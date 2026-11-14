import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesService } from '../inventory/recipes.service';
import { UpdateRecipeDto } from '../inventory/dto/update-recipe.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
  ) {}

  async getRecipe(id: number) {
    return (await this.recipes.get(id)).recipeItems;
  }

  async updateRecipe(id: number, dto: UpdateRecipeDto) {
    return (
      await this.recipes.replace(
        id,
        dto.ingredients.map((entry) => ({
          ingredientId: entry.ingredientId,
          amountRequired: entry.quantity,
        })),
      )
    ).recipeItems;
  }

  async getAllProducts() {
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
