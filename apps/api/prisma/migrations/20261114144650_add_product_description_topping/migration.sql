-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "Topping" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "amountRequired" INTEGER NOT NULL,

    CONSTRAINT "Topping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topping_code_key" ON "Topping"("code");

-- AddForeignKey
ALTER TABLE "Topping" ADD CONSTRAINT "Topping_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
