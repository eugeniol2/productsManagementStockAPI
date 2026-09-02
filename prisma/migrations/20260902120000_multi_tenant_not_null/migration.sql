-- DropIndex
DROP INDEX "sales_account_id_idx";

-- DropIndex
DROP INDEX "sales_idempotency_key_key";

-- DropIndex
DROP INDEX "stock_entries_idempotency_key_key";

-- AlterTable
ALTER TABLE "batches" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "movements" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_barcodes" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sale_items" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "account_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_entries" ALTER COLUMN "account_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sales_account_id_idempotency_key_key" ON "sales"("account_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "stock_entries_account_id_idempotency_key_key" ON "stock_entries"("account_id", "idempotency_key");
