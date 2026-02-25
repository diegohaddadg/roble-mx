"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";

interface Movement {
  id: string;
  date: string;
  source: string;
  delta: number;
  newOnHand: number;
  notes: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

interface InvLevel {
  onHand: number;
  lowThreshold: number;
  criticalThreshold: number;
  updatedAt: string;
  status: "OK" | "Bajo" | "Crítico";
}

interface InvDetail {
  ingredient: {
    id: string;
    name: string;
    category: string | null;
    unit: string;
    currentPrice: number | null;
  };
  inventoryLevel: InvLevel | null;
  movements: Movement[];
  recentInvoiceLines: {
    invoiceId: string;
    date: string;
    supplierName: string;
    qty: number;
    unit: string;
    pricePaid: number;
  }[];
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OK: "bg-[var(--success-light)] text-[var(--success)]",
    Bajo: "bg-[var(--warning-light)] text-[var(--warning)]",
    Crítico: "bg-[var(--danger-light)] text-[var(--danger)]",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${styles[status] ?? "bg-zinc-100 text-zinc-500"}`}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    INVOICE: {
      label: "Factura",
      cls: "bg-blue-50 text-blue-700",
    },
    MANUAL_ADJUST: {
      label: "Ajuste",
      cls: "bg-[var(--warning-light)] text-[var(--warning)]",
    },
    PHYSICAL_COUNT: {
      label: "Conteo",
      cls: "bg-[var(--primary-light)] text-[var(--primary)]",
    },
  };
  const s = map[source] ?? { label: source, cls: "bg-zinc-100 text-zinc-600" };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<InvDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Adjust form
  const [mode, setMode] = useState<"adjust" | "count" | null>(null);
  const [deltaInput, setDeltaInput] = useState("");
  const [countInput, setCountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId || !id) return;
    try {
      const res = await fetch(
        `/api/inventory/${id}?restaurantId=${restaurantId}`
      );
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id, restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInitialize = async () => {
    if (!restaurantId || !id) return;
    setIsSaving(true);
    try {
      await fetch(
        `/api/inventory/${id}/adjust?restaurantId=${restaurantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setCount: 0, notes: "Inicialización" }),
        }
      );
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!restaurantId || !id) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (mode === "adjust") {
        body.delta = parseFloat(deltaInput);
        if (isNaN(body.delta as number)) return;
      } else {
        body.setCount = parseFloat(countInput);
        if (isNaN(body.setCount as number)) return;
      }
      if (noteInput.trim()) body.notes = noteInput.trim();

      await fetch(
        `/api/inventory/${id}/adjust?restaurantId=${restaurantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      setMode(null);
      setDeltaInput("");
      setCountInput("");
      setNoteInput("");
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatShortDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
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
        <div className="h-48 bg-[var(--card)] rounded-2xl border border-[var(--border-light)]" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="text-center py-20">
        <h3 className="font-semibold text-[var(--text)] mb-1">
          Ingrediente no encontrado
        </h3>
        <Link
          href="/inventory"
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
        >
          ← Volver a inventario
        </Link>
      </div>
    );
  }

  const { ingredient, inventoryLevel, movements, recentInvoiceLines } = data;
  const hasLevel = inventoryLevel !== null;

  return (
    <div className="space-y-6">
      <Link
        href="/inventory"
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
        Volver a inventario
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
          {hasLevel ? (
            <>
              <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
                {inventoryLevel.onHand.toFixed(1)}
                <span className="text-sm font-normal text-[var(--muted)] ml-1">
                  {ingredient.unit}
                </span>
              </div>
              <StatusPill status={inventoryLevel.status} />
            </>
          ) : (
            <button
              onClick={handleInitialize}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50"
            >
              Inicializar inventario
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {hasLevel && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setMode(mode === "adjust" ? null : "adjust")}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                mode === "adjust"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--border-light)]"
              }`}
            >
              ± Ajustar
            </button>
            <button
              onClick={() => setMode(mode === "count" ? null : "count")}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                mode === "count"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--border-light)]"
              }`}
            >
              Conteo físico
            </button>
          </div>

          {mode && (
            <div className="space-y-3 max-w-sm">
              {mode === "adjust" ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    Delta (+/-)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={deltaInput}
                    onChange={(e) => setDeltaInput(e.target.value)}
                    placeholder="Ej: -2.5 o +5"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    Cantidad exacta en mano
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    placeholder="Ej: 12.5"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Merma, conteo semanal..."
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={
                  isSaving ||
                  (mode === "adjust" && !deltaInput) ||
                  (mode === "count" && !countInput)
                }
                className="px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Movements */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
            Historial de movimientos ({movements.length})
          </h3>
        </div>
        {movements.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--muted)]">
              Sin movimientos registrados
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
              <div className="col-span-3">Fecha</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2 text-right">Delta</div>
              <div className="col-span-2 text-right">Stock</div>
              <div className="col-span-3">Notas</div>
            </div>
            <div className="divide-y divide-[var(--border-light)]">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-12 gap-2 px-5 py-2.5 items-center"
                >
                  <div className="col-span-3 text-xs text-[var(--muted)]">
                    {formatDate(m.date)}
                  </div>
                  <div className="col-span-2">
                    <SourceBadge source={m.source} />
                  </div>
                  <div
                    className={`col-span-2 text-right text-sm font-medium tabular-nums ${
                      m.delta > 0
                        ? "text-[var(--success)]"
                        : m.delta < 0
                          ? "text-[var(--danger)]"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta.toFixed(1)}
                  </div>
                  <div className="col-span-2 text-right text-sm text-[var(--text)] tabular-nums">
                    {m.newOnHand.toFixed(1)}
                  </div>
                  <div className="col-span-3 text-xs text-[var(--muted)] truncate">
                    {m.invoiceId ? (
                      <Link
                        href={`/invoices/${m.invoiceId}`}
                        className="text-[var(--primary)] hover:underline"
                      >
                        {m.invoiceNumber
                          ? `#${m.invoiceNumber}`
                          : "Ver factura"}
                      </Link>
                    ) : (
                      m.notes || "—"
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent invoices */}
      {recentInvoiceLines.length > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Compras recientes ({recentInvoiceLines.length})
            </h3>
          </div>
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border-light)]">
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
                  {formatShortDate(li.date)}
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
        </div>
      )}
    </div>
  );
}
