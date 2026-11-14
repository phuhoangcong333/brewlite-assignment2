CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Ingredient_quantity_nonnegative" CHECK ("quantity" >= 0)
);

CREATE TABLE "Recipe" (
    "productId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("productId","ingredientId"),
    CONSTRAINT "Recipe_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "OrderIngredient" (
    "orderId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    CONSTRAINT "OrderIngredient_pkey" PRIMARY KEY ("orderId","ingredientId"),
    CONSTRAINT "OrderIngredient_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE INDEX "Recipe_ingredientId_idx" ON "Recipe"("ingredientId");
CREATE INDEX "OrderIngredient_ingredientId_idx" ON "OrderIngredient"("ingredientId");

ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
