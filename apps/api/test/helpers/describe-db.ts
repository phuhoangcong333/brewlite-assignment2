import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  const result = config({ path: envPath });
  if (result.error) {
    throw result.error;
  }
}

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

if (!hasDatabase) {
  console.warn(
    'Skipping database-backed test suites: DATABASE_URL is not set.',
  );
}

export const describeDb = hasDatabase ? describe : describe.skip;

export async function checkDbConnection(
  prisma: PrismaClient,
): Promise<{ databaseName: string; productTableExists: boolean }> {
  const [database] = await prisma.$queryRaw<
    Array<{ database_name: string; product_table_exists: boolean }>
  >`
    SELECT current_database() AS database_name,
      to_regclass('"Product"') IS NOT NULL AS product_table_exists
  `;

  if (!database) {
    throw new Error('Database connection check returned no result');
  }

  return {
    databaseName: database.database_name,
    productTableExists: database.product_table_exists,
  };
}
