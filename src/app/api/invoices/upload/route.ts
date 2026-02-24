// app/api/invoices/upload/route.ts
// Handles invoice image upload → AI extraction → creates pending invoice

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractInvoiceData } from "@/lib/extraction";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

    // Validate file type
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

    // 10 MB server-side limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    // Save file to local storage
    // FUTURE: Replace with S3/Cloudflare R2 for production
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${randomUUID()}.${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/${fileName}`;

    // Run AI extraction pipeline
    const extraction = await extractInvoiceData(buffer, file.type);

    // Create invoice record with PENDING_REVIEW status
    const invoice = await prisma.invoice.create({
      data: {
        restaurantId,
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
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
