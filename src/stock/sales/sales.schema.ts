import { z } from "zod";

import { INT4_MAX } from "../../database/constraints.ts";

export const MAX_QUANTITY_PER_ITEM = 10_000;

export const saleItemSchema = z.object({
  productId: z.number().int().positive().max(INT4_MAX),
  quantity: z.number().int().positive().max(MAX_QUANTITY_PER_ITEM),
});

export const saleSchema = z.object({
  idempotencyKey: z.uuid(),
  items: z.array(saleItemSchema).min(1).max(200),
});

export type SaleItem = z.infer<typeof saleItemSchema>;
export type Sale = z.infer<typeof saleSchema>;
