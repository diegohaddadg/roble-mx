"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRestaurant } from "@/context/restaurant";

interface SupplierRow {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  ingredientsCount: number;
  invoicesCount: number;
  totalSpent: number;
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

export default function SuppliersPage() {
  const { restaurantId } = useRestaurant();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/suppliers?restaurantId=${restaurantId}`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load suppliers error:", err);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Proveedores
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Tus proveedores y sus ingredientes vinculados
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
        >
          + Nuevo proveedor
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-3 max-w-md">
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
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Crear"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-[var(--card)] rounded-xl border border-[var(--border-light)]"
            />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
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
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-1">
            Sin proveedores
          </h3>
          <p className="text-sm text-[var(--muted)] mb-5">
            Los proveedores se crean automáticamente al confirmar facturas, o
            puedes crear uno manualmente.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <div className="col-span-3 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Nombre
            </div>
            <div className="col-span-3 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Teléfono
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Ingredientes
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Facturas
            </div>
            <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Total gastado
            </div>
          </div>

          {suppliers.map((s) => (
            <Link
              key={s.id}
              href={`/suppliers/${s.id}`}
              className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg)]/50 transition-colors"
            >
              <div className="col-span-3 text-sm font-medium text-[var(--text)] truncate">
                {s.name}
              </div>
              <div className="col-span-3 text-sm text-[var(--muted)] truncate">
                {s.phone || "—"}
              </div>
              <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                {s.ingredientsCount}
              </div>
              <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                {s.invoicesCount}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                ${s.totalSpent.toLocaleString("es-MX", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
