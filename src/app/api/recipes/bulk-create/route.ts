import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface DishInput {
  name: string;
  category: string;
  sellPrice: number | null;
  estimatedIngredients: {
    name: string;
    estimatedQuantity: number;
    unit: string;
  }[];
}

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = {
    kilogramos: "kg",
    kilogramo: "kg",
    kilos: "kg",
    kilo: "kg",
    gramos: "g",
    gramo: "g",
    litros: "L",
    litro: "L",
    mililitros: "ml",
    mililitro: "ml",
    piezas: "pza",
    pieza: "pza",
  };
  const lower = unit.toLowerCase().trim();
  return map[lower] ?? lower;
}

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, dishes } = body as {
      restaurantId: string;
      dishes: DishInput[];
    };

    if (!restaurantId || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { error: "restaurantId y dishes[] son requeridos" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 400 }
      );
    }

    const existingIngredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
    });

    const ingredientMap = new Map<string, string>();
    for (const ing of existingIngredients) {
      ingredientMap.set(normalizeIngredientName(ing.name), ing.id);
    }

    const createdRecipes: { id: string; name: string }[] = [];

    for (const dish of dishes) {
      if (!dish.name?.trim()) continue;

      const recipeItemsData: {
        ingredientId: string;
        quantity: number;
        unit: string;
      }[] = [];

      for (const estIng of dish.estimatedIngredients) {
        if (!estIng.name?.trim()) continue;

        const normalizedName = normalizeIngredientName(estIng.name);
        let ingredientId = ingredientMap.get(normalizedName);

        if (!ingredientId) {
          // Fuzzy: check if existing name starts with or contains
          for (const [existingNorm, existingId] of ingredientMap.entries()) {
            if (
              existingNorm.includes(normalizedName) ||
              normalizedName.includes(existingNorm)
            ) {
              ingredientId = existingId;
              break;
            }
          }
        }

        if (!ingredientId) {
          const newIngredient = await prisma.ingredient.create({
            data: {
              name: estIng.name.trim(),
              unit: normalizeUnit(estIng.unit),
              restaurantId,
            },
          });
          ingredientId = newIngredient.id;
          ingredientMap.set(normalizedName, ingredientId);
        }

        recipeItemsData.push({
          ingredientId,
          quantity: estIng.estimatedQuantity || 0.1,
          unit: normalizeUnit(estIng.unit),
        });
      }

      const recipe = await prisma.recipe.create({
        data: {
          name: dish.name.trim(),
          category: dish.category || null,
          sellPrice: dish.sellPrice ?? 0,
          yield: 1,
          estimatedFromMenu: true,
          restaurantId,
          items: {
            create: recipeItemsData.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              unit: item.unit,
            })),
          },
        },
        select: { id: true, name: true },
      });

      createdRecipes.push(recipe);
    }

    return NextResponse.json({
      created: createdRecipes.length,
      recipes: createdRecipes,
    });
  } catch (err) {
    console.error("Bulk create recipes error:", err);
    return NextResponse.json(
      { error: "Error al crear recetas" },
      { status: 500 }
    );
  }
}
