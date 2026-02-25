"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface PricePoint {
  date: string;
  price: number;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceId: string | null;
}

interface RecipeUsage {
  recipeId: string;
  recipeName: string;
  qty: number;
  unit: string;
  costContribution: number;
  recipeFoodCostPercent: number;
}

interface InvoiceLine {
  invoiceId: string;
  date: string;
  supplierName: string;
  qty: number;
  unit: string;
  pricePaid: number;
}

interface IngredientDetail {
  ingredient: {
    id: string;
    name: string;
    category: string | null;
    unit: string;
    currentPrice: number;
    previousPrice: number | null;
    changePercent: number;
  };
  priceHistory: PricePoint[];
  recipesUsing: RecipeUsage[];
  recentInvoiceLines: InvoiceLine[];
}

function getFoodCostColor(pct: number) {
  if (pct <= 28) return "text-[var(--success)]";
  if (pct <= 35) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="font-semibold text-[var(--text)] tabular-nums">
        ${d.price.toFixed(2)}
      </div>
      <div className="text-xs text-[var(--muted)] mt-1">{d.dateLabel}</div>
      {d.supplierName && (
        <div className="text-xs text-[var(--muted)]">{d.supplierName}</div>
      )}
      {d.invoiceNumber && (
        <div className="text-xs text-[var(--muted)]">#{d.invoiceNumber}</div>
      )}
    </div>
  );
}

export default function IngredientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<IngredientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!restaurantId || !id) return;
    fetch(`/api/ingredients/${id}?restaurantId=${restaurantId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id, restaurantId]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.priceHistory.map((p) => ({
      ...p,
      dateLabel: new Date(p.date).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }),
      dateShort: new Date(p.date).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      }),
    }));
  }, [data]);

  const avgPrice = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((s, p) => s + p.price, 0) / chartData.length;
  }, [chartData]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 bg-zinc-200/60 rounded w-40" />
        <div className="h-8 bg-zinc-200/60 rounded-lg w-64" />
        <div className="h-64 bg-[var(--card)] rounded-2xl border border-[var(--border-light)]" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
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
          Ingrediente no encontrado
        </h3>
        <Link
          href="/ingredients"
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
        >
          ← Volver a ingredientes
        </Link>
      </div>
    );
  }

  const { ingredient, recipesUsing, recentInvoiceLines } = data;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/ingredients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
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
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Volver a ingredientes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            {ingredient.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--muted)]">
            {ingredient.category && <span>{ingredient.category}</span>}
            <span>Unidad: {ingredient.unit}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
            ${ingredient.currentPrice.toFixed(2)}
            <span className="text-sm font-normal text-[var(--muted)] ml-1">
              /{ingredient.unit}
            </span>
          </div>
          {ingredient.previousPrice !== null && ingredient.changePercent !== 0 && (
            <div
              className={`text-sm font-medium tabular-nums mt-0.5 ${
                ingredient.changePercent > 0
                  ? "text-[var(--danger)]"
                  : "text-[var(--success)]"
              }`}
            >
              {ingredient.changePercent > 0 ? "↑" : "↓"}{" "}
              {ingredient.changePercent > 0 ? "+" : ""}
              {ingredient.changePercent}% vs anterior ($
              {ingredient.previousPrice.toFixed(2)})
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Price History Chart */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">
          Historial de precios
        </h3>
        {chartData.length < 2 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-[var(--border-light)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-[var(--muted)]"
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
            <p className="text-sm text-[var(--muted)]">
              Escanea más facturas para ver tendencias de precio
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-light)"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateShort"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-light)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={avgPrice}
                  stroke="var(--muted)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{
                    value: `Prom: $${avgPrice.toFixed(2)}`,
                    position: "insideTopRight",
                    fill: "var(--muted)",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--card)",
                    stroke: "var(--primary)",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 2: Recipes Using This Ingredient */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Recetas que lo usan ({recipesUsing.length})
            </h3>
          </div>
          {recipesUsing.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--muted)]">
                Ninguna receta usa este ingrediente aún
              </p>
              <Link
                href="/recipes/new"
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium mt-2 inline-block"
              >
                Crear receta →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {recipesUsing.map((r) => (
                <Link
                  key={r.recipeId}
                  href="/recipes"
                  className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg)]/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {r.recipeName}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {r.qty} {r.unit} · ${r.costContribution.toFixed(2)}{" "}
                      aporte
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold tabular-nums ${getFoodCostColor(r.recipeFoodCostPercent)}`}
                    >
                      {r.recipeFoodCostPercent}%
                    </span>
                    <div className="text-[11px] text-[var(--muted)]">
                      costo MP
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Recent Invoices */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Compras recientes ({recentInvoiceLines.length})
            </h3>
          </div>
          {recentInvoiceLines.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--muted)]">
                Sin compras registradas
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
                <div className="col-span-3">Fecha</div>
                <div className="col-span-3">Proveedor</div>
                <div className="col-span-3 text-right">Cantidad</div>
                <div className="col-span-3 text-right">$/unidad</div>
              </div>
              <div className="divide-y divide-[var(--border-light)]">
                {recentInvoiceLines.map((li, i) => (
                  <Link
                    key={i}
                    href={`/invoices/${li.invoiceId}`}
                    className="grid grid-cols-12 gap-2 px-5 py-2.5 hover:bg-[var(--bg)]/50 transition-colors"
                  >
                    <div className="col-span-3 text-sm text-[var(--muted)]">
                      {formatDate(li.date)}
                    </div>
                    <div className="col-span-3 text-sm text-[var(--text)] truncate">
                      {li.supplierName}
                    </div>
                    <div className="col-span-3 text-right text-sm text-[var(--muted)] tabular-nums">
                      {li.qty} {li.unit}
                    </div>
                    <div className="col-span-3 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                      ${li.pricePaid.toFixed(2)}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
