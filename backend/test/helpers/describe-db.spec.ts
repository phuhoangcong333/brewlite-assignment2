import { checkDbConnection, describeDb } from './describe-db';
import { PrismaClient } from '@prisma/client';

describe('describeDb helper', () => {
  it('exports a Jest describe function for database-aware suites', () => {
    expect(typeof describeDb).toBe('function');
  });
});

describeDb('database-backed tests', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    'connects to the configured PostgreSQL database and finds the migrated Product table',
    async () => {
      const database = await checkDbConnection(prisma);
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is required for the database test');
      }
      const configuredDatabase = decodeURIComponent(
        new URL(databaseUrl).pathname.slice(1).split('/')[0],
      );

      expect(database.databaseName).toBe(configuredDatabase);
      expect(database.productTableExists).toBe(true);
    },
    15_000,
  );
});
