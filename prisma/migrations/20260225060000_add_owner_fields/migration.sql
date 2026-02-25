-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "ownerWhatsApp" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "pinHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_ownerWhatsApp_key" ON "restaurants"("ownerWhatsApp");
