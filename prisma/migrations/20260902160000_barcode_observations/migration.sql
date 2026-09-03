-- CreateEnum
CREATE TYPE "BarcodeObservationStatus" AS ENUM ('PENDING', 'PROMOTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "barcode_observations" (
    "id" SERIAL NOT NULL,
    "account_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "suggested_product_id" INTEGER NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "status" "BarcodeObservationStatus" NOT NULL DEFAULT 'PENDING',
    "operator_id" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barcode_observations_account_id_status_idx" ON "barcode_observations"("account_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "barcode_observations_account_id_code_suggested_product_id_key" ON "barcode_observations"("account_id", "code", "suggested_product_id");

-- AddForeignKey
ALTER TABLE "barcode_observations" ADD CONSTRAINT "barcode_observations_suggested_product_id_fkey" FOREIGN KEY ("suggested_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

