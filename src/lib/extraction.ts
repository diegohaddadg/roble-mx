import Anthropic from "@anthropic-ai/sdk";
import { ExtractedInvoice, ExtractedLineItem } from "./types";

const EXTRACTION_PROMPT = `Eres un asistente experto en extraer datos de facturas de proveedores de restaurantes en México.

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
      "unitPrice": número,
      "totalPrice": número,
      "confidence": número entre 0 y 1
    }
  ]
}

Reglas:
- Si un campo no es legible, usa null
- Normaliza unidades: kilogramos→"kg", litros→"L", piezas→"pza"
- Si no aparece unitPrice pero sí totalPrice y quantity, calcula: unitPrice = totalPrice / quantity
- confidence: 0.0 a 1.0
- Responde SOLO con el JSON, sin texto adicional`;

const MOCK_EXTRACTION: ExtractedInvoice = {
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

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractInvoiceData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedInvoice> {
  if (process.env.TOAST_USE_REAL_AI !== "1") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return MOCK_EXTRACTION;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to use real AI extraction."
    );
  }

  const client = new Anthropic({ apiKey });

  const mediaType = mimeType as ImageMediaType;
  const base64Data = imageBuffer.toString("base64");

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error(
        "Anthropic API authentication failed. Check your ANTHROPIC_API_KEY."
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error(
        "Anthropic API rate limit reached. Wait a moment and try again."
      );
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Anthropic API error (${err.status}): ${err.message}`);
    }
    throw new Error(
      `Unexpected error calling Anthropic: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      "Anthropic returned no text content. The model may not have been able to read the image."
    );
  }

  const rawText = textBlock.text.trim();

  let parsed: unknown;
  try {
    const jsonStr = rawText.startsWith("```")
      ? rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : rawText;
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON. Raw response:\n${rawText.slice(0, 500)}`
    );
  }

  return validateExtraction(parsed);
}

function validateExtraction(data: unknown): ExtractedInvoice {
  if (typeof data !== "object" || data === null) {
    throw new Error(
      "AI extraction returned non-object. Expected ExtractedInvoice shape."
    );
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.lineItems)) {
    throw new Error(
      'AI extraction missing "lineItems" array. Cannot proceed without line items.'
    );
  }

  const lineItems: ExtractedLineItem[] = obj.lineItems.map(
    (item: unknown, i: number) => {
      if (typeof item !== "object" || item === null) {
        throw new Error(`lineItems[${i}] is not an object.`);
      }
      const li = item as Record<string, unknown>;

      const quantity = Number(li.quantity) || 0;
      const unitPrice = Number(li.unitPrice) || 0;
      const totalPrice = Number(li.totalPrice) || 0;

      return {
        description: String(li.description || ""),
        quantity,
        unit: String(li.unit || "pza"),
        unitPrice: unitPrice || (quantity > 0 ? totalPrice / quantity : 0),
        totalPrice: totalPrice || quantity * unitPrice,
        confidence: Math.min(1, Math.max(0, Number(li.confidence) || 0.5)),
      };
    }
  );

  return {
    supplierName:
      typeof obj.supplierName === "string" ? obj.supplierName : null,
    invoiceNumber:
      typeof obj.invoiceNumber === "string" ? obj.invoiceNumber : null,
    invoiceDate:
      typeof obj.invoiceDate === "string" ? obj.invoiceDate : null,
    subtotal: typeof obj.subtotal === "number" ? obj.subtotal : null,
    tax: typeof obj.tax === "number" ? obj.tax : null,
    total: typeof obj.total === "number" ? obj.total : null,
    lineItems,
  };
}
