import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { availableQuantity } from '../ingredients/ingredient-stock';
import { UpdateRecipeDto } from '../ingredients/dto/update-recipe.dto';

const recipeInclude = { ingredient: true } as const;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}
  async getAllProducts() {
    const products = await this.prisma.product.findMany({
      include: { recipe: { include: recipeInclude } },
      orderBy: { id: 'asc' },
    });
    return products.map(({ recipe, ...product }) => {
      const quantity = availableQuantity(recipe);
      return { ...product, stock: quantity, availableQuantity: quantity };
    });
  }
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { recipe: { include: recipeInclude } },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
    }

    const { recipe, ...details } = product;
    const quantity = availableQuantity(recipe);
    return { ...details, stock: quantity, availableQuantity: quantity };
  }

  async getRecipe(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, recipe: { include: recipeInclude } },
    });
    if (!product) throw new NotFoundException(`Product ${id} was not found`);
    return product.recipe;
  }

  async updateRecipe(id: number, dto: UpdateRecipeDto) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const product = await tx.product.findUnique({
              where: { id },
              select: { id: true },
            });
            if (!product)
              throw new NotFoundException(`Product ${id} was not found`);
            const ingredientIds = dto.ingredients.map(
              (entry) => entry.ingredientId,
            );
            const count = await tx.ingredient.count({
              where: { id: { in: ingredientIds } },
            });
            if (count !== ingredientIds.length) {
              throw new BadRequestException(
                'Recipe contains unknown or duplicate ingredients',
              );
            }
            await tx.recipe.deleteMany({ where: { productId: id } });
            await tx.recipe.createMany({
              data: dto.ingredients.map((entry) => ({
                ingredientId: entry.ingredientId,
                quantity: entry.quantity,
                productId: id,
              })),
            });
            return tx.recipe.findMany({
              where: { productId: id },
              include: recipeInclude,
              orderBy: { ingredientId: 'asc' },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034') throw error;
        if (attempt >= 2)
          throw new BadRequestException(
            'Recipe changed repeatedly; please retry',
          );
      }
    }
  }
}
