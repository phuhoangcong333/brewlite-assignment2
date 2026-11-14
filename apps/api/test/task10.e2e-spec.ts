import {
  attachIngredient,
  ingredientQuantity,
} from './helpers/ingredient-fixtures';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { describeDb } from './helpers/describe-db';

config({ path: resolve(__dirname, '../.env') });

describeDb('Task 10 HTTP integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `task10-e2e-${suffix}@example.test`;
  const otherEmail = `task10-e2e-other-${suffix}@example.test`;
  const password = 'task10-password';
  const productIds: number[] = [];
  const ingredientIds: number[] = [];
  const promotionCodes: string[] = [];
  let userId: number;
  let otherUserId: number;
  let token: string;
  let otherToken: string;
  let staffToken: string;
  let staffId: number;

  async function createProduct(stock: number): Promise<number> {
    const product = await prisma.product.create({
      data: {
        name: `task10-e2e-product-${suffix}-${productIds.length}`,
        price: 1_000,
        stock,
      },
      select: { id: true },
    });
    productIds.push(product.id);
    await attachIngredient(prisma, product.id, stock, ingredientIds);
    return product.id;
  }

  async function createOrder(productId: number) {
    return request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, qty: 1, size: 'S' }] });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    userId = (
      await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 4),
        },
        select: { id: true },
      })
    ).id;
    otherUserId = (
      await prisma.user.create({
        data: {
          email: otherEmail,
          passwordHash: await bcrypt.hash(password, 4),
        },
        select: { id: true },
      })
    ).id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    token = login.body.access_token;
    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, password })
      .expect(200);
    otherToken = otherLogin.body.access_token;
    const staffEmail = 'staff-' + email;
    staffId = (
      await prisma.user.create({
        data: {
          email: staffEmail,
          passwordHash: await bcrypt.hash(password, 4),
          role: 'STAFF',
        },
      })
    ).id;
    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: staffEmail, password })
      .expect(200);
    staffToken = staffLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { order: { userId } } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId: otherUserId } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.ingredient.deleteMany({
      where: { id: { in: ingredientIds } },
    });
    await prisma.promotion.deleteMany({
      where: { code: { in: promotionCodes } },
    });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: staffId } });
    await app.close();
  });

  it('C6: rejects POST /orders without JWT', async () => {
    const productId = await createProduct(1);

    await request(app.getHttpServer())
      .post('/orders')
      .send({ items: [{ productId, qty: 1, size: 'S' }] })
      .expect(401);
  });

  it('TV5: GET /orders/me returns only the authenticated user orders', async () => {
    const productId = await createProduct(1);
    const ownOrder = await createOrder(productId);
    expect(ownOrder.status).toBe(201);

    const foreignOrder = await prisma.order.create({
      data: {
        userId: otherUserId,
        total: 1_000,
        items: {
          create: {
            productId,
            size: 'S',
            qty: 1,
            toppings: [],
            lineTotal: 1_000,
          },
        },
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .get('/orders/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const orderIds = response.body.map((order: { id: number }) => order.id);

    expect(orderIds).toContain(ownOrder.body.id);
    expect(orderIds).not.toContain(foreignOrder.id);
  });

  it('C5: concurrent HTTP orders cannot oversell stock', async () => {
    const productId = await createProduct(1);
    const responses = await Promise.all([
      createOrder(productId),
      createOrder(productId),
    ]);

    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === 400),
    ).toHaveLength(1);
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(0);
  });

  it('C9: repeated HTTP payment with one key replays one payment', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);
    expect(order.status).toBe(201);

    const body = {
      orderId: order.body.id,
      method: 'WALLET',
      walletId: 'WALLET-1234',
    };
    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task10-${suffix}-same`)
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task10-${suffix}-same`)
      .send(body)
      .expect(201);

    expect(first.body.replayed).toBe(false);
    expect(second.body.replayed).toBe(true);
    expect(second.body.paymentId).toBe(first.body.paymentId);
    await expect(
      prisma.payment.count({ where: { orderId: order.body.id } }),
    ).resolves.toBe(1);
  });

  it('C8a: a new payment key cannot pay an already PAID order', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);
    const body = {
      orderId: order.body.id,
      method: 'WALLET',
      walletId: 'WALLET-1234',
    };

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task10-${suffix}-paid-1`)
      .send(body)
      .expect(201);
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task10-${suffix}-paid-2`)
      .send(body)
      .expect(409);
  });

  it('cancel: owner cancels an order and stock is released', async () => {
    const stockedProductId = await createProduct(1);
    const stockedOrder = await createOrder(stockedProductId);
    expect(stockedOrder.status).toBe(201);

    await request(app.getHttpServer())
      .delete(`/orders/${stockedOrder.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: stockedOrder.body.id },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: 'CANCELLED' });
    await expect(ingredientQuantity(prisma, stockedProductId)).resolves.toBe(1);
  });

  it('cancel: requires JWT', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);

    await request(app.getHttpServer())
      .delete(`/orders/${order.body.id}`)
      .expect(401);
  });

  it('cancel: another user receives 404 and cannot change the order', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);

    await request(app.getHttpServer())
      .delete(`/orders/${order.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: order.body.id },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: 'PENDING' });
  });

  it('cancel: PREPARING orders return 409 and keep stock reserved', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);
    await prisma.order.update({
      where: { id: order.body.id },
      data: { status: 'PREPARING' },
    });

    await request(app.getHttpServer())
      .delete(`/orders/${order.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(0);
  });

  it('cancel: concurrent cancellation releases stock only once', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);
    const responses = await Promise.all([
      request(app.getHttpServer())
        .delete(`/orders/${order.body.id}`)
        .set('Authorization', `Bearer ${token}`),
      request(app.getHttpServer())
        .delete(`/orders/${order.body.id}`)
        .set('Authorization', `Bearer ${token}`),
    ]);

    expect(
      responses.filter((response) => response.status === 204),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === 409),
    ).toHaveLength(1);
    await expect(ingredientQuantity(prisma, productId)).resolves.toBe(1);
  });

  it('C13: advances PAID orders through the barista lifecycle', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);
    const paymentBody = {
      orderId: order.body.id,
      method: 'WALLET',
      walletId: 'WALLET-1234',
    };

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task10-${suffix}-lifecycle-payment`)
      .send(paymentBody)
      .expect(201);

    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      await request(app.getHttpServer())
        .patch(`/orders/${order.body.id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status })
        .expect(204);
    }

    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: order.body.id },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: 'COMPLETED' });
  });

  it('C13: rejects an invalid status transition with 409', async () => {
    const productId = await createProduct(1);
    const order = await createOrder(productId);

    await request(app.getHttpServer())
      .patch(`/orders/${order.body.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'READY' })
      .expect(409);
  });

  it('TV5: applies a promotion through POST /orders', async () => {
    const productId = await createProduct(1);
    const code = `E2E-${suffix.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
    promotionCodes.push(code);
    await prisma.promotion.create({
      data: {
        code,
        percent: 10,
        expiresAt: new Date(Date.now() + 60_000),
        usageLeft: 1,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        promoCode: code.toLowerCase(),
        items: [{ productId, qty: 1, size: 'S' }],
      })
      .expect(201);

    expect(response.body).toMatchObject({ total: 900, discount: 100 });
    await expect(
      prisma.promotion.findUniqueOrThrow({ where: { code } }),
    ).resolves.toMatchObject({ usageLeft: 0 });
  });
});
