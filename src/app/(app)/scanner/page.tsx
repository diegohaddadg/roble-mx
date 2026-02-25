"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import InvoiceUpload from "@/components/InvoiceUpload";
import InvoiceReview from "@/components/InvoiceReview";
import PriceImpact, { type ImpactData } from "@/components/PriceImpact";
import { useRestaurant } from "@/context/restaurant";
import { UploadResponse } from "@/lib/types";

export default function ScannerPage() {
  const { restaurantId } = useRestaurant();
  const [currentUpload, setCurrentUpload] = useState<UploadResponse | null>(
    null
  );
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [noImpactId, setNoImpactId] = useState<string | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [lastConfirmedId, setLastConfirmedId] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!currentUpload) return;
    const invoiceId = currentUpload.invoiceId;

    setCurrentUpload(null);
    setIsLoadingImpact(true);

    try {
      const res = await fetch(
        `/api/invoices/${invoiceId}/impact?restaurantId=${restaurantId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ingredientsAffected?.length > 0) {
          setImpactData({ ...data, invoiceId });
          setIsLoadingImpact(false);
          return;
        }
      }
    } catch {
      // Impact fetch failed — still show the no-impact screen
    }

    setIsLoadingImpact(false);
    setNoImpactId(invoiceId);
  }, [currentUpload, restaurantId]);

  const handleImpactDismiss = useCallback(() => {
    setImpactData(null);
    setConfirmedCount((prev) => prev + 1);
  }, []);

  const handleNoImpactDismiss = useCallback(() => {
    setNoImpactId(null);
    setConfirmedCount((prev) => prev + 1);
  }, []);

  // Phase: loading impact
  if (isLoadingImpact) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--muted)]">
          Calculando impacto en tus platillos...
        </p>
      </div>
    );
  }

  // Phase: showing impact (recipes affected)
  if (impactData) {
    return <PriceImpact data={impactData} onDismiss={handleImpactDismiss} />;
  }

  // Phase: no meaningful impact
  if (noImpactId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
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
          <h2 className="text-lg font-bold text-[var(--text)] mb-1">
            Sin cambios de precio relevantes
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            En esta factura no hubo cambios que afecten tus recetas (o aún no
            hay historial).
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleNoImpactDismiss}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98]"
            >
              Entendido ✓
            </button>
            <Link
              href="/invoices"
              className="px-6 py-2.5 text-sm font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
            >
              Ver historial →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Phase: reviewing extracted data
  if (currentUpload) {
    return (
      <InvoiceReview
        invoiceId={currentUpload.invoiceId}
        imageUrl={currentUpload.imageUrl}
        extraction={currentUpload.extraction}
        onConfirm={handleConfirm}
        onCancel={() => setCurrentUpload(null)}
      />
    );
  }

  // Phase: upload
  return (
    <div className="space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-2">
          Escáner de facturas
        </h1>
        <p className="text-[var(--muted)] text-sm sm:text-base">
          Toma una foto de la factura de tu proveedor. La IA extrae todos los
          productos, cantidades y precios automáticamente.
        </p>
      </div>

      <InvoiceUpload
        restaurantId={restaurantId}
        onUploadComplete={setCurrentUpload}
      />

      {confirmedCount > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[var(--success-light)] border border-[var(--success)]/20 rounded-xl">
          <svg
            className="w-4 h-4 text-[var(--success)] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          <p className="text-sm text-[var(--success)]">
            {confirmedCount} factura
            {confirmedCount !== 1 ? "s" : ""} procesada
            {confirmedCount !== 1 ? "s" : ""} en esta sesión
            {lastConfirmedId && (
              <>
                {" · "}
                <Link
                  href={`/invoices/${lastConfirmedId}`}
                  className="underline underline-offset-2 hover:text-[var(--primary)]"
                >
                  Ver factura
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
