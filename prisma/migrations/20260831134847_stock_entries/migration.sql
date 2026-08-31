-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "stock_entry_id" INTEGER;

-- CreateTable
CREATE TABLE "stock_entries" (
    "id" SERIAL NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "purchased_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_entries_idempotency_key_key" ON "stock_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "batches_stock_entry_id_idx" ON "batches"("stock_entry_id");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "stock_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
