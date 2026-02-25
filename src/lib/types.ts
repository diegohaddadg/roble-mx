// lib/types.ts — Shared types for the invoice extraction pipeline

export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  confidence: number; // 0-1 AI confidence score
}

export interface ExtractedInvoice {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null; // ISO date string
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  lineItems: ExtractedLineItem[];
}

export interface UploadResponse {
  invoiceId: string;
  imageUrl: string;
  extraction: ExtractedInvoice;
  usedFallbackRestaurantId?: string;
}

export interface ConfirmInvoicePayload {
  supplierId: string | null;
  supplierName: string | null; // if new supplier
  invoiceNumber: string | null;
  invoiceDate: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  lineItems: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    ingredientId: string | null; // link to existing ingredient
    ingredientName: string | null; // if creating new ingredient
  }[];
}
