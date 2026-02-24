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
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Recetas
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Costeo de materia prima por platillo
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
        >
          + Nueva receta
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-white rounded-xl border border-zinc-100"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-zinc-700 mb-1">
            No tienes recetas aún
          </h3>
          <p className="text-sm text-zinc-500 mb-5">
            Agrega tus platillos para ver el costo real de cada uno
          </p>
          <Link
            href="/recipes/new"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Crear primera receta →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-zinc-50/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
            <div className="col-span-4">Platillo</div>
            <div className="col-span-2 text-right">Venta</div>
            <div className="col-span-2 text-right">Costo MP</div>
            <div className="col-span-2 text-right">Margen</div>
            <div className="col-span-2 text-right">% Costo</div>
          </div>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors"
            >
              <div className="col-span-4">
                <div className="text-sm font-medium text-zinc-800">
                  {recipe.name}
                </div>
                {recipe.category && (
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {recipe.category}
                  </div>
                )}
              </div>
              <div className="col-span-2 text-right text-sm text-zinc-600 tabular-nums">
                ${recipe.sellPrice.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm text-zinc-600 tabular-nums">
                ${recipe.costPerPortion.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-emerald-600 tabular-nums">
                ${recipe.margin.toFixed(2)}
              </div>
              <div className="col-span-2 text-right">
                <span
                  className={`text-sm font-bold tabular-nums ${getFoodCostColor(recipe.foodCostPercent)}`}
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
