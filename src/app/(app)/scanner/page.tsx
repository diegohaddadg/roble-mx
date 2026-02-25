"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InvoiceUpload from "@/components/InvoiceUpload";
import InvoiceReview from "@/components/InvoiceReview";
import { useRestaurant } from "@/context/restaurant";
import { UploadResponse } from "@/lib/types";

export default function ScannerPage() {
  const { restaurantId, setRestaurantId } = useRestaurant();
  const router = useRouter();
  const [currentUpload, setCurrentUpload] = useState<UploadResponse | null>(
    null
  );
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [lastConfirmedId, setLastConfirmedId] = useState<string | null>(null);

  const handleUploadComplete = useCallback(
    (data: UploadResponse) => {
      if (data.usedFallbackRestaurantId) {
        setRestaurantId(data.usedFallbackRestaurantId);
      }
      setCurrentUpload(data);
    },
    [setRestaurantId]
  );

  const handleConfirm = useCallback(async () => {
    if (!currentUpload) return;
    const invoiceId = currentUpload.invoiceId;

    setLastConfirmedId(invoiceId);
    setConfirmedCount((prev) => prev + 1);
    setCurrentUpload(null);

    // Navigate to the standalone impact page
    router.push(`/impact/${invoiceId}`);
  }, [currentUpload, router]);

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
        onUploadComplete={handleUploadComplete}
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
