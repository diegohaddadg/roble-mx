import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeParseModelJson } from "@/lib/parse-model-json";

const MENU_PROMPT = `Eres un asistente experto en menús de restaurantes mexicanos.

Analiza esta imagen de un menú de restaurante y extrae TODOS los platillos visibles en formato JSON válido.

Devuelve únicamente un objeto JSON con esta estructura exacta:

{
  "dishes": [
    {
      "name": "nombre exacto del platillo como aparece en el menú",
      "category": "Entradas | Platos fuertes | Tacos | Bebidas | Postres | Otros",
      "sellPrice": número (en MXN) o null,
      "estimatedIngredients": [
        {
          "name": "ingrediente principal estimado",
          "estimatedQuantity": número,
          "unit": "kg | g | L | ml | pza"
        }
      ]
    }
  ]
}

Reglas estrictas:
- Extrae TODOS los platillos visibles.
- No inventes platillos que no aparecen.
- Si el precio no es visible o legible, usa null.
- Estima únicamente ingredientes principales.
- Las cantidades son aproximadas y por porción.
- Devuelve SOLO JSON válido.
- No incluyas texto antes ni después del JSON.`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

interface ExtractedDish {
  name: string;
  category: string;
  sellPrice: number | null;
  estimatedIngredients: {
    name: string;
    estimatedQuantity: number;
    unit: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: true, message: "No se recibió archivo." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: true, message: "El archivo excede 10 MB." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: true,
          message:
            "ANTHROPIC_API_KEY no está configurada. Contacta al administrador.",
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mediaType = file.type as ImageMediaType;

    const client = new Anthropic({ apiKey });

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
              { type: "text", text: MENU_PROMPT },
            ],
          },
        ],
      });
    } catch (err: unknown) {
      if (err instanceof Anthropic.AuthenticationError) {
        return NextResponse.json(
          { error: true, message: "Error de autenticación con la API de IA." },
          { status: 500 }
        );
      }
      if (err instanceof Anthropic.RateLimitError) {
        return NextResponse.json(
          { error: true, message: "Límite de uso alcanzado. Intenta en unos minutos." },
          { status: 429 }
        );
      }
      throw err;
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: true, message: "La IA no devolvió texto. Intenta con otra imagen." },
        { status: 500 }
      );
    }

    const rawText = textBlock.text.trim();

    let parsed: { dishes?: unknown[] };
    try {
      parsed = safeParseModelJson(rawText) as { dishes?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: true, message: "No se pudo interpretar el menú. Intenta con una imagen más clara." },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsed.dishes)) {
      return NextResponse.json(
        { error: true, message: "No se encontraron platillos en la imagen." },
        { status: 422 }
      );
    }

    const dishes: ExtractedDish[] = parsed.dishes.map((d: unknown) => {
      const item = d as Record<string, unknown>;
      return {
        name: String(item.name || ""),
        category: String(item.category || "Otros"),
        sellPrice:
          typeof item.sellPrice === "number" ? item.sellPrice : null,
        estimatedIngredients: Array.isArray(item.estimatedIngredients)
          ? (item.estimatedIngredients as Record<string, unknown>[]).map(
              (ing) => ({
                name: String(ing.name || ""),
                estimatedQuantity: Number(ing.estimatedQuantity) || 0,
                unit: String(ing.unit || "pza"),
              })
            )
          : [],
      };
    });

    return NextResponse.json({ dishes });
  } catch (err) {
    console.error("Menu import error:", err);
    return NextResponse.json(
      {
        error: true,
        message: "Error inesperado al procesar el menú.",
      },
      { status: 500 }
    );
  }
}
