// app/api/recipes/route.ts
// List recipes with calculated costs + Create new recipe

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRecipeSchema, paginationSchema } from "@/lib/validations";
import { Decimal } from "@prisma/client/runtime/library";

// ─── GET: List recipes with calculated food cost ───────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = paginationSchema.safeParse({
      restaurantId: searchParams.get("restaurantId"),
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { restaurantId, cursor, limit } = parseResult.data;

    const recipes = await prisma.recipe.findMany({
      where: { restaurantId, isActive: true },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    // Calculate food cost and margins for each recipe
    const recipesWithCosts = recipes.map((recipe) => {
      const foodCost = recipe.items.reduce((sum, item) => {
        const ingredientPrice = item.ingredient.currentPrice
          ? Number(item.ingredient.currentPrice)
          : 0;
        return sum + Number(item.quantity) * ingredientPrice;
      }, 0);

      const sellPrice = recipe.sellPrice ? Number(recipe.sellPrice) : 0;
      const costPerPortion = recipe.yield > 0 ? foodCost / recipe.yield : foodCost;
      const margin = sellPrice > 0 ? sellPrice - costPerPortion : 0;
      const marginPercent = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
      const foodCostPercent = sellPrice > 0 ? (costPerPortion / sellPrice) * 100 : 0;

      return {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        sellPrice,
        yield: recipe.yield,
        isActive: recipe.isActive,
        items: recipe.items.map((item) => ({
          id: item.id,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.name,
          ingredientCategory: item.ingredient.category,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: item.ingredient.currentPrice
            ? Number(item.ingredient.currentPrice)
            : 0,
          itemCost:
            Number(item.quantity) *
            (item.ingredient.currentPrice
              ? Number(item.ingredient.currentPrice)
              : 0),
        })),
        // ─── Calculated cost fields ───
        totalFoodCost: Math.round(foodCost * 100) / 100,
        costPerPortion: Math.round(costPerPortion * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      };
    });

    // Sort by margin percent ascending (worst performers first for dashboard)
    const nextCursor =
      recipes.length === limit ? recipes[recipes.length - 1].id : null;

    return NextResponse.json({
      recipes: recipesWithCosts,
      nextCursor,
    });
  } catch (error) {
    console.error("List recipes error:", error);
    return NextResponse.json(
      { error: "Error al obtener recetas" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new recipe ─────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = createRecipeSchema.safeParse(rawBody);

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

    // Verify all ingredients exist and belong to this restaurant
    const ingredientIds = body.items.map((i) => i.ingredientId);
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        restaurantId: body.restaurantId,
      },
    });

    if (ingredients.length !== ingredientIds.length) {
      return NextResponse.json(
        { error: "Uno o más ingredientes no fueron encontrados" },
        { status: 400 }
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: body.name,
        category: body.category || null,
        sellPrice: body.sellPrice,
        yield: body.yield,
        restaurantId: body.restaurantId,
        items: {
          create: body.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Create recipe error:", error);
    return NextResponse.json(
      { error: "Error al crear receta" },
      { status: 500 }
    );
  }
}
