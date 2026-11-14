ALTER TABLE "OrderItem"
ADD COLUMN "toppingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "OrderItem"
ADD COLUMN "toppingAmounts" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

CREATE TABLE "Topping" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "amountPerPortion" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    CONSTRAINT "Topping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Topping_name_key" ON "Topping"("name");
CREATE UNIQUE INDEX "Topping_ingredientId_key" ON "Topping"("ingredientId");

ALTER TABLE "Topping"
ADD CONSTRAINT "Topping_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Ingredient" ("name", "unit", "stockQuantity")
VALUES ('Trân châu', 'g', 1500)
ON CONFLICT ("name") DO UPDATE
SET "unit" = EXCLUDED."unit", "stockQuantity" = EXCLUDED."stockQuantity";

UPDATE "Ingredient"
SET "name" = 'Kem / Kem cheese', "unit" = 'ml', "stockQuantity" = 1000
WHERE "name" = 'Kem'
  AND NOT EXISTS (
    SELECT 1 FROM "Ingredient" WHERE "name" = 'Kem / Kem cheese'
  );

INSERT INTO "Ingredient" ("name", "unit", "stockQuantity")
VALUES ('Kem / Kem cheese', 'ml', 1000)
ON CONFLICT ("name") DO UPDATE
SET "unit" = EXCLUDED."unit", "stockQuantity" = EXCLUDED."stockQuantity";

INSERT INTO "Topping" ("id", "name", "price", "amountPerPortion", "ingredientId")
SELECT 'pearl', 'Trân châu', 5000, 50, "id"
FROM "Ingredient"
WHERE "name" = 'Trân châu'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Topping" ("id", "name", "price", "amountPerPortion", "ingredientId")
SELECT 'cream', 'Kem / Kem cheese', 5000, 30, "id"
FROM "Ingredient"
WHERE "name" = 'Kem / Kem cheese'
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "price" = EXCLUDED."price",
    "amountPerPortion" = EXCLUDED."amountPerPortion",
    "ingredientId" = EXCLUDED."ingredientId";
