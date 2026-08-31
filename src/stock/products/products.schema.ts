import { z } from "zod";

export const productQuerySchema = z.strictObject({
  categoryId: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

export const priceSchema = z.strictObject({
  salePrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "must be digits with an optional decimal point")
    .refine((value) => (value.split(".")[1]?.length ?? 0) <= 2, "max 2 decimal places")
    .refine((value) => (value.split(".")[0]?.length ?? 0) <= 8, "max 8 integer digits")
    .refine((value) => Number(value) > 0, "must be greater than 0"),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type PriceUpdate = z.infer<typeof priceSchema>;
