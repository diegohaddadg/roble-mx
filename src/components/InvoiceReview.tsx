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
  "w-full px-3 py-2 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors";

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
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    if (confidence >= 0.7)
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    return "bg-red-50 text-red-700 border-red-200/80";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Revisar factura
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Verifica los datos extraídos por la IA y corrige si es necesario
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Invoice image */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center justify-center min-h-[400px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Factura escaneada"
              className="max-w-full max-h-[600px] object-contain rounded-xl"
            />
          ) : (
            <p className="text-zinc-400 text-sm">Vista previa no disponible</p>
          )}
        </div>

        {/* Right: Extracted data */}
        <div className="space-y-4">
          {/* Invoice header fields */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Datos de la factura
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Total calculado
                </label>
                <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800">
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
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Productos ({lineItems.length})
              </h3>
              <button
                onClick={addLineItem}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-zinc-100 rounded-xl p-3.5 space-y-3 group hover:border-zinc-200 transition-colors"
                >
                  {/* Confidence + delete */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getConfidenceColor(item.confidence)}`}
                    >
                      {Math.round(item.confidence * 100)}% confianza
                    </span>
                    <button
                      onClick={() => removeLineItem(index)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-all"
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    className={`${inputClass} font-medium`}
                    placeholder="Descripción del producto"
                  />

                  {/* Quantity / Unit / Price row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
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
                      <label className="block text-[11px] text-zinc-400 mb-1">
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
                      <label className="block text-[11px] text-zinc-400 mb-1">
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
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Total
                      </label>
                      <div className="px-2 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-center font-medium text-zinc-700">
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
      <div className="flex items-center justify-between pt-5 border-t border-zinc-200">
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">
            {lineItems.length}
          </span>{" "}
          productos ·{" "}
          <span className="font-medium text-zinc-700">
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
            className="px-5 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || lineItems.length === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
          >
            {isConfirming ? "Guardando..." : "Confirmar factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
