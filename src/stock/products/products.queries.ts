import type { PrismaClient } from "@prisma/client";

const withCategoryAndBarcodes = {
  category: true,
  barcodes: {
    select: { code: true, unitsPerScan: true },
    orderBy: { unitsPerScan: "asc" },
  },
} as const;

export function listProducts(prisma: PrismaClient, categoryId?: number) {
  return prisma.product.findMany({
    where: { active: true, categoryId },
    orderBy: { name: "asc" },
    include: withCategoryAndBarcodes,
  });
}

export function findProductById(prisma: PrismaClient, id: number) {
  return prisma.product.findFirst({
    where: { id, active: true },
    include: withCategoryAndBarcodes,
  });
}

export function findProductByCode(prisma: PrismaClient, code: string) {
  return prisma.product.findFirst({
    where: {
      active: true,
      OR: [{ internalCode: code }, { barcodes: { some: { code } } }],
    },
    include: withCategoryAndBarcodes,
  });
}
