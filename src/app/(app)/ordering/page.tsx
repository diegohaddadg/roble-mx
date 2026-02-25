"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface Suggestion {
  ingredientId: string;
  name: string;
  category: string | null;
  unit: string;
  onHand: number;
  suggestedQty: number;
  reason: string;
  estimatedCost: number;
  currentPrice: number;
  supplierId: string | null;
  supplierName: string | null;
  supplierPhone: string | null;
}

interface OrderingData {
  suggestions: Suggestion[];
  summary: { totalItems: number; totalEstimatedCost: number };
}

interface SupplierGroup {
  supplierId: string | null;
  supplierName: string;
  supplierPhone: string | null;
  items: Suggestion[];
  subtotal: number;
}

interface LastInvoice {
  total: number | null;
  invoiceDate: string | null;
  supplierName: string | null;
}

function fmt(val: number): string {
  return `$${Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ReasonBadge({ reason }: { reason: string }) {
  const map: Record<string, string> = {
    Crítico: "bg-[var(--danger-light)] text-[var(--danger)]",
    "Bajo stock": "bg-[var(--warning-light)] text-[var(--warning)]",
    "Reposición (uso semanal)":
      "bg-[var(--primary-light)] text-[var(--primary)]",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap ${map[reason] ?? "bg-zinc-100 text-zinc-600"}`}
    >
      {reason}
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--border-light)] text-[var(--muted)] text-[11px] font-bold hover:bg-[var(--border)] transition-colors cursor-help"
        aria-label="Información"
      >
        ⓘ
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--text)] text-white text-xs rounded-xl shadow-lg z-50 leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[var(--text)]" />
        </div>
      )}
    </span>
  );
}

