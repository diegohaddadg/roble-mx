"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface IngredientRow {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentPrice: number | null;
  previousPrice: number | null;
  changePercent: number;
  recipesCount: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Todas",
  "Proteínas",
  "Verduras",
  "Lácteos",
  "Básicos",
  "Abarrotes",
  "Frutas",
] as const;

type SortKey = "name" | "currentPrice" | "changePercent" | "recipesCount";
type SortDir = "asc" | "desc";

const inputClass =
  "px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

export default function IngredientsPage() {
  const { restaurantId } = useRestaurant();
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const [ingRes, supRes] = await Promise.all([
        fetch(`/api/ingredients?restaurantId=${restaurantId}`),
        fetch(`/api/suppliers?restaurantId=${restaurantId}`),
      ]);
      const ingData = await ingRes.json();
      const supData = await supRes.json();
      setIngredients(Array.isArray(ingData) ? ingData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error("Load ingredients error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSupplierChange = async (
    ingredientId: string,
    supplierId: string | null
  ) => {
    if (!restaurantId) return;
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === ingredientId
          ? {
              ...i,
              preferredSupplierId: supplierId,
              preferredSupplierName:
                suppliers.find((s) => s.id === supplierId)?.name ?? null,
            }
          : i
      )
    );
    try {
      await fetch(
        `/api/ingredients/${ingredientId}/preferred-supplier?restaurantId=${restaurantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferredSupplierId: supplierId || null,
          }),
        }
      );
    } catch (err) {
      console.error("Update supplier error:", err);
      await load();
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let list = ingredients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (category !== "Todas") {
      list = list.filter((i) => i.category === category);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "currentPrice":
          cmp = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
          break;
        case "changePercent":
          cmp = a.changePercent - b.changePercent;
          break;
        case "recipesCount":
          cmp = a.recipesCount - b.recipesCount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [ingredients, search, category, sortKey, sortDir]);

  const SortHeader = ({
    label,
    field,
    className,
  }: {
    label: string;
    field: SortKey;
    className?: string;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
        sortKey === field
          ? "text-[var(--primary)]"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      } ${className ?? ""}`}
    >
      {label}
      {sortKey === field && (
        <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Ingredientes
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Todos los insumos de tu restaurante, sus precios y recetas vinculadas
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          className={`${inputClass} flex-1`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputClass} w-full sm:w-44`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[var(--card)] rounded-xl border border-[var(--border-light)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            {ingredients.length === 0
              ? "No tienes ingredientes aún"
              : "Sin resultados"}
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            {ingredients.length === 0
              ? "Escanea una factura para registrar tus primeros ingredientes"
              : "Intenta con otro término de búsqueda o categoría"}
          </p>
          {ingredients.length === 0 && (
            <Link
              href="/scanner"
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              Escanear factura →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <div className="col-span-2">
              <SortHeader label="Nombre" field="name" />
            </div>
            <div className="col-span-2">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Proveedor
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Categoría
              </span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Unidad
              </span>
            </div>
            <div className="col-span-2 text-right">
              <SortHeader
                label="Precio"
                field="currentPrice"
                className="justify-end"
              />
            </div>
            <div className="col-span-1 text-right">
              <SortHeader
                label="Cambio"
                field="changePercent"
                className="justify-end"
              />
            </div>
            <div className="col-span-2 text-right">
              <SortHeader
                label="Recetas"
                field="recipesCount"
                className="justify-end"
              />
            </div>
          </div>

          {filtered.map((ing) => (
            <div
              key={ing.id}
              className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors items-center"
            >
              <Link
                href={`/ingredients/${ing.id}`}
                className="col-span-2 text-sm font-medium text-[var(--text)] truncate hover:text-[var(--primary)] transition-colors"
              >
                {ing.name}
              </Link>
              <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                <select
                  value={ing.preferredSupplierId ?? ""}
                  onChange={(e) =>
                    handleSupplierChange(ing.id, e.target.value || null)
                  }
                  className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[var(--border)] rounded-lg text-xs text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-ring)] transition-colors cursor-pointer truncate"
                >
                  <option value="">—</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 text-sm text-[var(--muted)] truncate">
                {ing.category ?? "—"}
              </div>
              <div className="col-span-1 text-center text-sm text-[var(--muted)]">
                {ing.unit}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                {ing.currentPrice !== null
                  ? `$${ing.currentPrice.toFixed(2)}`
                  : "—"}
              </div>
              <div className="col-span-1 text-right">
                {ing.previousPrice !== null && ing.changePercent !== 0 ? (
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      ing.changePercent > 0
                        ? "text-[var(--danger)]"
                        : "text-[var(--success)]"
                    }`}
                  >
                    {ing.changePercent > 0 ? "↑" : "↓"}
                    {ing.changePercent > 0 ? "+" : ""}
                    {ing.changePercent}%
                  </span>
                ) : (
                  <span className="text-xs text-zinc-300">—</span>
                )}
              </div>
              <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                {ing.recipesCount}
              </div>
            </div>
          ))}
        </div>
      )}

      {suppliers.length === 0 && ingredients.length > 0 && (
        <p className="text-xs text-[var(--muted)] text-center">
          Los proveedores se crean automáticamente al confirmar facturas, o
          puedes{" "}
          <Link
            href="/suppliers"
            className="text-[var(--primary)] hover:underline"
          >
            crear uno manualmente
          </Link>
          .
        </p>
      )}

      <p className="text-xs text-[var(--muted)] text-center">
        {filtered.length} de {ingredients.length} ingrediente
        {ingredients.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
