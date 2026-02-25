-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "preferredSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "ingredients_preferredSupplierId_idx" ON "ingredients"("preferredSupplierId");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
