// app/api/invoices/route.ts
// List invoices for a restaurant, optionally filtered by status

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status") as InvoiceStatus | null;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    const where: { restaurantId: string; status?: InvoiceStatus } = {
      restaurantId,
    };
    if (status && Object.values(InvoiceStatus).includes(status)) {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        supplier: true,
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("List invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
