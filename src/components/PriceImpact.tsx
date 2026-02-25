"use client";

import Link from "next/link";

interface RecipeImpact {
  recipeId: string;
  recipeName: string;
  sellPrice: number;
  oldFoodCost: number;
  newFoodCost: number;
  oldMarginPercent: number;
  newMarginPercent: number;
}

interface IngredientImpact {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  recipesAffected: RecipeImpact[];
}

export interface ImpactData {
  invoiceId: string;
  ingredientsAffected: IngredientImpact[];
  summary: {
    totalRecipesAffected: number;
    oldAvgFoodCostPercent: number;
    newAvgFoodCostPercent: number;
  };
}

interface PriceImpactProps {
  data: ImpactData;
  onDismiss: () => void;
}

function PriceArrow({ up }: { up: boolean }) {
  return (
    <svg
      className={`w-3 h-3 inline ${up ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={up ? "M4.5 19.5 12 4.5l7.5 15" : "M19.5 4.5 12 19.5 4.5 4.5"}
      />
    </svg>
  );
}

export default function PriceImpact({ data, onDismiss }: PriceImpactProps) {
  const { ingredientsAffected, summary } = data;
  const avgDelta =
    summary.newAvgFoodCostPercent - summary.oldAvgFoodCostPercent;
  const avgWorsened = avgDelta > 0;

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
          Esta factura actualizó {ingredientsAffected.length} precio
          {ingredientsAffected.length !== 1 ? "s" : ""} que afectan tus
          platillos
        </p>
      </div>

      {/* Per-ingredient cards */}
      <div className="space-y-4">
        {ingredientsAffected.map((ing) => {
          const priceUp = ing.newPrice > ing.oldPrice;
          return (
            <div
              key={ing.ingredientId}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden"
            >
              {/* Ingredient header */}
              <div className="px-5 py-3.5 border-b border-[var(--border-light)] flex items-center justify-between">
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
                  <svg
                    className="w-3.5 h-3.5 text-zinc-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
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

              {/* Affected recipes */}
              <div className="divide-y divide-[var(--border-light)]">
                {ing.recipesAffected.map((recipe) => {
                  const marginDrop =
                    recipe.newMarginPercent < recipe.oldMarginPercent;
                  const marginImproved =
                    recipe.newMarginPercent > recipe.oldMarginPercent;
                  return (
                    <div
                      key={recipe.recipeId}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div className="text-sm font-medium text-[var(--text)]">
                        {recipe.recipeName}
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
                          <div className="tabular-nums flex items-center justify-end gap-1">
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
                            {marginDrop && <PriceArrow up />}
                            {marginImproved && <PriceArrow up={false} />}
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
              Tu costo promedio de MP pasó de{" "}
              <span className="font-medium tabular-nums">
                {summary.oldAvgFoodCostPercent}%
              </span>{" "}
              a{" "}
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
              avgWorsened
                ? "text-[var(--danger)]"
                : "text-[var(--success)]"
            }`}
          >
            {avgDelta > 0 ? "+" : ""}
            {avgDelta.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onDismiss}
          className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
        >
          Entendido ✓
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 text-sm font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
        >
          Ver dashboard →
        </Link>
      </div>
      <div className="text-center">
        <Link
          href={`/invoices/${data.invoiceId}`}
          className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
        >
          Ver factura →
        </Link>
      </div>
    </div>
  );
}
