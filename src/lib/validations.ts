// lib/validations.ts — Runtime validation for all API inputs
// Zod catches bad data BEFORE it hits Prisma/your database

import { z } from "zod";

// ─── INVOICE UPLOAD ────────────────────────────────────────
export const uploadInvoiceSchema = z.object({
  restaurantId: z
    .string()
    .min(1, "restaurantId es requerido")
    .max(100),
});

// ─── CONFIRM INVOICE ───────────────────────────────────────
export const confirmLineItemSchema = z.object({
  description: z.string().min(1, "Descripción requerida").max(500),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  unit: z.enum(["kg", "L", "pza", "caja", "manojo", "bolsa", "lata", "g", "ml"]),
  unitPrice: z.number().min(0, "Precio no puede ser negativo"),
  totalPrice: z.number().min(0),
  ingredientId: z.string().nullable(),
  ingredientName: z.string().max(200).nullable(),
});

export const confirmInvoiceSchema = z.object({
  supplierId: z.string().nullable(),
  supplierName: z.string().max(200).nullable(),
  invoiceNumber: z.string().max(100).nullable(),
  invoiceDate: z.string().nullable(), // ISO date string
  subtotal: z.number().min(0).nullable(),
  tax: z.number().min(0).nullable(),
  total: z.number().min(0).nullable(),
  lineItems: z
    .array(confirmLineItemSchema)
    .min(1, "Debe haber al menos un producto"),
});

// ─── RECIPE ────────────────────────────────────────────────
export const recipeItemSchema = z.object({
  ingredientId: z.string().min(1, "Ingrediente requerido"),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  unit: z.enum(["kg", "L", "pza", "caja", "manojo", "bolsa", "lata", "g", "ml"]),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  category: z.string().max(100).nullable().optional(),
  sellPrice: z.number().positive("Precio de venta debe ser mayor a 0"),
  yield: z.number().int().positive().default(1),
  restaurantId: z.string().min(1),
  items: z
    .array(recipeItemSchema)
    .min(1, "Debe tener al menos un ingrediente"),
});

export const updateRecipeSchema = createRecipeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── PAGINATION ────────────────────────────────────────────
export const paginationSchema = z.object({
  restaurantId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Type exports
export type ConfirmInvoiceInput = z.infer<typeof confirmInvoiceSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
