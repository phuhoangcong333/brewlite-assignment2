import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaCatalogRepository } from '../adapters/prisma-catalog.repository';
import { PrismaPromotionRepository } from '../adapters/prisma-promotion.repository';

describe('PrismaCatalogRepository', () => {
  it('uses the current recipe schema and computes stock from ingredients', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Cà phê sữa',
        imageUrl: null,
        price: 35_000,
        stock: 50,
        recipeItems: [
          {
            amountRequired: 20,
            ingredient: { stockQuantity: 45 },
          },
          {
            amountRequired: 10,
            ingredient: { stockQuantity: 10 },
          },
        ],
      },
    ]);
    const prisma = {
      product: { findMany },
    } as unknown as PrismaService;
    const repository = new PrismaCatalogRepository(prisma);

    await expect(repository.findProducts([1])).resolves.toEqual([
      {
        id: 1,
        name: 'Cà phê sữa',
        imageUrl: null,
        basePrice: 35_000,
        stock: 1,
        sizes: [
          { id: 1, extraPrice: 0 },
          { id: 2, extraPrice: 5_000 },
          { id: 3, extraPrice: 10_000 },
        ],
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      include: { recipeItems: { include: { ingredient: true } } },
    });
  });

  it('returns the supported toppings without querying a nonexistent table', async () => {
    const prisma = {} as unknown as PrismaService;
    const repository = new PrismaCatalogRepository(prisma);

    await expect(repository.findToppings([1, 2, 99])).resolves.toEqual([
      { id: 1, price: 5_000, stock: Number.MAX_SAFE_INTEGER },
      { id: 2, price: 5_000, stock: Number.MAX_SAFE_INTEGER },
    ]);
  });
});

describe('PrismaPromotionRepository', () => {
  it('maps the current promotion fields to the quote rule model', async () => {
    const expiresAt = new Date('2026-12-31T23:59:59.999Z');
    const findUnique = jest.fn().mockResolvedValue({
      id: 3,
      code: 'BREW20',
      percent: 20,
      expiresAt,
      usageLeft: 2,
    });
    const prisma = {
      promotion: { findUnique },
    } as unknown as PrismaService;
    const repository = new PrismaPromotionRepository(prisma);

    await expect(repository.findByCode('BREW20')).resolves.toEqual({
      id: 3,
      code: 'BREW20',
      description: null,
      discountType: 'PERCENT',
      discountValue: 20,
      maxDiscountAmount: null,
      minOrderValue: 0,
      startsAt: new Date(0),
      expiresAt,
      usageLimit: 1,
      usedCount: 0,
      isActive: true,
    });
  });

  it('maps exhausted promotions to the usage limit rule', async () => {
    const prisma = {
      promotion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
          code: 'BREW20',
          percent: 20,
          expiresAt: new Date('2026-12-31T23:59:59.999Z'),
          usageLeft: 0,
        }),
      },
    } as unknown as PrismaService;
    const repository = new PrismaPromotionRepository(prisma);

    await expect(repository.findByCode('BREW20')).resolves.toMatchObject({
      usageLimit: 1,
      usedCount: 1,
    });
  });
});
