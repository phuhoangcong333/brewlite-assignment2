import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { describeDb } from './helpers/describe-db';

const statuses = Object.values(OrderStatus);
const staffTransitions = new Set([
  'PAID:PREPARING',
  'PREPARING:READY',
  'READY:COMPLETED',
  'PENDING:CANCELLED',
  'PREPARING:CANCELLED',
]);

describeDb(
  'Issue #21/#28: order status, history, ownership and cancellation',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerId: number;
    let otherId: number;
    let staffId: number;
    let productId: number;
    let token: string;
    let otherToken: string;
    let staffToken: string;
    const userIds: number[] = [];
    const productIds: number[] = [];
    const ingredientIds: number[] = [];
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const auth = (access = token) => ({ Authorization: `Bearer ${access}` });
    const patch = (id: number, status: string, access = staffToken) =>
      request(app.getHttpServer())
        .patch(`/orders/${id}/status`)
        .set(auth(access))
        .send({ status });

    const create = (
      status: OrderStatus = 'PENDING',
      owner = customerId,
      createdAt = new Date(),
    ) =>
      prisma.order.create({
        data: {
          userId: owner,
          status,
          createdAt,
          total: 25_000,
          items: {
            create: {
              productId,
              size: 'S',
              qty: 1,
              lineTotal: 25_000,
              toppings: ['Kem'],
            },
          },
        },
      });

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
      const password = 'status-e2e-password';
      for (const name of ['customer', 'other', 'staff']) {
        const email = `status-${name}-${suffix}@example.test`;
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash(password, 4),
            role: name === 'staff' ? 'STAFF' : 'CUSTOMER',
          },
        });
        userIds.push(user.id);
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password })
          .expect(200);
        if (name === 'customer') {
          customerId = user.id;
          token = login.body.access_token;
        } else if (name === 'other') {
          otherId = user.id;
          otherToken = login.body.access_token;
        } else {
          staffId = user.id;
          staffToken = login.body.access_token;
        }
      }
      productId = (
        await prisma.product.create({
          data: {
            name: `status-fixture-${suffix}`,
            price: 25_000,
            stock: 1_000,
          },
        })
      ).id;
      productIds.push(productId);
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
      if (prisma) {
        await prisma.product.deleteMany({ where: { id: { in: productIds } } });
        await prisma.ingredient.deleteMany({
          where: { id: { in: ingredientIds } },
        });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      if (app) await app.close();
    });

    it('returns only the owner history, newest first, ignoring client userId overrides', async () => {
      const older = await create(
        'COMPLETED',
        customerId,
        new Date('2026-01-01'),
      );
      const newer = await create('PAID', customerId, new Date('2026-02-01'));
      await create('PENDING', otherId);
      const response = await request(app.getHttpServer())
        .get(`/orders?userId=${otherId}`)
        .set(auth())
        .expect(200);
      expect(response.body.map((o: { id: number }) => o.id)).toEqual([
        newer.id,
        older.id,
      ]);
      expect(response.body[0].items[0]).toMatchObject({
        productId,
        size: 'S',
        qty: 1,
        toppings: ['Kem'],
        product: { name: `status-fixture-${suffix}` },
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('returns an empty history for an account with no orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set(auth())
        .expect(200);
      expect(response.body).toEqual([]);
    });

    it('returns an owner detail including items and the earned loyalty ledger', async () => {
      const order = await create('READY');
      await patch(order.id, 'COMPLETED').expect(204);
      const response = await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set(auth())
        .expect(200);
      expect(response.body).toMatchObject({
        id: order.id,
        status: 'COMPLETED',
        total: 25_000,
        loyaltyTransaction: { points: 2 },
      });
      expect(response.body.items[0]).toMatchObject({
        productId,
        lineTotal: 25_000,
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('hides another owner detail from CUSTOMER and STAFF with identical 404 responses', async () => {
      const order = await create();
      for (const access of [otherToken, staffToken]) {
        await request(app.getHttpServer())
          .get(`/orders/${order.id}`)
          .set(auth(access))
          .expect(404);
      }
      await request(app.getHttpServer())
        .get('/orders/2147483647')
        .set(auth())
        .expect(404);
    });

    it.each(['/orders', '/orders/1', '/orders/staff'])(
      'requires JWT on GET %s',
      async (path) => {
        await request(app.getHttpServer()).get(path).expect(401);
        await request(app.getHttpServer())
          .get(path)
          .set(auth('invalid-token'))
          .expect(401);
      },
    );

    it('keeps /orders/me compatible and does not treat /orders/staff as an ID', async () => {
      const order = await create('PAID');
      const mine = await request(app.getHttpServer())
        .get('/orders/me')
        .set(auth())
        .expect(200);
      expect(mine.body.map((o: { id: number }) => o.id)).toEqual([order.id]);
      await request(app.getHttpServer())
        .get('/orders/staff')
        .set(auth())
        .expect(403);
      const active = await request(app.getHttpServer())
        .get('/orders/staff')
        .set(auth(staffToken))
        .expect(200);
      expect(active.body.map((o: { id: number }) => o.id)).toContain(order.id);
    });

    it('lists only PENDING/PAID/PREPARING/READY orders for staff', async () => {
      const orders = await Promise.all(
        statuses.map((status) => create(status)),
      );
      const response = await request(app.getHttpServer())
        .get('/orders/staff')
        .set(auth(staffToken))
        .expect(200);
      expect(
        response.body
          .map((o: { id: number }) => o.id)
          .sort((a: number, b: number) => a - b),
      ).toEqual(
        orders
          .filter((o) =>
            ['PENDING', 'PAID', 'PREPARING', 'READY'].includes(o.status),
          )
          .map((o) => o.id)
          .sort((a, b) => a - b),
      );
    });

    it.each(statuses.flatMap((from) => statuses.map((to) => ({ from, to }))))(
      'PATCH STAFF $from -> $to follows the state machine and role contract',
      async ({ from, to }) => {
        const order = await create(from);
        const valid = staffTransitions.has(`${from}:${to}`);
        await patch(order.id, to).expect(valid ? 204 : 409);
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
            .status,
        ).toBe(valid ? to : from);
        const points = valid && to === 'COMPLETED' ? 2 : 0;
        expect(
          (await prisma.user.findUniqueOrThrow({ where: { id: customerId } }))
            .loyaltyPoints,
        ).toBe(points);
        expect(
          await prisma.loyaltyTransaction.count({
            where: { orderId: order.id },
          }),
        ).toBe(points ? 1 : 0);
      },
    );

    it('rejects missing JWT, CUSTOMER and a downgraded old STAFF token without writes', async () => {
      const order = await create('PAID');
      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: 'PREPARING' })
        .expect(401);
      await patch(order.id, 'PREPARING', token).expect(403);
      await prisma.user.update({
        where: { id: staffId },
        data: { role: 'CUSTOMER' },
      });
      try {
        await patch(order.id, 'PREPARING').expect(403);
      } finally {
        await prisma.user.update({
          where: { id: staffId },
          data: { role: 'STAFF' },
        });
      }
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe('PAID');
    });

    it('validates status bodies and path IDs, returning 400/404 before writes', async () => {
      const order = await create('PAID');
      for (const body of [
        {},
        { status: 'DELIVERED' },
        { status: 'PREPARING', userId: otherId },
      ]) {
        await request(app.getHttpServer())
          .patch(`/orders/${order.id}/status`)
          .set(auth(staffToken))
          .send(body)
          .expect(400);
      }
      await request(app.getHttpServer())
        .get('/orders/not-a-number')
        .set(auth())
        .expect(400);
      await patch(2_147_483_647, 'PREPARING').expect(404);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe('PAID');
    });

    it('lets only one of two simultaneous staff status changes succeed', async () => {
      const order = await create('PAID');
      const results = await Promise.all([
        patch(order.id, 'PREPARING'),
        patch(order.id, 'PREPARING'),
      ]);
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        204, 409,
      ]);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe('PREPARING');
    });

    it.each(['0', '-1', '2147483648', '99999999999999999999', 'invalid'])(
      'rejects invalid order id %s on detail, status and cancellation',
      async (id) => {
        await request(app.getHttpServer())
          .get(`/orders/${id}`)
          .set(auth())
          .expect(400);
        await request(app.getHttpServer())
          .patch(`/orders/${id}/status`)
          .set(auth(staffToken))
          .send({ status: 'PREPARING' })
          .expect(400);
        await request(app.getHttpServer())
          .delete(`/orders/${id}`)
          .set(auth())
          .expect(400);
      },
    );

    it.each(['PENDING', 'PAYMENT_FAILED'] as const)(
      'cancels %s and restores TV4 ingredient inventory exactly once',
      async (status) => {
        const ingredient = await prisma.ingredient.create({
          data: {
            name: `cancel-${status}-${suffix}`,
            stockQuantity: 200,
            unit: 'ml',
          },
        });
        ingredientIds.push(ingredient.id);
        const product = await prisma.product.create({
          data: {
            name: `cancel-${status}-${suffix}`,
            price: 25_000,
            recipeItems: {
              create: {
                ingredientId: ingredient.id,
                size: 'S',
                amountRequired: 20,
              },
            },
          },
        });
        productIds.push(product.id);
        const response = await request(app.getHttpServer())
          .post('/orders')
          .set(auth())
          .send({ items: [{ productId: product.id, qty: 2, size: 'S' }] })
          .expect(201);
        const id: number = response.body.id;
        if (status === 'PAYMENT_FAILED') {
          await request(app.getHttpServer())
            .post('/payments')
            .set(auth())
            .set('Idempotency-Key', `cancel-${id}-${suffix}`)
            .send({ orderId: id, method: 'WALLET', walletId: 'demo-0000' })
            .expect(201);
        }
        expect(
          (
            await prisma.ingredient.findUniqueOrThrow({
              where: { id: ingredient.id },
            })
          ).stockQuantity,
        ).toBe(160);
        await request(app.getHttpServer()).delete(`/orders/${id}`).expect(401);
        await request(app.getHttpServer())
          .delete(`/orders/${id}`)
          .set(auth(otherToken))
          .expect(404);
        const results = await Promise.all(
          [1, 2].map(() =>
            request(app.getHttpServer()).delete(`/orders/${id}`).set(auth()),
          ),
        );
        expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
          204, 409,
        ]);
        expect(
          (
            await prisma.ingredient.findUniqueOrThrow({
              where: { id: ingredient.id },
            })
          ).stockQuantity,
        ).toBe(200);
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
        ).toBe('CANCELLED');
        expect(
          await prisma.loyaltyTransaction.count({ where: { orderId: id } }),
        ).toBe(0);
      },
    );

    it.each(['PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const)(
      'forbids cancellation of %s without changing status or stock',
      async (status) => {
        const order = await create(status);
        const stock = await prisma.product.findUniqueOrThrow({
          where: { id: productId },
        });
        await request(app.getHttpServer())
          .delete(`/orders/${order.id}`)
          .set(auth())
          .expect(409);
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
            .status,
        ).toBe(status);
        expect(
          (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
            .stock,
        ).toBe(stock.stock);
      },
    );
  },
);
