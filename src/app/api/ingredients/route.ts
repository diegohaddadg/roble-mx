import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      include: {
        priceHistory: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
        preferredSupplier: {
          select: { id: true, name: true },
        },
        _count: {
          select: { recipeItems: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = ingredients.map((ing) => {
      const currentPrice = ing.currentPrice ? Number(ing.currentPrice) : null;
      const prev = ing.priceHistory[1];
      const previousPrice = prev ? Number(prev.price) : null;

      let changePercent = 0;
      if (previousPrice !== null && currentPrice !== null && previousPrice > 0) {
        changePercent =
          Math.round(((currentPrice - previousPrice) / previousPrice) * 1000) /
          10;
      }

      return {
        id: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        currentPrice,
        previousPrice,
        changePercent,
        recipesCount: ing._count.recipeItems,
        preferredSupplierId: ing.preferredSupplierId,
        preferredSupplierName: ing.preferredSupplier?.name ?? null,
        createdAt: ing.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("List ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients" },
      { status: 500 }
    );
  }
}
