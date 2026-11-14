import { Injectable } from '@nestjs/common';
import { CatalogRepository } from '../repositories';
import { CatalogProduct, CatalogTopping } from '../promotion.types';
import { PrismaService } from '../../prisma/prisma.service';
import { computeAvailableQuantity } from '../../Product/product.service';

const SIZES: CatalogProduct['sizes'] = [
  { id: 1, extraPrice: 0 },
  { id: 2, extraPrice: 5_000 },
  { id: 3, extraPrice: 10_000 },
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

    return rows.map((product) => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      stock: computeAvailableQuantity(product.recipeItems, product.stock),
      sizes: SIZES,
    }));
  }

  async findToppings(ids: number[]): Promise<CatalogTopping[]> {
    return TOPPINGS.filter((topping) => ids.includes(topping.id));
  }
}
