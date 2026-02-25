"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
}

interface OrderingData {
  suggestions: Suggestion[];
  summary: {
    totalItems: number;
    totalEstimatedCost: number;
  };
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

export default function OrderingPage() {
  const { restaurantId } = useRestaurant();
  const [data, setData] = useState<OrderingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const whatsAppText = useMemo(() => {
    if (!suggestions.length) return "";
    const lines = suggestions.map(
      (s) => `- ${s.name}: ${s.suggestedQty} ${s.unit}`
    );
    return `Lista de pedido:\n${lines.join("\n")}\n\nTotal estimado: $${summary.totalEstimatedCost.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [suggestions, summary]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = whatsAppText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            ¿Qué pedir esta semana?
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Sugerencias basadas en tu consumo de los últimos 28 días
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
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[var(--card)] rounded-xl border border-[var(--border-light)]"
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
          {/* Table */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
              <div className="col-span-3 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Ingrediente
              </div>
              <div className="col-span-1 text-center text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Unidad
              </div>
              <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                En mano
              </div>
              <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Pedir
              </div>
              <div className="col-span-2 text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Razón
              </div>
              <div className="col-span-2 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                Costo est.
              </div>
            </div>

            <div className="divide-y divide-[var(--border-light)]">
              {suggestions.map((s) => (
                <div
                  key={s.ingredientId}
                  className="grid grid-cols-12 gap-2 px-5 py-3 items-center"
                >
                  <div className="col-span-3 text-sm font-medium text-[var(--text)] truncate">
                    {s.name}
                  </div>
                  <div className="col-span-1 text-center text-sm text-[var(--muted)]">
                    {s.unit}
                  </div>
                  <div className="col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">
                    {s.onHand.toFixed(1)}
                  </div>
                  <div className="col-span-2 text-right text-sm font-bold text-[var(--text)] tabular-nums">
                    {s.suggestedQty.toFixed(1)}
                  </div>
                  <div className="col-span-2">
                    <ReasonBadge reason={s.reason} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                    ${s.estimatedCost.toLocaleString("es-MX", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary + Copy */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--muted)]">
                  {summary.totalItems} ingrediente
                  {summary.totalItems !== 1 ? "s" : ""} por pedir
                </div>
                <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
                  $
                  {summary.totalEstimatedCost.toLocaleString("es-MX", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  <span className="text-sm font-normal text-[var(--muted)] ml-1">
                    costo estimado
                  </span>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] ${
                  copied
                    ? "bg-[var(--success)] text-white"
                    : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                }`}
              >
                {copied ? "¡Copiado! ✓" : "Copiar lista 📋"}
              </button>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border-light)]">
              <div className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                Vista previa WhatsApp
              </div>
              <pre className="text-sm text-[var(--text)] whitespace-pre-wrap font-sans">
                {whatsAppText}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
