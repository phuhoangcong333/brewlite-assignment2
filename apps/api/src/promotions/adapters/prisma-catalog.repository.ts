import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { computeAvailableQuantities } from "../../Product/product.service";
import { PRODUCT_SIZE_OPTIONS } from "../../common/catalog-options";
import { CatalogProduct, CatalogTopping } from "../promotion.types";
import { CatalogRepository } from "../repositories";

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

  async findToppings(ids: string[]): Promise<CatalogTopping[]> {
    const rows = await this.prisma.topping.findMany({
      where: { id: { in: ids } },
      include: { ingredient: { select: { stockQuantity: true } } },
    });
    return rows.map((topping) => ({
      id: topping.id,
      price: topping.price,
      stock: Math.floor(
        topping.ingredient.stockQuantity / topping.amountPerPortion,
      ),
    }));
  }
}