function buildWhatsAppMessage(group: SupplierGroup): string {
  const lines = group.items.map(
    (s) => `- ${s.name}: ${s.suggestedQty} ${s.unit}`
  );
  return `Hola ${group.supplierName}, necesito para esta semana:\n${lines.join("\n")}\n\nTotal estimado: ${fmt(group.subtotal)}\nGracias!`;
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/* ── Comparison strip ── */
function ComparisonCard({
  lastInvoice,
  suggestedTotal,
}: {
  lastInvoice: LastInvoice | null;
  suggestedTotal: number;
}) {
  const hasInvoice = lastInvoice && lastInvoice.total != null;
  const invoiceTotal = hasInvoice ? Number(lastInvoice!.total) : 0;
  const diff = suggestedTotal - invoiceTotal;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Last invoice */}
        <div className="text-center sm:text-left">
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
            Última factura confirmada
          </div>
          <div className="text-lg font-bold text-[var(--text)] tabular-nums">
            {hasInvoice ? fmt(invoiceTotal) : "—"}
          </div>
          {lastInvoice?.invoiceDate && (
            <div className="text-[11px] text-[var(--muted)]">
              {new Date(lastInvoice.invoiceDate).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}
              {lastInvoice.supplierName && ` · ${lastInvoice.supplierName}`}
            </div>
          )}
        </div>

        {/* Suggested total */}
        <div className="text-center sm:text-left">
          <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
            Pedido sugerido hoy
          </div>
          <div className="text-lg font-bold text-[var(--primary)] tabular-nums">
            {fmt(suggestedTotal)}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            Basado en inventario actual
          </div>
        </div>

        {/* Difference */}
        {hasInvoice && (
          <div className="text-center sm:text-left">
            <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
              Diferencia
            </div>
            <div
              className={`text-lg font-bold tabular-nums ${diff > 0 ? "text-[var(--danger)]" : diff < 0 ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
            >
              {diff > 0 ? "+" : ""}
              {fmt(diff)}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              vs última factura
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */
function OrderingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Comparison skeleton */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-5">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 bg-[var(--border-light)] rounded" />
              <div className="h-6 w-20 bg-[var(--border-light)] rounded" />
            </div>
          ))}
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] overflow-hidden"
        >
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--border-light)] flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-[var(--border-light)] rounded" />
              <div className="h-3 w-20 bg-[var(--border-light)] rounded" />
            </div>
            <div className="h-6 w-20 bg-[var(--border-light)] rounded" />
          </div>
          <div className="px-4 py-3 sm:px-5 space-y-3">
            {Array.from({ length: i === 0 ? 4 : 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-3">
                <div className="h-3 flex-1 max-w-[120px] bg-[var(--border-light)] rounded" />
                <div className="h-3 w-10 bg-[var(--border-light)] rounded" />
                <div className="h-3 w-14 bg-[var(--border-light)] rounded" />
              </div>
            ))}
          </div>
          <div className="px-4 py-3 sm:px-5 border-t border-[var(--border-light)] flex flex-col sm:flex-row gap-2">
            <div className="h-10 sm:h-9 w-full sm:w-36 bg-[var(--border-light)] rounded-xl" />
            <div className="h-10 sm:h-9 w-full sm:w-36 bg-[var(--border-light)] rounded-xl" />
            <div className="h-10 sm:h-9 w-full sm:w-28 bg-[var(--border-light)] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Error state ── */
function OrderingError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-16 px-4">
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
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h3 className="font-semibold text-[var(--text)] mb-1">
        Algo salió mal
      </h3>
      <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
        No pudimos calcular las sugerencias. Intenta de nuevo.
      </p>
      <button
        onClick={onRetry}
        className="w-full max-w-xs px-5 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
      >
        Reintentar
      </button>
    </div>
  );
}

/* ── Empty state ── */
function OrderingEmpty() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-14 h-14 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-7 h-7 text-[var(--primary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
          />
        </svg>
      </div>
      <h3 className="font-semibold text-[var(--text)] mb-1">
        Necesitas historial de facturas para generar sugerencias
      </h3>
      <p className="text-sm text-[var(--muted)] mb-6 max-w-xs mx-auto">
        Escanea tus facturas de proveedor para que podamos calcular qué pedir.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/inventory"
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary-light)]/80 rounded-xl transition-colors text-center"
        >
          Ver inventario
        </Link>
        <Link
          href="/scanner"
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors text-center"
        >
          Escanear factura
        </Link>
      </div>
    </div>
  );
}

/* ── Supplier card ── */
function SupplierCard({ group }: { group: SupplierGroup }) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const message = useMemo(() => buildWhatsAppMessage(group), [group]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Pedido - ${group.supplierName}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1e1e1e}
      h1{font-size:18px;margin-bottom:4px}
      .sub{color:#6b6b6b;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;border-bottom:2px solid #e8e6e1;padding:6px 8px;font-size:11px;text-transform:uppercase;color:#6b6b6b}
      td{padding:6px 8px;border-bottom:1px solid #f0eeea}
      .r{text-align:right}
      .total{margin-top:16px;font-size:16px;font-weight:700}
      </style></head><body>`);
    w.document.write(el.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  const digits = group.supplierPhone ? cleanPhone(group.supplierPhone) : null;
  const waLink =
    digits && digits.length >= 10
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : null;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 bg-[var(--bg)] border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text)] truncate">
              {group.supplierName}
            </h3>
            {group.supplierPhone && (
              <p className="text-xs text-[var(--muted)]">
                {group.supplierPhone}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-base sm:text-lg font-bold text-[var(--text)] tabular-nums">
              {fmt(group.subtotal)}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              {group.items.length} artículo
              {group.items.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable content */}
      <div ref={printRef} className="hidden">
        <h1>Pedido para {group.supplierName}</h1>
        <div className="sub">
          {group.supplierPhone && <span>{group.supplierPhone}</span>}
        </div>
        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th className="r">Cantidad</th>
              <th>Unidad</th>
              <th className="r">Costo pedido</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((s) => (
              <tr key={s.ingredientId}>
                <td>{s.name}</td>
                <td className="r">{s.suggestedQty}</td>
                <td>{s.unit}</td>
                <td className="r">{fmt(s.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total">
          Total estimado de reposición: {fmt(group.subtotal)}
        </div>
      </div>

      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
        <div className="col-span-3">Ingrediente</div>
        <div className="col-span-2 text-right">Pedir</div>
        <div className="col-span-1 text-center">Unidad</div>
        <div className="col-span-2 text-right">En mano</div>
        <div className="col-span-2">Motivo</div>
        <div className="col-span-2 text-right">
          <span>Costo pedido</span>
          <span className="block normal-case tracking-normal font-normal text-[10px]">
            (cantidad × precio)
          </span>
        </div>
      </div>

      {/* Desktop table rows */}
      <div className="hidden md:block divide-y divide-[var(--border-light)]">
        {group.items.map((s) => (
          <div
            key={s.ingredientId}
            className="grid grid-cols-12 gap-2 px-5 py-2.5 items-center"
          >
            <div className="col-span-3 text-sm font-medium text-[var(--text)] truncate">
              {s.name}
            </div>
            <div className="col-span-2 text-right text-sm font-bold text-[var(--text)] tabular-nums">
              {s.suggestedQty.toFixed(1)}
            </div>
            <div className="col-span-1 text-center text-sm text-[var(--muted)]">
              {s.unit}
            </div>
            <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
              {s.onHand.toFixed(1)}
            </div>
            <div className="col-span-2">
              <ReasonBadge reason={s.reason} />
            </div>
            <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
              {fmt(s.estimatedCost)}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile mini-cards */}
      <div className="md:hidden divide-y divide-[var(--border-light)]">
        {group.items.map((s) => (
          <div key={s.ingredientId} className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-[var(--text)]">
                {s.name}
              </span>
              <span className="text-sm font-bold text-[var(--text)] tabular-nums shrink-0">
                {fmt(s.estimatedCost)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
              <span>
                Pedir:{" "}
                <strong className="text-[var(--text)]">
                  {s.suggestedQty.toFixed(1)}
                </strong>{" "}
                {s.unit}
              </span>
              <span>En mano: {s.onHand.toFixed(1)}</span>
              <ReasonBadge reason={s.reason} />
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 sm:px-5 border-t border-[var(--border-light)] flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleCopy}
          className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-medium rounded-xl transition-all active:scale-[0.98] ${
            copied
              ? "bg-[var(--success)] text-white"
              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
          }`}
        >
          {copied ? "¡Copiado! ✓" : "Copiar WhatsApp 📋"}
        </button>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-medium bg-[#25D366] text-white rounded-xl hover:bg-[#20BD5C] transition-colors active:scale-[0.98] text-center"
          >
            Abrir WhatsApp
          </a>
        )}
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors active:scale-[0.98]"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function OrderingPage() {
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<OrderingData | null>(null);
  const [lastInvoice, setLastInvoice] = useState<LastInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const [orderingRes, invoicesRes] = await Promise.all([
        fetch(`/api/ordering?restaurantId=${restaurantId}`),
        fetch(
          `/api/invoices?restaurantId=${restaurantId}&status=CONFIRMED`
        ),
      ]);

      if (!orderingRes.ok) throw new Error(`HTTP ${orderingRes.status}`);
      const json = await orderingRes.json();
      setData({
        suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
        summary: {
          totalItems: json?.summary?.totalItems ?? 0,
          totalEstimatedCost: json?.summary?.totalEstimatedCost ?? 0,
        },
      });

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        if (Array.isArray(invoices) && invoices.length > 0) {
          const latest = invoices[0];
          setLastInvoice({
            total: latest.total ? Number(latest.total) : null,
            invoiceDate: latest.invoiceDate,
            supplierName: latest.supplier?.name ?? null,
          });
        }
      }
    } catch (err) {
      console.error("Load ordering error:", err);
      setHasError(true);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const suggestions = data?.suggestions ?? [];
  const summary = data?.summary ?? { totalItems: 0, totalEstimatedCost: 0 };

  const groups = useMemo((): SupplierGroup[] => {
    const map = new Map<string, SupplierGroup>();
    const NO_SUPPLIER = "__none__";

    for (const s of suggestions) {
      const key = s.supplierId ?? NO_SUPPLIER;
      if (!map.has(key)) {
        map.set(key, {
          supplierId: s.supplierId,
          supplierName: s.supplierName ?? "Sin proveedor asignado",
          supplierPhone: s.supplierPhone,
          items: [],
          subtotal: 0,
        });
      }
      const g = map.get(key)!;
      g.items.push(s);
      g.subtotal += s.estimatedCost;
    }

    for (const g of map.values()) {
      g.subtotal = Math.round(g.subtotal * 100) / 100;
    }

    const named = [...map.values()].filter((g) => g.supplierId !== null);
    const none = map.get(NO_SUPPLIER);
    named.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    return none ? [...named, none] : named;
  }, [suggestions]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            ¿Qué pedir esta semana?
          </h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Pedidos agrupados por proveedor, listos para enviar
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          ← Inventario
        </Link>
      </div>

      {isLoading ? (
        <OrderingSkeleton />
      ) : hasError ? (
        <OrderingError onRetry={load} />
      ) : suggestions.length === 0 ? (
        <OrderingEmpty />
      ) : (
        <>
          {/* Comparison card */}
          <ComparisonCard
            lastInvoice={lastInvoice}
            suggestedTotal={summary.totalEstimatedCost}
          />

          {/* Supplier cards */}
          <div className="space-y-4 sm:space-y-5">
            {groups.map((g) => (
              <SupplierCard
                key={g.supplierId ?? "__none__"}
                group={g}
              />
            ))}
          </div>

          {/* Summary bar */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm text-[var(--muted)]">
                  {summary.totalItems} ingrediente
                  {summary.totalItems !== 1 ? "s" : ""} · {groups.length}{" "}
                  proveedor{groups.length !== 1 ? "es" : ""}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums">
                    {fmt(summary.totalEstimatedCost)}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-[var(--muted)]">
                    costo estimado de reposición
                  </span>
                  <InfoTooltip text="Pedido sugerido = (cantidad a pedir) × (precio unitario) por ingrediente. Se genera cuando tu stock está 'Bajo' o 'Crítico'." />
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  Este monto NO es el total de tu última factura. Se calcula con
                  base en tu inventario actual y cantidades sugeridas.
                </p>
              </div>
              <Link
                href="/suppliers"
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium shrink-0"
              >
                Gestionar proveedores →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
