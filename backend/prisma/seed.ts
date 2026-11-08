import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const products = [
  { name: 'Cà phê sữa', price: 35_000, imageUrl: '/image/Picture1.png' },
  { name: 'Americano', price: 40_000, imageUrl: '/image/Picture2.png' },
  { name: 'Cappuccino', price: 45_000, imageUrl: '/image/Picture3.png' },
  { name: 'Trà đào', price: 39_000, imageUrl: '/image/Picture4.png' },
  { name: 'Latte', price: 45_000, imageUrl: '/image/Picture5.png' },
  { name: 'Bạc xỉu', price: 38_000, imageUrl: '/image/Picture6.png' },
  { name: 'Trà vải', price: 39_000, imageUrl: '/image/Picture7.png' },
  { name: 'Matcha latte', price: 50_000, imageUrl: '/image/Picture8.png' },
];

const promotions = [
  {
    code: 'GIAM10',
    percent: 10,
    expiresAt: new Date('2026-12-31T23:59:59.999Z'),
    usageLeft: 100,
  },
  {
    code: 'BREW20',
    percent: 20,
    expiresAt: new Date('2026-12-31T23:59:59.999Z'),
    usageLeft: 5,
  },
];

const user = [
  {
    email: 'test@gmail.com',
    loyaltyPoints: 0
  },
];


async function seed(): Promise<void> {
  const staffEmail = process.env.STAFF_EMAIL?.trim().toLowerCase();
  const staffPassword = process.env.STAFF_PASSWORD;
  if (Boolean(staffEmail) !== Boolean(staffPassword)) {
    throw new Error('STAFF_EMAIL and STAFF_PASSWORD must be configured together');
  }
  if (staffPassword !== undefined && staffPassword.length < 6) {
    throw new Error('STAFF_PASSWORD must contain at least 6 characters');
  }
  const staffPasswordHash =
    staffPassword === undefined ? undefined : await bcrypt.hash(staffPassword, 12);

  await prisma.$transaction(async (transaction) => {
    const existingProducts = await transaction.product.findMany({
      where: { name: { in: products.map(({ name }) => name) } },
      select: { name: true },
    });
    const existingNames = new Set(existingProducts.map(({ name }) => name));
    const missingProducts = products.filter(
      ({ name }) => !existingNames.has(name),
    );

    if (missingProducts.length > 0) {
      await transaction.product.createMany({
        data: missingProducts.map((product) => ({ ...product, stock: 50 })),
      });
    }

    for (const promotion of promotions) {
      await transaction.promotion.upsert({
        where: { code: promotion.code },
        create: promotion,
        update: {},
      });
    }

    const userPasswordHash = await bcrypt.hash('password123', 10);
    for (const u of user) {
      await transaction.user.upsert({
        where: { email: u.email },
        create: {
          ...u,
          passwordHash: userPasswordHash
        },
        update: {},
      });
    }

    if (staffEmail && staffPasswordHash) {
      await transaction.user.upsert({
        where: { email: staffEmail },
        create: {
          email: staffEmail,
          passwordHash: staffPasswordHash,
          role: 'STAFF',
        },
        update: { passwordHash: staffPasswordHash, role: 'STAFF' },
      });
    }
  });
}

seed()
  .catch((error: unknown) => {
    console.error('Failed to seed the BrewLite database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
