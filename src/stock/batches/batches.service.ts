import type { PrismaClient } from "@prisma/client";

import type { BatchInput } from "./batches.schema.ts";

type RegisteredBatch = {
  id: number;
  expiresAt: Date | null;
  receivedUnits: number;
  currentUnits: number;
  totalCost: string;
  receivedAt: Date;
};

type BatchResult =
  | { ok: true; batch: RegisteredBatch }
  | { ok: false; reason: "PRODUCT_NOT_FOUND" | "EXPIRY_REQUIRED" };

export async function registerBatch(
  prisma: PrismaClient,
  productId: number,
  input: BatchInput,
): Promise<BatchResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    select: {
      unitsPerPack: true,
      category: { select: { requiresExpiry: true } },
    },
  });

  if (!product) {
    return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  }
  if (product.category.requiresExpiry && !input.expiresAt) {
    return { ok: false, reason: "EXPIRY_REQUIRED" };
  }

  const unitsPerPack = input.unitsPerPack ?? product.unitsPerPack;
  const receivedUnits = input.packs * unitsPerPack;

  const batch = await prisma.$transaction(async (transaction) => {
    const created = await transaction.batch.create({
      data: {
        productId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        receivedUnits,
        currentUnits: receivedUnits,
        totalCost: input.totalCost,
      },
      select: {
        id: true,
        expiresAt: true,
        receivedUnits: true,
        currentUnits: true,
        totalCost: true,
        receivedAt: true,
      },
    });

    await transaction.movement.create({
      data: { batchId: created.id, type: "ENTRY", quantity: receivedUnits },
    });

    return created;
  });

  return {
    ok: true,
    batch: {
      id: batch.id,
      expiresAt: batch.expiresAt,
      receivedUnits: batch.receivedUnits,
      currentUnits: batch.currentUnits,
      totalCost: batch.totalCost.toFixed(2),
      receivedAt: batch.receivedAt,
    },
  };
}
