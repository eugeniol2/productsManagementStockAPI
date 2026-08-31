import { randomUUID } from "node:crypto";

import { beforeEach, expect, test } from "vitest";

import { registerStockEntry } from "../../src/stock/stockEntries/stockEntries.service.ts";
import { prisma, resetDatabase } from "./helpers/db.ts";

beforeEach(async () => {
  await resetDatabase();
});

function validEntry() {
  return {
    idempotencyKey: randomUUID(),
    supplier: "Distribuidora Sul",
    items: [
      { productId: 11, packs: 2, expiresAt: "2026-12-31", totalCost: "200.00" },
      { productId: 36, packs: 5, totalCost: "90.00" },
    ],
  };
}

test("registra uma nota com seus fardos, convertendo fardo em unidade", async () => {
  const result = await registerStockEntry(prisma, validEntry());

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.replayed).toBe(false);
  expect(result.entry.batches).toHaveLength(2);
  expect(result.entry.batches.map((batch) => batch.currentUnits)).toEqual([24, 120]);
});

test("reenvio com a mesma idempotencyKey devolve a nota existente sem duplicar", async () => {
  const input = validEntry();

  const first = await registerStockEntry(prisma, input);
  const second = await registerStockEntry(prisma, input);

  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) return;

  expect(second.replayed).toBe(true);
  expect(second.entry.id).toBe(first.entry.id);
  expect(await prisma.stockEntry.count()).toBe(1);
});

test("recusa a nota inteira quando um item exige validade e não a traz", async () => {
  const result = await registerStockEntry(prisma, {
    idempotencyKey: randomUUID(),
    items: [
      { productId: 11, packs: 1, expiresAt: "2026-12-31", totalCost: "10.00" },
      { productId: 17, packs: 1, totalCost: "10.00" },
    ],
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;

  expect(result.reason).toBe("EXPIRY_REQUIRED");
  expect(await prisma.stockEntry.count()).toBe(0);
  expect(await prisma.batch.count({ where: { stockEntryId: { not: null } } })).toBe(0);
});
