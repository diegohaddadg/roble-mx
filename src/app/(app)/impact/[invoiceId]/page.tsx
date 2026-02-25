"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";
import type { RecipeImpactResult, Suggestion } from "@/lib/impact";
import { buildWhatsAppSummary } from "@/lib/impact";

interface IngredientImpact {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  recipesAffected: {
    recipeId: string;
    recipeName: string;
    sellPrice: number;
    oldFoodCost: number;
    newFoodCost: number;
    oldMarginPercent: number;
    newMarginPercent: number;
  }[];
}

interface ImpactResponse {
  ingredientsAffected: IngredientImpact[];
  recipeImpacts: RecipeImpactResult[];
  suggestions: Suggestion[];
  summary: {
    totalRecipesAffected: number;
    oldAvgFoodCostPercent: number;
    newAvgFoodCostPercent: number;
  };
}

export default function ImpactPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const { restaurantId } = useRestaurant();
  const router = useRouter();
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    fetch(`/api/invoices/${invoiceId}/impact?restaurantId=${restaurantId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [invoiceId, restaurantId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--muted)]">
          Calculando impacto en tus platillos...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← Volver
        </button>
      </div>
    );
  }

  if (
    !data ||
    !data.ingredientsAffected ||
    data.ingredientsAffected.length === 0
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-[var(--success-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--success)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--text)] mb-1">
            Sin cambios de precio relevantes
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            En esta factura no hubo cambios que afecten tus recetas (o aún no
            hay historial).
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/scanner"
              className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
            >
              Escanear otra factura
            </Link>
            <Link
              href={`/invoices/${invoiceId}`}
              className="px-6 py-2.5 text-sm font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
            >
              Ver factura →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { ingredientsAffected, recipeImpacts, suggestions, summary } = data;
  const avgDelta =
    summary.newAvgFoodCostPercent - summary.oldAvgFoodCostPercent;
  const avgWorsened = avgDelta > 0;

  const handleCopy = async () => {
    const text = buildWhatsAppSummary(
      ingredientsAffected.map((i) => ({
        name: i.ingredientName,
        oldPrice: i.oldPrice,
        newPrice: i.newPrice,
        changePercent: i.changePercent,
        unit: i.unit,
      })),
      recipeImpacts ?? [],
      suggestions ?? []
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-[var(--primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Impacto en tus platillos
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {ingredientsAffected.length} precio
          {ingredientsAffected.length !== 1 ? "s" : ""} cambiaron ·{" "}
          {summary.totalRecipesAffected} platillo
          {summary.totalRecipesAffected !== 1 ? "s" : ""} afectado
          {summary.totalRecipesAffected !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Ingredient cards */}
      <div className="space-y-4">
        {ingredientsAffected.map((ing) => {
          const priceUp = ing.newPrice > ing.oldPrice;
          return (
            <div
              key={ing.ingredientId}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-light)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {ing.ingredientName}
                  </span>
                  <span className="text-xs text-[var(--muted)] ml-1.5">
                    /{ing.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--muted)] tabular-nums">
                    ${ing.oldPrice.toFixed(2)}
                  </span>
                  <span className="text-zinc-300">→</span>
                  <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                    ${ing.newPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      priceUp
                        ? "bg-[var(--danger-light)] text-[var(--danger)]"
                        : "bg-[var(--success-light)] text-[var(--success)]"
                    }`}
                  >
                    {priceUp ? "+" : ""}
                    {ing.changePercent}%
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[var(--border-light)]">
                {ing.recipesAffected.map((recipe) => {
                  const marginDrop =
                    recipe.newMarginPercent < recipe.oldMarginPercent;
                  const marginImproved =
                    recipe.newMarginPercent > recipe.oldMarginPercent;
                  return (
                    <div
                      key={recipe.recipeId}
                      className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="text-sm font-medium text-[var(--text)]">
                        {recipe.recipeName}
                        {marginDrop && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--danger-light)] text-[var(--danger)]">
                            Empeoró
                          </span>
                        )}
                        {marginImproved && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--success-light)] text-[var(--success)]">
                            Mejoró
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide mb-0.5">
                            Costo MP
                          </div>
                          <div className="tabular-nums text-[var(--text)]">
                            <span className="text-[var(--muted)]">
                              ${recipe.oldFoodCost.toFixed(2)}
                            </span>
                            {" → "}
                            <span className="font-medium">
                              ${recipe.newFoodCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide mb-0.5">
                            Margen
                          </div>
                          <div className="tabular-nums">
                            <span className="text-[var(--muted)]">
                              {recipe.oldMarginPercent}%
                            </span>
                            {" → "}
                            <span
                              className={`font-bold ${
                                marginDrop
                                  ? "text-[var(--danger)]"
                                  : marginImproved
                                    ? "text-[var(--success)]"
                                    : "text-[var(--text)]"
                              }`}
                            >
                              {recipe.newMarginPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary card */}
      <div
        className={`rounded-2xl border p-5 ${
          avgWorsened
            ? "bg-[var(--danger-light)] border-[var(--danger)]/20"
            : "bg-[var(--success-light)] border-[var(--success)]/20"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {summary.totalRecipesAffected} platillo
              {summary.totalRecipesAffected !== 1 ? "s" : ""} afectado
              {summary.totalRecipesAffected !== 1 ? "s" : ""}
            </div>
            <div className="text-sm text-[var(--muted)] mt-0.5">
              Costo promedio MP:{" "}
              <span className="font-medium tabular-nums">
                {summary.oldAvgFoodCostPercent}%
              </span>
              {" → "}
              <span
                className={`font-bold tabular-nums ${
                  avgWorsened
                    ? "text-[var(--danger)]"
                    : "text-[var(--success)]"
                }`}
              >
                {summary.newAvgFoodCostPercent}%
              </span>
            </div>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              avgWorsened ? "text-[var(--danger)]" : "text-[var(--success)]"
            }`}
          >
            {avgDelta > 0 ? "+" : ""}
            {avgDelta.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Acciones sugeridas
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {suggestions.map((s, i) => (
              <div key={i} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                <span className="shrink-0 mt-0.5">
                  {s.type === "raise_price" && (
                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold">
                      $
                    </span>
                  )}
                  {s.type === "review_portion" && (
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z"
                        />
                      </svg>
                    </span>
                  )}
                  {s.type === "find_supplier" && (
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                        />
                      </svg>
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {s.recipeName}
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    {s.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/scanner"
          className="w-full sm:w-auto text-center px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
        >
          Escanear otra factura
        </Link>
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-[var(--text)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4 text-[var(--success)]"
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
              Copiado
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z"
                />
              </svg>
              Copiar resumen
            </>
          )}
        </button>
        <Link
          href="/dashboard"
          className="w-full sm:w-auto text-center px-6 py-2.5 text-sm font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
        >
          Ver dashboard →
        </Link>
      </div>
      <div className="text-center pb-4">
        <Link
          href={`/invoices/${invoiceId}`}
          className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
        >
          Ver factura →
        </Link>
      </div>
    </div>
  );
}
