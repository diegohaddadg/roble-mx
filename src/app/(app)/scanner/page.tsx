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
      // Impact fetch failed — proceed with normal success flow
    }

    setIsLoadingImpact(false);
    setConfirmedCount((prev) => prev + 1);
    setLastConfirmedId(invoiceId);
  }, [currentUpload, restaurantId]);

  const handleImpactDismiss = useCallback(() => {
    setImpactData(null);
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

  // Phase: showing impact
  if (impactData) {
    return <PriceImpact data={impactData} onDismiss={handleImpactDismiss} />;
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
