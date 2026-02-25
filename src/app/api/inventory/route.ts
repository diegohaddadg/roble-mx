import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function computeStatus(
  onHand: number | null,
  low: number,
  critical: number
): "OK" | "Bajo" | "Crítico" | null {
  if (onHand === null) return null;
  if (onHand <= critical) return "Crítico";
  if (onHand <= low) return "Bajo";
  return "OK";
}

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
        inventoryLevel: true,
      },
      orderBy: { name: "asc" },
    });

    const result = ingredients.map((ing) => {
      const lvl = ing.inventoryLevel;
      const onHand = lvl ? Number(lvl.onHand) : null;
      const low = lvl ? Number(lvl.lowThreshold) : 3;
      const critical = lvl ? Number(lvl.criticalThreshold) : 1;

      return {
        ingredientId: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        onHand,
        lowThreshold: low,
        criticalThreshold: critical,
        updatedAt: lvl?.updatedAt ?? null,
        status: computeStatus(onHand, low, critical),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Inventory list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
