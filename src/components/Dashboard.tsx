"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface DashboardData {
  summary: {
    totalRecipes: number;
    totalIngredients: number;
    totalInvoices: number;
    pendingInvoices: number;
    avgFoodCostPercent: number;
  };
  spending: {
    thisWeek: number;
    lastWeek: number;
    weekChange: number;
    thisMonth: number;
  };
  topProfitable: RecipeMetric[];
  bottomProfitable: RecipeMetric[];
  supplierBreakdown: SupplierSpend[];
  priceAlerts: PriceAlert[];
}

interface RecipeMetric {
  id: string;
  name: string;
  category: string | null;
  sellPrice: number;
  foodCost: number;
  margin: number;
  marginPercent: number;
  foodCostPercent: number;
}

interface SupplierSpend {
  supplierId: string | null;
  supplierName: string;
  totalSpent: number;
  invoiceCount: number;
}

interface PriceAlert {
  ingredientId: string;
  name: string;
  unit: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
}

interface DashboardProps {
  restaurantId: string;
}

function formatMoney(value: number): string {
  return (
    "$" +
    value.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatPercent(value: number): string {
  return value.toFixed(1) + "%";
}

function isEmptyData(data: DashboardData): boolean {
  return (
    data.summary.totalRecipes === 0 &&
    data.summary.totalIngredients === 0 &&
    data.summary.totalInvoices === 0 &&
    data.spending.thisWeek === 0 &&
    data.spending.thisMonth === 0 &&
    data.topProfitable.length === 0 &&
    data.bottomProfitable.length === 0
  );
}

function getFoodCostColor(pct: number): string {
  if (pct <= 28) return "text-[var(--success)]";
  if (pct <= 35) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function getFoodCostBg(pct: number): string {
  if (pct <= 28) return "bg-[var(--success-light)] border-[var(--success)]/20";
  if (pct <= 35) return "bg-[var(--warning-light)] border-[var(--warning)]/20";
  return "bg-[var(--danger-light)] border-[var(--danger)]/20";
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--border-light)] rounded-lg animate-pulse ${className ?? ""}`}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="h-4 w-56" />
      </div>

      {/* KPI cards — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Recipe sections — stacked mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <SkeletonBlock className="h-3 w-28" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="w-6 h-6 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-28" />
                    <SkeletonBlock className="h-3 w-36" />
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  <SkeletonBlock className="h-3.5 w-12 ml-auto" />
                  <SkeletonBlock className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Price alerts skeleton */}
      <div className="bg-[var(--warning-light)] border border-[var(--warning)]/20 rounded-2xl p-4 sm:p-5 space-y-3">
        <SkeletonBlock className="h-3 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/60 rounded-xl p-3 space-y-2"
            >
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Supplier breakdown skeleton */}
      <div className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
        <SkeletonBlock className="h-3 w-44" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-3.5 w-24" />
            </div>
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                       */
/* ------------------------------------------------------------------ */

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-xs mx-auto px-4">
        <div className="w-12 h-12 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[var(--danger)]"
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
        <p className="text-sm font-medium text-[var(--text)] mb-1">
          No se pudo cargar el dashboard
        </p>
        <p className="text-xs text-[var(--muted)] mb-4">
          Verifica tu conexión e intenta de nuevo.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
        >
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
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          Reintentar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function DashboardEmpty() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-xs mx-auto px-4">
        <div className="w-12 h-12 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
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
        <p className="text-sm font-medium text-[var(--text)] mb-1">
          Tu dashboard está vacío
        </p>
        <p className="text-xs text-[var(--muted)] mb-5">
          Escanea facturas y crea recetas para ver tu rentabilidad
        </p>
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
        >
          Empezar
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
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recipe list (shared by top & bottom sections)                     */
/* ------------------------------------------------------------------ */

function RecipeRow({
  recipe,
  rank,
  variant,
}: {
  recipe: RecipeMetric;
  rank: number;
  variant: "top" | "bottom";
}) {
  const badgeCls =
    variant === "top"
      ? "bg-[var(--success-light)] text-[var(--success)]"
      : recipe.marginPercent < 50
        ? "bg-[var(--danger-light)] text-[var(--danger)]"
        : "bg-[var(--warning-light)] text-[var(--warning)]";

  return (
    <div className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg)] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badgeCls}`}
        >
          {rank}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text)] truncate">
            {recipe.name}
          </div>
          <div className="text-xs text-[var(--muted)]">
            Venta: {formatMoney(recipe.sellPrice)} · Costo:{" "}
            {formatMoney(recipe.foodCost)}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        {variant === "top" ? (
          <>
            <div className="text-sm font-bold text-[var(--success)] tabular-nums">
              {formatPercent(recipe.marginPercent)}
            </div>
            <div className="text-xs text-[var(--muted)] tabular-nums">
              {formatMoney(recipe.margin)} margen
            </div>
          </>
        ) : (
          <>
            <div
              className={`text-sm font-bold tabular-nums ${getFoodCostColor(100 - recipe.marginPercent)}`}
            >
              {formatPercent(recipe.foodCostPercent)}
            </div>
            <div className="text-xs text-[var(--muted)]">costo MP</div>
          </>
        )}
      </div>
    </div>
  );
}

