import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderService } from '../src/orders/order.service';
import { describeDb } from './helpers/describe-db';

describeDb('Issue #21/#28: loyalty HTTP + PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerId: number;
  let staffId: number;
  let customerToken: string;
  let staffToken: string;
  const userIds: number[] = [];
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const transition = (id: number, status: OrderStatus, token = staffToken) =>
    request(app.getHttpServer())
      .patch(`/orders/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status });

  async function createOrder(
    status: OrderStatus = 'READY',
    total = 25_000,
    discount = 0,
  ) {
    return prisma.order.create({
      data: { userId: customerId, status, total, discount },
    });
  }

  async function expectLoyalty(points: number, transactions: number) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(user.loyaltyPoints).toBe(points);
    expect(
      await prisma.loyaltyTransaction.count({ where: { userId: customerId } }),
    ).toBe(transactions);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    const password = 'loyalty-e2e-password';
    for (const role of ['CUSTOMER', 'STAFF'] as const) {
      const email = `loyalty-${role.toLowerCase()}-${suffix}@example.test`;
      const user = await prisma.user.create({
        data: { email, role, passwordHash: await bcrypt.hash(password, 4) },
      });
      userIds.push(user.id);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      if (role === 'CUSTOMER') {
        customerId = user.id;
        customerToken = login.body.access_token;
      } else {
        staffId = user.id;
        staffToken = login.body.access_token;
      }
    }
  });

  afterEach(async () => {
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    if (customerId)
      await prisma.user.update({
        where: { id: customerId },
        data: { loyaltyPoints: 0 },
      });
  });

  afterAll(async () => {
    if (prisma)
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (app) await app.close();
  });

  it('credits only at READY -> COMPLETED, using the discounted total and the customer owner', async () => {
    const order = await createOrder('PENDING', 25_000, 10_000);
    await expectLoyalty(0, 0);
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `loyalty-${suffix}-${order.id}`)
      .send({ orderId: order.id, method: 'WALLET', walletId: 'demo-1234' })
      .expect(201);
    await expectLoyalty(0, 0);
    for (const status of ['PREPARING', 'READY'] as const) {
      await transition(order.id, status).expect(204);
      await expectLoyalty(0, 0);
    }
    await transition(order.id, 'COMPLETED').expect(204);
    await expectLoyalty(2, 1);
    expect(
      await prisma.loyaltyTransaction.findUnique({
        where: { orderId: order.id },
      }),
    ).toMatchObject({ orderId: order.id, userId: customerId, points: 2 });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: staffId } }))
        .loyaltyPoints,
    ).toBe(0);
  });

  it.each([0, 9_999])(
    'completes a %i VND order without a zero-point transaction',
    async (total) => {
      const order = await createOrder('READY', total);
      await transition(order.id, 'COMPLETED').expect(204);
      await expectLoyalty(0, 0);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe('COMPLETED');
    },
  );

  it('credits exactly one point at the 10,000 VND boundary', async () => {
    const order = await createOrder('READY', 10_000);
    await transition(order.id, 'COMPLETED').expect(204);
    await expectLoyalty(1, 1);
  });

  it.each([
    'PENDING',
    'PAYMENT_FAILED',
    'PAID',
    'PREPARING',
    'CANCELLED',
  ] as const)(
    'rejects %s -> COMPLETED and records no points',
    async (status) => {
      const order = await createOrder(status);
      await transition(order.id, 'COMPLETED').expect(409);
      await expectLoyalty(0, 0);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe(status);
    },
  );

  it('does not credit twice on repeated completion requests', async () => {
    const order = await createOrder();
    await transition(order.id, 'COMPLETED').expect(204);
    await transition(order.id, 'COMPLETED').expect(409);
    await expectLoyalty(2, 1);
  });

  it('allows one of two concurrent completions and credits once', async () => {
    const order = await createOrder();
    const responses = await Promise.all([
      transition(order.id, 'COMPLETED'),
      transition(order.id, 'COMPLETED'),
    ]);
    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      204, 409,
    ]);
    await expectLoyalty(2, 1);
  });

  it('atomically accumulates points from two different orders completed concurrently', async () => {
    const first = await createOrder('READY', 25_000);
    const second = await createOrder('READY', 35_000);
    await Promise.all([
      transition(first.id, 'COMPLETED').expect(204),
      transition(second.id, 'COMPLETED').expect(204),
    ]);
    await expectLoyalty(5, 2);
  });

  it('requires JWT and STAFF before completing an order', async () => {
    const order = await createOrder();
    await request(app.getHttpServer())
      .patch(`/orders/${order.id}/status`)
      .send({ status: 'COMPLETED' })
      .expect(401);
    await transition(order.id, 'COMPLETED', customerToken).expect(403);
    await expectLoyalty(0, 0);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe('READY');
  });

  it('rolls back the status change when the unique ledger constraint prevents a second credit', async () => {
    const order = await createOrder();
    await prisma.loyaltyTransaction.create({
      data: { userId: customerId, orderId: order.id, points: 2 },
    });
    await expect(
      app.get(OrderService).transitionOrder(order.id, 'COMPLETED'),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe('READY');
    await expectLoyalty(0, 1);
  });

  it('does not award points on cancellation', async () => {
    const order = await createOrder('PAYMENT_FAILED');
    await request(app.getHttpServer())
      .delete(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(204);
    await expectLoyalty(0, 0);
  });
});
