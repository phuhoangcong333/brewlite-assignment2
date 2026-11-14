import { PrismaClient, Size } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const products = [
  // Danh mục Cà phê (COFFEE)
  { name: 'Cà phê sữa', price: 29_000, category: 'COFFEE', imageUrl: '/image/Picture1.png', stock: 10 },
  { name: 'Americano', price: 35_000, category: 'COFFEE', imageUrl: '/image/Picture2.png', stock: 10 },
  { name: 'Cappuccino', price: 45_000, category: 'COFFEE', imageUrl: '/image/Picture3.png', stock: 10 },
  { name: 'Latte', price: 45_000, category: 'COFFEE', imageUrl: '/image/Picture5.png', stock: 10 },
  { name: 'Bạc xỉu', price: 32_000, category: 'COFFEE', imageUrl: '/image/Picture6.png', stock: 10 },

  // Danh mục Trà trái cây (FRUIT_TEA)
  { name: 'Trà đào', price: 39_000, category: 'FRUIT_TEA', imageUrl: '/image/Picture4.png', stock: 10 },
  { name: 'Trà vải', price: 39_000, category: 'FRUIT_TEA', imageUrl: '/image/Picture7.png', stock: 10 },
  { name: 'Trà chanh sả', price: 35_000, category: 'FRUIT_TEA', imageUrl: '/image/Picture4.png', stock: 10 },
  { name: 'Trà dâu tằm', price: 42_000, category: 'FRUIT_TEA', imageUrl: '/image/Picture7.png', stock: 0 }, // Hết hàng

  // Danh mục Trà sữa & Matcha (MILK_TEA)
  { name: 'Matcha latte', price: 50_000, category: 'MILK_TEA', imageUrl: '/image/Picture8.png', stock: 10 },
  { name: 'Trà sữa truyền thống', price: 35_000, category: 'MILK_TEA', imageUrl: '/image/Picture8.png', stock: 10 },
  { name: 'Trà sữa ô long nướng', price: 42_000, category: 'MILK_TEA', imageUrl: '/image/Picture8.png', stock: 0 }, // Hết hàng
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

type RecipeIngredient = {
  ingredientName: string;
  size: Size;
  amountRequired: number;
};

const productRecipes: Record<string, RecipeIngredient[]> = {
  'Cà phê sữa': [
    { ingredientName: 'Cà phê hạt', size: Size.S, amountRequired: 20 },
    { ingredientName: 'Sữa đặc', size: Size.S, amountRequired: 35 },
    { ingredientName: 'Cà phê hạt', size: Size.M, amountRequired: 25 },
    { ingredientName: 'Sữa đặc', size: Size.M, amountRequired: 40 },
    { ingredientName: 'Cà phê hạt', size: Size.L, amountRequired: 30 },
    { ingredientName: 'Sữa đặc', size: Size.L, amountRequired: 50 },
  ],
  Americano: [
    { ingredientName: 'Cà phê hạt', size: Size.S, amountRequired: 16 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 8 },
    { ingredientName: 'Cà phê hạt', size: Size.M, amountRequired: 20 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 10 },
    { ingredientName: 'Cà phê hạt', size: Size.L, amountRequired: 25 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 15 },
  ],
  Cappuccino: [
    { ingredientName: 'Cà phê hạt', size: Size.S, amountRequired: 16 },
    { ingredientName: 'Sữa tươi', size: Size.S, amountRequired: 90 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 8 },
    { ingredientName: 'Cà phê hạt', size: Size.M, amountRequired: 20 },
    { ingredientName: 'Sữa tươi', size: Size.M, amountRequired: 120 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 10 },
    { ingredientName: 'Cà phê hạt', size: Size.L, amountRequired: 25 },
    { ingredientName: 'Sữa tươi', size: Size.L, amountRequired: 150 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 15 },
  ],
  'Trà đào': [
    { ingredientName: 'Trà đen', size: Size.S, amountRequired: 12 },
    { ingredientName: 'Đào ngâm', size: Size.S, amountRequired: 40 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 15 },
    { ingredientName: 'Trà đen', size: Size.M, amountRequired: 15 },
    { ingredientName: 'Đào ngâm', size: Size.M, amountRequired: 50 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 20 },
    { ingredientName: 'Trà đen', size: Size.L, amountRequired: 20 },
    { ingredientName: 'Đào ngâm', size: Size.L, amountRequired: 70 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 25 },
  ],
  Latte: [
    { ingredientName: 'Cà phê hạt', size: Size.S, amountRequired: 16 },
    { ingredientName: 'Sữa tươi', size: Size.S, amountRequired: 110 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 8 },
    { ingredientName: 'Cà phê hạt', size: Size.M, amountRequired: 20 },
    { ingredientName: 'Sữa tươi', size: Size.M, amountRequired: 150 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 10 },
    { ingredientName: 'Cà phê hạt', size: Size.L, amountRequired: 25 },
    { ingredientName: 'Sữa tươi', size: Size.L, amountRequired: 190 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 15 },
  ],
  'Bạc xỉu': [
    { ingredientName: 'Cà phê hạt', size: Size.S, amountRequired: 12 },
    { ingredientName: 'Sữa đặc', size: Size.S, amountRequired: 40 },
    { ingredientName: 'Sữa tươi', size: Size.S, amountRequired: 45 },
    { ingredientName: 'Cà phê hạt', size: Size.M, amountRequired: 15 },
    { ingredientName: 'Sữa đặc', size: Size.M, amountRequired: 50 },
    { ingredientName: 'Sữa tươi', size: Size.M, amountRequired: 60 },
    { ingredientName: 'Cà phê hạt', size: Size.L, amountRequired: 20 },
    { ingredientName: 'Sữa đặc', size: Size.L, amountRequired: 65 },
    { ingredientName: 'Sữa tươi', size: Size.L, amountRequired: 80 },
  ],
  'Trà vải': [
    { ingredientName: 'Trà đen', size: Size.S, amountRequired: 12 },
    { ingredientName: 'Vải ngâm', size: Size.S, amountRequired: 40 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 15 },
    { ingredientName: 'Trà đen', size: Size.M, amountRequired: 15 },
    { ingredientName: 'Vải ngâm', size: Size.M, amountRequired: 50 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 20 },
    { ingredientName: 'Trà đen', size: Size.L, amountRequired: 20 },
    { ingredientName: 'Vải ngâm', size: Size.L, amountRequired: 70 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 25 },
  ],
  'Matcha latte': [
    { ingredientName: 'Bột Matcha', size: Size.S, amountRequired: 12 },
    { ingredientName: 'Sữa tươi', size: Size.S, amountRequired: 110 },
    { ingredientName: 'Đường', size: Size.S, amountRequired: 10 },
    { ingredientName: 'Bột Matcha', size: Size.M, amountRequired: 15 },
    { ingredientName: 'Sữa tươi', size: Size.M, amountRequired: 150 },
    { ingredientName: 'Đường', size: Size.M, amountRequired: 15 },
    { ingredientName: 'Bột Matcha', size: Size.L, amountRequired: 20 },
    { ingredientName: 'Sữa tươi', size: Size.L, amountRequired: 190 },
    { ingredientName: 'Đường', size: Size.L, amountRequired: 20 },
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
    throw new Error(
      'STAFF_EMAIL and STAFF_PASSWORD must be configured together',
    );
  }
  if (staffPassword !== undefined && staffPassword.length < 6) {
    throw new Error('STAFF_PASSWORD must contain at least 6 characters');
  }
  const staffPasswordHash =
    staffPassword === undefined
      ? undefined
      : await bcrypt.hash(staffPassword, 12);

  await prisma.$transaction(async (transaction) => {
    for (const product of products) {
      const existing = await transaction.product.findFirst({
        where: { name: product.name },
        select: { id: true },
      });

      if (existing) {
        await transaction.product.update({
          where: { id: existing.id },
          data: {
            price: product.price,
            category: product.category,
            imageUrl: product.imageUrl,
            stock: product.stock,
          },
        });
      } else {
        await transaction.product.create({
          data: product,
        });
      }
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
      select: { id: true, name: true, recipeItems: { select: { id: true } } },
    });

    for (const product of allProducts) {
      // Preserve recipes edited by staff when Docker reruns seed on restart.
      if (product.recipeItems.length > 0) continue;
      const recipeList = productRecipes[product.name] ?? [];
      for (const item of recipeList) {
        const ingredientId = ingredientMap.get(item.ingredientName);
        if (!ingredientId) continue;

        await transaction.recipeItem.upsert({
          where: {
            productId_ingredientId_size: {
              productId: product.id,
              ingredientId,
              size: item.size,
            },
          },
          create: {
            productId: product.id,
            ingredientId,
            size: item.size,
            amountRequired: item.amountRequired,
          },
          update: {
            amountRequired: item.amountRequired,
          },
        });
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
