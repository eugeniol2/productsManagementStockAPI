import { z } from "zod";

export const productQuerySchema = z.strictObject({
  categoryId: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
