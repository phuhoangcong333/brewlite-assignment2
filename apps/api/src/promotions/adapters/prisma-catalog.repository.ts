import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { computeAvailableQuantities } from "../../Product/product.service";
import { PRODUCT_SIZE_OPTIONS } from "../../common/catalog-options";
import { CatalogProduct, CatalogTopping } from "../promotion.types";
import { CatalogRepository } from "../repositories";

const TOPPINGS: CatalogTopping[] = [
  {
    id: 1,
    price: 5_000,
    stock: Number.MAX_SAFE_INTEGER,
  },
  {
    id: 2,
    price: 5_000,
    stock: Number.MAX_SAFE_INTEGER,
  },
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
          include: {
            ingredient: true,
          },
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
        sizes: PRODUCT_SIZE_OPTIONS.map(
          ({ id, code, additionalPrice }) => ({
            id,
            extraPrice: additionalPrice,
            stock: availableQuantityBySize[code],
          }),
        ),
      };
    });
  }

  async findToppings(ids: number[]): Promise<CatalogTopping[]> {
    return TOPPINGS.filter((topping) => ids.includes(topping.id));
  }
}