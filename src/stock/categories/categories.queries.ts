import type { PrismaClient } from "@prisma/client";

export function listCategories(prisma: PrismaClient, accountId: string) {
  return prisma.category.findMany({
    where: { accountId },
    orderBy: { name: "asc" },
  });
}
