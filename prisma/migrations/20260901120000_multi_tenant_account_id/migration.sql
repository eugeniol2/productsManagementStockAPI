-- DropIndex
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "product_barcodes_code_key";

-- DropIndex
DROP INDEX "products_internal_code_key";

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "movements" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "product_barcodes" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "operator_id" TEXT;

-- AlterTable
ALTER TABLE "stock_entries" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "operator_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_account_id_name_key" ON "categories"("account_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_account_id_code_key" ON "product_barcodes"("account_id", "code");

-- CreateIndex
CREATE INDEX "products_account_id_idx" ON "products"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_account_id_internal_code_key" ON "products"("account_id", "internal_code");

-- CreateIndex
CREATE INDEX "sales_account_id_idx" ON "sales"("account_id");

