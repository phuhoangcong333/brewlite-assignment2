import {
  attachIngredient,
  ingredientQuantity,
} from '../../test/helpers/ingredient-fixtures';
import { PrismaService } from '../prisma/prisma.service';
import { describeDb } from '../../test/helpers/describe-db';
import { InvalidTransitionException } from '../common/errors';
import { OrderService } from './order.service';
import { OrderStatus } from './order-state';
import { PrismaInventoryRepository } from '../inventory/prisma-inventory.repository';

describeDb('OrderService with PostgreSQL', () => {
  const prisma = new PrismaService();
  const service = new OrderService(
    prisma,
    new PrismaInventoryRepository(prisma),
  );
  const orderIds: number[] = [];
  const userIds: number[] = [];
  const productIds: number[] = [];
  const ingredientIds: number[] = [];

  async function createOrder(
    status: OrderStatus = 'PENDING',
  ): Promise<{ orderId: number; productId: number }> {
    const product = await prisma.product.create({
      data: {
        name: `order-cancel-test-${Date.now()}-${Math.random()}`,
        price: 1000,
        stock: 49,
        version: 1,
      },
      select: { id: true },
    });
    productIds.push(product.id);
    const ingredientId = await attachIngredient(
      prisma,
      product.id,
      49,
      ingredientIds,
    );

    const user = await prisma.user.create({
      data: {
        email: `order-cancel-${Date.now()}-${Math.random()}@example.test`,
        passwordHash: 'test-password-hash',
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status,
        ingredients: { create: { ingredientId, quantity: 1 } },
        total: 1000,
        items: {
          create: {
            productId: product.id,
            size: 'S',
            qty: 1,
            lineTotal: 1000,
          },
        },
      },
      select: { id: true },
    });
    orderIds.push(order.id);

    return { orderId: order.id, productId: product.id };
  }

  async function createRecipeBackedOrder(): Promise<{
    orderId: number;
    ingredientId: number;
  }> {
    const product = await prisma.product.create({
      data: {
        name: `order-cancel-recipe-${Date.now()}-${Math.random()}`,
        price: 1000,
        stock: 50,
      },
      select: { id: true },
    });
    productIds.push(product.id);

    const ingredient = await prisma.ingredient.create({
      data: {
        name: `order-cancel-ingredient-${Date.now()}-${Math.random()}`,
        unit: 'g',
        stockQuantity: 940,
      },
      select: { id: true },
    });
    ingredientIds.push(ingredient.id);
    await prisma.recipeItem.createMany({
      data: [
        {
          productId: product.id,
          ingredientId: ingredient.id,
          size: 'S',
          amountRequired: 10,
        },
        {
          productId: product.id,
          ingredientId: ingredient.id,
          size: 'M',
          amountRequired: 20,
        },
        {
          productId: product.id,
          ingredientId: ingredient.id,
          size: 'L',
          amountRequired: 30,
        },
      ],
    });

    const user = await prisma.user.create({
      data: {
        email: `order-cancel-recipe-${Date.now()}-${Math.random()}@example.test`,
        passwordHash: 'test-password-hash',
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total: 2000,
        items: {
          create: {
            productId: product.id,
            size: 'L',
            qty: 2,
            lineTotal: 2000,
          },
        },
      },
      select: { id: true },
    });
    orderIds.push(order.id);
    return { orderId: order.id, ingredientId: ingredient.id };
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
    if (ingredientIds.length > 0) {
      await prisma.ingredient.deleteMany({
        where: { id: { in: ingredientIds } },
      });
      ingredientIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('restores inventory only once when two cancellations race', async () => {
    const { orderId, productId } = await createOrder();

    const results = await Promise.allSettled([
      service.transitionOrder(orderId, 'CANCELLED'),
      service.transitionOrder(orderId, 'CANCELLED'),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(50);
  });

  it('allows only cancellation or payment to win when both race', async () => {
    const { orderId, productId } = await createOrder();

    const results = await Promise.allSettled([
      service.transitionOrder(orderId, 'CANCELLED'),
      service.transitionOrder(orderId, 'PAID'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    const product = await ingredientQuantity(prisma, productId);

    if (order.status === 'CANCELLED') {
      expect(product).toBe(50);
    } else {
      expect(order.status).toBe('PAID');
      expect(product).toBe(49);
    }
  });

  it('keeps reserved stock when retrying payment after PAYMENT_FAILED', async () => {
    const { orderId, productId } = await createOrder('PAYMENT_FAILED');

    await service.transitionOrder(orderId, 'PENDING');

    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(49);
  });

  it('supports the PAID -> PREPARING -> READY -> COMPLETED lifecycle', async () => {
    const { orderId, productId } = await createOrder('PAID');

    for (const status of ['PREPARING', 'READY', 'COMPLETED'] as const) {
      await service.transitionOrder(orderId, status);
      await expect(
        prisma.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true },
        }),
      ).resolves.toEqual({ status });
    }

    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(49);
  });

  it('records loyalty only when an order reaches COMPLETED', async () => {
    const product = await prisma.product.create({
      data: {
        name: `loyalty-test-${Date.now()}-${Math.random()}`,
        price: 25_000,
        stock: 1,
        version: 1,
      },
      select: { id: true },
    });
    productIds.push(product.id);

    const user = await prisma.user.create({
      data: {
        email: `loyalty-${Date.now()}-${Math.random()}@example.test`,
        passwordHash: 'test-password-hash',
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PAID',
        total: 25_000,
        items: {
          create: {
            productId: product.id,
            size: 'S',
            qty: 1,
            lineTotal: 25_000,
          },
        },
      },
      select: { id: true },
    });
    orderIds.push(order.id);

    await service.transitionOrder(order.id, 'PREPARING');
    await service.transitionOrder(order.id, 'READY');

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 0 });

    await service.transitionOrder(order.id, 'COMPLETED');

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 2 });
    await expect(
      prisma.loyaltyTransaction.findUniqueOrThrow({
        where: { orderId: order.id },
        select: { userId: true, points: true },
      }),
    ).resolves.toEqual({ userId: user.id, points: 2 });
  });

  it('does not allow staff transitions to change payment-managed statuses', async () => {
    const { orderId } = await createOrder('PENDING');

    await expect(
      service.transitionOrderForStaff(orderId, 'PAID'),
    ).rejects.toBeInstanceOf(InvalidTransitionException);
    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: 'PENDING' });
  });

  it.each(['PENDING', 'PREPARING'] as const)(
    'staff cancels %s and restores the saved consumption only once',
    async (status) => {
      const { orderId, productId } = await createOrder(status);
      await prisma.order.update({
        where: { id: orderId },
        data: { usesIngredientInventory: true },
      });
      await service.transitionOrderForStaff(orderId, 'CANCELLED');
      expect(await ingredientQuantity(prisma, productId)).toBe(50);
      await expect(
        service.transitionOrderForStaff(orderId, 'CANCELLED'),
      ).rejects.toBeInstanceOf(InvalidTransitionException);
      expect(await ingredientQuantity(prisma, productId)).toBe(50);
      expect(
        await prisma.loyaltyTransaction.count({ where: { orderId } }),
      ).toBe(0);
    },
  );

  it('staff cancellation still restores legacy product stock for a preparing order', async () => {
    const { orderId, productId } = await createOrder('PREPARING');
    await prisma.order.update({
      where: { id: orderId },
      data: { usesIngredientInventory: false },
    });
    await service.transitionOrderForStaff(orderId, 'CANCELLED');
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(50);
    expect(await ingredientQuantity(prisma, productId)).toBe(49);
  });

  it.each(['PENDING', 'PAYMENT_FAILED'] as const)(
    'restores inventory when cancelling from %s',
    async (status) => {
      const { orderId, productId } = await createOrder(status);

      await expect(
        service.transitionOrder(orderId, 'CANCELLED'),
      ).resolves.toBeUndefined();
      await expect(ingredientQuantity(prisma, productId)).resolves.toBe(50);
    },
  );

  it('restores ingredients using the size recipe when cancelling an order', async () => {
    const { orderId, ingredientId } = await createRecipeBackedOrder();

    await service.transitionOrder(orderId, 'CANCELLED');

    await expect(
      prisma.ingredient.findUniqueOrThrow({
        where: { id: ingredientId },
        select: { stockQuantity: true, version: true },
      }),
    ).resolves.toEqual({ stockQuantity: 1_000, version: 1 });
  });

  it.each(['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const)(
    'rejects cancellation from %s without changing inventory',
    async (status) => {
      const { orderId, productId } = await createOrder(status);

      await expect(
        service.transitionOrder(orderId, 'CANCELLED'),
      ).rejects.toBeInstanceOf(InvalidTransitionException);
      await expect(ingredientQuantity(prisma, productId)).resolves.toBe(49);
    },
  );

  it('rejects PENDING -> READY without changing the order or inventory', async () => {
    const { orderId, productId } = await createOrder();

    await expect(
      service.transitionOrder(orderId, 'READY'),
    ).rejects.toBeInstanceOf(InvalidTransitionException);
    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: 'PENDING' });
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(49);
  });
});
