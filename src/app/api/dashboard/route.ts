// app/api/dashboard/route.ts
// Aggregated profitability metrics for the restaurant owner
// This is the "check your phone in 60 seconds every morning" endpoint

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId es requerido" },
        { status: 400 }
      );
    }

    // ─── 1. Recipe profitability (all active recipes) ──────
    const recipes = await prisma.recipe.findMany({
      where: { restaurantId, isActive: true },
      include: {
        items: { include: { ingredient: true } },
      },
    });

    const recipeMetrics = recipes
      .map((recipe) => {
        const foodCost = recipe.items.reduce((sum, item) => {
          const price = item.ingredient.currentPrice
            ? Number(item.ingredient.currentPrice)
            : 0;
          return sum + Number(item.quantity) * price;
        }, 0);

        const sellPrice = recipe.sellPrice ? Number(recipe.sellPrice) : 0;
        const costPerPortion =
          recipe.yield > 0 ? foodCost / recipe.yield : foodCost;
        const margin = sellPrice - costPerPortion;
        const marginPercent =
          sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
        const foodCostPercent =
          sellPrice > 0 ? (costPerPortion / sellPrice) * 100 : 0;

        return {
          id: recipe.id,
          name: recipe.name,
          category: recipe.category,
          sellPrice: Math.round(sellPrice * 100) / 100,
          foodCost: Math.round(costPerPortion * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          marginPercent: Math.round(marginPercent * 10) / 10,
          foodCostPercent: Math.round(foodCostPercent * 10) / 10,
        };
      })
      .sort((a, b) => a.marginPercent - b.marginPercent); // worst first

    const topProfitable = [...recipeMetrics]
      .sort((a, b) => b.marginPercent - a.marginPercent)
      .slice(0, 5);

    const bottomProfitable = recipeMetrics.slice(0, 5);

    // ─── 2. Overall food cost average ──────────────────────
    const avgFoodCostPercent =
      recipeMetrics.length > 0
        ? recipeMetrics.reduce((sum, r) => sum + r.foodCostPercent, 0) /
          recipeMetrics.length
        : 0;

    // ─── 3. Invoice / spending summary ─────────────────────
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // start of week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This week's spending
    const thisWeekInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: "CONFIRMED",
        invoiceDate: { gte: thisWeekStart },
      },
      select: { total: true },
    });
    const thisWeekTotal = thisWeekInvoices.reduce(
      (sum, inv) => sum + (inv.total ? Number(inv.total) : 0),
      0
    );

    // Last week's spending
    const lastWeekInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: "CONFIRMED",
        invoiceDate: { gte: lastWeekStart, lt: thisWeekStart },
      },
      select: { total: true },
    });
    const lastWeekTotal = lastWeekInvoices.reduce(
      (sum, inv) => sum + (inv.total ? Number(inv.total) : 0),
      0
    );

    // This month
    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: "CONFIRMED",
        invoiceDate: { gte: thisMonthStart },
      },
      select: { total: true },
    });
    const thisMonthTotal = thisMonthInvoices.reduce(
      (sum, inv) => sum + (inv.total ? Number(inv.total) : 0),
      0
    );

    // ─── 4. Spending by supplier (this month) ──────────────
    const supplierSpending = await prisma.invoice.groupBy({
      by: ["supplierId"],
      where: {
        restaurantId,
        status: "CONFIRMED",
        invoiceDate: { gte: thisMonthStart },
        supplierId: { not: null },
      },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    });

    // Get supplier names
    const supplierIds = supplierSpending
      .map((s) => s.supplierId)
      .filter(Boolean) as string[];
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierMap = Object.fromEntries(
      suppliers.map((s) => [s.id, s.name])
    );

    const supplierBreakdown = supplierSpending.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierId ? supplierMap[s.supplierId] || "Desconocido" : "Sin proveedor",
      totalSpent: s._sum.total ? Number(s._sum.total) : 0,
      invoiceCount: s._count,
    }));

    // ─── 5. Ingredient price alerts ────────────────────────
    // Find ingredients where the latest price is 15%+ higher than the previous
    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      include: {
        priceHistory: {
          orderBy: { date: "desc" },
          take: 2,
        },
      },
    });

    const priceAlerts = ingredients
      .filter((ing) => ing.priceHistory.length >= 2)
      .map((ing) => {
        const current = Number(ing.priceHistory[0].price);
        const previous = Number(ing.priceHistory[1].price);
        const changePercent =
          previous > 0 ? ((current - previous) / previous) * 100 : 0;
        return {
          ingredientId: ing.id,
          name: ing.name,
          unit: ing.unit,
          currentPrice: current,
          previousPrice: previous,
          changePercent: Math.round(changePercent * 10) / 10,
        };
      })
      .filter((alert) => Math.abs(alert.changePercent) >= 15)
      .sort((a, b) => b.changePercent - a.changePercent);

    // ─── 6. Summary counts ─────────────────────────────────
    const totalRecipes = recipes.length;
    const totalIngredients = await prisma.ingredient.count({
      where: { restaurantId },
    });
    const totalInvoices = await prisma.invoice.count({
      where: { restaurantId, status: "CONFIRMED" },
    });
    const pendingInvoices = await prisma.invoice.count({
      where: { restaurantId, status: "PENDING_REVIEW" },
    });

    // ─── RESPONSE ──────────────────────────────────────────
    return NextResponse.json({
      summary: {
        totalRecipes,
        totalIngredients,
        totalInvoices,
        pendingInvoices,
        avgFoodCostPercent: Math.round(avgFoodCostPercent * 10) / 10,
      },
      spending: {
        thisWeek: Math.round(thisWeekTotal * 100) / 100,
        lastWeek: Math.round(lastWeekTotal * 100) / 100,
        weekChange:
          lastWeekTotal > 0
            ? Math.round(
                ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 1000
              ) / 10
            : 0,
        thisMonth: Math.round(thisMonthTotal * 100) / 100,
      },
      topProfitable,
      bottomProfitable,
      supplierBreakdown,
      priceAlerts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Error al obtener dashboard" },
      { status: 500 }
    );
  }
}
