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
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">
          Escáner de facturas
        </h1>
        <p className="text-zinc-500">
          Toma una foto de la factura de tu proveedor. La IA extrae todos los
          productos, cantidades y precios automáticamente.
        </p>
      </div>
      <InvoiceUpload
        restaurantId={restaurantId}
        onUploadComplete={setCurrentUpload}
      />
      {confirmedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-sm text-emerald-700">
            {confirmedCount} factura
            {confirmedCount !== 1 ? "s" : ""} procesada
            {confirmedCount !== 1 ? "s" : ""} en esta sesión
          </p>
        </div>
      )}
    </div>
  );
}