function RecipeSection({
  title,
  recipes,
  variant,
}: {
  title: string;
  recipes: RecipeMetric[];
  variant: "top" | "bottom";
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
        {title}
      </h3>
      {recipes.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-6 text-center">
          Agrega recetas para ver tu rentabilidad
        </p>
      ) : (
        <div className="space-y-1">
          {recipes.map((recipe, i) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              rank={i + 1}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Price alert card                                                  */
/* ------------------------------------------------------------------ */

function PriceAlertCard({ alert }: { alert: PriceAlert }) {
  const changeBadge =
    alert.changePercent > 0
      ? "bg-[var(--danger-light)] text-[var(--danger)]"
      : "bg-[var(--success-light)] text-[var(--success)]";

  return (
    <div className="bg-white/60 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-[var(--text)] truncate">
          {alert.name}
        </div>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${changeBadge}`}
        >
          {alert.changePercent > 0 ? "+" : ""}
          {formatPercent(alert.changePercent)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--muted)] tabular-nums">
          {formatMoney(alert.previousPrice)}
        </span>
        <svg
          className="w-3.5 h-3.5 text-[var(--warning)] shrink-0"
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
        <span className="font-medium text-[var(--text)] tabular-nums">
          {formatMoney(alert.currentPrice)}
        </span>
        <span className="text-[var(--muted)] text-xs">/{alert.unit}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function Dashboard({ restaurantId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setError(false);
    fetch(`/api/dashboard?restaurantId=${restaurantId}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(setData)
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setIsLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError onRetry={fetchData} />;
  if (isEmptyData(data)) return <DashboardEmpty />;

  const maxSupplierSpend = data.supplierBreakdown[0]?.totalSpent || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Dashboard
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Resumen de rentabilidad y costos
        </p>
      </div>

      {/* KPI Cards — 2×2 on mobile, 4-col on lg+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Avg food cost */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 ${getFoodCostBg(data.summary.avgFoodCostPercent)}`}
        >
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            Costo MP promedio
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums ${getFoodCostColor(data.summary.avgFoodCostPercent)}`}
          >
            {formatPercent(data.summary.avgFoodCostPercent)}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">Meta: &lt;30%</div>
        </div>

        {/* Weekly spend */}
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            Gasto esta semana
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5 tabular-nums truncate">
            {formatMoney(data.spending.thisWeek)}
          </div>
          {data.spending.weekChange !== 0 && (
            <div
              className={`text-xs mt-1 font-medium ${
                data.spending.weekChange > 0
                  ? "text-[var(--danger)]"
                  : "text-[var(--success)]"
              }`}
            >
              {data.spending.weekChange > 0 ? "↑" : "↓"}{" "}
              {formatPercent(Math.abs(data.spending.weekChange))} vs sem. pasada
            </div>
          )}
        </div>

        {/* Monthly spend */}
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            Gasto este mes
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5 tabular-nums truncate">
            {formatMoney(data.spending.thisMonth)}
          </div>
        </div>

        {/* Pending invoices */}
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            Facturas pendientes
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5">
            {data.summary.pendingInvoices}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1">
            {data.summary.totalInvoices} confirmadas total
          </div>
        </div>
      </div>

      {/* Recipe sections — stacked on mobile, side-by-side on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecipeSection
          title="Más rentables"
          recipes={data.topProfitable}
          variant="top"
        />
        <RecipeSection
          title="Menor margen"
          recipes={data.bottomProfitable}
          variant="bottom"
        />
      </div>

      {/* Price Alerts — card grid on mobile */}
      {data.priceAlerts.length > 0 && (
        <div className="bg-[var(--warning-light)] border border-[var(--warning)]/20 rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-medium text-[var(--warning)] uppercase tracking-wide mb-3">
            Alertas de precio
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.priceAlerts.map((alert) => (
              <PriceAlertCard key={alert.ingredientId} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Supplier Breakdown */}
      {data.supplierBreakdown.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
            Gasto por proveedor (este mes)
          </h3>
          <div className="space-y-4">
            {data.supplierBreakdown.map((supplier) => {
              const barWidth = Math.min(
                (supplier.totalSpent / maxSupplierSpend) * 100,
                100,
              );
              return (
                <div
                  key={supplier.supplierId || "none"}
                  className="space-y-1.5"
                >
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <span className="font-medium text-[var(--text)] truncate">
                      {supplier.supplierName}
                    </span>
                    <span className="text-[var(--muted)] tabular-nums shrink-0">
                      {formatMoney(supplier.totalSpent)} ·{" "}
                      {supplier.invoiceCount} factura
                      {supplier.invoiceCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--border-light)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-[var(--primary)] transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
