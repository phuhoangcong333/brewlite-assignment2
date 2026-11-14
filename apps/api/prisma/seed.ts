import { PrismaClient, Size } from '@prisma/client';
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

const ingredients = [
  { name: 'Cà phê hạt', unit: 'g', stockQuantity: 2_000 },
  { name: 'Sữa đặc', unit: 'ml', stockQuantity: 2_500 },
  { name: 'Sữa tươi', unit: 'ml', stockQuantity: 4_000 },
  { name: 'Đường', unit: 'g', stockQuantity: 2_000 },
  { name: 'Trà đen', unit: 'g', stockQuantity: 1_500 },
  { name: 'Đào ngâm', unit: 'g', stockQuantity: 1_200 },
  { name: 'Vải ngâm', unit: 'g', stockQuantity: 1_200 },
  { name: 'Bột Matcha', unit: 'g', stockQuantity: 800 },
];

const productRecipes: Record<
  string,
  Array<{ ingredientName: string; amountRequired: number }>
> = {
  'Cà phê sữa': [
    { ingredientName: 'Cà phê hạt', amountRequired: 25 },
    { ingredientName: 'Sữa đặc', amountRequired: 40 },
  ],
  Americano: [
    { ingredientName: 'Cà phê hạt', amountRequired: 20 },
    { ingredientName: 'Đường', amountRequired: 10 },
  ],
  Cappuccino: [
    { ingredientName: 'Cà phê hạt', amountRequired: 20 },
    { ingredientName: 'Sữa tươi', amountRequired: 120 },
    { ingredientName: 'Đường', amountRequired: 10 },
  ],
  'Trà đào': [
    { ingredientName: 'Trà đen', amountRequired: 15 },
    { ingredientName: 'Đào ngâm', amountRequired: 50 },
    { ingredientName: 'Đường', amountRequired: 20 },
  ],
  Latte: [
    { ingredientName: 'Cà phê hạt', amountRequired: 20 },
    { ingredientName: 'Sữa tươi', amountRequired: 150 },
    { ingredientName: 'Đường', amountRequired: 10 },
  ],
  'Bạc xỉu': [
    { ingredientName: 'Cà phê hạt', amountRequired: 15 },
    { ingredientName: 'Sữa đặc', amountRequired: 50 },
    { ingredientName: 'Sữa tươi', amountRequired: 60 },
  ],
  'Trà vải': [
    { ingredientName: 'Trà đen', amountRequired: 15 },
    { ingredientName: 'Vải ngâm', amountRequired: 50 },
    { ingredientName: 'Đường', amountRequired: 20 },
  ],
  'Matcha latte': [
    { ingredientName: 'Bột Matcha', amountRequired: 15 },
    { ingredientName: 'Sữa tươi', amountRequired: 150 },
    { ingredientName: 'Đường', amountRequired: 15 },
  ],
};

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
    loyaltyPoints: 0,
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

    // 1. Khởi tạo danh sách nguyên liệu mẫu (Ingredient)
    const ingredientMap = new Map<string, number>();
    for (const ing of ingredients) {
      const savedIngredient = await transaction.ingredient.upsert({
        where: { name: ing.name },
        create: ing,
        update: {},
      });
      ingredientMap.set(ing.name, savedIngredient.id);
    }

    // 2. Gán công thức định lượng (RecipeItem) cho 8 món trong bảng Product
    const allProducts = await transaction.product.findMany({
      where: { name: { in: products.map(({ name }) => name) } },
      select: { id: true, name: true },
    });

    for (const product of allProducts) {
      const recipeList = productRecipes[product.name] ?? [];
      for (const size of Object.values(Size)) {
        for (const item of recipeList) {
          const ingredientId = ingredientMap.get(item.ingredientName);
          if (!ingredientId) continue;

          await transaction.recipeItem.upsert({
            where: {
              productId_ingredientId_size: {
                productId: product.id,
                ingredientId,
                size,
              },
            },
            create: {
              productId: product.id,
              ingredientId,
              size,
              amountRequired: item.amountRequired,
            },
            update: {
              amountRequired: item.amountRequired,
            },
          });
        }
      }
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
          passwordHash: userPasswordHash,
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
