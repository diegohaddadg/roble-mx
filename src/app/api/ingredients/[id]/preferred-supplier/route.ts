import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
    const { preferredSupplierId } = body as {
      preferredSupplierId: string | null;
    };

    if (preferredSupplierId !== null) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: preferredSupplierId },
      });
      if (!supplier || supplier.restaurantId !== restaurantId) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 }
        );
      }
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: { preferredSupplierId },
      include: {
        preferredSupplier: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      preferredSupplierId: updated.preferredSupplierId,
      preferredSupplierName: updated.preferredSupplier?.name ?? null,
    });
  } catch (error) {
    console.error("Update preferred supplier error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
