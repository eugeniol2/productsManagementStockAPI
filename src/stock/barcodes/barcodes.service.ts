import type { PrismaClient } from "@prisma/client";

type Observation = {
  id: number;
  code: string;
  suggestedProductId: number;
  occurrences: number;
};

type RecordResult =
  | { ok: true; observation: Observation }
  | { ok: false; reason: "PRODUCT_NOT_FOUND" | "CODE_ALREADY_KNOWN" };

type Barcode = {
  id: number;
  productId: number;
  code: string;
  unitsPerScan: number;
};

type AddBarcodeResult =
  | { ok: true; created: boolean; barcode: Barcode }
  | { ok: false; reason: "PRODUCT_NOT_FOUND" }
  | { ok: false; reason: "CODE_TAKEN"; productId: number };

export async function recordBarcodeObservation(
  prisma: PrismaClient,
  accountId: string,
  operatorId: string | null,
  code: string,
  productId: number,
): Promise<RecordResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId, active: true },
    select: { id: true },
  });

  if (!product) {
    return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  }

  const known = await prisma.barcode.findUnique({
    where: { accountId_code: { accountId, code } },
    select: { id: true },
  });

  if (known) {
    return { ok: false, reason: "CODE_ALREADY_KNOWN" };
  }

  const observation = await prisma.barcodeObservation.upsert({
    where: {
      accountId_code_suggestedProductId: { accountId, code, suggestedProductId: productId },
    },
    create: { accountId, code, suggestedProductId: productId, operatorId },
    update: { occurrences: { increment: 1 }, lastSeenAt: new Date() },
    select: { id: true, code: true, suggestedProductId: true, occurrences: true },
  });

  return { ok: true, observation };
}

export async function addBarcode(
  prisma: PrismaClient,
  accountId: string,
  productId: number,
  code: string,
  unitsPerScan: number,
): Promise<AddBarcodeResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId, active: true },
    select: { id: true },
  });

  if (!product) {
    return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  }

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.barcode.findUnique({
      where: { accountId_code: { accountId, code } },
      select: { id: true, productId: true, code: true, unitsPerScan: true },
    });

    if (existing && existing.productId !== productId) {
      return { ok: false, reason: "CODE_TAKEN", productId: existing.productId };
    }

    const barcode =
      existing ??
      (await transaction.barcode.create({
        data: { accountId, productId, code, unitsPerScan },
        select: { id: true, productId: true, code: true, unitsPerScan: true },
      }));

    await transaction.barcodeObservation.updateMany({
      where: { accountId, code, status: "PENDING" },
      data: { status: "PROMOTED" },
    });

    return { ok: true, created: existing === null, barcode };
  });
}

export async function dismissObservation(
  prisma: PrismaClient,
  accountId: string,
  id: number,
): Promise<boolean> {
  const updated = await prisma.barcodeObservation.updateMany({
    where: { id, accountId, status: "PENDING" },
    data: { status: "DISMISSED" },
  });

  return updated.count > 0;
}
