import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient || ingredient.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Price history — fetch related supplier/invoice data via separate queries
    const priceHistory = await prisma.priceHistory.findMany({
      where: { ingredientId: id },
      orderBy: { date: "asc" },
    });

    const invoiceIds = priceHistory
      .map((p) => p.invoiceId)
      .filter(Boolean) as string[];
    const supplierIds = priceHistory
      .map((p) => p.supplierId)
      .filter(Boolean) as string[];

    const [invoices, suppliers] = await Promise.all([
      prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, invoiceNumber: true },
      }),
      prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true },
      }),
    ]);

    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const enrichedHistory = priceHistory.map((p) => ({
      date: p.date,
      price: Number(p.price),
      supplierName: p.supplierId
        ? (supplierMap.get(p.supplierId)?.name ?? null)
        : null,
      invoiceNumber: p.invoiceId
        ? (invoiceMap.get(p.invoiceId)?.invoiceNumber ?? null)
        : null,
      invoiceId: p.invoiceId,
    }));

    // Recipes using this ingredient
    const recipeItems = await prisma.recipeItem.findMany({
      where: { ingredientId: id },
      include: {
        recipe: {
          include: {
            items: { include: { ingredient: true } },
          },
        },
      },
    });

    const currentPrice = Number(ingredient.currentPrice ?? 0);

    const recipesUsing = recipeItems
      .filter((ri) => ri.recipe.isActive && ri.recipe.sellPrice)
      .map((ri) => {
        const qty = Number(ri.quantity);
        const costContribution =
          Math.round(qty * currentPrice * 100) / 100;
        const sellPrice = Number(ri.recipe.sellPrice);
        const recipeYield = ri.recipe.yield || 1;

        let totalRecipeCost = 0;
        for (const item of ri.recipe.items) {
          totalRecipeCost +=
            Number(item.quantity) *
            Number(item.ingredient.currentPrice ?? 0);
        }
        const foodCostPerPortion = totalRecipeCost / recipeYield;
        const recipeFoodCostPercent =
          sellPrice > 0
            ? Math.round((foodCostPerPortion / sellPrice) * 1000) / 10
            : 0;

        return {
          recipeId: ri.recipe.id,
          recipeName: ri.recipe.name,
          qty,
          unit: ri.unit,
          costContribution,
          recipeFoodCostPercent,
        };
      });

    // Recent invoice lines containing this ingredient
    const recentLines = await prisma.lineItem.findMany({
      where: {
        ingredientId: id,
        invoice: { restaurantId, status: "CONFIRMED" },
      },
      orderBy: { invoice: { createdAt: "desc" } },
      take: 10,
      include: {
        invoice: {
          include: { supplier: true },
        },
      },
    });

    const recentInvoiceLines = recentLines.map((li) => ({
      invoiceId: li.invoice.id,
      date: li.invoice.invoiceDate ?? li.invoice.createdAt,
      supplierName: li.invoice.supplier?.name ?? "Sin proveedor",
      qty: Number(li.quantity),
      unit: li.unit,
      pricePaid: Number(li.unitPrice),
    }));

    // Previous price for header
    const prev =
      priceHistory.length >= 2
        ? Number(priceHistory[priceHistory.length - 2].price)
        : null;
    let changePercent = 0;
    if (prev !== null && currentPrice > 0 && prev > 0) {
      changePercent =
        Math.round(((currentPrice - prev) / prev) * 1000) / 10;
    }

    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        currentPrice,
        previousPrice: prev,
        changePercent,
      },
      priceHistory: enrichedHistory,
      recipesUsing,
      recentInvoiceLines,
    });
  } catch (error) {
    console.error("Ingredient detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredient" },
      { status: 500 }
    );
  }
}
