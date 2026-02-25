"use client";

import { useState } from "react";
import InvoiceUpload from "@/components/InvoiceUpload";
import InvoiceReview from "@/components/InvoiceReview";
import { useRestaurant } from "@/context/restaurant";
import { UploadResponse } from "@/lib/types";

export default function ScannerPage() {
  const { restaurantId } = useRestaurant();
  const [currentUpload, setCurrentUpload] = useState<UploadResponse | null>(
    null
  );
  const [confirmedCount, setConfirmedCount] = useState(0);

  if (currentUpload) {
    return (
      <InvoiceReview
        invoiceId={currentUpload.invoiceId}
        imageUrl={currentUpload.imageUrl}
        extraction={currentUpload.extraction}
        onConfirm={() => {
          setCurrentUpload(null);
          setConfirmedCount((prev) => prev + 1);
        }}
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
          </p>
        </div>
      )}
    </div>
  );
}
