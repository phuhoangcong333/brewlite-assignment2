import { PrismaService } from '../prisma/prisma.service';
import { describeDb } from '../../test/helpers/describe-db';
import { OutOfStockException } from '../common/errors';
import { planReserve } from './inventory.plan';
import { InMemoryInventoryRepository } from './in-memory-inventory.repository';
import { PrismaInventoryRepository } from './prisma-inventory.repository';
import { InventoryService } from './inventory.service';

describe('InventoryService with an in-memory repository', () => {
  it('allows only one of two concurrent reservations for the last item', async () => {
    const repository = new InMemoryInventoryRepository([
      { productId: 1, stock: 1, version: 0 },
    ]);
    const service = new InventoryService(repository);

    const results = await Promise.allSettled([
      service.reserve([{ productId: 1, qty: 1 }]),
      service.reserve([{ productId: 1, qty: 1 }]),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(OutOfStockException);
    await expect(repository.getMany([1])).resolves.toEqual([
      { productId: 1, stock: 0, version: 1 },
    ]);
  });

  it('retries a stale version so both reservations succeed', async () => {
    const repository = new InMemoryInventoryRepository([
      { productId: 1, stock: 50, version: 0 },
    ]);
    const service = new InventoryService(repository);

    await expect(
      Promise.all([
        service.reserve([{ productId: 1, qty: 1 }]),
        service.reserve([{ productId: 1, qty: 1 }]),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    await expect(repository.getMany([1])).resolves.toEqual([
      { productId: 1, stock: 48, version: 2 },
    ]);
  });

  it('never makes in-memory stock negative under concurrent demand', async () => {
    const repository = new InMemoryInventoryRepository([
      { productId: 1, stock: 2, version: 0 },
    ]);
    const service = new InventoryService(repository);

    await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.reserve([{ productId: 1, qty: 1 }]),
      ),
    );

    const [product] = await repository.getMany([1]);
    expect(product.stock).toBeGreaterThanOrEqual(0);
  });
});

describeDb('InventoryService with PostgreSQL', () => {
  const prisma = new PrismaService();
  const repository = new PrismaInventoryRepository(prisma);
  const service = new InventoryService(repository);
  const createdProductIds: number[] = [];

  async function createProducts(stocks: number[]): Promise<number[]> {
    const products: number[] = [];
    for (const [index, stock] of stocks.entries()) {
      const product = await prisma.product.create({
        data: {
          name: `inventory-test-${Date.now()}-${index}-${Math.random()}`,
          price: 1000,
          stock,
        },
        select: { id: true },
      });
      createdProductIds.push(product.id);
      products.push(product.id);
    }
    return products;
  }

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      createdProductIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows only one of two concurrent reservations for the last item', async () => {
    const [productId] = await createProducts([1]);

    const results = await Promise.allSettled([
      service.reserve([{ productId, qty: 1 }]),
      service.reserve([{ productId, qty: 1 }]),
    ]);
    const fulfilled = results.filter(
      (result) => result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(OutOfStockException);
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      }),
    ).resolves.toEqual({ stock: 0 });
  });

  it('retries a stale version so both reservations succeed with stock remaining', async () => {
    const [productId] = await createProducts([50]);

    await expect(
      Promise.all([
        service.reserve([{ productId, qty: 1 }]),
        service.reserve([{ productId, qty: 1 }]),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 48, version: 2 });
  });

  it('never allows concurrent reservations to make stock negative', async () => {
    const [productId] = await createProducts([2]);

    await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.reserve([{ productId, qty: 1 }]),
      ),
    );

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stock: true },
    });
    expect(product.stock).toBeGreaterThanOrEqual(0);
  });

  it('rolls back earlier product updates when a later product becomes unavailable', async () => {
    const [firstProductId, secondProductId] = await createProducts([5, 1]);
    const current = await repository.getMany([
      firstProductId,
      secondProductId,
    ]);
    const updates = planReserve(
      [
        { productId: firstProductId, qty: 1 },
        { productId: secondProductId, qty: 1 },
      ],
      current,
    );

    await prisma.product.update({
      where: { id: secondProductId },
      data: { stock: 0, version: { increment: 1 } },
    });

    await expect(repository.applyUpdates(updates)).resolves.toBe(false);
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: firstProductId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 5, version: 0 });
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: secondProductId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 0, version: 1 });
  });
});
