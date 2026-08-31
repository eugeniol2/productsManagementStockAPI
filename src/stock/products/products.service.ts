import type { PrismaClient } from "@prisma/client";

import { findProductById } from "./products.queries.ts";

export async function updateProductPrice(
  prisma: PrismaClient,
  id: number,
  salePrice: string,
) {
  const updated = await prisma.product.updateMany({
    where: { id, active: true },
    data: { salePrice },
  });

  if (updated.count === 0) {
    return null;
  }

  return findProductById(prisma, id);
}
