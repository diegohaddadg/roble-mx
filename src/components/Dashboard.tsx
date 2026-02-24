"use client";

import { useState, useEffect } from "react";

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

export default function Dashboard({ restaurantId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 bg-zinc-200/60 rounded-lg w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-2xl border border-zinc-100"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-2xl border border-zinc-100" />
          <div className="h-64 bg-white rounded-2xl border border-zinc-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-zinc-400"
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
          <p className="text-sm text-zinc-500">
            No se pudo cargar el dashboard
          </p>
        </div>
      </div>
    );
  }

  const getFoodCostColor = (pct: number) => {
    if (pct <= 28) return "text-emerald-600";
    if (pct <= 35) return "text-amber-600";
    return "text-red-600";
  };

  const getFoodCostBg = (pct: number) => {
    if (pct <= 28) return "bg-emerald-50 border-emerald-100";
    if (pct <= 35) return "bg-amber-50 border-amber-100";
    return "bg-red-50 border-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Dashboard
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Resumen de rentabilidad y costos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Food Cost */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 ${getFoodCostBg(data.summary.avgFoodCostPercent)}`}
        >
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Costo MP promedio
          </div>
          <div
            className={`text-3xl font-bold mt-1.5 tabular-nums ${getFoodCostColor(data.summary.avgFoodCostPercent)}`}
          >
            {data.summary.avgFoodCostPercent}%
          </div>
          <div className="text-xs text-zinc-400 mt-1">Meta: &lt;30%</div>
        </div>

        {/* This Week Spending */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Gasto esta semana
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1.5 tabular-nums">
            ${data.spending.thisWeek.toLocaleString("es-MX")}
          </div>
          {data.spending.weekChange !== 0 && (
            <div
              className={`text-xs mt-1 font-medium ${
                data.spending.weekChange > 0
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            >
              {data.spending.weekChange > 0 ? "↑" : "↓"}{" "}
              {Math.abs(data.spending.weekChange)}% vs semana pasada
            </div>
          )}
        </div>

        {/* This Month */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Gasto este mes
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1.5 tabular-nums">
            ${data.spending.thisMonth.toLocaleString("es-MX")}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Facturas pendientes
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1.5">
            {data.summary.pendingInvoices}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {data.summary.totalInvoices} confirmadas total
          </div>
        </div>
      </div>

      {/* Two-column: Top + Bottom recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Profitable */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Más rentables
          </h3>
          {data.topProfitable.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">
              Agrega recetas para ver tu rentabilidad
            </p>
          ) : (
            <div className="space-y-1">
              {data.topProfitable.map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-800">
                        {recipe.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Venta: ${recipe.sellPrice} · Costo: ${recipe.foodCost}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold text-emerald-600 tabular-nums">
                      {recipe.marginPercent}%
                    </div>
                    <div className="text-xs text-zinc-400 tabular-nums">
                      ${recipe.margin} margen
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Profitable */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Menor margen
          </h3>
          {data.bottomProfitable.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">
              Agrega recetas para ver tu rentabilidad
            </p>
          ) : (
            <div className="space-y-1">
              {data.bottomProfitable.map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        recipe.marginPercent < 50
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-800">
                        {recipe.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Venta: ${recipe.sellPrice} · Costo: ${recipe.foodCost}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div
                      className={`text-sm font-bold tabular-nums ${getFoodCostColor(100 - recipe.marginPercent)}`}
                    >
                      {recipe.foodCostPercent}%
                    </div>
                    <div className="text-xs text-zinc-400">costo MP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Price Alerts */}
      {data.priceAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <h3 className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-3">
            Alertas de precio
          </h3>
          <div className="space-y-1">
            {data.priceAlerts.map((alert) => (
              <div
                key={alert.ingredientId}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-800">
                    {alert.name}
                  </span>
                  <span className="text-zinc-400"> ({alert.unit})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 tabular-nums">
                    ${alert.previousPrice.toFixed(2)}
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
                  <span className="font-medium text-zinc-800 tabular-nums">
                    ${alert.currentPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      alert.changePercent > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {alert.changePercent > 0 ? "+" : ""}
                    {alert.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Breakdown */}
      {data.supplierBreakdown.length > 0 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Gasto por proveedor (este mes)
          </h3>
          <div className="space-y-4">
            {data.supplierBreakdown.map((supplier) => {
              const maxSpend = data.supplierBreakdown[0]?.totalSpent || 1;
              const barWidth = (supplier.totalSpent / maxSpend) * 100;
              return (
                <div key={supplier.supplierId || "none"} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">
                      {supplier.supplierName}
                    </span>
                    <span className="text-zinc-400 tabular-nums">
                      ${supplier.totalSpent.toLocaleString("es-MX")} ·{" "}
                      {supplier.invoiceCount} factura
                      {supplier.invoiceCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-orange-400 transition-all duration-500"
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
