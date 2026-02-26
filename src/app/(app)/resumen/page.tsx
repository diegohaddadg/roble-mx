"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

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

interface InventoryAlert {
  ingredientId: string;
  name: string;
  unit: string;
  onHand: number;
  status: "Bajo" | "Crítico";
}

interface DashboardData {
  summary: {
    totalRecipes: number;
    totalIngredients: number;
    totalInvoices: number;
    pendingInvoices: number;
    avgFoodCostPercent: number;
    thisWeekInvoiceCount: number;
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

const fmt = (val: number) =>
  "$" +
  val.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pct = (val: number) => val.toFixed(1) + "%";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--border-light)] rounded-lg animate-pulse ${className ?? ""}`}
    />
  );
}

function ResumenSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-4 space-y-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border-light)] rounded-2xl p-5 space-y-4"
          >
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumenError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-xs mx-auto px-4">
        <div className="w-12 h-12 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text)] mb-1">
          No se pudo cargar el resumen
        </p>
        <p className="text-xs text-[var(--muted)] mb-4">
          Verifica tu conexión e intenta de nuevo.
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

function ResumenEmpty() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-xs mx-auto px-4">
        <div className="w-12 h-12 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text)] mb-1">
          Tu resumen está vacío
        </p>
        <p className="text-xs text-[var(--muted)] mb-5">
          Escanea facturas y crea recetas para ver tu rentabilidad
        </p>
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
        >
          Empezar →
        </Link>
      </div>
    </div>
  );
}

export default function ResumenPage() {
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lowStock, setLowStock] = useState<InventoryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(false);

    Promise.all([
      fetch(`/api/dashboard?restaurantId=${restaurantId}`).then((r) => {
        if (!r.ok) throw new Error("dashboard");
        return r.json();
      }),
      fetch(`/api/inventory?restaurantId=${restaurantId}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([dashboard, inventory]) => {
        setData(dashboard);
        const alerts: InventoryAlert[] = (inventory as Array<{
          ingredientId: string;
          name: string;
          unit: string;
          onHand: number | null;
          status: string | null;
        }>)
          .filter(
            (i) =>
              i.status === "Bajo" || i.status === "Crítico"
          )
          .map((i) => ({
            ingredientId: i.ingredientId,
            name: i.name,
            unit: i.unit,
            onHand: i.onHand ?? 0,
            status: i.status as "Bajo" | "Crítico",
          }));
        setLowStock(alerts);
      })
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setIsLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <ResumenSkeleton />;
  if (error || !data) return <ResumenError onRetry={load} />;

  const isEmpty =
    data.summary.totalRecipes === 0 &&
    data.summary.totalIngredients === 0 &&
    data.summary.totalInvoices === 0 &&
    data.spending.thisWeek === 0;

  if (isEmpty) return <ResumenEmpty />;

  const highCostRecipes = data.bottomProfitable.filter(
    (r) => r.foodCostPercent > 35
  );
  const hasAlerts =
    data.priceAlerts.length > 0 ||
    lowStock.length > 0 ||
    highCostRecipes.length > 0;

  const maxSpend = data.supplierBreakdown[0]?.totalSpent || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Resumen
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Vista general de tu restaurante
        </p>
      </div>

      {/* ── ESTA SEMANA — KPI cards ── */}
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
          Esta semana
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Weekly spend */}
          <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Gasto en ingredientes
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5 tabular-nums truncate">
              {fmt(data.spending.thisWeek)}
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
                {pct(Math.abs(data.spending.weekChange))} vs sem. pasada
              </div>
            )}
          </div>

          {/* Avg food cost */}
          <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Costo MP promedio
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold mt-1.5 tabular-nums ${
                data.summary.avgFoodCostPercent <= 28
                  ? "text-[var(--success)]"
                  : data.summary.avgFoodCostPercent <= 35
                    ? "text-[var(--warning)]"
                    : "text-[var(--danger)]"
              }`}
            >
              {pct(data.summary.avgFoodCostPercent)}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">Meta: &lt;30%</div>
          </div>

          {/* Invoices confirmed */}
          <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Facturas confirmadas
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5">
              {data.summary.totalInvoices}
            </div>
            {data.summary.pendingInvoices > 0 && (
              <Link
                href="/scanner"
                className="text-xs text-[var(--warning)] font-medium mt-1 inline-block"
              >
                {data.summary.pendingInvoices} pendiente
                {data.summary.pendingInvoices !== 1 ? "s" : ""} →
              </Link>
            )}
          </div>

          {/* Monthly spend */}
          <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Gasto este mes
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1.5 tabular-nums truncate">
              {fmt(data.spending.thisMonth)}
            </div>
          </div>
        </div>
      </div>

      {/* ── ATENCIÓN — Alerts ── */}
      {hasAlerts && (
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
            Atención
          </h3>
          <div className="space-y-2">
            {/* Price spikes */}
            {data.priceAlerts.map((alert) => (
              <Link
                key={alert.ingredientId}
                href={`/ingredients/${alert.ingredientId}`}
                className="flex items-center justify-between gap-3 bg-[var(--warning-light)] border border-[var(--warning)]/20 rounded-xl px-4 py-3 hover:border-[var(--warning)]/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] truncate">
                    {alert.name}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {fmt(alert.previousPrice)} → {fmt(alert.currentPrice)}/{alert.unit}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--danger)] bg-[var(--danger-light)] px-2 py-0.5 rounded-full tabular-nums">
                  +{pct(alert.changePercent)}
                </span>
              </Link>
            ))}

            {/* Low stock */}
            {lowStock.slice(0, 5).map((item) => (
              <Link
                key={item.ingredientId}
                href={`/inventory/${item.ingredientId}`}
                className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-colors ${
                  item.status === "Crítico"
                    ? "bg-[var(--danger-light)] border-[var(--danger)]/20 hover:border-[var(--danger)]/40"
                    : "bg-[var(--warning-light)] border-[var(--warning)]/20 hover:border-[var(--warning)]/40"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {item.onHand.toFixed(1)} {item.unit} en stock
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "Crítico"
                      ? "bg-[var(--danger-light)] text-[var(--danger)]"
                      : "bg-[var(--warning-light)] text-[var(--warning)]"
                  }`}
                >
                  {item.status}
                </span>
              </Link>
            ))}

            {/* High food cost recipes */}
            {highCostRecipes.slice(0, 3).map((recipe) => (
              <Link
                key={recipe.id}
                href="/recipes"
                className="flex items-center justify-between gap-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl px-4 py-3 hover:border-[var(--danger)]/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] truncate">
                    {recipe.name}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Costo MP: {pct(recipe.foodCostPercent)} · Margen:{" "}
                    {pct(recipe.marginPercent)}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--danger)] tabular-nums">
                  {pct(recipe.foodCostPercent)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── TOP / BOTTOM RECIPES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top profitable */}
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
            Más rentables
          </h3>
          {data.topProfitable.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-6 text-center">
              Agrega recetas para ver rentabilidad
            </p>
          ) : (
            <div className="space-y-1">
              {data.topProfitable.slice(0, 3).map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[var(--success-light)] text-[var(--success)]">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)] truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        Venta: {fmt(r.sellPrice)} · Costo: {fmt(r.foodCost)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold text-[var(--success)] tabular-nums">
                      {pct(r.marginPercent)}
                    </div>
                    <div className="text-xs text-[var(--muted)] tabular-nums">
                      {fmt(r.margin)} margen
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom margin */}
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
            Menor margen
          </h3>
          {data.bottomProfitable.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-6 text-center">
              Agrega recetas para ver rentabilidad
            </p>
          ) : (
            <div className="space-y-1">
              {data.bottomProfitable.slice(0, 3).map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        r.marginPercent < 50
                          ? "bg-[var(--danger-light)] text-[var(--danger)]"
                          : "bg-[var(--warning-light)] text-[var(--warning)]"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text)] truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        Venta: {fmt(r.sellPrice)} · Costo: {fmt(r.foodCost)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        r.foodCostPercent > 35
                          ? "text-[var(--danger)]"
                          : r.foodCostPercent > 28
                            ? "text-[var(--warning)]"
                            : "text-[var(--success)]"
                      }`}
                    >
                      {pct(r.foodCostPercent)}
                    </div>
                    <div className="text-xs text-[var(--muted)]">costo MP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SUPPLIER SPEND BAR CHART ── */}
      {data.supplierBreakdown.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border-light)] shadow-sm rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
            Gasto por proveedor (este mes)
          </h3>
          <div className="space-y-4">
            {data.supplierBreakdown.map((supplier) => {
              const barWidth = Math.min(
                (supplier.totalSpent / maxSpend) * 100,
                100
              );
              return (
                <div key={supplier.supplierId || "none"} className="space-y-1.5">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <span className="font-medium text-[var(--text)] truncate">
                      {supplier.supplierName}
                    </span>
                    <span className="text-[var(--muted)] tabular-nums shrink-0">
                      {fmt(supplier.totalSpent)} · {supplier.invoiceCount}{" "}
                      factura{supplier.invoiceCount !== 1 ? "s" : ""}
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
