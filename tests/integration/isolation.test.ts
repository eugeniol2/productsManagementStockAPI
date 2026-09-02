import { randomUUID } from "node:crypto";

import { beforeEach, expect, test } from "vitest";

import { DEMO_ACCOUNT_ID, seedAccount } from "../../prisma/seed.ts";
import { findProductById, listProducts } from "../../src/stock/products/products.queries.ts";
import { registerStockEntry } from "../../src/stock/stockEntries/stockEntries.service.ts";
import { prisma, resetDatabase } from "./helpers/db.ts";

const ACCOUNT_A = DEMO_ACCOUNT_ID;
const ACCOUNT_B = "00000000-0000-4000-8000-0000000000b2";

beforeEach(async () => {
  await resetDatabase(); // limpa e semeia a conta A
  await seedAccount(prisma, ACCOUNT_B); // adiciona a conta B sobre a mesma base, sem limpar
});

test("cada conta só enxerga os próprios produtos", async () => {
  const [productsA, productsB] = await Promise.all([
    listProducts(prisma, ACCOUNT_A),
    listProducts(prisma, ACCOUNT_B),
  ]);

  expect(productsA.length).toBeGreaterThan(0);
  expect(productsB).toHaveLength(productsA.length);

  expect(productsA.every((product) => product.accountId === ACCOUNT_A)).toBe(true);
  expect(productsB.every((product) => product.accountId === ACCOUNT_B)).toBe(true);

  const idsA = new Set(productsA.map((product) => product.id));
  expect(productsB.some((product) => idsA.has(product.id))).toBe(false);
});

test("uma conta não alcança o produto da outra: findProductById devolve null", async () => {
  const [productA] = await listProducts(prisma, ACCOUNT_A);

  expect(await findProductById(prisma, ACCOUNT_B, productA.id)).toBeNull();
  expect(await findProductById(prisma, ACCOUNT_A, productA.id)).not.toBeNull();
});

test("a escrita também é escopada: B não dá entrada num produto de A", async () => {
  const [productA] = await listProducts(prisma, ACCOUNT_A);

  const result = await registerStockEntry(prisma, ACCOUNT_B, null, {
    idempotencyKey: randomUUID(),
    items: [{ productId: productA.id, packs: 1, expiresAt: "2026-12-31", totalCost: "10.00" }],
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;

  expect(result.reason).toBe("PRODUCT_NOT_FOUND");
});

test("idempotencyKey é por conta: a mesma chave vale em A e B de forma independente", async () => {
  const key = randomUUID();
  const [productA] = await listProducts(prisma, ACCOUNT_A);
  const [productB] = await listProducts(prisma, ACCOUNT_B);

  const entryA = await registerStockEntry(prisma, ACCOUNT_A, null, {
    idempotencyKey: key,
    items: [{ productId: productA.id, packs: 1, expiresAt: "2026-12-31", totalCost: "10.00" }],
  });
  const entryB = await registerStockEntry(prisma, ACCOUNT_B, null, {
    idempotencyKey: key,
    items: [{ productId: productB.id, packs: 1, expiresAt: "2026-12-31", totalCost: "10.00" }],
  });

  expect(entryA.ok && entryB.ok).toBe(true);
  if (!entryA.ok || !entryB.ok) return;

  expect(entryA.replayed).toBe(false);
  expect(entryB.replayed).toBe(false);
  expect(entryB.entry.id).not.toBe(entryA.entry.id);
});
