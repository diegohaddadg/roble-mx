"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface SupplierRow {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  ingredientsCount: number;
  invoicesCount: number;
  totalSpent: number;
}

function fmt(val: number): string {
  return `$${Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

/* ── Loading skeleton ── */
function SuppliersSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-36 bg-[var(--border-light)] rounded" />
              <div className="h-3 w-24 bg-[var(--border-light)] rounded" />
            </div>
            <div className="h-5 w-20 bg-[var(--border-light)] rounded" />
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-24 bg-[var(--border-light)] rounded" />
            <div className="h-3 w-20 bg-[var(--border-light)] rounded" />
            <div className="h-3 w-16 bg-[var(--border-light)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Error state ── */
function SuppliersError({ onRetry }: { onRetry: () => void }) {
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
        No pudimos cargar los proveedores. Intenta de nuevo.
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
function SuppliersEmpty() {
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
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <h3 className="font-semibold text-[var(--text)] mb-1">
        Tus proveedores se crean al confirmar facturas
      </h3>
      <p className="text-sm text-[var(--muted)] mb-6 max-w-xs mx-auto">
        Escanea una factura y confirma los datos para registrar proveedores
        automáticamente, o crea uno manualmente arriba.
      </p>
      <Link
        href="/scanner"
        className="inline-flex px-5 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
      >
        Escanear factura
      </Link>
    </div>
  );
}

/* ── Main page ── */
export default function SuppliersPage() {
  const { restaurantId } = useRestaurant();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch(`/api/suppliers?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load suppliers error:", err);
      setHasError(true);
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!restaurantId || !newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewPhone("");
        setShowCreate(false);
        await load();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Proveedores
          </h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Tus proveedores y sus ingredientes vinculados
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
        >
          + Nuevo proveedor
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 sm:p-5 space-y-3 max-w-md">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del proveedor"
            className={inputClass}
            autoFocus
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Teléfono (opcional, para WhatsApp)"
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {isSaving ? "Guardando..." : "Crear"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 sm:py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <SuppliersSkeleton />
      ) : hasError ? (
        <SuppliersError onRetry={load} />
      ) : suppliers.length === 0 ? (
        <SuppliersEmpty />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                className="block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text)] truncate">
                      {s.name}
                    </h3>
                    {(s.phone || s.contactName) && (
                      <p className="text-xs text-[var(--muted)] mt-0.5 truncate">
                        {[s.contactName, s.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[var(--text)] tabular-nums shrink-0">
                    {fmt(s.totalSpent)}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {s.ingredientsCount} ingrediente
                  {s.ingredientsCount !== 1 ? "s" : ""} ·{" "}
                  {s.invoicesCount} factura
                  {s.invoicesCount !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
              <div className="col-span-3 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Nombre
              </div>
              <div className="col-span-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Contacto
              </div>
              <div className="col-span-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Teléfono
              </div>
              <div className="col-span-1 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Ingred.
              </div>
              <div className="col-span-1 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Facturas
              </div>
              <div className="col-span-3 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Total gastado
              </div>
            </div>

            <div className="divide-y divide-[var(--border-light)]">
              {suppliers.map((s) => (
                <Link
                  key={s.id}
                  href={`/suppliers/${s.id}`}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-[var(--bg)]/50 transition-colors items-center"
                >
                  <div className="col-span-3 text-sm font-medium text-[var(--text)] truncate">
                    {s.name}
                  </div>
                  <div className="col-span-2 text-sm text-[var(--muted)] truncate">
                    {s.contactName || "—"}
                  </div>
                  <div className="col-span-2 text-sm text-[var(--muted)] truncate">
                    {s.phone || "—"}
                  </div>
                  <div className="col-span-1 text-right text-sm text-[var(--muted)] tabular-nums">
                    {s.ingredientsCount}
                  </div>
                  <div className="col-span-1 text-right text-sm text-[var(--muted)] tabular-nums">
                    {s.invoicesCount}
                  </div>
                  <div className="col-span-3 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                    {fmt(s.totalSpent)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
