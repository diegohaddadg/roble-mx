import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      summary: {
        totalRecipesAffected: 0,
        oldAvgFoodCostPercent: 0,
        newAvgFoodCostPercent: 0,
      },
    };

    // PriceHistory entries created during this invoice's confirmation
    const invoicePriceEntries = await prisma.priceHistory.findMany({
      where: { invoiceId },
      include: { ingredient: true },
    });

    if (invoicePriceEntries.length === 0) {
      return NextResponse.json(empty);
    }

    // Phase 1 — determine which ingredients actually changed price
    interface PriceChange {
      ingredientId: string;
      ingredientName: string;
      unit: string;
      oldPrice: number;
      newPrice: number;
      changePercent: number;
    }

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

      const changePercent =
        Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;

      priceChanges.push({
        ingredientId: entry.ingredientId,
        ingredientName: entry.ingredient.name,
        unit: entry.ingredient.unit,
        oldPrice,
        newPrice,
        changePercent,
      });

      priceChangeMap.set(entry.ingredientId, { oldPrice, newPrice });
    }

    if (priceChanges.length === 0) {
      return NextResponse.json(empty);
    }

    // Phase 2 — find every recipe that uses a changed ingredient
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

    // Group by ingredient for the per-ingredient breakdown
    const byIngredient = new Map<string, typeof affectedRecipeItems>();
    for (const ri of affectedRecipeItems) {
      const arr = byIngredient.get(ri.ingredientId) ?? [];
      arr.push(ri);
      byIngredient.set(ri.ingredientId, arr);
    }

    const ingredientsAffected = [];
    const uniqueRecipeIds = new Set<string>();

    for (const change of priceChanges) {
      const recipeItems = byIngredient.get(change.ingredientId) ?? [];
      const recipesAffected = [];

      for (const ri of recipeItems) {
        const recipe = ri.recipe;
        const sellPrice = Number(recipe.sellPrice);
        const recipeYield = recipe.yield || 1;
        const qtyInRecipe = Number(ri.quantity);

        let newTotalCost = 0;
        for (const item of recipe.items) {
          newTotalCost +=
            Number(item.quantity) *
            Number(item.ingredient.currentPrice ?? 0);
        }

        const newFoodCost = newTotalCost / recipeYield;
        const oldFoodCost =
          (newTotalCost + qtyInRecipe * (change.oldPrice - change.newPrice)) /
          recipeYield;

        const newMargin =
          sellPrice > 0
            ? Math.round(((sellPrice - newFoodCost) / sellPrice) * 1000) / 10
            : 0;
        const oldMargin =
          sellPrice > 0
            ? Math.round(((sellPrice - oldFoodCost) / sellPrice) * 1000) / 10
            : 0;

        recipesAffected.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          sellPrice,
          oldFoodCost: Math.round(oldFoodCost * 100) / 100,
          newFoodCost: Math.round(newFoodCost * 100) / 100,
          oldMarginPercent: oldMargin,
          newMarginPercent: newMargin,
        });

        uniqueRecipeIds.add(recipe.id);
      }

      if (recipesAffected.length > 0) {
        ingredientsAffected.push({ ...change, recipesAffected });
      }
    }

    // Phase 3 — summary: avg food cost % across unique affected recipes,
    // accounting for ALL ingredient changes from this invoice at once
    const uniqueRecipes = new Map<
      string,
      { sellPrice: number; oldFoodCost: number; newFoodCost: number }
    >();

    for (const ri of affectedRecipeItems) {
      if (uniqueRecipes.has(ri.recipe.id)) continue;

      const recipe = ri.recipe;
      const sellPrice = Number(recipe.sellPrice);
      const recipeYield = recipe.yield || 1;

      let newTotal = 0;
      let oldTotal = 0;
      for (const item of recipe.items) {
        const qty = Number(item.quantity);
        const currentPrice = Number(item.ingredient.currentPrice ?? 0);
        newTotal += qty * currentPrice;

        const delta = priceChangeMap.get(item.ingredientId);
        oldTotal += qty * (delta ? delta.oldPrice : currentPrice);
      }

      uniqueRecipes.set(recipe.id, {
        sellPrice,
        newFoodCost: newTotal / recipeYield,
        oldFoodCost: oldTotal / recipeYield,
      });
    }

    let sumOldPct = 0;
    let sumNewPct = 0;
    for (const [, r] of uniqueRecipes) {
      if (r.sellPrice > 0) {
        sumOldPct += (r.oldFoodCost / r.sellPrice) * 100;
        sumNewPct += (r.newFoodCost / r.sellPrice) * 100;
      }
    }

    const count = uniqueRecipes.size;

    return NextResponse.json({
      ingredientsAffected,
      summary: {
        totalRecipesAffected: uniqueRecipeIds.size,
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
