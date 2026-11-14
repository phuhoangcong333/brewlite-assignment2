import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { describeDb } from './helpers/describe-db';

describeDb('Ingredient inventory HTTP + PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerId: number;
  let staffId: number;
  let customerToken: string;
  let staffToken: string;
  let productId: number;
  let milkId: number;
  let coffeeId: number;
  const productIds: number[] = [];
  const ingredientIds: number[] = [];
  const suffix = `${Date.now()}-${Math.random()}`;

  const auth = (token = staffToken) => ({ Authorization: `Bearer ${token}` });
  const order = (items = [{ productId, qty: 1, size: 'S' }]) =>
    request(app.getHttpServer())
      .post('/orders')
      .set(auth(customerToken))
      .send({ items });
  const recipe = (id = productId) => `/products/${id}/recipe`;
  const restock = () => `/ingredients/${milkId}/restock`;

  async function quantity(id: number) {
    return (
      await prisma.ingredient.findUniqueOrThrow({ where: { id } })
    ).quantity.toNumber();
  }

  async function createProduct(withRecipe = true) {
    const product = await prisma.product.create({
      data: {
        name: `inventory-e2e-${suffix}-${productIds.length}`,
        price: 10_000,
        stock: 999,
        ...(withRecipe
          ? {
              recipe: {
                create: [
                  { ingredientId: milkId, quantity: 30 },
                  { ingredientId: coffeeId, quantity: 10 },
                ],
              },
            }
          : {}),
      },
    });
    productIds.push(product.id);
    return product.id;
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
    const passwordHash = await bcrypt.hash('inventory-password', 4);
    for (const role of ['CUSTOMER', 'STAFF'] as const) {
      const email = `${role.toLowerCase()}-${suffix}@example.test`;
      const user = await prisma.user.create({
        data: { email, passwordHash, role },
      });
      if (role === 'CUSTOMER') customerId = user.id;
      else staffId = user.id;
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'inventory-password' })
        .expect(200);
      if (role === 'CUSTOMER') customerToken = login.body.access_token;
      else staffToken = login.body.access_token;
    }
  });

  beforeEach(async () => {
    for (const [name, unit, stock] of [
      ['milk', 'ml', 100],
      ['coffee', 'g', 45],
    ] as const) {
      const row = await prisma.ingredient.create({
        data: {
          name: `${name}-${suffix}-${Math.random()}`,
          unit,
          quantity: stock,
        },
      });
      ingredientIds.push(row.id);
      if (name === 'milk') milkId = row.id;
      else coffeeId = row.id;
    }
    productId = await createProduct();
  });

  afterEach(async () => {
    await prisma.order.deleteMany({
      where: { userId: { in: [customerId, staffId].filter(Number.isInteger) } },
    });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.ingredient.deleteMany({
      where: { id: { in: ingredientIds } },
    });
    productIds.length = 0;
    ingredientIds.length = 0;
  });

  afterAll(async () => {
    if (prisma)
      await prisma.user.deleteMany({
        where: { id: { in: [customerId, staffId].filter(Number.isInteger) } },
      });
    if (app) await app.close();
  });

  it('returns the bottleneck quantity publicly on list and detail, independent of Product.stock', async () => {
    const list = await request(app.getHttpServer())
      .get('/products')
      .expect(200);
    expect(
      list.body.find((p: { id: number }) => p.id === productId),
    ).toMatchObject({ availableQuantity: 3, stock: 3 });
    const detail = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(detail.body).toMatchObject({ availableQuantity: 3, stock: 3 });
    await prisma.ingredient.update({
      where: { id: coffeeId },
      data: { quantity: 9 },
    });
    const empty = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(empty.body.availableQuantity).toBe(0);
  });

  it('treats products without a recipe as unavailable and rejects orders with 400', async () => {
    const id = await createProduct(false);
    const detail = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(detail.body.availableQuantity).toBe(0);
    await order([{ productId: id, qty: 1, size: 'S' }]).expect(400);
    expect(await quantity(milkId)).toBe(100);
  });

  it('deducts ingredients, snapshots consumption and leaves Product.stock unchanged', async () => {
    const response = await order([{ productId, qty: 2, size: 'M' }]).expect(
      201,
    );
    expect(await quantity(milkId)).toBe(40);
    expect(await quantity(coffeeId)).toBe(25);
    const consumed = await prisma.orderIngredient.findMany({
      where: { orderId: response.body.id },
    });
    expect(consumed).toHaveLength(2);
    expect(
      consumed
        .find((entry) => entry.ingredientId === milkId)
        ?.quantity.toNumber(),
    ).toBe(60);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(999);
    const detail = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(detail.body.availableQuantity).toBe(1);
  });

  it('aggregates duplicate lines and shared ingredients across different products', async () => {
    const other = await createProduct();
    await order([
      { productId, qty: 1, size: 'S' },
      { productId, qty: 1, size: 'L' },
      { productId: other, qty: 2, size: 'M' },
    ]).expect(400);
    expect(await quantity(milkId)).toBe(100);
    expect(await prisma.order.count({ where: { userId: customerId } })).toBe(0);
    await order([
      { productId, qty: 1, size: 'S' },
      { productId: other, qty: 2, size: 'L' },
    ]).expect(201);
    expect(await quantity(milkId)).toBe(10);
    expect(await quantity(coffeeId)).toBe(15);
  });

  it('rolls back earlier ingredient deductions when a later ingredient is insufficient', async () => {
    await prisma.ingredient.update({
      where: { id: coffeeId },
      data: { quantity: 0 },
    });
    const response = await order().expect(400);
    expect(response.body.message).toContain('Insufficient ingredient');
    expect(await quantity(milkId)).toBe(100);
    expect(await prisma.order.count({ where: { userId: customerId } })).toBe(0);
    expect(
      await prisma.orderIngredient.count({ where: { ingredientId: milkId } }),
    ).toBe(0);
  });

  it('rolls back ingredients if promotion validation fails after deduction', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set(auth(customerToken))
      .send({
        items: [{ productId, qty: 1, size: 'S' }],
        promoCode: `MISSING-${suffix}`,
      });
    expect(response.status).toBe(400);
    expect(await quantity(milkId)).toBe(100);
    expect(await quantity(coffeeId)).toBe(45);
  });

  it('prevents overselling when different products compete for the same last ingredients', async () => {
    const other = await createProduct();
    await prisma.ingredient.update({
      where: { id: milkId },
      data: { quantity: 30 },
    });
    const results = await Promise.all([
      order(),
      order([{ productId: other, qty: 1, size: 'M' }]),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);
    expect(await quantity(milkId)).toBe(0);
    expect(await quantity(coffeeId)).toBe(35);
    expect(await prisma.order.count({ where: { userId: customerId } })).toBe(1);
  });

  it('preserves decimal precision when dividing and deducting quantities', async () => {
    await request(app.getHttpServer())
      .patch(recipe())
      .set(auth())
      .send({ ingredients: [{ ingredientId: milkId, quantity: 0.1 }] })
      .expect(200);
    await prisma.ingredient.update({
      where: { id: milkId },
      data: { quantity: 0.3 },
    });
    const product = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(product.body.availableQuantity).toBe(3);
    await order([{ productId, qty: 3, size: 'S' }]).expect(201);
    expect(await quantity(milkId)).toBe(0);
  });

  it.each(['list', 'restock', 'readRecipe', 'updateRecipe'] as const)(
    '%s requires JWT (401), denies CUSTOMER (403), and accepts STAFF',
    async (operation) => {
      const send = (token?: string) => {
        const url =
          operation === 'list'
            ? '/ingredients'
            : operation === 'restock'
              ? restock()
              : recipe();
        const req =
          operation === 'restock' || operation === 'updateRecipe'
            ? request(app.getHttpServer()).patch(url)
            : request(app.getHttpServer()).get(url);
        if (token) req.set(auth(token));
        if (operation === 'restock') req.send({ quantity: 1 });
        if (operation === 'updateRecipe')
          req.send({ ingredients: [{ ingredientId: milkId, quantity: 20 }] });
        return req;
      };
      await send().expect(401);
      await send(customerToken).expect(403);
      expect(await quantity(milkId)).toBe(100);
      await send(staffToken).expect(200);
    },
  );

  it('rechecks the database role even when an old staff token is still valid', async () => {
    await prisma.user.update({
      where: { id: staffId },
      data: { role: 'CUSTOMER' },
    });
    try {
      await request(app.getHttpServer())
        .get('/ingredients')
        .set(auth())
        .expect(403);
    } finally {
      await prisma.user.update({
        where: { id: staffId },
        data: { role: 'STAFF' },
      });
    }
  });

  it('restocks atomically and reflects increased availability immediately', async () => {
    await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .patch(restock())
          .set(auth())
          .send({ quantity: 10.125 })
          .expect(200),
      ),
    );
    expect(await quantity(milkId)).toBe(120.25);
    const product = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(product.body.availableQuantity).toBe(4);
  });

  it.each([0, -1, 0.0001, '10', null])(
    'rejects invalid restock quantity %p',
    async (value) => {
      await request(app.getHttpServer())
        .patch(restock())
        .set(auth())
        .send({ quantity: value })
        .expect(400);
      expect(await quantity(milkId)).toBe(100);
    },
  );

  it.each([
    { ingredients: [] },
    { ingredients: [{ ingredientId: 1, quantity: 0 }] },
    { ingredients: [{ ingredientId: 1, quantity: -1 }] },
    { ingredients: [{ ingredientId: 1, quantity: 0.0001 }] },
    {
      ingredients: [
        { ingredientId: 1, quantity: 1 },
        { ingredientId: 1, quantity: 2 },
      ],
    },
    { ingredients: [null] },
  ])(
    'rejects malformed recipes %p without deleting the current recipe',
    async ({ ingredients }) => {
      await request(app.getHttpServer())
        .patch(recipe())
        .set(auth())
        .send({ ingredients })
        .expect(400);
      expect(await prisma.recipe.count({ where: { productId } })).toBe(2);
    },
  );

  it('rejects unknown ingredient IDs and preserves the previous recipe', async () => {
    await request(app.getHttpServer())
      .patch(recipe())
      .set(auth())
      .send({ ingredients: [{ ingredientId: 2_147_483_647, quantity: 1 }] })
      .expect(400);
    expect(await prisma.recipe.count({ where: { productId } })).toBe(2);
  });

  it('replaces recipes and restores the original consumption exactly once on cancellation', async () => {
    const response = await order().expect(201);
    await request(app.getHttpServer())
      .patch(recipe())
      .set(auth())
      .send({ ingredients: [{ ingredientId: milkId, quantity: 5 }] })
      .expect(200);
    const changed = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(changed.body.availableQuantity).toBe(14);
    const url = `/orders/${response.body.id}`;
    const cancelled = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer()).delete(url).set(auth(customerToken)),
      ),
    );
    expect(cancelled.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      204, 409,
    ]);
    expect(await quantity(milkId)).toBe(100);
    expect(await quantity(coffeeId)).toBe(45);
  });

  it('returns 404 for missing ingredients and products', async () => {
    await request(app.getHttpServer())
      .patch('/ingredients/2147483647/restock')
      .set(auth())
      .send({ quantity: 1 })
      .expect(404);
    await request(app.getHttpServer()).get('/products/2147483647').expect(404);
    await request(app.getHttpServer())
      .get(recipe(2_147_483_647))
      .set(auth())
      .expect(404);
    await request(app.getHttpServer())
      .patch(recipe(2_147_483_647))
      .set(auth())
      .send({ ingredients: [{ ingredientId: milkId, quantity: 1 }] })
      .expect(404);
  });
});
