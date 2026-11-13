import { config } from 'dotenv';
import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { describeDb } from './helpers/describe-db';

config({ path: resolve(__dirname, '../.env') });

/**
 * S2 / TV6 / Issue #28 — real HTTP + PostgreSQL tests.
 * Runs only with DATABASE_URL set (describeDb); never claim PASS when skipped.
 * Creates its own isolated users and product/order fixtures. No preset staff
 * credentials or seed database are required.
 */
describeDb('TV6 S2 — Order status HTTP API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerId: number;
  let otherCustomerId: number;
  let staffId: number;
  let customerToken: string;
  let otherCustomerToken: string;
  let staffToken: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const password = 'tv6-s2-test-password';
  const customerEmail = `tv6-customer-${suffix}@example.test`;
  const otherCustomerEmail = `tv6-other-${suffix}@example.test`;
  const staffEmail = `tv6-staff-${suffix}@example.test`;
  const orderIds: number[] = [];
  const productIds: number[] = [];

  async function login(email: string): Promise<string> {
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(result.body.access_token).toEqual(expect.any(String));
    return result.body.access_token as string;
  }

  async function fixtureOrder(status: OrderStatus = 'PENDING'): Promise<number> {
    const product = await prisma.product.create({
      data: {
        name: `tv6-s2-product-${suffix}-${productIds.length}`,
        price: 15_000,
        stock: 49,
        version: 1,
      },
      select: { id: true },
    });
    productIds.push(product.id);

    const order = await prisma.order.create({
      data: {
        userId: customerId,
        status,
        total: 15_000,
        items: {
          create: {
            productId: product.id,
            size: 'S',
            qty: 1,
            toppings: [],
            lineTotal: 15_000,
          },
        },
      },
      select: { id: true },
    });
    orderIds.push(order.id);
    return order.id;
  }

  const patchStatus = (id: number, status: string, bearer?: string) => {
    const endpoint = request(app.getHttpServer())
      .patch(`/orders/${id}/status`);
    return (bearer ? endpoint.set('Authorization', `Bearer ${bearer}`) : endpoint)
      .send({ status });
  };

  async function expectDbStatus(orderId: number, status: OrderStatus) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order.status).toBe(status);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 4);
    const [customer, other, staff] = await Promise.all([
      prisma.user.create({
        data: { email: customerEmail, passwordHash, role: 'CUSTOMER' },
        select: { id: true },
      }),
      prisma.user.create({
        data: { email: otherCustomerEmail, passwordHash, role: 'CUSTOMER' },
        select: { id: true },
      }),
      prisma.user.create({
        data: { email: staffEmail, passwordHash, role: 'STAFF' },
        select: { id: true },
      }),
    ]);
    customerId = customer.id;
    otherCustomerId = other.id;
    staffId = staff.id;

    [customerToken, otherCustomerToken, staffToken] = await Promise.all([
      login(customerEmail),
      login(otherCustomerEmail),
      login(staffEmail),
    ]);
  });

  afterAll(async () => {
    if (prisma) {
      if (orderIds.length) {
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (productIds.length) {
        await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      }
      if (customerId && otherCustomerId && staffId) {
        await prisma.user.deleteMany({
          where: { id: { in: [customerId, otherCustomerId, staffId] } },
        });
      }
    }
    if (app) await app.close();
  });

  it('allows exactly PAID -> PREPARING -> READY -> COMPLETED (204, DB persisted)', async () => {
    const orderId = await fixtureOrder('PAID');
    for (const next of ['PREPARING', 'READY', 'COMPLETED'] as const) {
      const response = await patchStatus(orderId, next, staffToken).expect(204);
      expect(response.text).toBe('');
      await expectDbStatus(orderId, next);
    }
  });

  it('rejects a skipped step with 409 without changing DB', async () => {
    const orderId = await fixtureOrder('PAID');
    await patchStatus(orderId, 'READY', staffToken).expect(409);
    await expectDbStatus(orderId, 'PAID');
  });

  it('rejects PENDING -> PREPARING (STAFF cannot perform payment)', async () => {
    const orderId = await fixtureOrder();
    await patchStatus(orderId, 'PREPARING', staffToken).expect(409);
    await expectDbStatus(orderId, 'PENDING');
  });

  it.each(['COMPLETED', 'CANCELLED'] as const)(
    'keeps terminal state %s immutable (409)',
    async (terminal) => {
      const orderId = await fixtureOrder(terminal);
      await patchStatus(orderId, 'PREPARING', staffToken).expect(409);
      await expectDbStatus(orderId, terminal);
    },
  );

  it('rejects missing JWT (401) and CUSTOMER JWT (403)', async () => {
    const orderId = await fixtureOrder('PAID');
    await patchStatus(orderId, 'PREPARING').expect(401);
    await patchStatus(orderId, 'PREPARING', customerToken).expect(403);
    await expectDbStatus(orderId, 'PAID');
  });

  it('rejects unknown status, missing status, and invalid JSON (400)', async () => {
    const orderId = await fixtureOrder('PAID');
    await patchStatus(orderId, 'NOT_A_STATUS', staffToken).expect(400);
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Content-Type', 'application/json')
      .send('{"status":')
      .expect(400);
    await expectDbStatus(orderId, 'PAID');
  });

  it('returns 400 for invalid/zero order id and 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .patch('/orders/not-an-id/status')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'PREPARING' })
      .expect(400);
    await patchStatus(0, 'PREPARING', staffToken).expect(400);
    await patchStatus(2147483647, 'PREPARING', staffToken).expect(404);
  });

  it('returns 200 GET /orders/:id to owner, 404 to another customer', async () => {
    const orderId = await fixtureOrder('READY');
    const response = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(response.body).toMatchObject({
      id: orderId,
      userId: customerId,
      status: 'READY',
      total: 15_000,
    });
    expect(response.body.items).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .expect(401);
  });

  it('GET /orders/:id responds 400 for malformed id, 404 for missing id', async () => {
    await request(app.getHttpServer())
      .get('/orders/bad-id')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/orders/0')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/orders/2147483647')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(404);
  });

  it('only one of two simultaneous identical transitions succeeds (204 / 409)', async () => {
    const orderId = await fixtureOrder('PAID');
    const responses = await Promise.all([
      patchStatus(orderId, 'PREPARING', staffToken),
      patchStatus(orderId, 'PREPARING', staffToken),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([204, 409]);
    await expectDbStatus(orderId, 'PREPARING');
  });
});
