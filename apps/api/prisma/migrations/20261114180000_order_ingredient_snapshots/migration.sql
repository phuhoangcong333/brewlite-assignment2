-- TV4 owns Ingredient/RecipeItem. Extend its schema instead of creating them twice.
-- NULL marks orders created before snapshots; their legacy refund behavior is retained.
ALTER TABLE "Order" ADD COLUMN "usesIngredientInventory" BOOLEAN;

CREATE TABLE "OrderIngredient" (
    "orderId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "OrderIngredient_pkey" PRIMARY KEY ("orderId", "ingredientId"),
    CONSTRAINT "OrderIngredient_quantity_positive" CHECK ("quantity" > 0)
);

CREATE INDEX "OrderIngredient_ingredientId_idx" ON "OrderIngredient"("ingredientId");
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
