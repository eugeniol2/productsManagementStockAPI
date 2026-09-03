import type { PrismaClient } from "@prisma/client";

export function listPendingObservations(prisma: PrismaClient, accountId: string) {
  return prisma.barcodeObservation.findMany({
    where: { accountId, status: "PENDING" },
    orderBy: [{ code: "asc" }, { occurrences: "desc" }],
    select: {
      id: true,
      code: true,
      occurrences: true,
      firstSeenAt: true,
      lastSeenAt: true,
      product: { select: { id: true, name: true, internalCode: true } },
    },
  });
}
