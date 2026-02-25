"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";

interface SupplierDetail {
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
  linkedIngredients: {
    id: string;
    name: string;
    category: string | null;
    unit: string;
    currentPrice: number | null;
  }[];
  recentInvoices: {
    id: string;
    invoiceNumber: string | null;
    date: string | null;
    total: number | null;
    lineItemsCount: number;
  }[];
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<SupplierDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [allIngredients, setAllIngredients] = useState<
    { id: string; name: string }[]
  >([]);
  const [linkIngId, setLinkIngId] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId || !id) return;
    try {
      const [supRes, ingRes] = await Promise.all([
        fetch(`/api/suppliers/${id}?restaurantId=${restaurantId}`),
        fetch(`/api/ingredients?restaurantId=${restaurantId}`),
      ]);
      if (supRes.status === 404) {
        setNotFound(true);
        return;
      }
      setData(await supRes.json());
      const ingData = await ingRes.json();
      if (Array.isArray(ingData)) setAllIngredients(ingData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id, restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLink = async () => {
    if (!linkIngId || !restaurantId) return;
    setIsLinking(true);
    try {
      await fetch(
        `/api/ingredients/${linkIngId}/preferred-supplier?restaurantId=${restaurantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredSupplierId: id }),
        }
      );
      setLinkIngId("");
      await load();
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (ingredientId: string) => {
    if (!restaurantId) return;
    await fetch(
      `/api/ingredients/${ingredientId}/preferred-supplier?restaurantId=${restaurantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredSupplierId: null }),
      }
    );
    await load();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 bg-zinc-200/60 rounded w-40" />
        <div className="h-8 bg-zinc-200/60 rounded-lg w-64" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="text-center py-20">
        <h3 className="font-semibold text-[var(--text)] mb-1">
          Proveedor no encontrado
        </h3>
        <Link
          href="/suppliers"
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
        >
          ← Volver a proveedores
        </Link>
      </div>
    );
  }

  const { supplier, linkedIngredients, recentInvoices } = data;
  const linkedIds = new Set(linkedIngredients.map((i) => i.id));
  const unlinked = allIngredients.filter((i) => !linkedIds.has(i.id));

  return (
    <div className="space-y-6">
      <Link
        href="/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Volver a proveedores
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
          {supplier.name}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[var(--muted)]">
          {supplier.contactName && <span>{supplier.contactName}</span>}
          {supplier.phone && <span>{supplier.phone}</span>}
          {supplier.email && <span>{supplier.email}</span>}
        </div>
        {supplier.notes && (
          <p className="text-sm text-[var(--muted)] mt-2 italic">
            {supplier.notes}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linked ingredients */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Ingredientes vinculados ({linkedIngredients.length})
            </h3>
          </div>
          {linkedIngredients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--muted)]">
                Sin ingredientes vinculados
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {linkedIngredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between px-5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {ing.name}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {ing.category} · {ing.unit}
                      {ing.currentPrice !== null &&
                        ` · $${ing.currentPrice.toFixed(2)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(ing.id)}
                    className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 font-medium"
                  >
                    Desvincular
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link ingredient */}
          {unlinked.length > 0 && (
            <div className="px-5 py-3 border-t border-[var(--border-light)] flex gap-2">
              <select
                value={linkIngId}
                onChange={(e) => setLinkIngId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
              >
                <option value="">Vincular ingrediente...</option>
                {unlinked.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLink}
                disabled={!linkIngId || isLinking}
                className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Recent invoices */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Facturas recientes ({recentInvoices.length})
            </h3>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--muted)]">
                Sin facturas registradas
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--bg)]/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {inv.invoiceNumber ?? "Sin número"}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {formatDate(inv.date)} · {inv.lineItemsCount} artículos
                    </div>
                  </div>
                  {inv.total !== null && (
                    <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                      ${inv.total.toLocaleString("es-MX", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
