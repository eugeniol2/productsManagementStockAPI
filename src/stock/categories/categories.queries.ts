import type { PrismaClient } from "@prisma/client";

export function listCategories(prisma: PrismaClient) {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}
