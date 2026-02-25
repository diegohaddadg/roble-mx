"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

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

const CATEGORIES = [
  "Todas",
  "Proteínas",
  "Verduras",
  "Lácteos",
  "Básicos",
  "Abarrotes",
  "Frutas",
] as const;

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

export default function InventoryPage() {
  const { restaurantId } = useRestaurant();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [initializingId, setInitializingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory?restaurantId=${restaurantId}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load inventory error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

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
      await load();
    } catch (err) {
      console.error("Initialize error:", err);
    } finally {
      setInitializingId(null);
    }
  };

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
      critico = 0,
      sinInv = 0;
    for (const r of rows) {
      if (r.status === "OK") ok++;
      else if (r.status === "Bajo") bajo++;
      else if (r.status === "Crítico") critico++;
      else sinInv++;
    }
    return { ok, bajo, critico, sinInv };
  }, [rows]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Inventario
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Stock actual de tus ingredientes
          </p>
        </div>
        <Link
          href="/ordering"
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
        >
          ¿Qué pedir? →
        </Link>
      </div>

      {/* Summary pills */}
      {!isLoading && rows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {counts.critico > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--danger-light)] rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
              <span className="text-xs font-semibold text-[var(--danger)]">
                {counts.critico} crítico{counts.critico !== 1 ? "s" : ""}
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
          {counts.sinInv > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border-light)] rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[var(--muted)]" />
              <span className="text-xs font-semibold text-[var(--muted)]">
                {counts.sinInv} sin inventario
              </span>
            </div>
          )}
        </div>
      )}

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

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[var(--card)] rounded-xl border border-[var(--border-light)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            {rows.length === 0
              ? "Sin ingredientes registrados"
              : "Sin resultados"}
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            {rows.length === 0
              ? "Escanea facturas para registrar ingredientes automáticamente"
              : "Intenta con otro término de búsqueda o categoría"}
          </p>
          {rows.length === 0 && (
            <Link
              href="/scanner"
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              Escanear factura →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <div className="col-span-3 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Ingrediente
            </div>
            <div className="col-span-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Categoría
            </div>
            <div className="col-span-1 text-center text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Unidad
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              En mano
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Actualizado
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Estado
            </div>
          </div>

          {/* Rows */}
          {filtered.map((row) => (
            <div
              key={row.ingredientId}
              className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors"
            >
              {row.onHand !== null ? (
                <Link
                  href={`/inventory/${row.ingredientId}`}
                  className="col-span-3 text-sm font-medium text-[var(--text)] truncate hover:text-[var(--primary)] transition-colors"
                >
                  {row.name}
                </Link>
              ) : (
                <span className="col-span-3 text-sm font-medium text-[var(--text)] truncate">
                  {row.name}
                </span>
              )}
              <div className="col-span-2 text-sm text-[var(--muted)] truncate">
                {row.category ?? "—"}
              </div>
              <div className="col-span-1 text-center text-sm text-[var(--muted)]">
                {row.unit}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                {row.onHand !== null ? row.onHand.toFixed(1) : "—"}
              </div>
              <div className="col-span-2 text-right text-xs text-[var(--muted)]">
                {formatDate(row.updatedAt)}
              </div>
              <div className="col-span-2 text-right">
                {row.onHand !== null ? (
                  <StatusPill status={row.status} />
                ) : (
                  <button
                    onClick={() => handleInitialize(row.ingredientId)}
                    disabled={initializingId === row.ingredientId}
                    className="text-[11px] font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {initializingId === row.ingredientId
                      ? "..."
                      : "Inicializar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--muted)] text-center">
        {filtered.length} de {rows.length} ingrediente
        {rows.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
