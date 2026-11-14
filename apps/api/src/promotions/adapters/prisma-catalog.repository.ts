import { Injectable } from '@nestjs/common';
import { CatalogRepository } from '../repositories';
import { CatalogProduct, CatalogTopping } from '../promotion.types';
import { PrismaService } from '../../prisma/prisma.service';
import { Size } from '@prisma/client';
import { computeAvailableQuantities } from '../../Product/product.service';

const SIZES: { id: number; size: Size; extraPrice: number }[] = [
  { id: 1, size: Size.S, extraPrice: 0 },
  { id: 2, size: Size.M, extraPrice: 5_000 },
  { id: 3, size: Size.L, extraPrice: 10_000 },
];

const TOPPINGS: CatalogTopping[] = [
  { id: 1, price: 5_000, stock: Number.MAX_SAFE_INTEGER },
  { id: 2, price: 5_000, stock: Number.MAX_SAFE_INTEGER },
];

@Injectable()
export class PrismaCatalogRepository extends CatalogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProducts(ids: number[]): Promise<CatalogProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        recipeItems: {
          include: { ingredient: true },
        },
      },
    });

    return rows.map((product) => {
      const availableQuantityBySize = computeAvailableQuantities(
        product.recipeItems,
        product.stock,
      );
      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        basePrice: product.price,
        sizes: SIZES.map(({ id, size, extraPrice }) => ({
          id,
          extraPrice,
          stock: availableQuantityBySize[size],
        })),
      };
    });
  }

  async findToppings(ids: number[]): Promise<CatalogTopping[]> {
    return TOPPINGS.filter((topping) => ids.includes(topping.id));
  }
}
