import { z } from "zod";

import { INT4_MAX } from "../../database/constraints.ts";

export const MAX_PACKS = 100_000;
export const MAX_UNITS_PER_PACK = 10_000;
export const MAX_ITEMS = 200;
const MAX_TEXT = 120;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(\.\d+)?$/;

function today() {
  return new Date().toISOString().slice(0, 10);
}

const money = z
  .string()
  .regex(MONEY, "must be digits with an optional decimal point")
  .refine((value) => (value.split(".")[1]?.length ?? 0) <= 2, "max 2 decimal places")
  .refine((value) => (value.split(".")[0]?.length ?? 0) <= 8, "max 8 integer digits")
  .refine((value) => Number(value) > 0, "must be greater than 0");

const stockEntryItemSchema = z.strictObject({
  productId: z.number().int().positive().max(INT4_MAX),
  packs: z.number().int().positive().max(MAX_PACKS),
  unitsPerPack: z.number().int().positive().max(MAX_UNITS_PER_PACK).optional(),
  expiresAt: z
    .string()
    .regex(DATE_ONLY, "must be a date as YYYY-MM-DD")
    .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date")
    .refine((value) => value >= today(), "must not be in the past")
    .optional(),
  totalCost: money,
});

export const stockEntrySchema = z.strictObject({
  idempotencyKey: z.uuid(),
  supplier: z.string().min(1).max(MAX_TEXT).optional(),
  invoiceNumber: z.string().min(1).max(MAX_TEXT).optional(),
  purchasedAt: z
    .string()
    .regex(DATE_ONLY, "must be a date as YYYY-MM-DD")
    .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date")
    .refine((value) => value <= today(), "must not be in the future")
    .optional(),
  items: z.array(stockEntryItemSchema).min(1).max(MAX_ITEMS),
});

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockEntryItem = z.infer<typeof stockEntryItemSchema>;
