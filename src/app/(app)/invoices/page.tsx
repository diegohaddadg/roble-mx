"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: string | null;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  _count: { lineItems: number };
}

const fmt = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const money = (val: string | number | null) => {
  if (val == null) return "—";
  return `$${Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function InvoicesPage() {
  const { restaurantId } = useRestaurant();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/invoices?restaurantId=${restaurantId}&status=CONFIRMED`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudo cargar el historial de facturas");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Historial de facturas
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Facturas confirmadas y guardadas en el sistema
          </p>
        </div>
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-[var(--border-light)] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-[var(--border-light)] rounded w-1/2" />
                </div>
                <div className="h-4 bg-[var(--border-light)] rounded w-20 ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Historial de facturas
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Facturas confirmadas y guardadas en el sistema
          </p>
        </div>
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--danger)]"
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

  /* ── Empty state ── */
  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Historial de facturas
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Facturas confirmadas y guardadas en el sistema
          </p>
        </div>
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            Aún no tienes facturas confirmadas
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Escanea tu primera factura para comenzar a rastrear costos
          </p>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
          >
            Escanear primera factura
          </Link>
        </div>
      </div>
    );
  }

  /* ── Data list ── */
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Historial de facturas
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Facturas confirmadas y guardadas en el sistema
        </p>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
          <div className="col-span-2">Fecha</div>
          <div className="col-span-3">Proveedor</div>
          <div className="col-span-2">No. Factura</div>
          <div className="col-span-2 text-right">Total (MXN)</div>
          <div className="col-span-2 text-right">Productos</div>
          <div className="col-span-1" />
        </div>
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors group"
          >
            <div className="col-span-2 text-sm text-[var(--muted)]">
              {fmt(inv.invoiceDate ?? inv.createdAt)}
            </div>
            <div className="col-span-3">
              <div className="text-sm font-medium text-[var(--text)] truncate">
                {inv.supplier?.name ?? "Sin proveedor"}
              </div>
            </div>
            <div className="col-span-2 text-sm text-[var(--muted)] truncate">
              {inv.invoiceNumber ?? "—"}
            </div>
            <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
              {money(inv.total)}
            </div>
            <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
              {inv._count.lineItems}
            </div>
            <div className="col-span-1 flex items-center justify-end">
              <svg
                className="w-4 h-4 text-zinc-300 group-hover:text-[var(--muted)] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">
                  {inv.supplier?.name ?? "Sin proveedor"}
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {fmt(inv.invoiceDate ?? inv.createdAt)}
                  {inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold text-[var(--text)] tabular-nums whitespace-nowrap">
                {money(inv.total)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--border-light)]">
              <span className="text-xs text-[var(--muted)]">
                {inv._count.lineItems} producto{inv._count.lineItems !== 1 ? "s" : ""}
              </span>
              <svg
                className="w-4 h-4 text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
