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

export default function InvoicesPage() {
  const { restaurantId } = useRestaurant();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/invoices?restaurantId=${restaurantId}&status=CONFIRMED`
      );
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load invoices error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Historial de facturas
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Facturas confirmadas y guardadas en el sistema
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-white rounded-xl border border-zinc-100"
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-zinc-400"
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
          <h3 className="font-semibold text-zinc-700 mb-1">
            No tienes facturas confirmadas
          </h3>
          <p className="text-sm text-zinc-500 mb-5">
            Escanea tu primera factura para comenzar a rastrear costos
          </p>
          <Link
            href="/scanner"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Escanea tu primera factura →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-zinc-50/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
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
              className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors group"
            >
              <div className="col-span-2 text-sm text-zinc-600">
                {formatDate(inv.invoiceDate ?? inv.createdAt)}
              </div>
              <div className="col-span-3">
                <div className="text-sm font-medium text-zinc-800 truncate">
                  {inv.supplier?.name ?? "Sin proveedor"}
                </div>
              </div>
              <div className="col-span-2 text-sm text-zinc-500 truncate">
                {inv.invoiceNumber ?? "—"}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-zinc-800 tabular-nums">
                {inv.total
                  ? `$${Number(inv.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                  : "—"}
              </div>
              <div className="col-span-2 text-right text-sm text-zinc-500 tabular-nums">
                {inv._count.lineItems}
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <svg
                  className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors"
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
      )}
    </div>
  );
}
