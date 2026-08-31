import { Prisma, type PrismaClient } from "@prisma/client";

import {
  allocateByExpiry,
  type AllocatableBatch,
} from "./sales.allocation.ts";
import type { Sale, SaleItem } from "./sales.schema.ts";

export class ProductNotFound extends Error {}

type Transaction = Prisma.TransactionClient;

type RegisteredItem = {
  productId: number;
  quantity: number;
  unitPrice: string;
  shortfall: number;
  allocations: { batchId: number; quantity: number }[];
};

export type RegisteredSale = {
  saleId: number;
  occurredAt: Date;
  replayed: boolean;
  items: RegisteredItem[];
};

export async function registerSale(
  prisma: PrismaClient,
  sale: Sale,
): Promise<RegisteredSale> {
  const alreadyRegistered = await findByIdempotencyKey(
    prisma,
    sale.idempotencyKey,
  );

  if (alreadyRegistered) {
    return alreadyRegistered;
  }

  try {
    return await recordSale(prisma, sale);
  } catch (error) {
    const existingSale = await resolveIdempotencyRace(prisma, sale, error);

    if (existingSale) {
      return existingSale;
    }

    throw error;
  }
}

async function resolveIdempotencyRace(
  prisma: PrismaClient,
  sale: Sale,
  error: unknown,
): Promise<RegisteredSale | null> {
  const isDuplicate =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002";

  if (!isDuplicate) {
    return null;
  }

  return findByIdempotencyKey(prisma, sale.idempotencyKey);
}

function recordSale(prisma: PrismaClient, sale: Sale): Promise<RegisteredSale> {
  return prisma.$transaction(async (transaction) => {
    const items = mergeItemsByProduct(sale.items);
    const prices = await priceEachProduct(transaction, items);
    const batchesByProduct = await lockBatchesOf(transaction, items);

    const created = await transaction.sale.create({
      data: { idempotencyKey: sale.idempotencyKey },
      select: { id: true, occurredAt: true },
    });

    const registered: RegisteredItem[] = [];

    for (const item of items) {
      registered.push(
        await registerItem(transaction, created.id, item, prices, batchesByProduct),
      );
    }

    return {
      saleId: created.id,
      occurredAt: created.occurredAt,
      replayed: false,
      items: registered,
    };
  });
}

function mergeItemsByProduct(items: SaleItem[]): SaleItem[] {
  const merged = new Map<number, number>();

  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

async function priceEachProduct(
  transaction: Transaction,
  items: SaleItem[],
): Promise<Map<number, string>> {
  const products = await transaction.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, salePrice: true },
  });

  const prices = new Map(
    products.map((product) => [product.id, product.salePrice.toFixed(2)]),
  );

  for (const item of items) {
    if (!prices.has(item.productId)) {
      throw new ProductNotFound(`Product ${item.productId} does not exist`);
    }
  }

  return prices;
}

async function lockBatchesOf(
  transaction: Transaction,
  items: SaleItem[],
): Promise<Map<number, AllocatableBatch[]>> {
  const productIds = items.map((item) => item.productId);

  const locked = await transaction.$queryRaw<
    (AllocatableBatch & { productId: number })[]
  >`
    SELECT id, product_id AS "productId", expires_at AS "expiresAt",
           current_units AS "currentUnits"
    FROM batches
    WHERE product_id = ANY(${productIds})
    ORDER BY id
    FOR UPDATE
  `;

  const byProduct = new Map<number, AllocatableBatch[]>();

  for (const batch of locked) {
    const existing = byProduct.get(batch.productId) ?? [];
    existing.push(batch);
    byProduct.set(batch.productId, existing);
  }

  return byProduct;
}

async function registerItem(
  transaction: Transaction,
  saleId: number,
  item: SaleItem,
  prices: Map<number, string>,
  batchesByProduct: Map<number, AllocatableBatch[]>,
): Promise<RegisteredItem> {
  const unitPrice = prices.get(item.productId) ?? "0.00";
  const known = batchesByProduct.get(item.productId) ?? [];
  const batches =
    known.length > 0
      ? known
      : [await createEmptyBatch(transaction, item.productId)];

  const { allocations, shortfall } = allocateByExpiry(batches, item.quantity);

  await transaction.saleItem.create({
    data: {
      saleId,
      productId: item.productId,
      quantity: item.quantity,
      shortfall,
      unitPrice,
    },
  });

  for (const allocation of allocations) {
    await transaction.batch.update({
      where: { id: allocation.batchId },
      data: { currentUnits: { decrement: allocation.quantity } },
    });

    await transaction.movement.create({
      data: {
        batchId: allocation.batchId,
        saleId,
        type: "SALE",
        quantity: -allocation.quantity,
      },
    });
  }

  return { ...item, unitPrice, allocations, shortfall };
}

async function createEmptyBatch(
  transaction: Transaction,
  productId: number,
): Promise<AllocatableBatch> {
  return transaction.batch.create({
    data: {
      productId,
      expiresAt: null,
      receivedUnits: 0,
      currentUnits: 0,
      totalCost: "0",
    },
    select: { id: true, expiresAt: true, currentUnits: true },
  });
}

async function findByIdempotencyKey(
  prisma: PrismaClient,
  idempotencyKey: string,
): Promise<RegisteredSale | null> {
  const sale = await prisma.sale.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      occurredAt: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          shortfall: true,
          unitPrice: true,
        },
      },
      movements: {
        select: { batchId: true, quantity: true, batch: { select: { productId: true } } },
      },
    },
  });

  if (!sale) {
    return null;
  }

  return {
    saleId: sale.id,
    occurredAt: sale.occurredAt,
    replayed: true,
    items: sale.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      shortfall: item.shortfall,
      allocations: sale.movements
        .filter((movement) => movement.batch.productId === item.productId)
        .map((movement) => ({
          batchId: movement.batchId,
          quantity: -movement.quantity,
        })),
    })),
  };
}
