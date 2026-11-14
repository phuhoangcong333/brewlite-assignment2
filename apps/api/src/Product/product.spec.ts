import { NotFoundException } from '@nestjs/common';
import { Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

type MockProductRow = {
  id: number;
  name: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stock: number;
  version: number;
  recipeItems: {
    size: Size;
    amountRequired: number;
    ingredient: { stockQuantity: number };
  }[];
};

function setup() {
  const rows: MockProductRow[] = [
    {
      id: 1,
      name: 'Cà phê sữa',
      price: 29000,
      category: 'COFFEE',
      imageUrl: '/image/Picture1.png',
      stock: 10,
      version: 0,
      recipeItems: [
        {
          size: Size.S,
          amountRequired: 25,
          ingredient: { stockQuantity: 200 },
        },
        {
          size: Size.M,
          amountRequired: 25,
          ingredient: { stockQuantity: 200 },
        },
        {
          size: Size.L,
          amountRequired: 25,
          ingredient: { stockQuantity: 200 },
        },
      ],
    },
    {
      id: 2,
      name: 'Trà đào',
      price: 39000,
      category: 'FRUIT_TEA',
      imageUrl: '/image/Picture4.png',
      stock: 10,
      version: 0,
      recipeItems: [
        {
          size: Size.S,
          amountRequired: 30,
          ingredient: { stockQuantity: 150 },
        },
        {
          size: Size.M,
          amountRequired: 30,
          ingredient: { stockQuantity: 150 },
        },
        {
          size: Size.L,
          amountRequired: 30,
          ingredient: { stockQuantity: 150 },
        },
      ],
    },
    {
      id: 3,
      name: 'Trà dâu tằm',
      price: 42000,
      category: 'FRUIT_TEA',
      imageUrl: '/image/Picture7.png',
      stock: 0,
      version: 0,
      recipeItems: [],
    },
  ];

  const prisma = {
    product: {
      findMany: jest.fn(async (args?: { where?: { category?: string } }) => {
        const category = args?.where?.category;
        if (!category) {
          return rows;
        }
        return rows.filter((p) => p.category === category);
      }),
      findUnique: jest.fn(
        async ({ where }: { where: { id: number } }) =>
          rows.find((p) => p.id === where.id) ?? null,
      ),
    },
  };

  const service = new ProductService(prisma as unknown as PrismaService);
  const controller = new ProductController(service);

  return { rows, prisma, service, controller };
}

describe('Task 4.3 - GET /products & lọc danh mục', () => {
  it('trả về danh sách tất cả sản phẩm kèm số ly khả dụng và món hết hàng', async () => {
    const { controller } = setup();
    const result = await controller.getProducts();

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 1,
      name: 'Cà phê sữa',
      category: 'COFFEE',
      availableQuantity: 8,
      stock: 8,
    });
    expect(result[0].availableQuantityBySize).toEqual({
      S: 8,
      M: 8,
      L: 8,
    });
    expect(result[2]).toMatchObject({
      id: 3,
      name: 'Trà dâu tằm',
      availableQuantity: 0,
      stock: 0,
    });
  });

  it('lọc đúng danh sách món theo query category (không phân biệt hoa thường)', async () => {
    const { controller } = setup();
    const coffeeList = await controller.getProducts('coffee');

    expect(coffeeList).toHaveLength(1);
    expect(coffeeList[0].name).toBe('Cà phê sữa');

    const allList = await controller.getProducts('ALL');
    expect(allList).toHaveLength(3);
  });

  it('GET /products/:id trả về chi tiết món hoặc báo lỗi 404 nếu không tồn tại', async () => {
    const { controller } = setup();
    const detail = await controller.getProductDetail(2);
    expect(detail.name).toBe('Trà đào');
    expect(detail.availableQuantity).toBe(5);

    await expect(controller.getProductDetail(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});