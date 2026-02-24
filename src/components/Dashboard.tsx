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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">No se pudo cargar el dashboard</p>
      </div>
    );
  }

  const getFoodCostColor = (pct: number) => {
    if (pct <= 28) return "text-emerald-600";
    if (pct <= 35) return "text-amber-600";
    return "text-red-600";
  };

  const getFoodCostBg = (pct: number) => {
    if (pct <= 28) return "bg-emerald-50 border-emerald-200";
    if (pct <= 35) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Resumen de rentabilidad y costos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Food Cost */}
        <div
          className={`border rounded-xl p-4 ${getFoodCostBg(data.summary.avgFoodCostPercent)}`}
        >
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Costo MP promedio
          </div>
          <div
            className={`text-3xl font-bold mt-1 ${getFoodCostColor(data.summary.avgFoodCostPercent)}`}
          >
            {data.summary.avgFoodCostPercent}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Meta: &lt;30%
          </div>
        </div>

        {/* This Week Spending */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Gasto esta semana
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">
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
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Gasto este mes
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">
            ${data.spending.thisMonth.toLocaleString("es-MX")}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Facturas pendientes
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">
            {data.summary.pendingInvoices}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {data.summary.totalInvoices} confirmadas total
          </div>
        </div>
      </div>

      {/* Two-column: Top + Bottom recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Profitable */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h3 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide mb-4">
            ✦ Más rentables
          </h3>
          {data.topProfitable.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">
              Agrega recetas para ver tu rentabilidad
            </p>
          ) : (
            <div className="space-y-3">
              {data.topProfitable.map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
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
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {recipe.marginPercent}%
                    </div>
                    <div className="text-xs text-zinc-400">
                      ${recipe.margin} margen
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Profitable (money losers) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h3 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide mb-4">
            ⚠ Menor margen
          </h3>
          {data.bottomProfitable.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">
              Agrega recetas para ver tu rentabilidad
            </p>
          ) : (
            <div className="space-y-3">
              {data.bottomProfitable.map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${getFoodCostColor(100 - recipe.marginPercent)}`}
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide mb-3">
            🔔 Alertas de precio
          </h3>
          <div className="space-y-2">
            {data.priceAlerts.map((alert) => (
              <div
                key={alert.ingredientId}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-800">
                    {alert.name}
                  </span>
                  <span className="text-zinc-400"> ({alert.unit})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">
                    ${alert.previousPrice.toFixed(2)}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="font-medium text-zinc-800">
                    ${alert.currentPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h3 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide mb-4">
            Gasto por proveedor (este mes)
          </h3>
          <div className="space-y-3">
            {data.supplierBreakdown.map((supplier) => {
              const maxSpend = data.supplierBreakdown[0]?.totalSpent || 1;
              const barWidth = (supplier.totalSpent / maxSpend) * 100;
              return (
                <div key={supplier.supplierId || "none"} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">
                      {supplier.supplierName}
                    </span>
                    <span className="text-zinc-500">
                      ${supplier.totalSpent.toLocaleString("es-MX")} ·{" "}
                      {supplier.invoiceCount} factura
                      {supplier.invoiceCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-orange-400 transition-all duration-300"
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
