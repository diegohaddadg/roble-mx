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

function ReasonBadge({ reason }: { reason: string }) {
  const map: Record<string, string> = {
    Crítico: "bg-[var(--danger-light)] text-[var(--danger)]",
    "Bajo stock": "bg-[var(--warning-light)] text-[var(--warning)]",
    "Reposición (uso semanal)":
      "bg-[var(--primary-light)] text-[var(--primary)]",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${map[reason] ?? "bg-zinc-100 text-zinc-600"}`}
    >
      {reason}
    </span>
  );
}

function buildWhatsAppMessage(group: SupplierGroup): string {
  const lines = group.items.map(
    (s) => `- ${s.name}: ${s.suggestedQty} ${s.unit}`
  );
  const total = `$${group.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `Hola ${group.supplierName}, necesito para esta semana:\n${lines.join("\n")}\n\nTotal estimado: ${total}\nGracias!`;
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

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
      {/* Card header */}
      <div className="px-5 py-4 bg-[var(--bg)] border-b border-[var(--border-light)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              {group.supplierName}
            </h3>
            {group.supplierPhone && (
              <p className="text-xs text-[var(--muted)]">
                {group.supplierPhone}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[var(--text)] tabular-nums">
              $
              {group.subtotal.toLocaleString("es-MX", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              {group.items.length} artículo
              {group.items.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Printable content (hidden, used for print) */}
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
              <th className="r">Costo est.</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((s) => (
              <tr key={s.ingredientId}>
                <td>{s.name}</td>
                <td className="r">{s.suggestedQty}</td>
                <td>{s.unit}</td>
                <td className="r">
                  $
                  {s.estimatedCost.toLocaleString("es-MX", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total">
          Total estimado: $
          {group.subtotal.toLocaleString("es-MX", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </div>
      </div>

      {/* Items table */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
        <div className="col-span-3">Ingrediente</div>
        <div className="col-span-2 text-right">Pedir</div>
        <div className="col-span-1 text-center">Unidad</div>
        <div className="col-span-2 text-right">En mano</div>
        <div className="col-span-2">Motivo</div>
        <div className="col-span-2 text-right">Costo est.</div>
      </div>
      <div className="divide-y divide-[var(--border-light)]">
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
              $
              {s.estimatedCost.toLocaleString("es-MX", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-[var(--border-light)] flex flex-wrap gap-2">
        <button
          onClick={handleCopy}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-all active:scale-[0.98] ${
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
            className="px-4 py-2 text-xs font-medium bg-[#25D366] text-white rounded-xl hover:bg-[#20BD5C] transition-colors active:scale-[0.98]"
          >
            Abrir WhatsApp
          </a>
        )}
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-xs font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

export default function OrderingPage() {
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<OrderingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch(`/api/ordering?restaurantId=${restaurantId}`);
      const json = await res.json();
      setData({
        suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
        summary: {
          totalItems: json?.summary?.totalItems ?? 0,
          totalEstimatedCost: json?.summary?.totalEstimatedCost ?? 0,
        },
      });
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

    // Round subtotals
    for (const g of map.values()) {
      g.subtotal = Math.round(g.subtotal * 100) / 100;
    }

    // Named suppliers first, then "sin proveedor"
    const named = [...map.values()].filter((g) => g.supplierId !== null);
    const none = map.get(NO_SUPPLIER);
    named.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    return none ? [...named, none] : named;
  }, [suggestions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            ¿Qué pedir esta semana?
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
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
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-[var(--card)] rounded-2xl border border-[var(--border-light)]"
            />
          ))}
        </div>
      ) : hasError ? (
        <div className="text-center py-20">
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
          <p className="text-sm text-[var(--muted)] mb-5">
            No pudimos calcular las sugerencias. Intenta de nuevo.
          </p>
          <button
            onClick={load}
            className="px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
          >
            Reintentar
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--success-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--success)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            No necesitas pedir nada ahora
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Tu inventario está cubierto. Revisa de nuevo en unos días.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inventory"
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              Ir a Inventario →
            </Link>
            <Link
              href="/scanner"
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] font-medium"
            >
              Escanear factura →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Supplier cards */}
          <div className="space-y-5">
            {groups.map((g) => (
              <SupplierCard
                key={g.supplierId ?? "__none__"}
                group={g}
              />
            ))}
          </div>

          {/* Grand total */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--muted)]">
                  {summary.totalItems} ingrediente
                  {summary.totalItems !== 1 ? "s" : ""} · {groups.length}{" "}
                  proveedor{groups.length !== 1 ? "es" : ""}
                </div>
                <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
                  $
                  {summary.totalEstimatedCost.toLocaleString("es-MX", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  <span className="text-sm font-normal text-[var(--muted)] ml-1">
                    costo total estimado
                  </span>
                </div>
              </div>
              <Link
                href="/suppliers"
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
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
