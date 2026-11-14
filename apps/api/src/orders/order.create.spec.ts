import {
  attachIngredient,
  ingredientQuantity,
} from '../../test/helpers/ingredient-fixtures';
import { PrismaService } from '../prisma/prisma.service';
import { describeDb } from '../../test/helpers/describe-db';
import { OrderService } from './order.service';
import { PrismaInventoryRepository } from '../inventory/prisma-inventory.repository';

describeDb('OrderService.createOrder with PostgreSQL', () => {
  const prisma = new PrismaService();
  const service = new OrderService(
    prisma,
    new PrismaInventoryRepository(prisma),
  );
  const orderIds: number[] = [];
  const userIds: number[] = [];
  const productIds: number[] = [];
  const ingredientIds: number[] = [];
  const promotionCodes: string[] = [];

  async function createUser(): Promise<number> {
    const user = await prisma.user.create({
      data: {
        email: `order-create-${Date.now()}-${Math.random()}@example.test`,
        passwordHash: 'test-password-hash',
      },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function createProduct(stock: number): Promise<number> {
    const product = await prisma.product.create({
      data: {
        name: `order-create-product-${Date.now()}-${Math.random()}`,
        price: 35_000,
        stock,
      },
      select: { id: true },
    });
    productIds.push(product.id);
    await attachIngredient(prisma, product.id, stock, ingredientIds);
    return product.id;
  }

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    if (orderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      orderIds.length = 0;
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = 0;
    }
    if (productIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      productIds.length = 0;
      await prisma.ingredient.deleteMany({
        where: { id: { in: ingredientIds } },
      });
      ingredientIds.length = 0;
    }
    if (promotionCodes.length > 0) {
      await prisma.promotion.deleteMany({
        where: { code: { in: promotionCodes } },
      });
      promotionCodes.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the order and reserves stock in the same transaction', async () => {
    const userId = await createUser();
    const productId = await createProduct(10);

    const order = await service.createOrder(userId, [
      {
        productId,
        qty: 2,
        size: 'M',
        toppings: ['Trân châu'],
      },
    ]);
    orderIds.push(order.id);

    expect(order).toMatchObject({
      status: 'PENDING',
      total: 90_000,
      discount: 0,
    });
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(8);
    await expect(
      prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, qty: true, lineTotal: true, toppings: true },
      }),
    ).resolves.toEqual([
      {
        productId,
        qty: 2,
        lineTotal: 90_000,
        toppings: ['Trân châu'],
      },
    ]);
  });

  it('rolls back reserved stock if creating the order fails', async () => {
    const productId = await createProduct(10);
    let missingUserId = 2_147_483_647;
    while (await prisma.user.findUnique({ where: { id: missingUserId } })) {
      missingUserId -= 1;
    }

    await expect(
      service.createOrder(missingUserId, [{ productId, qty: 2, size: 'S' }]),
    ).rejects.toThrow();

    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(10);
    await expect(
      prisma.order.count({ where: { userId: missingUserId } }),
    ).resolves.toBe(0);
  });

  it('retries concurrent order creation without reserving the same stock twice', async () => {
    const userId = await createUser();
    const productId = await createProduct(50);

    const orders = await Promise.all([
      service.createOrder(userId, [{ productId, qty: 1, size: 'S' }]),
      service.createOrder(userId, [{ productId, qty: 1, size: 'S' }]),
    ]);
    orderIds.push(...orders.map(({ id }) => id));

    expect(orders).toHaveLength(2);
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(48);
  });

  it('applies a promotion and consumes its usage inside the order transaction', async () => {
    const userId = await createUser();
    const productId = await createProduct(10);
    const code = `TV5-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    promotionCodes.push(code);
    await prisma.promotion.create({
      data: {
        code,
        percent: 20,
        expiresAt: new Date(Date.now() + 60_000),
        usageLeft: 1,
      },
    });

    const order = await service.createOrder(
      userId,
      [{ productId, qty: 1, size: 'S' }],
      code,
    );
    orderIds.push(order.id);

    expect(order).toMatchObject({ total: 28_000, discount: 7_000 });
    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { promoCode: true, discount: true, total: true },
      }),
    ).resolves.toEqual({ promoCode: code, discount: 7_000, total: 28_000 });
    await expect(
      prisma.promotion.findUniqueOrThrow({ where: { code } }),
    ).resolves.toMatchObject({ usageLeft: 0 });

    await expect(
      service.createOrder(userId, [{ productId, qty: 1, size: 'S' }], code),
    ).rejects.toThrow('invalid or expired');
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(9);
  });
});
