import { Prisma, type PrismaClient } from "@prisma/client";

import type { StockEntryInput } from "./stockEntries.schema.ts";

type RegisteredBatch = {
  id: number;
  productId: number;
  expiresAt: Date | null;
  currentUnits: number;
  totalCost: string;
};

type RegisteredEntry = {
  id: number;
  supplier: string | null;
  invoiceNumber: string | null;
  purchasedAt: Date | null;
  createdAt: Date;
  batches: RegisteredBatch[];
};

type StockEntryResult =
  | { ok: true; entry: RegisteredEntry; replayed: boolean }
  | { ok: false; reason: "PRODUCT_NOT_FOUND" | "EXPIRY_REQUIRED" };

type EntryProduct = { unitsPerPack: number; requiresExpiry: boolean };

export async function registerStockEntry(
  prisma: PrismaClient,
  accountId: string,
  operatorId: string | null,
  input: StockEntryInput,
): Promise<StockEntryResult> {
  const alreadyRegistered = await findByIdempotencyKey(
    prisma,
    accountId,
    input.idempotencyKey,
  );

  if (alreadyRegistered) {
    return { ok: true, entry: alreadyRegistered, replayed: true };
  }

  const productsById = await productsOf(prisma, accountId, input);

  for (const item of input.items) {
    const product = productsById.get(item.productId);

    if (!product) {
      return { ok: false, reason: "PRODUCT_NOT_FOUND" };
    }
    if (product.requiresExpiry && !item.expiresAt) {
      return { ok: false, reason: "EXPIRY_REQUIRED" };
    }
  }

  try {
    const entry = await recordStockEntry(prisma, accountId, operatorId, input, productsById);

    return { ok: true, entry, replayed: false };
  } catch (error) {
    const existingEntry = await resolveIdempotencyRace(prisma, accountId, input, error);

    if (existingEntry) {
      return { ok: true, entry: existingEntry, replayed: true };
    }

    throw error;
  }
}

async function productsOf(
  prisma: PrismaClient,
  accountId: string,
  input: StockEntryInput,
): Promise<Map<number, EntryProduct>> {
  const foundProducts = await prisma.product.findMany({
    where: {
      accountId,
      id: { in: input.items.map((item) => item.productId) },
      active: true,
    },
    select: {
      id: true,
      unitsPerPack: true,
      category: { select: { requiresExpiry: true } },
    },
  });

  return new Map(
    foundProducts.map((product) => [
      product.id,
      {
        unitsPerPack: product.unitsPerPack,
        requiresExpiry: product.category.requiresExpiry,
      },
    ]),
  );
}

function recordStockEntry(
  prisma: PrismaClient,
  accountId: string,
  operatorId: string | null,
  input: StockEntryInput,
  productsById: Map<number, EntryProduct>,
): Promise<RegisteredEntry> {
  return prisma.$transaction(async (transaction) => {
    const entry = await transaction.stockEntry.create({
      data: {
        accountId,
        operatorId,
        idempotencyKey: input.idempotencyKey,
        supplier: input.supplier ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : null,
      },
      select: {
        id: true,
        supplier: true,
        invoiceNumber: true,
        purchasedAt: true,
        createdAt: true,
      },
    });

    const batches: RegisteredBatch[] = [];

    for (const item of input.items) {
      const unitsPerPack = item.unitsPerPack ?? productsById.get(item.productId)!.unitsPerPack;
      const receivedUnits = item.packs * unitsPerPack;

      const batch = await transaction.batch.create({
        data: {
          accountId,
          productId: item.productId,
          stockEntryId: entry.id,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          receivedUnits,
          currentUnits: receivedUnits,
          totalCost: item.totalCost,
        },
        select: {
          id: true,
          productId: true,
          expiresAt: true,
          currentUnits: true,
          totalCost: true,
        },
      });

      await transaction.movement.create({
        data: { accountId, batchId: batch.id, type: "ENTRY", quantity: receivedUnits },
      });

      batches.push({ ...batch, totalCost: batch.totalCost.toFixed(2) });
    }

    return { ...entry, batches };
  });
}

async function resolveIdempotencyRace(
  prisma: PrismaClient,
  accountId: string,
  input: StockEntryInput,
  error: unknown,
): Promise<RegisteredEntry | null> {
  const isDuplicate =
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

  if (!isDuplicate) {
    return null;
  }

  return findByIdempotencyKey(prisma, accountId, input.idempotencyKey);
}

async function findByIdempotencyKey(
  prisma: PrismaClient,
  accountId: string,
  idempotencyKey: string,
): Promise<RegisteredEntry | null> {
  const entry = await prisma.stockEntry.findFirst({
    where: { accountId, idempotencyKey },
    select: {
      id: true,
      supplier: true,
      invoiceNumber: true,
      purchasedAt: true,
      createdAt: true,
      batches: {
        select: {
          id: true,
          productId: true,
          expiresAt: true,
          currentUnits: true,
          totalCost: true,
        },
      },
    },
  });

  if (!entry) {
    return null;
  }

  return {
    ...entry,
    batches: entry.batches.map((batch) => ({
      ...batch,
      totalCost: batch.totalCost.toFixed(2),
    })),
  };
}
