// app/api/invoices/[id]/confirm/route.ts
// v2: Zod validation + $transaction to prevent partial writes

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmInvoiceSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    // 1. Parse and validate input
    const rawBody = await request.json();
    const parseResult = confirmInvoiceSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    // 2. Verify invoice exists and is pending
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    // Validate the invoice's restaurant still exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: invoice.restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        {
          error: "Restaurante no encontrado (posible reseed). Actualiza tu restaurantId.",
        },
        { status: 400 }
      );
    }

    if (invoice.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Esta factura ya fue confirmada" },
        { status: 400 }
      );
    }

    // 3. Run everything in a transaction — all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // Handle supplier — find existing first to avoid duplicates
      let supplierId = body.supplierId;
      if (!supplierId && body.supplierName) {
        const existingSupplier = await tx.supplier.findFirst({
          where: {
            name: body.supplierName,
            restaurantId: invoice.restaurantId,
          },
        });
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const newSupplier = await tx.supplier.create({
            data: {
              name: body.supplierName,
              restaurantId: invoice.restaurantId,
            },
          });
          supplierId = newSupplier.id;
        }
      }

      // Process each line item
      const processedItems = [];
      for (const item of body.lineItems) {
        let ingredientId = item.ingredientId;

        // Create new ingredient if needed
        if (!ingredientId && item.ingredientName) {
          // Check if ingredient already exists (by name)
          const existing = await tx.ingredient.findUnique({
            where: {
              name_restaurantId: {
                name: item.ingredientName,
                restaurantId: invoice.restaurantId,
              },
            },
          });

          if (existing) {
            ingredientId = existing.id;
          } else {
            const newIngredient = await tx.ingredient.create({
              data: {
                name: item.ingredientName,
                unit: item.unit,
                currentPrice: item.unitPrice,
                restaurantId: invoice.restaurantId,
              },
            });
            ingredientId = newIngredient.id;
          }
        }

        // Update ingredient current price + auto-assign preferred supplier
        if (ingredientId) {
          const existingIngredient = await tx.ingredient.findUnique({
            where: { id: ingredientId },
            select: { preferredSupplierId: true },
          });
          await tx.ingredient.update({
            where: { id: ingredientId },
            data: {
              currentPrice: item.unitPrice,
              ...(supplierId && !existingIngredient?.preferredSupplierId
                ? { preferredSupplierId: supplierId }
                : {}),
            },
          });

          // Create price history record
          await tx.priceHistory.create({
            data: {
              price: item.unitPrice,
              date: body.invoiceDate
                ? new Date(body.invoiceDate)
                : new Date(),
              supplierId: supplierId,
              ingredientId: ingredientId,
              invoiceId: invoiceId,
            },
          });
        }

        processedItems.push({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          ingredientId: ingredientId,
        });
      }

      // Delete old AI-extracted line items
      await tx.lineItem.deleteMany({
        where: { invoiceId },
      });

      // Create confirmed line items
      await tx.lineItem.createMany({
        data: processedItems.map((item) => ({
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          ingredientId: item.ingredientId,
        })),
      });

      // Update invoice to CONFIRMED
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "CONFIRMED",
          supplierId,
          invoiceNumber: body.invoiceNumber,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
          subtotal: body.subtotal,
          tax: body.tax,
          total: body.total,
        },
        include: {
          lineItems: { include: { ingredient: true } },
          supplier: true,
        },
      });

      // ── Inventory: update on-hand for each linked line item ──
      for (const item of processedItems) {
        if (!item.ingredientId || !item.quantity) continue;
        const qty = Number(item.quantity);
        if (qty <= 0 || isNaN(qty)) continue;

        const existing = await tx.inventoryLevel.findUnique({
          where: { ingredientId: item.ingredientId },
        });

        const oldOnHand = existing ? Number(existing.onHand) : 0;
        const newOnHand = Math.max(0, oldOnHand + qty);

        await tx.inventoryLevel.upsert({
          where: { ingredientId: item.ingredientId },
          create: {
            ingredientId: item.ingredientId,
            onHand: newOnHand,
          },
          update: {
            onHand: newOnHand,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            ingredientId: item.ingredientId,
            delta: qty,
            newOnHand,
            source: "INVOICE",
            invoiceId,
          },
        });
      }

      return updatedInvoice;
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Invoice confirm error:", { message, error });
    return NextResponse.json(
      {
        error: "Error al confirmar factura",
        details: message,
      },
      { status: 500 }
    );
  }
}
