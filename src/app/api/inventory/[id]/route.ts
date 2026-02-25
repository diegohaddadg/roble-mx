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
      include: { inventoryLevel: true },
    });

    if (!ingredient || ingredient.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const movements = await prisma.inventoryMovement.findMany({
      where: { ingredientId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const invoiceIds = movements
      .map((m) => m.invoiceId)
      .filter(Boolean) as string[];
    const invoiceMap = new Map<string, string>();
    if (invoiceIds.length > 0) {
      const invoices = await prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, invoiceNumber: true },
      });
      for (const inv of invoices) {
        invoiceMap.set(inv.id, inv.invoiceNumber ?? inv.id);
      }
    }

    const recentLines = await prisma.lineItem.findMany({
      where: {
        ingredientId: id,
        invoice: { restaurantId, status: "CONFIRMED" },
      },
      orderBy: { invoice: { createdAt: "desc" } },
      take: 10,
      include: {
        invoice: { include: { supplier: true } },
      },
    });

    const lvl = ingredient.inventoryLevel;
    const onHand = lvl ? Number(lvl.onHand) : null;
    const low = lvl ? Number(lvl.lowThreshold) : 3;
    const critical = lvl ? Number(lvl.criticalThreshold) : 1;

    let status: "OK" | "Bajo" | "Crítico" | null = null;
    if (onHand !== null) {
      if (onHand <= critical) status = "Crítico";
      else if (onHand <= low) status = "Bajo";
      else status = "OK";
    }

    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        currentPrice: ingredient.currentPrice
          ? Number(ingredient.currentPrice)
          : null,
      },
      inventoryLevel: lvl
        ? {
            onHand,
            lowThreshold: low,
            criticalThreshold: critical,
            updatedAt: lvl.updatedAt,
            status,
          }
        : null,
      movements: movements.map((m) => ({
        id: m.id,
        date: m.createdAt,
        source: m.source,
        delta: Number(m.delta),
        newOnHand: Number(m.newOnHand),
        notes: m.notes,
        invoiceId: m.invoiceId,
        invoiceNumber: m.invoiceId
          ? (invoiceMap.get(m.invoiceId) ?? null)
          : null,
      })),
      recentInvoiceLines: recentLines.map((li) => ({
        invoiceId: li.invoice.id,
        date: li.invoice.invoiceDate ?? li.invoice.createdAt,
        supplierName: li.invoice.supplier?.name ?? "Sin proveedor",
        qty: Number(li.quantity),
        unit: li.unit,
        pricePaid: Number(li.unitPrice),
      })),
    });
  } catch (error) {
    console.error("Inventory detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory detail" },
      { status: 500 }
    );
  }
}
