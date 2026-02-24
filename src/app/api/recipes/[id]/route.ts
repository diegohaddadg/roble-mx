// app/api/recipes/[id]/route.ts
// GET single recipe, PUT update, DELETE (soft)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRecipeSchema } from "@/lib/validations";

// ─── GET: Single recipe with full costing breakdown ────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: {
              include: {
                priceHistory: {
                  orderBy: { date: "desc" },
                  take: 10,
                },
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Receta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Get recipe error:", error);
    return NextResponse.json(
      { error: "Error al obtener receta" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update recipe ────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawBody = await request.json();
    const parseResult = updateRecipeSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    const updated = await prisma.$transaction(async (tx) => {
      // Update recipe fields
      const recipe = await tx.recipe.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.sellPrice !== undefined && { sellPrice: body.sellPrice }),
          ...(body.yield !== undefined && { yield: body.yield }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      // If items provided, replace all recipe items
      if (body.items) {
        await tx.recipeItem.deleteMany({ where: { recipeId: id } });
        await tx.recipeItem.createMany({
          data: body.items.map((item) => ({
            recipeId: id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        });
      }

      return tx.recipe.findUnique({
        where: { id },
        include: { items: { include: { ingredient: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update recipe error:", error);
    return NextResponse.json(
      { error: "Error al actualizar receta" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Soft delete (set isActive = false) ────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.recipe.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recipe error:", error);
    return NextResponse.json(
      { error: "Error al eliminar receta" },
      { status: 500 }
    );
  }
}
