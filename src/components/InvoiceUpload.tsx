"use client";

import { useState, useCallback, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setError(
          err instanceof Error ? err.message : "Error al subir factura"
        );
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
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          group border-2 border-dashed rounded-2xl p-10 sm:p-14
          flex flex-col items-center justify-center gap-4
          transition-all duration-200 cursor-pointer
          ${
            isDragging
              ? "border-orange-400 bg-orange-50/80 scale-[1.01]"
              : "border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50/30"
          }
          ${isUploading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        <div
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200
            ${isDragging ? "bg-orange-100" : "bg-zinc-100 group-hover:bg-orange-100"}
          `}
        >
          {isUploading ? (
            <svg
              className="w-6 h-6 text-orange-500 animate-spin"
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
              className={`w-6 h-6 transition-colors duration-200 ${
                isDragging
                  ? "text-orange-500"
                  : "text-zinc-400 group-hover:text-orange-500"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
          )}
        </div>

        {isUploading ? (
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">
              Procesando factura...
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              La IA está extrayendo los datos
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">
              Sube una factura de proveedor
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Arrastra una imagen o PDF, o haz clic para seleccionar
            </p>
            <p className="text-[11px] text-zinc-300 mt-2">
              JPG, PNG, WebP o PDF — máx 10MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200/80 rounded-xl">
          <svg
            className="w-4 h-4 text-red-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
