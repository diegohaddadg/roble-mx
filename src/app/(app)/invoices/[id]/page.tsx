"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  confidence: number | null;
  ingredient: { id: string; name: string } | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  lineItems: LineItem[];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { restaurantId } = useRestaurant();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!restaurantId || !id) return;

    fetch(`/api/invoices/${id}?restaurantId=${restaurantId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setInvoice(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id, restaurantId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const fmtMoney = (val: string | null) =>
    val
      ? `$${Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
      : "—";

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 bg-zinc-200/60 rounded w-40" />
        <div className="h-7 bg-zinc-200/60 rounded-lg w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-[var(--card)] rounded-2xl border border-[var(--border-light)]" />
          <div className="h-64 bg-[var(--card)] rounded-2xl border border-[var(--border-light)]" />
        </div>
      </div>
    );
  }

  if (notFound || !invoice) {
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
          Factura no encontrada
        </h3>
        <p className="text-sm text-[var(--muted)] mb-5">
          Esta factura no existe o no pertenece a tu restaurante
        </p>
        <Link
          href="/invoices"
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
        >
          ← Volver al historial
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/invoices"
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
        Volver al historial
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          {invoice.supplier?.name ?? "Sin proveedor"}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[var(--muted)]">
          {invoice.invoiceNumber && <span>#{invoice.invoiceNumber}</span>}
          <span>{formatDate(invoice.invoiceDate ?? invoice.createdAt)}</span>
          <span className="px-2 py-0.5 bg-[var(--success-light)] text-[var(--success)] text-xs font-medium rounded-full border border-[var(--success)]/20">
            Confirmada
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: image + totals */}
        <div className="space-y-4">
          {/* Totals card */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-0 divide-y divide-[var(--border-light)]">
            <div className="flex justify-between items-center py-2.5 first:pt-0">
              <span className="text-sm text-[var(--muted)]">Subtotal</span>
              <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                {fmtMoney(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-[var(--muted)]">IVA</span>
              <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                {fmtMoney(invoice.tax)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 last:pb-0">
              <span className="text-sm font-medium text-[var(--text)]">Total</span>
              <span className="text-lg font-bold text-[var(--text)] tabular-nums">
                {fmtMoney(invoice.total)}
              </span>
            </div>
          </div>

          {/* Scanned image */}
          {invoice.imageUrl && (
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4">
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                Imagen escaneada
              </h3>
              <img
                src={invoice.imageUrl}
                alt="Factura escaneada"
                className="w-full rounded-xl object-contain max-h-[500px]"
              />
            </div>
          )}
        </div>

        {/* Right column: line items */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                Productos ({invoice.lineItems.length})
              </h3>
            </div>
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2.5 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
              <div className="col-span-5">Descripción</div>
              <div className="col-span-2 text-right">Cantidad</div>
              <div className="col-span-1 text-center">Unidad</div>
              <div className="col-span-2 text-right">$/unidad</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {invoice.lineItems.map((item) => (
              <div key={item.id}>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b border-[var(--border-light)] last:border-0">
                  <div className="col-span-5">
                    <div className="text-sm font-medium text-[var(--text)]">
                      {item.description}
                    </div>
                    {item.ingredient && (
                      <div className="text-xs text-[var(--muted)] mt-0.5">
                        → {item.ingredient.name}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                    {Number(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 3 })}
                  </div>
                  <div className="col-span-1 text-center text-sm text-[var(--muted)]">
                    {item.unit}
                  </div>
                  <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                    ${Number(item.unitPrice).toFixed(2)}
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                    ${Number(item.totalPrice).toFixed(2)}
                  </div>
                </div>
                {/* Mobile card */}
                <div className="md:hidden px-4 py-3 border-b border-[var(--border-light)] last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{item.description}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {Number(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 3 })} {item.unit} × ${Number(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text)] tabular-nums shrink-0">
                      ${Number(item.totalPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
