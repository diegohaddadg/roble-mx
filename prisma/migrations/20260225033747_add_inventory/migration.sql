-- CreateTable
CREATE TABLE "inventory_levels" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "onHand" DECIMAL(10,3) NOT NULL,
    "lowThreshold" DECIMAL(10,3) NOT NULL DEFAULT 3,
    "criticalThreshold" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "delta" DECIMAL(10,3) NOT NULL,
    "newOnHand" DECIMAL(10,3) NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_levels_ingredientId_key" ON "inventory_levels"("ingredientId");

-- CreateIndex
CREATE INDEX "inventory_levels_ingredientId_idx" ON "inventory_levels"("ingredientId");

-- CreateIndex
CREATE INDEX "inventory_movements_ingredientId_idx" ON "inventory_movements"("ingredientId");

-- CreateIndex
CREATE INDEX "inventory_movements_ingredientId_createdAt_idx" ON "inventory_movements"("ingredientId", "createdAt");

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
