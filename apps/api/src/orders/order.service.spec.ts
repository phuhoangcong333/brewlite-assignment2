import { PrismaService } from '../prisma/prisma.service';
import { describeDb } from '../../test/helpers/describe-db';
import { InvalidTransitionException } from '../common/errors';
import { PrismaInventoryRepository } from '../inventory/prisma-inventory.repository';
import { OrderService } from './order.service';
import { OrderStatus } from './order-state';

describeDb('OrderService with PostgreSQL', () => {
  const prisma = new PrismaService();
  const service = new OrderService(
    prisma,
    new PrismaInventoryRepository(prisma),
  );
  const orderIds: number[] = [];
  const userIds: number[] = [];
  const productIds: number[] = [];

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
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 50, version: 2 });
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
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stock: true, version: true },
    });

    if (order.status === 'CANCELLED') {
      expect(product).toEqual({ stock: 50, version: 2 });
    } else {
      expect(order.status).toBe('PAID');
      expect(product).toEqual({ stock: 49, version: 1 });
    }
  });

  it('keeps reserved stock when retrying payment after PAYMENT_FAILED', async () => {
    const { orderId, productId } = await createOrder('PAYMENT_FAILED');

    await service.transitionOrder(orderId, 'PENDING');

    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 49, version: 1 });
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

    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 49, version: 1 });
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

  it.each(['PENDING', 'PAYMENT_FAILED'] as const)(
    'restores inventory when cancelling from %s',
    async (status) => {
      const { orderId, productId } = await createOrder(status);

      await expect(
        service.transitionOrder(orderId, 'CANCELLED'),
      ).resolves.toBeUndefined();
      await expect(
        prisma.product.findUniqueOrThrow({
          where: { id: productId },
          select: { stock: true, version: true },
        }),
      ).resolves.toEqual({ stock: 50, version: 2 });
    },
  );

  it.each(['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const)(
    'rejects cancellation from %s without changing inventory',
    async (status) => {
      const { orderId, productId } = await createOrder(status);

      await expect(
        service.transitionOrder(orderId, 'CANCELLED'),
      ).rejects.toBeInstanceOf(InvalidTransitionException);
      await expect(
        prisma.product.findUniqueOrThrow({
          where: { id: productId },
          select: { stock: true, version: true },
        }),
      ).resolves.toEqual({ stock: 49, version: 1 });
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
    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, version: true },
      }),
    ).resolves.toEqual({ stock: 49, version: 1 });
  });
});
