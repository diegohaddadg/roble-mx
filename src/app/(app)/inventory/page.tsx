"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface InventoryRow {
  ingredientId: string;
  name: string;
  category: string | null;
  unit: string;
  onHand: number | null;
  lowThreshold: number;
  criticalThreshold: number;
  updatedAt: string | null;
  status: "OK" | "Bajo" | "Crítico" | null;
}

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

interface ExpandedIngredient {
  priceHistory: { date: string; price: number; supplierName: string }[];
  recentInvoices: {
    invoiceId: string;
    date: string;
    supplierName: string;
    qty: number;
    pricePaid: number;
  }[];
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UTILITIES
   ═══════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  "Todas",
  "Proteínas",
  "Verduras",
  "Lácteos",
  "Básicos",
  "Abarrotes",
  "Frutas",
] as const;

const fmt = (val: number) =>
  "$" +
  val.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const inputClass =
  "px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

function StatusPill({ status }: { status: "OK" | "Bajo" | "Crítico" | null }) {
  if (!status) return <span className="text-xs text-zinc-300">—</span>;
  const styles = {
    OK: "bg-[var(--success-light)] text-[var(--success)]",
    Bajo: "bg-[var(--warning-light)] text-[var(--warning)]",
    Crítico: "bg-[var(--danger-light)] text-[var(--danger)]",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${styles[status]}`}
    >
      {status}
    </span>
  );
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

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */

function InventorySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 bg-[var(--border-light)] rounded-xl"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-4 w-32 bg-[var(--border-light)] rounded" />
              <div className="h-5 w-14 bg-[var(--border-light)] rounded-full" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-[var(--border-light)] rounded" />
              <div className="h-3 w-12 bg-[var(--border-light)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INLINE EXPAND — price history + invoices + quick adjust
   ═══════════════════════════════════════════════════════════════ */

function InlineDetail({
  ingredientId,
  restaurantId,
  unit,
  onAdjusted,
}: {
  ingredientId: string;
  restaurantId: string;
  unit: string;
  onAdjusted: () => void;
}) {
  const [data, setData] = useState<ExpandedIngredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustVal, setAdjustVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/ingredients/${ingredientId}?restaurantId=${restaurantId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          setData({
            priceHistory: (json.priceHistory ?? []).slice(0, 5).map(
              (p: { date: string; price: number; supplierName?: string }) => ({
                date: p.date,
                price: Number(p.price),
                supplierName: p.supplierName ?? "",
              })
            ),
            recentInvoices: (json.recentInvoiceLines ?? [])
              .slice(0, 5)
              .map(
                (li: {
                  invoiceId: string;
                  date: string;
                  supplierName: string;
                  qty: number;
                  pricePaid: number;
                }) => ({
                  invoiceId: li.invoiceId,
                  date: li.date,
                  supplierName: li.supplierName,
                  qty: Number(li.qty),
                  pricePaid: Number(li.pricePaid),
                })
              ),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ingredientId, restaurantId]);

  const handleQuickAdjust = async () => {
    const delta = parseFloat(adjustVal);
    if (isNaN(delta)) return;
    setSaving(true);
    try {
      await fetch(
        `/api/inventory/${ingredientId}/adjust?restaurantId=${restaurantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta, notes: "Ajuste rápido" }),
        }
      );
      setAdjustVal("");
      onAdjusted();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse px-4 py-3 space-y-2">
        <div className="h-3 w-32 bg-[var(--border-light)] rounded" />
        <div className="h-3 w-48 bg-[var(--border-light)] rounded" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--border-light)] bg-[var(--bg)]/50">
      {/* Quick adjust */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          value={adjustVal}
          onChange={(e) => setAdjustVal(e.target.value)}
          placeholder="±"
          className={`${inputClass} w-20 text-center py-1.5`}
        />
        <span className="text-xs text-[var(--muted)]">{unit}</span>
        <button
          onClick={handleQuickAdjust}
          disabled={saving || !adjustVal}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "..." : "Ajustar"}
        </button>
        <Link
          href={`/inventory/${ingredientId}`}
          className="ml-auto text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
        >
          Detalle →
        </Link>
      </div>

      {/* Price history */}
      {data && data.priceHistory.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">
            Precios recientes
          </div>
          <div className="flex flex-wrap gap-2">
            {data.priceHistory.map((p, i) => (
              <div
                key={i}
                className="text-xs bg-white rounded-lg px-2 py-1 border border-[var(--border-light)]"
              >
                <span className="font-medium text-[var(--text)] tabular-nums">
                  {fmt(p.price)}
                </span>
                <span className="text-[var(--muted)] ml-1">
                  {new Date(p.date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent invoices */}
      {data && data.recentInvoices.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">
            Compras recientes
          </div>
          <div className="space-y-1">
            {data.recentInvoices.map((li, i) => (
              <Link
                key={i}
                href={`/invoices/${li.invoiceId}`}
                className="flex items-center justify-between text-xs py-1 hover:text-[var(--primary)]"
              >
                <span className="text-[var(--muted)]">
                  {new Date(li.date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {li.supplierName}
                </span>
                <span className="font-medium tabular-nums">
                  {li.qty} {unit} @ {fmt(li.pricePaid)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORDERING — Supplier Card (reused from ordering page)
   ═══════════════════════════════════════════════════════════════ */

function buildWhatsAppMessage(group: SupplierGroup): string {
  const lines = group.items.map(
    (s) => `- ${s.name}: ${s.suggestedQty} ${s.unit}`
  );
  return `Hola ${group.supplierName}, necesito para esta semana:\n${lines.join("\n")}\n\nTotal estimado: ${fmt(group.subtotal)}\nGracias!`;
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
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
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
            <div className="text-base font-bold text-[var(--text)] tabular-nums">
              {fmt(group.subtotal)}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              {group.items.length} artículo
              {group.items.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable */}
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
              <th className="r">Costo</th>
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
        <div className="total">Total estimado: {fmt(group.subtotal)}</div>
      </div>

      {/* Items */}
      <div className="divide-y divide-[var(--border-light)]">
        {group.items.map((s) => (
          <div key={s.ingredientId} className="px-4 py-3 space-y-1">
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

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[var(--border-light)] flex flex-col sm:flex-row gap-2">
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

/* ═══════════════════════════════════════════════════════════════
   MAIN INVENTORY PAGE
   ═══════════════════════════════════════════════════════════════ */

type Tab = "stock" | "ordering";

export default function InventoryPage() {
  const { restaurantId } = useRestaurant();
  const [tab, setTab] = useState<Tab>("stock");

  // Stock state
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initializingId, setInitializingId] = useState<string | null>(null);

  // Ordering state
  const [orderData, setOrderData] = useState<OrderingData | null>(null);
  const [lastInvoice, setLastInvoice] = useState<LastInvoice | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [orderLoaded, setOrderLoaded] = useState(false);

  /* ── Load stock ── */
  const loadStock = useCallback(async () => {
    if (!restaurantId) return;
    setStockLoading(true);
    setStockError(null);
    try {
      const res = await fetch(`/api/inventory?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setStockError(
        "No pudimos cargar tu inventario. Revisa tu conexión e intenta de nuevo."
      );
    } finally {
      setStockLoading(false);
    }
  }, [restaurantId]);

  /* ── Load ordering ── */
  const loadOrdering = useCallback(async () => {
    if (!restaurantId) return;
    setOrderLoading(true);
    setOrderError(false);
    try {
      const [orderingRes, invoicesRes] = await Promise.all([
        fetch(`/api/ordering?restaurantId=${restaurantId}`),
        fetch(
          `/api/invoices?restaurantId=${restaurantId}&status=CONFIRMED`
        ),
      ]);
      if (!orderingRes.ok) throw new Error("ordering failed");
      const json = await orderingRes.json();
      setOrderData({
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
    } catch {
      setOrderError(true);
      setOrderData(null);
    } finally {
      setOrderLoading(false);
      setOrderLoaded(true);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Lazy-load ordering data when tab switches
  useEffect(() => {
    if (tab === "ordering" && !orderLoaded) {
      loadOrdering();
    }
  }, [tab, orderLoaded, loadOrdering]);

  /* ── Handlers ── */
  const handleInitialize = async (ingredientId: string) => {
    if (!restaurantId) return;
    setInitializingId(ingredientId);
    try {
      await fetch(
        `/api/inventory/${ingredientId}/adjust?restaurantId=${restaurantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setCount: 0, notes: "Inicialización" }),
        }
      );
      await loadStock();
    } finally {
      setInitializingId(null);
    }
  };

  /* ── Computed ── */
  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (category !== "Todas") {
      list = list.filter((r) => r.category === category);
    }
    return list;
  }, [rows, search, category]);

  const counts = useMemo(() => {
    let ok = 0,
      bajo = 0,
      critico = 0;
    for (const r of rows) {
      if (r.status === "OK") ok++;
      else if (r.status === "Bajo") bajo++;
      else if (r.status === "Crítico") critico++;
    }
    return { ok, bajo, critico };
  }, [rows]);

  const suggestions = orderData?.suggestions ?? [];
  const summary = orderData?.summary ?? {
    totalItems: 0,
    totalEstimatedCost: 0,
  };

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
    for (const g of map.values())
      g.subtotal = Math.round(g.subtotal * 100) / 100;
    const named = [...map.values()].filter((g) => g.supplierId !== null);
    const none = map.get(NO_SUPPLIER);
    named.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    return none ? [...named, none] : named;
  }, [suggestions]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isLoading = tab === "stock" ? stockLoading : orderLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          Inventario
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          {tab === "stock"
            ? "Stock actual de tus ingredientes"
            : "Pedidos sugeridos por proveedor"}
        </p>
      </div>

      {/* Segmented control */}
      <div className="flex bg-[var(--border-light)] rounded-xl p-1 max-w-xs">
        <button
          onClick={() => setTab("stock")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "stock"
              ? "bg-white text-[var(--text)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Mi stock
        </button>
        <button
          onClick={() => setTab("ordering")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "ordering"
              ? "bg-white text-[var(--text)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Qué pedir
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && <InventorySkeleton />}

      {/* ═══════════════════════════════════════════════════════
         TAB: MI STOCK
         ═══════════════════════════════════════════════════════ */}
      {tab === "stock" && !stockLoading && (
        <>
          {stockError ? (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--muted)] mb-4">{stockError}</p>
              <button
                onClick={loadStock}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20">
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
                    d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-1">
                Sin ingredientes registrados
              </h3>
              <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
                Escanea facturas para llenar tu inventario
              </p>
              <Link
                href="/scanner"
                className="inline-flex px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
              >
                Escanear factura →
              </Link>
            </div>
          ) : (
            <>
              {/* Status summary */}
              <div className="flex flex-wrap gap-3">
                {counts.critico > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--danger-light)] rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                    <span className="text-xs font-semibold text-[var(--danger)]">
                      {counts.critico} crítico
                      {counts.critico !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {counts.bajo > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--warning-light)] rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <span className="text-xs font-semibold text-[var(--warning)]">
                      {counts.bajo} bajo{counts.bajo !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--success-light)] rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                  <span className="text-xs font-semibold text-[var(--success)]">
                    {counts.ok} OK
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ingrediente..."
                  className={`${inputClass} flex-1`}
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputClass} w-full sm:w-44`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-[var(--muted)] mb-3">
                    Sin resultados para estos filtros
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("Todas");
                    }}
                    className="text-sm text-[var(--primary)] font-medium"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((row) => {
                    const isExpanded = expandedId === row.ingredientId;
                    return (
                      <div
                        key={row.ingredientId}
                        className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : row.ingredientId
                            )
                          }
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--bg)]/50 transition-colors active:scale-[0.995]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text)] truncate">
                                {row.name}
                              </span>
                              {row.category && (
                                <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
                                  {row.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted)]">
                              <span>
                                {row.onHand !== null
                                  ? `${row.onHand.toFixed(1)} ${row.unit}`
                                  : "Sin inventario"}
                              </span>
                              <span>{formatDate(row.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {row.onHand !== null ? (
                              <StatusPill status={row.status} />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitialize(row.ingredientId);
                                }}
                                disabled={initializingId === row.ingredientId}
                                className="text-[11px] font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] disabled:opacity-50"
                              >
                                {initializingId === row.ingredientId
                                  ? "..."
                                  : "Inicializar"}
                              </button>
                            )}
                            <svg
                              className={`w-4 h-4 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <InlineDetail
                            ingredientId={row.ingredientId}
                            restaurantId={restaurantId}
                            unit={row.unit}
                            onAdjusted={loadStock}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conteo rápido button */}
              <div className="text-center">
                <Link
                  href="/inventory/batch"
                  className="hidden"
                >
                  {/* Placeholder for future batch count feature */}
                </Link>
              </div>

              <p className="text-xs text-[var(--muted)] text-center">
                {filtered.length} de {rows.length} ingrediente
                {rows.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
         TAB: QUÉ PEDIR
         ═══════════════════════════════════════════════════════ */}
      {tab === "ordering" && !orderLoading && (
        <>
          {orderError ? (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--muted)] mb-4">
                No pudimos calcular las sugerencias. Intenta de nuevo.
              </p>
              <button
                onClick={loadOrdering}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-20">
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
                Todo está en orden
              </h3>
              <p className="text-sm text-[var(--muted)] mb-5 max-w-xs mx-auto">
                No hay sugerencias de compra por ahora. Tu inventario está bien.
              </p>
              <button
                onClick={() => setTab("stock")}
                className="px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] rounded-xl transition-colors"
              >
                Ver stock →
              </button>
            </div>
          ) : (
            <>
              {/* Comparison card */}
              {lastInvoice && lastInvoice.total != null && (
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
                        Última factura
                      </div>
                      <div className="text-lg font-bold text-[var(--text)] tabular-nums">
                        {fmt(Number(lastInvoice.total))}
                      </div>
                      {lastInvoice.invoiceDate && (
                        <div className="text-[11px] text-[var(--muted)]">
                          {new Date(
                            lastInvoice.invoiceDate
                          ).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                          {lastInvoice.supplierName &&
                            ` · ${lastInvoice.supplierName}`}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
                        Pedido sugerido
                      </div>
                      <div className="text-lg font-bold text-[var(--primary)] tabular-nums">
                        {fmt(summary.totalEstimatedCost)}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        Basado en inventario actual
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
                        Diferencia
                      </div>
                      {(() => {
                        const diff =
                          summary.totalEstimatedCost -
                          Number(lastInvoice.total);
                        return (
                          <div
                            className={`text-lg font-bold tabular-nums ${diff > 0 ? "text-[var(--danger)]" : diff < 0 ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
                          >
                            {diff > 0 ? "+" : ""}
                            {fmt(diff)}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier cards */}
              <div className="space-y-4">
                {groups.map((g) => (
                  <SupplierCard
                    key={g.supplierId ?? "__none__"}
                    group={g}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-xs text-[var(--muted)]">
                      {summary.totalItems} ingrediente
                      {summary.totalItems !== 1 ? "s" : ""} · {groups.length}{" "}
                      proveedor{groups.length !== 1 ? "es" : ""}
                    </div>
                    <div className="text-xl font-bold text-[var(--text)] tabular-nums">
                      {fmt(summary.totalEstimatedCost)}
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Costo estimado de reposición (pedido sugerido)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
