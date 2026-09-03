import { beforeEach, expect, test } from "vitest";

import { DEMO_ACCOUNT_ID, seedAccount } from "../../prisma/seed.ts";
import {
  addBarcode,
  dismissObservation,
  recordBarcodeObservation,
} from "../../src/stock/barcodes/barcodes.service.ts";
import { listPendingObservations } from "../../src/stock/barcodes/barcodes.queries.ts";
import { findProductByCode, listProducts } from "../../src/stock/products/products.queries.ts";
import { prisma, resetDatabase } from "./helpers/db.ts";

const ACCOUNT_B = "00000000-0000-4000-8000-0000000000b2";
const UNKNOWN = "7899999999999";

beforeEach(async () => {
  await resetDatabase();
});

function record(accountId: string, code: string, productId: number) {
  return recordBarcodeObservation(prisma, accountId, null, code, productId);
}

test("bipe desconhecido resolvido na mão vira observação, e reincidência agrega", async () => {
  const [product] = await listProducts(prisma, DEMO_ACCOUNT_ID);

  await record(DEMO_ACCOUNT_ID, UNKNOWN, product.id);
  await record(DEMO_ACCOUNT_ID, UNKNOWN, product.id);

  const pending = await listPendingObservations(prisma, DEMO_ACCOUNT_ID);

  expect(pending).toHaveLength(1);
  expect(pending[0].occurrences).toBe(2);
  expect(pending[0].code).toBe(UNKNOWN);
  expect(pending[0].product.id).toBe(product.id);
});

test("misread e mis-pick aparecem lado a lado, ranqueados por ocorrência", async () => {
  const [coca, fanta] = await listProducts(prisma, DEMO_ACCOUNT_ID);

  await record(DEMO_ACCOUNT_ID, UNKNOWN, coca.id);
  await record(DEMO_ACCOUNT_ID, UNKNOWN, coca.id);
  await record(DEMO_ACCOUNT_ID, UNKNOWN, coca.id);
  await record(DEMO_ACCOUNT_ID, UNKNOWN, fanta.id);

  const pending = await listPendingObservations(prisma, DEMO_ACCOUNT_ID);

  expect(pending).toHaveLength(2);
  expect(pending[0].product.id).toBe(coca.id);
  expect(pending[0].occurrences).toBe(3);
  expect(pending[1].product.id).toBe(fanta.id);
  expect(pending[1].occurrences).toBe(1);
});

test("promover grava o código no catálogo e esvazia a fila daquele código", async () => {
  const [product] = await listProducts(prisma, DEMO_ACCOUNT_ID);
  await record(DEMO_ACCOUNT_ID, UNKNOWN, product.id);

  const result = await addBarcode(prisma, DEMO_ACCOUNT_ID, product.id, UNKNOWN, 1);

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.created).toBe(true);

  const found = await findProductByCode(prisma, DEMO_ACCOUNT_ID, UNKNOWN);
  expect(found?.id).toBe(product.id);
  expect(await listPendingObservations(prisma, DEMO_ACCOUNT_ID)).toHaveLength(0);
});

test("código que já é de outro produto da conta recusa com CODE_TAKEN", async () => {
  const products = await listProducts(prisma, DEMO_ACCOUNT_ID);
  const existing = await prisma.barcode.findFirst({
    where: { accountId: DEMO_ACCOUNT_ID },
    select: { code: true, productId: true },
  });
  if (!existing) throw new Error("seed sem códigos de barras");

  const other = products.find((product) => product.id !== existing.productId);
  if (!other) throw new Error("faltou um segundo produto");

  const result = await addBarcode(prisma, DEMO_ACCOUNT_ID, other.id, existing.code, 1);

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.reason).toBe("CODE_TAKEN");
  if (result.reason !== "CODE_TAKEN") return;
  expect(result.productId).toBe(existing.productId);
});

test("descartar tira a observação da fila", async () => {
  const [product] = await listProducts(prisma, DEMO_ACCOUNT_ID);
  const recorded = await record(DEMO_ACCOUNT_ID, UNKNOWN, product.id);

  expect(recorded.ok).toBe(true);
  if (!recorded.ok) return;

  expect(await dismissObservation(prisma, DEMO_ACCOUNT_ID, recorded.observation.id)).toBe(true);
  expect(await listPendingObservations(prisma, DEMO_ACCOUNT_ID)).toHaveLength(0);
});

test("observação e fila são escopadas por conta", async () => {
  await seedAccount(prisma, ACCOUNT_B);
  const [productA] = await listProducts(prisma, DEMO_ACCOUNT_ID);

  const cross = await record(ACCOUNT_B, UNKNOWN, productA.id);
  expect(cross.ok).toBe(false);
  if (cross.ok) return;
  expect(cross.reason).toBe("PRODUCT_NOT_FOUND");

  await record(DEMO_ACCOUNT_ID, UNKNOWN, productA.id);
  expect(await listPendingObservations(prisma, ACCOUNT_B)).toHaveLength(0);
  expect(await listPendingObservations(prisma, DEMO_ACCOUNT_ID)).toHaveLength(1);
});
