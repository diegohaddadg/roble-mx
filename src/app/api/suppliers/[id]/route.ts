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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        preferredIngredients: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true,
            currentPrice: true,
          },
          orderBy: { name: "asc" },
        },
        invoices: {
          where: { status: "CONFIRMED" },
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            total: true,
            _count: { select: { lineItems: true } },
          },
          orderBy: { invoiceDate: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier || supplier.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        notes: supplier.notes,
      },
      linkedIngredients: supplier.preferredIngredients.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        currentPrice: i.currentPrice ? Number(i.currentPrice) : null,
      })),
      recentInvoices: supplier.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.invoiceDate,
        total: inv.total ? Number(inv.total) : null,
        lineItemsCount: inv._count.lineItems,
      })),
    });
  } catch (error) {
    console.error("Supplier detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}
