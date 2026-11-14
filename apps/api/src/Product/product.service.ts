import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function computeAvailableQuantity(
  recipeItems: readonly {
    amountRequired: number;
    ingredient: { stockQuantity: number };
  }[],
  fallbackStock: number,
): number {
  if (!recipeItems || recipeItems.length === 0) {
    return fallbackStock;
  }

  const quantities = recipeItems.map((item) => {
    if (item.amountRequired <= 0) return 0;
    return Math.floor(item.ingredient.stockQuantity / item.amountRequired);
  });

  return Math.max(0, Math.min(...quantities));
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      orderBy: { id: 'asc' },
      include: {
        recipeItems: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return products.map((product) => {
      const availableQuantity = computeAvailableQuantity(
        product.recipeItems,
        product.stock,
      );

      return {
        ...product,
        availableQuantity,
        stock: availableQuantity, // Đồng bộ cả trường stock để tương thích ngược với code cũ
      };
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        recipeItems: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found`);
    }

    const availableQuantity = computeAvailableQuantity(
      product.recipeItems,
      product.stock,
    );

    return {
      ...product,
      availableQuantity,
      stock: availableQuantity,
    };
  }
}