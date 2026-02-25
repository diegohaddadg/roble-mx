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

    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: {
            preferredIngredients: true,
            invoices: true,
          },
        },
        invoices: {
          where: { status: "CONFIRMED" },
          select: { total: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      notes: s.notes,
      ingredientsCount: s._count.preferredIngredients,
      invoicesCount: s._count.invoices,
      totalSpent: s.invoices.reduce(
        (sum, inv) => sum + (inv.total ? Number(inv.total) : 0),
        0
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("List suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, name, phone, contactName, notes } = body as {
      restaurantId?: string;
      name?: string;
      phone?: string;
      contactName?: string;
      notes?: string;
    };

    if (!restaurantId || !name?.trim()) {
      return NextResponse.json(
        { error: "restaurantId and name required" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        restaurantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        contactName: contactName?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese nombre" },
        { status: 409 }
      );
    }
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
