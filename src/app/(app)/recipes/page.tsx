"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface RecipeListItem {
  id: string;
  name: string;
  category: string | null;
  sellPrice: number;
  totalFoodCost: number;
  costPerPortion: number;
  margin: number;
  marginPercent: number;
  foodCostPercent: number;
}

function getFoodCostColor(pct: number) {
  if (pct <= 28) return "text-emerald-600";
  if (pct <= 35) return "text-amber-600";
  return "text-red-600";
}

export default function RecipesPage() {
  const { restaurantId } = useRestaurant();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/recipes?restaurantId=${restaurantId}`);
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error("Load recipes error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Recetas</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Costeo de materia prima por platillo
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-sm"
        >
          + Nueva receta
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🍳</div>
          <h3 className="font-semibold text-zinc-700 mb-1">
            No tienes recetas aún
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Agrega tus platillos para ver el costo real de cada uno
          </p>
          <Link
            href="/recipes/new"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Crear primera receta →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-zinc-50 text-xs font-medium text-zinc-500 uppercase tracking-wide border-b border-zinc-200">
            <div className="col-span-4">Platillo</div>
            <div className="col-span-2 text-right">Venta</div>
            <div className="col-span-2 text-right">Costo MP</div>
            <div className="col-span-2 text-right">Margen</div>
            <div className="col-span-2 text-right">% Costo</div>
          </div>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
            >
              <div className="col-span-4">
                <div className="text-sm font-medium text-zinc-800">
                  {recipe.name}
                </div>
                {recipe.category && (
                  <div className="text-xs text-zinc-400">{recipe.category}</div>
                )}
              </div>
              <div className="col-span-2 text-right text-sm text-zinc-700">
                ${recipe.sellPrice.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm text-zinc-700">
                ${recipe.costPerPortion.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-emerald-600">
                ${recipe.margin.toFixed(2)}
              </div>
              <div className="col-span-2 text-right">
                <span
                  className={`text-sm font-bold ${getFoodCostColor(recipe.foodCostPercent)}`}
                >
                  {recipe.foodCostPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
