-- CreateEnum
CREATE TYPE "GstMode" AS ENUM ('NONE', 'PERCENTAGE', 'AMOUNT');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2),
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2),
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "material_orders" ADD COLUMN     "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "vendor_payments" ADD COLUMN     "gst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gst_mode" "GstMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "gst_percentage" DECIMAL(5,2),
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "expenses_deleted_at_idx" ON "expenses"("deleted_at");

-- CreateIndex
CREATE INDEX "expenses_project_id_deleted_at_idx" ON "expenses"("project_id", "deleted_at");

-- CreateIndex
CREATE INDEX "incomes_deleted_at_idx" ON "incomes"("deleted_at");

-- CreateIndex
CREATE INDEX "incomes_project_id_deleted_at_idx" ON "incomes"("project_id", "deleted_at");

-- CreateIndex
CREATE INDEX "incomes_client_id_deleted_at_idx" ON "incomes"("client_id", "deleted_at");
