import { Injectable, NotFoundException } from '@nestjs/common';
import { Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AvailableQuantityBySize = Record<Size, number>;

export function computeAvailableQuantities(
  recipeItems: readonly {
    size: Size;
    amountRequired: number;
    ingredient: { stockQuantity: number };
  }[],
  fallbackStock: number,
): AvailableQuantityBySize {
  if (!recipeItems || recipeItems.length === 0) {
    return { S: fallbackStock, M: fallbackStock, L: fallbackStock };
  }

  const quantities: AvailableQuantityBySize = { S: 0, M: 0, L: 0 };
  for (const size of Object.values(Size)) {
    const sizeRecipes = recipeItems.filter((item) => item.size === size);
    if (sizeRecipes.length === 0) continue;

    quantities[size] = Math.max(
      0,
      Math.min(
        ...sizeRecipes.map((item) =>
          item.amountRequired <= 0
            ? 0
            : Math.floor(item.ingredient.stockQuantity / item.amountRequired),
        ),
      ),
    );
  }

  return quantities;
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllProducts(category?: string) {
    const normalizedCategory = category?.trim().toUpperCase();

    const products = await this.prisma.product.findMany({
      where:
        normalizedCategory && normalizedCategory !== 'ALL'
          ? { category: normalizedCategory }
          : undefined,
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
      const availableQuantityBySize = computeAvailableQuantities(
        product.recipeItems,
        product.stock,
      );
      const availableQuantity = Math.min(
        ...Object.values(availableQuantityBySize),
      );

      return {
        ...product,
        availableQuantity,
        availableQuantityBySize,
        stock: availableQuantity,
      };
    });
  }

  async getProductById(id: number) {
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
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
    }

    const availableQuantityBySize = computeAvailableQuantities(
      product.recipeItems,
      product.stock,
    );
    const availableQuantity = Math.min(
      ...Object.values(availableQuantityBySize),
    );

    return {
      ...product,
      availableQuantity,
      availableQuantityBySize,
      stock: availableQuantity,
    };
  }
}
