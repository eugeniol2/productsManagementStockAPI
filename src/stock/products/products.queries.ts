import type { PrismaClient } from "@prisma/client";

const withCategoryAndBarcodes = {
  category: true,
  barcodes: {
    select: { code: true, unitsPerScan: true },
    orderBy: { unitsPerScan: "asc" },
  },
} as const;

export function listProducts(
  prisma: PrismaClient,
  accountId: string,
  categoryId?: number,
) {
  return prisma.product.findMany({
    where: { accountId, active: true, categoryId },
    orderBy: { name: "asc" },
    include: withCategoryAndBarcodes,
  });
}

export function findProductById(prisma: PrismaClient, accountId: string, id: number) {
  return prisma.product.findFirst({
    where: { id, accountId, active: true },
    include: withCategoryAndBarcodes,
  });
}

export function findProductByCode(
  prisma: PrismaClient,
  accountId: string,
  code: string,
) {
  return prisma.product.findFirst({
    where: {
      accountId,
      active: true,
      OR: [{ internalCode: code }, { barcodes: { some: { code } } }],
    },
    include: withCategoryAndBarcodes,
  });
}
