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

function formatMoney(val: number | null): string {
  if (val === null) return "—";
  return `$${Number(val).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PriceChange({ changePercent, hasPrevious }: { changePercent: number; hasPrevious: boolean }) {
  if (!hasPrevious || changePercent === 0) {
    return <span className="text-xs text-zinc-300">—</span>;
  }
  const up = changePercent > 0;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        up ? "text-[var(--danger)]" : "text-[var(--success)]"
      }`}
    >
      {up ? "↑" : "↓"}
      {up ? "+" : ""}
      {changePercent}%
    </span>
  );
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
      {category}
    </span>
  );
}

/* ── Skeletons ── */

function DesktopSkeleton() {
  return (
    <div className="hidden md:block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden animate-pulse">
      <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
        <div className="col-span-2"><div className="h-3 w-16 bg-[var(--border)] rounded" /></div>
        <div className="col-span-2"><div className="h-3 w-16 bg-[var(--border)] rounded" /></div>
        <div className="col-span-2"><div className="h-3 w-16 bg-[var(--border)] rounded" /></div>
        <div className="col-span-1"><div className="h-3 w-12 bg-[var(--border)] rounded" /></div>
        <div className="col-span-2"><div className="h-3 w-16 bg-[var(--border)] rounded" /></div>
        <div className="col-span-1"><div className="h-3 w-12 bg-[var(--border)] rounded" /></div>
        <div className="col-span-2"><div className="h-3 w-16 bg-[var(--border)] rounded" /></div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-[var(--border-light)] last:border-0"
        >
          <div className="col-span-2"><div className="h-4 w-24 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-2"><div className="h-4 w-20 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-2"><div className="h-4 w-16 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-1 flex justify-center"><div className="h-4 w-8 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-2 flex justify-end"><div className="h-4 w-14 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-1 flex justify-end"><div className="h-4 w-10 bg-[var(--border-light)] rounded" /></div>
          <div className="col-span-2 flex justify-end"><div className="h-4 w-6 bg-[var(--border-light)] rounded" /></div>
        </div>
      ))}
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div className="md:hidden space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-[var(--border-light)] rounded" />
            <div className="h-4 w-16 bg-[var(--border-light)] rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-[var(--border-light)] rounded-full" />
            <div className="h-5 w-10 bg-[var(--border-light)] rounded" />
          </div>
          <div className="h-8 w-full bg-[var(--border-light)] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function IngredientsPage() {
  const { restaurantId } = useRestaurant();
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ingRes, supRes] = await Promise.all([
        fetch(`/api/ingredients?restaurantId=${restaurantId}`),
        fetch(`/api/suppliers?restaurantId=${restaurantId}`),
      ]);
      if (!ingRes.ok || !supRes.ok) throw new Error("Error al cargar datos");
      const ingData = await ingRes.json();
      const supData = await supRes.json();
      setIngredients(Array.isArray(ingData) ? ingData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error("Load ingredients error:", err);
      setError("No pudimos cargar tus ingredientes. Revisa tu conexión e intenta de nuevo.");
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

  const hasFilters = search !== "" || category !== "Todas";
  const isEmptyState = !isLoading && !error && ingredients.length === 0;
  const isNoResults = !isLoading && !error && ingredients.length > 0 && filtered.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Ingredientes
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Todos los insumos de tu restaurante, sus precios y recetas vinculadas
        </p>
      </div>

      {/* Filters */}
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

      {/* Error state */}
      {error && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            Algo salió mal
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
            {error}
          </p>
          <button
            onClick={load}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <>
          <DesktopSkeleton />
          <MobileSkeleton />
        </>
      )}

      {/* Empty state: no ingredients at all */}
      {isEmptyState && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            No tienes ingredientes aún
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
            Tus ingredientes se crean solos al escanear facturas
          </p>
          <Link
            href="/scanner"
            className="inline-flex px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
          >
            Escanear factura →
          </Link>
        </div>
      )}

      {/* Empty state: filters returned 0 */}
      {isNoResults && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--border-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            Sin resultados
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Intenta con otro término de búsqueda o categoría
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("Todas");
              }}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Data table / cards */}
      {!isLoading && !error && filtered.length > 0 && (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
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
                <SortHeader label="Precio" field="currentPrice" className="justify-end" />
              </div>
              <div className="col-span-1 text-right">
                <SortHeader label="Cambio" field="changePercent" className="justify-end" />
              </div>
              <div className="col-span-2 text-right">
                <SortHeader label="Recetas" field="recipesCount" className="justify-end" />
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
                  {formatMoney(ing.currentPrice)}
                </div>
                <div className="col-span-1 text-right">
                  <PriceChange changePercent={ing.changePercent} hasPrevious={ing.previousPrice !== null} />
                </div>
                <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                  {ing.recipesCount}
                </div>
              </div>
            ))}
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((ing) => (
              <div
                key={ing.id}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 space-y-3"
              >
                {/* Row 1: Name + Price */}
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/ingredients/${ing.id}`}
                    className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)] transition-colors leading-tight"
                  >
                    {ing.name}
                  </Link>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                      {formatMoney(ing.currentPrice)}
                    </span>
                    <div>
                      <PriceChange changePercent={ing.changePercent} hasPrevious={ing.previousPrice !== null} />
                    </div>
                  </div>
                </div>

                {/* Row 2: Category pill + Unit + Recipes */}
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryPill category={ing.category} />
                  <span className="text-xs text-[var(--muted)]">{ing.unit}</span>
                  <span className="text-xs text-[var(--muted)] ml-auto">
                    {ing.recipesCount} receta{ing.recipesCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Row 3: Supplier dropdown (full width) */}
                <select
                  value={ing.preferredSupplierId ?? ""}
                  onChange={(e) =>
                    handleSupplierChange(ing.id, e.target.value || null)
                  }
                  className={`${inputClass} w-full text-xs`}
                >
                  <option value="">Proveedor: —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Supplier hint */}
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

      {/* Count */}
      {!isLoading && !error && ingredients.length > 0 && (
        <p className="text-xs text-[var(--muted)] text-center">
          {filtered.length} de {ingredients.length} ingrediente
          {ingredients.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
