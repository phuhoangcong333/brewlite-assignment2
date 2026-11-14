import { PrismaService } from '../prisma/prisma.service';
import { describeDb } from '../../test/helpers/describe-db';
import { PrismaInventoryRepository } from '../inventory/prisma-inventory.repository';
import { OrderService } from './order.service';

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
  const toppingIds: string[] = [];
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
    return product.id;
  }

  async function createIngredient(stockQuantity: number): Promise<number> {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: `order-create-ingredient-${Date.now()}-${Math.random()}`,
        unit: 'g',
        stockQuantity,
      },
      select: { id: true },
    });
    ingredientIds.push(ingredient.id);
    return ingredient.id;
  }

  async function createTopping(stockQuantity: number): Promise<{
    id: string;
    ingredientId: number;
  }> {
    const ingredientId = await createIngredient(stockQuantity);
    const id = `order-create-topping-${Date.now()}-${Math.random()}`;
    await prisma.topping.create({
      data: {
        id,
        name: id,
        price: 5_000,
        amountPerPortion: 50,
        ingredientId,
      },
    });
    toppingIds.push(id);
    return { id, ingredientId };
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
    }
    if (toppingIds.length > 0) {
      await prisma.topping.deleteMany({ where: { id: { in: toppingIds } } });
      toppingIds.length = 0;
    }
    if (ingredientIds.length > 0) {
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
    const topping = await createTopping(500);

    const order = await service.createOrder(userId, [
      {
        productId,
        qty: 2,
        size: 'M',
        toppings: [topping.id],
      },
    ]);
    orderIds.push(order.id);

    expect(order).toMatchObject({
      status: 'PENDING',
      total: 90_000,
      discount: 0,
    });
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 8, version: 1 });
    await expect(
      prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: {
          productId: true,
          qty: true,
          lineTotal: true,
          toppings: true,
          toppingIds: true,
          toppingAmounts: true,
        },
      }),
    ).resolves.toEqual([
      {
        productId,
        qty: 2,
        lineTotal: 90_000,
        toppings: [topping.id],
        toppingIds: [topping.id],
        toppingAmounts: [50],
      },
    ]);
    await expect(
      prisma.ingredient.findUniqueOrThrow({
        where: { id: topping.ingredientId },
        select: { stockQuantity: true, version: true },
      }),
    ).resolves.toEqual({ stockQuantity: 400, version: 1 });
  });

  it('reserves the ingredients for each ordered size', async () => {
    const userId = await createUser();
    const productId = await createProduct(50);
    const ingredientId = await createIngredient(1_000);
    await prisma.recipeItem.createMany({
      data: [
        { productId, ingredientId, size: 'S', amountRequired: 10 },
        { productId, ingredientId, size: 'M', amountRequired: 20 },
        { productId, ingredientId, size: 'L', amountRequired: 30 },
      ],
    });

    const order = await service.createOrder(userId, [
      { productId, qty: 2, size: 'S' },
      { productId, qty: 1, size: 'M' },
      { productId, qty: 1, size: 'L' },
    ]);
    orderIds.push(order.id);

    expect(order.total).toBe(155_000);
    await expect(
      prisma.ingredient.findUniqueOrThrow({
        where: { id: ingredientId },
        select: { stockQuantity: true, version: true },
      }),
    ).resolves.toEqual({ stockQuantity: 930, version: 1 });
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      }),
    ).resolves.toEqual({ stock: 50 });
    await expect(
      prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: { size: true, qty: true },
        orderBy: { id: 'asc' },
      }),
    ).resolves.toEqual([
      { size: 'S', qty: 2 },
      { size: 'M', qty: 1 },
      { size: 'L', qty: 1 },
    ]);
  });

  it('rejects an exhausted topping and rolls back all inventory reservations', async () => {
    const userId = await createUser();
    const productId = await createProduct(10);
    const topping = await createTopping(49);

    await expect(
      service.createOrder(userId, [
        { productId, qty: 1, size: 'S', toppings: [topping.id] },
      ]),
    ).rejects.toThrow('Không đủ nguyên liệu');

    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 10, version: 0 });
    await expect(
      prisma.ingredient.findUniqueOrThrow({
        where: { id: topping.ingredientId },
        select: { stockQuantity: true, version: true },
      }),
    ).resolves.toEqual({ stockQuantity: 49, version: 0 });
  });

  it('uses the same topping portion for size S and size L', async () => {
    const userId = await createUser();
    const productId = await createProduct(10);
    const topping = await createTopping(500);

    const order = await service.createOrder(userId, [
      { productId, qty: 1, size: 'S', toppings: [topping.id] },
      { productId, qty: 1, size: 'L', toppings: [topping.id] },
    ]);
    orderIds.push(order.id);

    expect(order.total).toBe(90_000);
    await expect(
      prisma.ingredient.findUniqueOrThrow({
        where: { id: topping.ingredientId },
        select: { stockQuantity: true },
      }),
    ).resolves.toEqual({ stockQuantity: 400 });
    await expect(
      prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: { size: true, toppingAmounts: true },
        orderBy: { id: 'asc' },
      }),
    ).resolves.toEqual([
      { size: 'S', toppingAmounts: [50] },
      { size: 'L', toppingAmounts: [50] },
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

    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 10, version: 0 });
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
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 48, version: 2 });
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
    ).rejects.toThrow(RangeError);
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      }),
    ).resolves.toEqual({ stock: 9 });
  });
});
