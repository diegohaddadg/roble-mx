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
  if (pct <= 28) return "text-[var(--success)]";
  if (pct <= 35) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
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
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Recetas
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Costeo de materia prima por platillo
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
        >
          + Nueva receta
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[var(--card)] rounded-xl border border-[var(--border-light)]"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--border-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--muted)]"
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
          <h3 className="font-semibold text-[var(--text)] mb-1">
            No tienes recetas aún
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Agrega tus platillos para ver el costo real de cada uno
          </p>
          <Link
            href="/recipes/new"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
          >
            Crear primera receta →
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
            <div className="col-span-4">Platillo</div>
            <div className="col-span-2 text-right">Venta</div>
            <div className="col-span-2 text-right">Costo MP</div>
            <div className="col-span-2 text-right">Margen</div>
            <div className="col-span-2 text-right">% Costo</div>
          </div>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors"
            >
              <div className="col-span-4">
                <div className="text-sm font-medium text-[var(--text)]">
                  {recipe.name}
                </div>
                {recipe.category && (
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {recipe.category}
                  </div>
                )}
              </div>
              <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                ${recipe.sellPrice.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                ${recipe.costPerPortion.toFixed(2)}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-[var(--success)] tabular-nums">
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
