// lib/extraction.ts — AI Invoice Extraction Pipeline
// Currently a realistic stub. Plug in Claude API / OpenAI Vision when ready.

import { ExtractedInvoice } from "./types";

/**
 * Extracts structured invoice data from an image or PDF.
 *
 * CURRENT: Returns mock data for development.
 * FUTURE:  Sends image to Claude Vision API → structured JSON extraction.
 *
 * Pipeline will be:
 *   1. Image preprocessing (straighten, enhance contrast)
 *   2. Send to Claude Vision API with extraction prompt
 *   3. Parse structured JSON response
 *   4. Validate and normalize units/prices
 *   5. Match against restaurant's known ingredients
 */
export async function extractInvoiceData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedInvoice> {
  // ──────────────────────────────────────────────────────────
  // TODO: Replace with real AI extraction
  //
  // const response = await anthropic.messages.create({
  //   model: "claude-sonnet-4-20250514",
  //   max_tokens: 2000,
  //   messages: [{
  //     role: "user",
  //     content: [
  //       {
  //         type: "image",
  //         source: {
  //           type: "base64",
  //           media_type: mimeType,
  //           data: imageBuffer.toString("base64"),
  //         },
  //       },
  //       {
  //         type: "text",
  //         text: EXTRACTION_PROMPT,
  //       },
  //     ],
  //   }],
  // });
  // ──────────────────────────────────────────────────────────

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock extraction — realistic Mexican supplier invoice
  const mockExtraction: ExtractedInvoice = {
    supplierName: "Distribuidora de Carnes El Patrón",
    invoiceNumber: "F-2024-00847",
    invoiceDate: new Date().toISOString().split("T")[0],
    subtotal: 4850.0,
    tax: 776.0,
    total: 5626.0,
    lineItems: [
      {
        description: "Pechuga de pollo s/h",
        quantity: 20,
        unit: "kg",
        unitPrice: 89.0,
        totalPrice: 1780.0,
        confidence: 0.95,
      },
      {
        description: "Arrachera de res",
        quantity: 10,
        unit: "kg",
        unitPrice: 189.0,
        totalPrice: 1890.0,
        confidence: 0.92,
      },
      {
        description: "Chuleta de cerdo",
        quantity: 8,
        unit: "kg",
        unitPrice: 79.0,
        totalPrice: 632.0,
        confidence: 0.88,
      },
      {
        description: "Tocino ahumado",
        quantity: 3,
        unit: "kg",
        unitPrice: 125.0,
        totalPrice: 375.0,
        confidence: 0.91,
      },
      {
        description: "Hueso de res p/caldo",
        quantity: 5,
        unit: "kg",
        unitPrice: 34.6,
        totalPrice: 173.0,
        confidence: 0.85,
      },
    ],
  };

  return mockExtraction;
}

/**
 * The prompt we'll send to Claude for extraction.
 * Kept here for reference — will be used when AI is plugged in.
 */
export const EXTRACTION_PROMPT = `Eres un asistente experto en extraer datos de facturas de proveedores de restaurantes en México.

Analiza esta imagen de una factura y extrae la siguiente información en formato JSON:

{
  "supplierName": "nombre del proveedor",
  "invoiceNumber": "número de factura",
  "invoiceDate": "YYYY-MM-DD",
  "subtotal": número,
  "tax": número (IVA),
  "total": número,
  "lineItems": [
    {
      "description": "descripción del producto tal como aparece",
      "quantity": número,
      "unit": "kg|L|pza|caja|manojo|bolsa",
      "unitPrice": número (precio por unidad),
      "totalPrice": número (cantidad × precio unitario),
      "confidence": número entre 0 y 1
    }
  ]
}

Reglas:
- Si un campo no es legible, usa null
- Normaliza las unidades: kilogramos→"kg", litros→"L", piezas→"pza"
- Si el precio unitario no aparece pero sí el total y la cantidad, calcula: unitPrice = totalPrice / quantity
- El campo "confidence" indica qué tan seguro estás de la extracción (0.0 a 1.0)
- Responde SOLO con el JSON, sin texto adicional`;
