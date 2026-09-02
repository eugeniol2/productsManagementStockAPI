import type { PrismaClient } from "@prisma/client";

import { findProductById } from "./products.queries.ts";

export async function updateProductPrice(
  prisma: PrismaClient,
  accountId: string,
  id: number,
  salePrice: string,
) {
  const updated = await prisma.product.updateMany({
    where: { id, accountId, active: true },
    data: { salePrice },
  });

  if (updated.count === 0) {
    return null;
  }

  return findProductById(prisma, accountId, id);
}
