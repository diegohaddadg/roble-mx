import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    const emptySummary = { totalItems: 0, totalEstimatedCost: 0 };

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required", suggestions: [], summary: emptySummary },
        { status: 400 }
      );
    }

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      include: { inventoryLevel: true },
    });

    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    // Aggregate line item quantities per ingredient over last 28 days
    const usageData = await prisma.lineItem.groupBy({
      by: ["ingredientId"],
      where: {
        ingredientId: { in: ingredients.map((i) => i.id) },
        invoice: {
          restaurantId,
          status: "CONFIRMED",
          invoiceDate: { gte: twentyEightDaysAgo },
        },
      },
      _sum: { quantity: true },
    });

    const usageMap = new Map<string, number>();
    for (const row of usageData) {
      if (row.ingredientId && row._sum.quantity) {
        usageMap.set(row.ingredientId, Number(row._sum.quantity));
      }
    }

    const suggestions = [];

    for (const ing of ingredients) {
      const lvl = ing.inventoryLevel;
      if (!lvl) continue;

      const onHand = Number(lvl.onHand);
      const low = Number(lvl.lowThreshold);
      const critical = Number(lvl.criticalThreshold);
      const currentPrice = ing.currentPrice ? Number(ing.currentPrice) : 0;

      const totalUsed28d = usageMap.get(ing.id) ?? 0;
      const avgWeeklyUsage = totalUsed28d / 4;

      const targetStock = Math.max(avgWeeklyUsage * 1.2, low * 2);
      const suggestedQty =
        Math.round(Math.max(0, targetStock - onHand) * 100) / 100;

      if (suggestedQty <= 0) continue;

      let reason: string;
      if (onHand <= critical) reason = "Crítico";
      else if (onHand <= low) reason = "Bajo stock";
      else reason = "Reposición (uso semanal)";

      suggestions.push({
        ingredientId: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        onHand,
        suggestedQty,
        reason,
        estimatedCost:
          Math.round(suggestedQty * currentPrice * 100) / 100,
        currentPrice,
      });
    }

    // Sort critical first, then low stock, then by estimated cost desc
    const priorityOrder: Record<string, number> = {
      Crítico: 0,
      "Bajo stock": 1,
      "Reposición (uso semanal)": 2,
    };
    suggestions.sort((a, b) => {
      const pa = priorityOrder[a.reason] ?? 3;
      const pb = priorityOrder[b.reason] ?? 3;
      if (pa !== pb) return pa - pb;
      return b.estimatedCost - a.estimatedCost;
    });

    const totalEstimatedCost = suggestions.reduce(
      (s, i) => s + i.estimatedCost,
      0
    );

    return NextResponse.json({
      suggestions,
      summary: {
        totalItems: suggestions.length,
        totalEstimatedCost:
          Math.round(totalEstimatedCost * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Ordering suggestions error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ordering suggestions",
        suggestions: [],
        summary: { totalItems: 0, totalEstimatedCost: 0 },
      },
      { status: 500 }
    );
  }
}
