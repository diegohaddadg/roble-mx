"use client";

import { useState, useCallback } from "react";
import { UploadResponse } from "@/lib/types";

interface InvoiceUploadProps {
  restaurantId: string;
  onUploadComplete: (data: UploadResponse) => void;
}

export default function InvoiceUpload({
  restaurantId,
  onUploadComplete,
}: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("restaurantId", restaurantId);

        const response = await fetch("/api/invoices/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Upload failed");
        }

        const data: UploadResponse = await response.json();
        onUploadComplete(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir factura");
      } finally {
        setIsUploading(false);
      }
    },
    [restaurantId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-12
        flex flex-col items-center justify-center gap-4
        transition-all duration-200 cursor-pointer
        ${
          isDragging
            ? "border-orange-400 bg-orange-50"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
        }
        ${isUploading ? "opacity-60 pointer-events-none" : ""}
      `}
      onClick={() => document.getElementById("invoice-file-input")?.click()}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
        {isUploading ? (
          <svg
            className="w-8 h-8 text-orange-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className="w-8 h-8 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      {isUploading ? (
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-700">
            Procesando factura...
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            La IA está extrayendo los datos
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-700">
            Sube una factura de proveedor
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Arrastra una imagen o PDF, o toca para tomar foto
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            JPG, PNG, WebP o PDF — máx 10MB
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        id="invoice-file-input"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
