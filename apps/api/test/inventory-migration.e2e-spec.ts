import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { describeDb } from './helpers/describe-db';

describeDb('Size migration with existing recipe data', () => {
  const prisma = new PrismaClient();
  afterAll(async () => prisma.$disconnect());

  it('copies each original recipe to S/M/L exactly once and preserves amounts', async () => {
    // All DDL and fixture data live in an isolated schema inside this transaction.
    const schema = `size_upgrade_${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe(`CREATE TYPE "Size" AS ENUM ('S', 'M', 'L')`);
      await tx.$executeRawUnsafe(
        `CREATE TABLE "RecipeItem" (id SERIAL PRIMARY KEY, "productId" INT NOT NULL, "ingredientId" INT NOT NULL, "amountRequired" INT NOT NULL)`,
      );
      await tx.$executeRawUnsafe(
        `CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_key" ON "RecipeItem" ("productId", "ingredientId")`,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO "RecipeItem" ("productId", "ingredientId", "amountRequired") VALUES (1, 1, 20), (1, 2, 35)`,
      );
      const sql = readFileSync(
        join(
          __dirname,
          '../prisma/migrations/20261114103000_add_size_to_recipe_item/migration.sql',
        ),
        'utf8',
      );
      for (const statement of sql.split(';').filter((s) => s.trim())) {
        await tx.$executeRawUnsafe(statement);
      }
      const rows = await tx.$queryRawUnsafe<
        { ingredientId: number; size: string; amountRequired: number }[]
      >(
        `SELECT "ingredientId", size::text, "amountRequired" FROM "RecipeItem" ORDER BY "ingredientId", size`,
      );
      expect(rows).toEqual(
        [1, 2].flatMap((ingredientId) =>
          ['L', 'M', 'S'].map((size) => ({
            ingredientId,
            size,
            amountRequired: ingredientId === 1 ? 20 : 35,
          })),
        ),
      );
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    });
  });
});
