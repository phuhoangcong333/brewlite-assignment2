ALTER TABLE "RecipeItem"
ADD COLUMN "size" "Size" NOT NULL DEFAULT 'M';

DROP INDEX "RecipeItem_productId_ingredientId_key";

INSERT INTO "RecipeItem" ("productId", "ingredientId", "size", "amountRequired")
SELECT "productId", "ingredientId", 'S', "amountRequired"
FROM "RecipeItem";

INSERT INTO "RecipeItem" ("productId", "ingredientId", "size", "amountRequired")
SELECT "productId", "ingredientId", 'L', "amountRequired"
FROM "RecipeItem";

CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_size_key"
ON "RecipeItem"("productId", "ingredientId", "size");
