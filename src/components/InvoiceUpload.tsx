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
          let serverError: string;
          try {
            const err = await response.json();
            serverError = err.error || "Upload failed";
          } catch {
            serverError = `Error ${response.status}`;
          }

          const friendlyMessages: Record<string, string> = {
            "restaurantId is required":
              "Sesión no válida. Cierra sesión y vuelve a entrar.",
            "Restaurante no encontrado. Actualiza tu restaurantId después de reseed.":
              "Restaurante no encontrado. Cierra sesión y vuelve a entrar.",
            "No existe ningún restaurante. Ejecuta npx prisma db seed primero.":
              "No hay restaurantes. Crea uno desde la pantalla de inicio.",
          };

          throw new Error(friendlyMessages[serverError] || serverError);
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
              ? "border-[var(--primary)] bg-[var(--primary-light)] scale-[1.01]"
              : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)]/30"
          }
          ${isUploading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        <div
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200
            ${isDragging ? "bg-[var(--primary-light)]" : "bg-[var(--border-light)] group-hover:bg-[var(--accent-light)]"}
          `}
        >
          {isUploading ? (
            <svg
              className="w-6 h-6 text-[var(--primary)] animate-spin"
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
                  ? "text-[var(--primary)]"
                  : "text-zinc-400 group-hover:text-[var(--accent)]"
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
            <p className="text-sm font-medium text-[var(--text)]">
              Procesando factura...
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              La IA está extrayendo los datos
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text)]">
              Sube una factura de proveedor
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
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
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl">
          <svg
            className="w-4 h-4 text-[var(--danger)] shrink-0"
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
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}
    </div>
  );
}
