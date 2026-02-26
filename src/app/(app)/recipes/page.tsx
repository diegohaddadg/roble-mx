"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

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
  estimatedFromMenu?: boolean;
}

interface ScannedDish {
  name: string;
  category: string;
  sellPrice: number | null;
  estimatedIngredients: {
    name: string;
    estimatedQuantity: number;
    unit: string;
  }[];
  selected: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */

const money = (val: number) =>
  `$${val.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

/* ═══════════════════════════════════════════════════════════════
   MENU SCANNER COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type ScannerStep = "idle" | "scanning" | "review" | "importing" | "done";

function MenuScanner({
  restaurantId,
  onComplete,
  onCancel,
}: {
  restaurantId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<ScannerStep>("idle");
  const [dishes, setDishes] = useState<ScannedDish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStep("scanning");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/recipes/import-menu", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.message || "Error al escanear el menú.");
        setStep("idle");
        return;
      }

      if (!Array.isArray(json.dishes) || json.dishes.length === 0) {
        setError("No se encontraron platillos en la imagen.");
        setStep("idle");
        return;
      }

      setDishes(
        json.dishes.map(
          (d: Omit<ScannedDish, "selected">) => ({
            ...d,
            selected: true,
          })
        )
      );
      setStep("review");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setStep("idle");
    }
  };

  const handleImport = async () => {
    const selected = dishes.filter((d) => d.selected);
    if (selected.length === 0) return;

    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/recipes/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          dishes: selected.map((d) => ({
            name: d.name,
            category: d.category,
            sellPrice: d.sellPrice,
            estimatedIngredients: d.estimatedIngredients,
          })),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error al importar.");
        setStep("review");
        return;
      }

      setImportResult({ created: json.created });
      setStep("done");
    } catch {
      setError("Error de conexión.");
      setStep("review");
    }
  };

  const toggleDish = (i: number) => {
    setDishes((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, selected: !d.selected } : d
      )
    );
  };

  const updateDishName = (i: number, name: string) => {
    setDishes((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, name } : d))
    );
  };

  const updateDishPrice = (i: number, price: string) => {
    setDishes((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? { ...d, sellPrice: price ? parseFloat(price) : null }
          : d
      )
    );
  };

  const selectedCount = dishes.filter((d) => d.selected).length;

  /* ── IDLE: upload prompt ── */
  if (step === "idle") {
    return (
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-6 text-center">
        <div className="w-16 h-16 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📸</span>
        </div>
        <h3 className="text-lg font-bold text-[var(--text)] mb-2">
          Escanear menú
        </h3>
        <p className="text-sm text-[var(--muted)] mb-5 max-w-sm mx-auto">
          Sube una foto de tu menú y la IA detectará los platillos con precios e
          ingredientes estimados
        </p>

        {error && (
          <div className="bg-[var(--danger-light)] text-[var(--danger)] text-sm rounded-xl p-3 mb-4 max-w-sm mx-auto">
            {error}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-6 py-3 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
          >
            Subir imagen del menú
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  /* ── SCANNING: loading ── */
  if (step === "scanning") {
    return (
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-8 text-center">
        <div className="w-12 h-12 border-4 border-[var(--primary-light)] border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text)] mb-1">
          Analizando tu menú...
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Detectando platillos, precios e ingredientes
        </p>
      </div>
    );
  }

  /* ── REVIEW: edit dishes ── */
  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">
              {dishes.length} platillos detectados
            </h3>
            <p className="text-sm text-[var(--muted)]">
              Revisa y edita antes de importar
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Cancelar
          </button>
        </div>

        {error && (
          <div className="bg-[var(--danger-light)] text-[var(--danger)] text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {dishes.map((dish, i) => (
            <div
              key={i}
              className={`bg-[var(--card)] rounded-xl border p-4 transition-colors ${
                dish.selected
                  ? "border-[var(--primary)]/30 bg-[var(--primary-light)]/20"
                  : "border-[var(--border-light)] opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={dish.selected}
                  onChange={() => toggleDish(i)}
                  className="mt-1 shrink-0 w-4 h-4 rounded accent-[var(--primary)]"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={dish.name}
                      onChange={(e) => updateDishName(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-[var(--muted)]">$</span>
                      <input
                        type="number"
                        value={dish.sellPrice ?? ""}
                        onChange={(e) => updateDishPrice(i, e.target.value)}
                        placeholder="Precio"
                        className="w-24 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-medium text-[var(--muted)] bg-[var(--border-light)] px-2 py-0.5 rounded-full">
                      {dish.category}
                    </span>
                    {dish.estimatedIngredients.slice(0, 4).map((ing, j) => (
                      <span
                        key={j}
                        className="text-[10px] text-[var(--muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full"
                      >
                        {ing.name}
                      </span>
                    ))}
                    {dish.estimatedIngredients.length > 4 && (
                      <span className="text-[10px] text-[var(--muted)]">
                        +{dish.estimatedIngredients.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleImport}
            disabled={selectedCount === 0}
            className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            Importar {selectedCount} platillo{selectedCount !== 1 ? "s" : ""}
          </button>
          <button
            onClick={() => {
              setDishes((prev) =>
                prev.map((d) => ({ ...d, selected: !prev.every((p) => p.selected) }))
              );
            }}
            className="px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            {dishes.every((d) => d.selected)
              ? "Deseleccionar todos"
              : "Seleccionar todos"}
          </button>
        </div>
      </div>
    );
  }

  /* ── IMPORTING ── */
  if (step === "importing") {
    return (
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-8 text-center">
        <div className="w-12 h-12 border-4 border-[var(--primary-light)] border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text)] mb-1">
          Importando platillos...
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Creando recetas e ingredientes
        </p>
      </div>
    );
  }

  /* ── DONE ── */
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-6 text-center">
      <div className="w-16 h-16 bg-[var(--success-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-[var(--success)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[var(--text)] mb-2">
        ¡{importResult?.created ?? 0} platillos importados!
      </h3>
      <p className="text-sm text-[var(--muted)] mb-5">
        Las recetas se crearon con ingredientes estimados. Puedes ajustarlos
        después.
      </p>
      <button
        onClick={onComplete}
        className="px-6 py-3 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
      >
        Ver mis recetas
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN RECIPES PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function RecipesPage() {
  const { restaurantId } = useRestaurant();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

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

  /* ── Scanner mode ── */
  if (showScanner) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Escanear menú
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Importa platillos automáticamente desde una foto de tu menú
          </p>
        </div>
        <MenuScanner
          restaurantId={restaurantId}
          onComplete={() => {
            setShowScanner(false);
            load();
          }}
          onCancel={() => setShowScanner(false)}
        />
      </div>
    );
  }

  /* ── Header ── */
  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Recetas
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Costeo de materia prima por platillo
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowScanner(true)}
          className="px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary-light)]/80 rounded-xl transition-colors active:scale-[0.98]"
        >
          📸 Escanear menú
        </button>
        <Link
          href="/recipes/new"
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
        >
          + Nueva receta
        </Link>
      </div>
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
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-center py-16">
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

  /* ── Empty ── */
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
          <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
            Escanea tu menú o crea recetas manualmente
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowScanner(true)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
            >
              📸 Escanear menú
            </button>
            <Link
              href="/recipes/new"
              className="px-5 py-2.5 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] rounded-xl transition-colors text-center"
            >
              Crear manualmente
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Recipe list ── */
  return (
    <div className="space-y-6">
      {header}

      {/* ── Mobile cards ── */}
      <div className="space-y-3">
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {r.name}
                  </p>
                  {r.estimatedFromMenu && (
                    <span className="shrink-0 text-[10px] font-medium text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded">
                      Estimado
                    </span>
                  )}
                </div>
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
