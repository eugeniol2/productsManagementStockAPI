import { z } from "zod";

import { INT4_MAX } from "../../database/constraints.ts";

export const MAX_UNITS_PER_SCAN = 10_000;

const code = z.string().regex(/^[A-Za-z0-9-]{1,32}$/, "must be up to 32 letters, digits or dashes");
const productId = z.number().int().positive().max(INT4_MAX);

export const observationSchema = z.strictObject({
  code,
  productId,
});

export const barcodeSchema = z.strictObject({
  code,
  unitsPerScan: z.number().int().positive().max(MAX_UNITS_PER_SCAN),
});

export type ObservationInput = z.infer<typeof observationSchema>;
export type BarcodeInput = z.infer<typeof barcodeSchema>;
