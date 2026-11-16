import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Size } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { describeDb } from './helpers/describe-db';

describeDb(
  'Issue #28: staff cancellation, stock restoration and payment audit',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerId: number;
    let staffId: number;
    let customerToken: string;
    let staffToken: string;
    let ingredientId: number;
    let productId: number;
    const userIds: number[] = [];
    const suffix = `${Date.now()}-${Math.random()}`;
    const auth = (token = staffToken) => ({ Authorization: `Bearer ${token}` });
    const cancel = (id: number, token = staffToken) =>
      request(app.getHttpServer())
        .delete(`/orders/staff/${id}`)
        .set(auth(token));
    const patch = (id: number, status: string) =>
      request(app.getHttpServer())
        .patch(`/orders/${id}/status`)
        .set(auth())
        .send({ status });
    const stock = async () =>
      (
        await prisma.ingredient.findUniqueOrThrow({
          where: { id: ingredientId },
        })
      ).stockQuantity;

    async function create(status: 'PENDING' | 'PREPARING' = 'PENDING') {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set(auth(customerToken))
        .send({ items: [{ productId, qty: 2, size: 'L' }] })
        .expect(201);
      const id: number = response.body.id;
      if (status === 'PREPARING') {
        await request(app.getHttpServer())
          .post('/payments')
          .set(auth(customerToken))
          .set('Idempotency-Key', `staff-cancel-${id}`)
          .send({ orderId: id, method: 'WALLET', walletId: 'demo-1234' })
          .expect(201);
        await patch(id, 'PREPARING').expect(204);
      }
      return id;
    }

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
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
      for (const role of ['CUSTOMER', 'STAFF'] as const) {
        const email = `staff-cancel-${role.toLowerCase()}-${suffix}@example.test`;
        const user = await prisma.user.create({
          data: {
            email,
            role,
            passwordHash: await bcrypt.hash('staff-cancel-password', 4),
          },
        });
        userIds.push(user.id);
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: 'staff-cancel-password' })
          .expect(200);
        if (role === 'CUSTOMER') {
          customerId = user.id;
          customerToken = login.body.access_token;
        } else {
          staffId = user.id;
          staffToken = login.body.access_token;
        }
      }
      ingredientId = (
        await prisma.ingredient.create({
          data: {
            name: `staff-cancel-${suffix}`,
            unit: 'g',
            stockQuantity: 200,
          },
        })
      ).id;
      productId = (
        await prisma.product.create({
          data: {
            name: `staff-cancel-${suffix}`,
            price: 35_000,
            recipeItems: {
              create: Object.values(Size).map((size) => ({
                size,
                ingredientId,
                amountRequired: size === 'L' ? 30 : 10,
              })),
            },
          },
        })
      ).id;
    });
    beforeEach(async () => {
      if (ingredientId)
        await prisma.ingredient.update({
          where: { id: ingredientId },
          data: { stockQuantity: 200 },
        });
    });
    afterEach(async () => {
      if (customerId)
        await prisma.order.deleteMany({ where: { userId: customerId } });
    });
    afterAll(async () => {
      if (prisma) {
        if (productId)
          await prisma.product.delete({ where: { id: productId } });
        if (ingredientId)
          await prisma.ingredient.delete({ where: { id: ingredientId } });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
      await app?.close();
    });

    it.each(['PENDING', 'PREPARING'] as const)(
      'staff cancels %s, restores size L consumption once and leaves payments untouched',
      async (status) => {
        const id = await create(status);
        expect(await stock()).toBe(140);
        const payments = await prisma.payment.findMany({
          where: { orderId: id },
        });
        if (status === 'PREPARING') {
          expect(payments).toHaveLength(1);
          expect(payments[0].status).toBe('SUCCESS');
          await request(app.getHttpServer())
            .delete(`/orders/${id}`)
            .set(auth(customerToken))
            .expect(409);
        }
        // Formula changes after reservation must never change the saved amount to restore.
        await prisma.recipeItem.updateMany({
          where: { productId },
          data: { amountRequired: 7 },
        });
        try {
          await cancel(id).expect(204);
          expect(await stock()).toBe(200);
          await cancel(id).expect(409);
          expect(await stock()).toBe(200);
          expect(
            await prisma.payment.findMany({ where: { orderId: id } }),
          ).toEqual(payments);
          expect(
            await prisma.loyaltyTransaction.count({ where: { orderId: id } }),
          ).toBe(0);
          expect(
            (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
          ).toBe('CANCELLED');
        } finally {
          for (const size of Object.values(Size))
            await prisma.recipeItem.updateMany({
              where: { productId, size },
              data: { amountRequired: size === 'L' ? 30 : 10 },
            });
        }
      },
    );

    it('requires JWT and a current STAFF role before cancelling another owner order', async () => {
      const id = await create();
      await request(app.getHttpServer())
        .delete(`/orders/staff/${id}`)
        .expect(401);
      await cancel(id, customerToken).expect(403);
      await prisma.user.update({
        where: { id: staffId },
        data: { role: 'CUSTOMER' },
      });
      try {
        await cancel(id).expect(403);
      } finally {
        await prisma.user.update({
          where: { id: staffId },
          data: { role: 'STAFF' },
        });
      }
      expect(await stock()).toBe(140);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('PENDING');
    });

    it.each([
      'PAID',
      'READY',
      'COMPLETED',
      'CANCELLED',
      'PAYMENT_FAILED',
    ] as const)(
      'rejects STAFF cancellation from %s without writes',
      async (status) => {
        const id = await create();
        await prisma.order.update({ where: { id }, data: { status } });
        await cancel(id).expect(409);
        expect(await stock()).toBe(140);
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
        ).toBe(status);
      },
    );

    it.each(['0', '-1', '2147483648', 'invalid'])(
      'validates staff cancellation path %s',
      async (id) => {
        await request(app.getHttpServer())
          .delete(`/orders/staff/${id}`)
          .set(auth())
          .expect(400);
      },
    );
    it('returns 404 for missing orders', async () => {
      await cancel(2_147_483_647).expect(404);
    });

    it.each(['PENDING', 'PREPARING'] as const)(
      'concurrent %s staff cancellations restore once',
      async (status) => {
        const id = await create(status);
        const responses = await Promise.all([cancel(id), cancel(id)]);
        expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
          204, 409,
        ]);
        expect(await stock()).toBe(200);
      },
    );

    it('customer and staff cancellation racing restore once', async () => {
      const id = await create();
      const responses = await Promise.all([
        cancel(id),
        request(app.getHttpServer())
          .delete(`/orders/${id}`)
          .set(auth(customerToken)),
      ]);
      expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        204, 409,
      ]);
      expect(await stock()).toBe(200);
    });

    it('cancellation racing with READY has only one winner and consistent stock', async () => {
      const id = await create('PREPARING');
      const responses = await Promise.all([cancel(id), patch(id, 'READY')]);
      expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        204, 409,
      ]);
      const status = (await prisma.order.findUniqueOrThrow({ where: { id } }))
        .status;
      expect(['CANCELLED', 'READY']).toContain(status);
      expect(await stock()).toBe(status === 'CANCELLED' ? 200 : 140);
    });

    it('rolls back the status if ingredient restoration would overflow', async () => {
      const id = await create();
      await prisma.ingredient.update({
        where: { id: ingredientId },
        data: { stockQuantity: 2_147_483_647 },
      });
      await cancel(id).expect(409);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('PENDING');
      expect(await stock()).toBe(2_147_483_647);
    });
  },
);
