import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractInvoiceData } from "@/lib/extraction";
import { randomUUID } from "crypto";

async function storeFile(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`invoices/${fileName}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  // Local fallback for dev without blob token
  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, fileName);
  await writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const restaurantId = formData.get("restaurantId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    let validRestaurantId = restaurantId;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      if (process.env.NODE_ENV !== "production") {
        const fallback = await prisma.restaurant.findFirst({
          select: { id: true },
        });
        if (fallback) {
          console.warn(
            `[upload] restaurantId "${restaurantId}" not found — using fallback "${fallback.id}" (dev mode)`
          );
          validRestaurantId = fallback.id;
        } else {
          return NextResponse.json(
            { error: "No existe ningún restaurante. Ejecuta npx prisma db seed primero." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Restaurante no encontrado. Actualiza tu restaurantId después de reseed." },
          { status: 400 }
        );
      }
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be an image (JPG, PNG, WebP) or PDF" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${randomUUID()}.${fileExt}`;

    const imageUrl = await storeFile(buffer, fileName, file.type);

    const extraction = await extractInvoiceData(buffer, file.type);

    const invoice = await prisma.invoice.create({
      data: {
        restaurantId: validRestaurantId,
        imageUrl,
        invoiceNumber: extraction.invoiceNumber,
        invoiceDate: extraction.invoiceDate
          ? new Date(extraction.invoiceDate)
          : null,
        subtotal: extraction.subtotal,
        tax: extraction.tax,
        total: extraction.total,
        status: "PENDING_REVIEW",
        rawExtraction: extraction as any,
        lineItems: {
          create: extraction.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            confidence: item.confidence,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      imageUrl,
      extraction,
      ...(validRestaurantId !== restaurantId
        ? { usedFallbackRestaurantId: validRestaurantId }
        : {}),
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
