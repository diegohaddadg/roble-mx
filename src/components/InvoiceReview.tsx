"use client";

import { useState } from "react";
import { ExtractedInvoice, ExtractedLineItem } from "@/lib/types";

interface InvoiceReviewProps {
  invoiceId: string;
  imageUrl: string;
  extraction: ExtractedInvoice;
  onConfirm: () => void;
  onCancel: () => void;
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

export default function InvoiceReview({
  invoiceId,
  imageUrl,
  extraction,
  onConfirm,
  onCancel,
}: InvoiceReviewProps) {
  const [supplierName, setSupplierName] = useState(
    extraction.supplierName || ""
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    extraction.invoiceNumber || ""
  );
  const [invoiceDate, setInvoiceDate] = useState(
    extraction.invoiceDate || ""
  );
  const [lineItems, setLineItems] = useState<ExtractedLineItem[]>(
    extraction.lineItems
  );
  const [isConfirming, setIsConfirming] = useState(false);

  const updateLineItem = (
    index: number,
    field: keyof ExtractedLineItem,
    value: string | number
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "quantity" || field === "unitPrice") {
        const qty =
          field === "quantity" ? Number(value) : updated[index].quantity;
        const price =
          field === "unitPrice" ? Number(value) : updated[index].unitPrice;
        updated[index].totalPrice = Math.round(qty * price * 100) / 100;
      }

      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 0,
        unit: "kg",
        unitPrice: 0,
        totalPrice: 0,
        confidence: 1.0,
      },
    ]);
  };

  const calculatedTotal = lineItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: null,
          supplierName,
          invoiceNumber,
          invoiceDate,
          subtotal: calculatedTotal,
          tax: null,
          total: calculatedTotal,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            ingredientId: null,
            ingredientName: item.description,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to confirm");
      onConfirm();
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9)
      return "bg-[var(--success-light)] text-[var(--success)] border-[var(--success)]/20";
    if (confidence >= 0.7)
      return "bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/20";
    return "bg-[var(--danger-light)] text-[var(--danger)] border-[var(--danger)]/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            Revisar factura
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Verifica los datos extraídos por la IA y corrige si es necesario
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg hover:bg-[var(--border-light)] transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Invoice image */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-4 flex items-center justify-center min-h-[400px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Factura escaneada"
              className="max-w-full max-h-[600px] object-contain rounded-xl"
            />
          ) : (
            <p className="text-[var(--muted)] text-sm">Vista previa no disponible</p>
          )}
        </div>

        {/* Right: Extracted data */}
        <div className="space-y-4">
          {/* Invoice header fields */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Datos de la factura
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  No. Factura
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={inputClass}
                  placeholder="F-2024-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Fecha
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Total calculado
                </label>
                <div className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)]">
                  $
                  {calculatedTotal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                Productos ({lineItems.length})
              </h3>
              <button
                onClick={addLineItem}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-2.5 py-1 rounded-lg hover:bg-[var(--primary-light)] transition-colors"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-[var(--border-light)] rounded-xl p-3.5 space-y-3 group hover:border-[var(--border)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getConfidenceColor(item.confidence)}`}
                    >
                      {Math.round(item.confidence * 100)}% confianza
                    </span>
                    <button
                      onClick={() => removeLineItem(index)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-[var(--danger)] hover:text-[var(--danger)] transition-all"
                    >
                      Eliminar
                    </button>
                  </div>

                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    className={`${inputClass} font-medium`}
                    placeholder="Descripción del producto"
                  />

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-[var(--muted)] mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`${inputClass} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--muted)] mb-1">
                        Unidad
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          updateLineItem(index, "unit", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pza">pza</option>
                        <option value="caja">caja</option>
                        <option value="manojo">manojo</option>
                        <option value="bolsa">bolsa</option>
                        <option value="lata">lata</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--muted)] mb-1">
                        $/unidad
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`${inputClass} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--muted)] mb-1">
                        Total
                      </label>
                      <div className="px-2 py-2 bg-[var(--bg)] border border-[var(--border-light)] rounded-xl text-sm text-center font-medium text-[var(--text)]">
                        $
                        {item.totalPrice.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-5 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--text)]">
            {lineItems.length}
          </span>{" "}
          productos ·{" "}
          <span className="font-medium text-[var(--text)]">
            $
            {calculatedTotal.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}{" "}
            MXN
          </span>{" "}
          total
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium text-[var(--muted)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || lineItems.length === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            {isConfirming ? "Guardando..." : "Confirmar factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
