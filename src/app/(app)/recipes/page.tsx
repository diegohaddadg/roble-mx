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

function getFoodCostBg(pct: number) {
  if (pct <= 28) return "bg-[var(--success-light)] text-[var(--success)]";
  if (pct <= 35) return "bg-[var(--warning-light)] text-[var(--warning)]";
  return "bg-[var(--danger-light)] text-[var(--danger)]";
}

const money = (val: number) =>
  `$${val.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RecipesPage() {
  const { restaurantId } = useRestaurant();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch {
      setError("No se pudo cargar la lista de recetas");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Header (shared across states) ── */
  const header = (
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
  );

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-[var(--border-light)] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-[var(--border-light)] rounded w-1/3" />
                </div>
                <div className="h-5 bg-[var(--border-light)] rounded-full w-14 ml-4" />
              </div>
              <div className="flex gap-4 mt-3">
                <div className="h-3 bg-[var(--border-light)] rounded w-16" />
                <div className="h-3 bg-[var(--border-light)] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--danger)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (recipes.length === 0) {
    return (
      <div className="space-y-6">
        {header}
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
            Agrega platillos para ver tu costo real
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Crea tu primera receta y calcula el costo de materia prima automáticamente
          </p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
          >
            Crear receta
          </Link>
        </div>
      </div>
    );
  }

  /* ── Data list ── */
  return (
    <div className="space-y-6">
      {header}

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
          <div className="col-span-4">Platillo</div>
          <div className="col-span-2 text-right">Venta</div>
          <div className="col-span-2 text-right">Costo MP</div>
          <div className="col-span-2 text-right">Margen</div>
          <div className="col-span-2 text-right">% Costo</div>
        </div>
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors group"
          >
            <div className="col-span-4">
              <div className="text-sm font-medium text-[var(--text)] truncate">
                {r.name}
              </div>
              {r.category && (
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {r.category}
                </div>
              )}
            </div>
            <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
              {money(r.sellPrice)}
            </div>
            <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
              {money(r.costPerPortion)}
            </div>
            <div className="col-span-2 text-right text-sm font-medium text-[var(--success)] tabular-nums">
              {money(r.margin)}
            </div>
            <div className="col-span-2 text-right">
              <span
                className={`text-sm font-bold tabular-nums ${getFoodCostColor(r.foodCostPercent)}`}
              >
                {r.foodCostPercent}%
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">
                  {r.name}
                </p>
                {r.category && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {r.category}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${getFoodCostBg(r.foodCostPercent)}`}
              >
                {r.foodCostPercent}%
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-[var(--border-light)]">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Venta
                </p>
                <p className="text-sm font-medium text-[var(--text)] tabular-nums">
                  {money(r.sellPrice)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Costo
                </p>
                <p className="text-sm font-medium text-[var(--text)] tabular-nums">
                  {money(r.costPerPortion)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Margen
                </p>
                <p className="text-sm font-medium text-[var(--success)] tabular-nums">
                  {money(r.margin)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
