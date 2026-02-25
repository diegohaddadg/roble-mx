import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeRecipeImpact,
  generateSuggestions,
  type PriceChange,
  type RecipeInput,
} from "@/lib/impact";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (
      !invoice ||
      invoice.restaurantId !== restaurantId ||
      invoice.status !== "CONFIRMED"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const empty = {
      ingredientsAffected: [],
      recipeImpacts: [],
      suggestions: [],
      summary: {
        totalRecipesAffected: 0,
        oldAvgFoodCostPercent: 0,
        newAvgFoodCostPercent: 0,
      },
    };

    const invoicePriceEntries = await prisma.priceHistory.findMany({
      where: { invoiceId },
      include: { ingredient: true },
    });

    if (invoicePriceEntries.length === 0) {
      return NextResponse.json(empty);
    }

    // Determine which ingredients actually changed price
    const priceChanges: PriceChange[] = [];
    const priceChangeMap = new Map<
      string,
      { oldPrice: number; newPrice: number }
    >();

    for (const entry of invoicePriceEntries) {
      const previousEntry = await prisma.priceHistory.findFirst({
        where: {
          ingredientId: entry.ingredientId,
          id: { not: entry.id },
          createdAt: { lt: entry.createdAt },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!previousEntry) continue;

      const oldPrice = Number(previousEntry.price);
      const newPrice = Number(entry.price);
      if (oldPrice === newPrice) continue;

      priceChanges.push({
        ingredientId: entry.ingredientId,
        ingredientName: entry.ingredient.name,
        unit: entry.ingredient.unit,
        oldPrice,
        newPrice,
      });

      priceChangeMap.set(entry.ingredientId, { oldPrice, newPrice });
    }

    if (priceChanges.length === 0) {
      return NextResponse.json(empty);
    }

    // Find every recipe that uses a changed ingredient
    const changedIds = priceChanges.map((pc) => pc.ingredientId);

    const affectedRecipeItems = await prisma.recipeItem.findMany({
      where: {
        ingredientId: { in: changedIds },
        recipe: {
          restaurantId,
          isActive: true,
          sellPrice: { not: null },
        },
      },
      include: {
        recipe: {
          include: {
            items: { include: { ingredient: true } },
          },
        },
      },
    });

    // Build unique recipe inputs for the pure computation
    const uniqueRecipeMap = new Map<string, RecipeInput>();
    for (const ri of affectedRecipeItems) {
      if (uniqueRecipeMap.has(ri.recipe.id)) continue;
      uniqueRecipeMap.set(ri.recipe.id, {
        recipeId: ri.recipe.id,
        recipeName: ri.recipe.name,
        sellPrice: Number(ri.recipe.sellPrice),
        yield: ri.recipe.yield || 1,
        items: ri.recipe.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: Number(item.quantity),
          currentPrice: Number(item.ingredient.currentPrice ?? 0),
        })),
      });
    }

    // Compute impact for each recipe using pure functions
    const recipeImpacts = Array.from(uniqueRecipeMap.values()).map((recipe) =>
      computeRecipeImpact(recipe, priceChanges)
    );

    const suggestions = generateSuggestions(recipeImpacts);

    // Build per-ingredient breakdown (with nested recipe impacts)
    const byIngredient = new Map<string, typeof affectedRecipeItems>();
    for (const ri of affectedRecipeItems) {
      const arr = byIngredient.get(ri.ingredientId) ?? [];
      arr.push(ri);
      byIngredient.set(ri.ingredientId, arr);
    }

    const ingredientsAffected = priceChanges
      .map((change) => {
        const { delta, percent } = (() => {
          const d = change.newPrice - change.oldPrice;
          const p =
            change.oldPrice > 0
              ? Math.round(
                  ((change.newPrice - change.oldPrice) / change.oldPrice) * 1000
                ) / 10
              : 0;
          return { delta: d, percent: p };
        })();

        const recipeItems = byIngredient.get(change.ingredientId) ?? [];
        const recipesAffected = recipeItems.map((ri) => {
          const impact = recipeImpacts.find(
            (r) => r.recipeId === ri.recipe.id
          );
          return {
            recipeId: ri.recipe.id,
            recipeName: ri.recipe.name,
            sellPrice: impact?.sellPrice ?? Number(ri.recipe.sellPrice),
            oldFoodCost: impact?.oldFoodCost ?? 0,
            newFoodCost: impact?.newFoodCost ?? 0,
            oldMarginPercent: impact?.oldMarginPercent ?? 0,
            newMarginPercent: impact?.newMarginPercent ?? 0,
          };
        });

        return {
          ...change,
          changePercent: percent,
          delta,
          recipesAffected,
        };
      })
      .filter((ia) => ia.recipesAffected.length > 0);

    // Summary
    let sumOldPct = 0;
    let sumNewPct = 0;
    for (const r of recipeImpacts) {
      sumOldPct += r.oldFoodCostPercent;
      sumNewPct += r.newFoodCostPercent;
    }
    const count = recipeImpacts.length;

    return NextResponse.json({
      ingredientsAffected,
      recipeImpacts,
      suggestions,
      summary: {
        totalRecipesAffected: recipeImpacts.length,
        oldAvgFoodCostPercent:
          count > 0 ? Math.round((sumOldPct / count) * 10) / 10 : 0,
        newAvgFoodCostPercent:
          count > 0 ? Math.round((sumNewPct / count) * 10) / 10 : 0,
      },
    });
  } catch (error) {
    console.error("Impact calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate impact" },
      { status: 500 }
    );
  }
}
