import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const body = await request.json();
    const { delta, setCount, notes } = body as {
      delta?: number;
      setCount?: number;
      notes?: string;
    };

    if (delta === undefined && setCount === undefined) {
      return NextResponse.json(
        { error: "Provide delta or setCount" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryLevel.findUnique({
        where: { ingredientId: id },
      });

      const oldOnHand = existing ? Number(existing.onHand) : 0;
      let computedDelta: number;
      let source: string;

      if (setCount !== undefined) {
        const clamped = Math.max(0, setCount);
        computedDelta = clamped - oldOnHand;
        source = "PHYSICAL_COUNT";
      } else {
        computedDelta = delta!;
        source = "MANUAL_ADJUST";
      }

      const newOnHand = Math.max(0, oldOnHand + computedDelta);

      const level = await tx.inventoryLevel.upsert({
        where: { ingredientId: id },
        create: {
          ingredientId: id,
          onHand: newOnHand,
        },
        update: {
          onHand: newOnHand,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          ingredientId: id,
          delta: computedDelta,
          newOnHand,
          source,
          notes: notes || null,
        },
      });

      const movements = await tx.inventoryMovement.findMany({
        where: { ingredientId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return { level, movements };
    });

    const lvl = result.level;
    const onHand = Number(lvl.onHand);
    const low = Number(lvl.lowThreshold);
    const critical = Number(lvl.criticalThreshold);
    let status: string = "OK";
    if (onHand <= critical) status = "Crítico";
    else if (onHand <= low) status = "Bajo";

    return NextResponse.json({
      inventoryLevel: {
        onHand,
        lowThreshold: low,
        criticalThreshold: critical,
        updatedAt: lvl.updatedAt,
        status,
      },
      movements: result.movements.map((m) => ({
        id: m.id,
        date: m.createdAt,
        source: m.source,
        delta: Number(m.delta),
        newOnHand: Number(m.newOnHand),
        notes: m.notes,
        invoiceId: m.invoiceId,
      })),
    });
  } catch (error) {
    console.error("Inventory adjust error:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}
