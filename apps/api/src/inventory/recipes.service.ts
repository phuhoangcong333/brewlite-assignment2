import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RecipeInput = {
  ingredientId: number;
  amountRequired: number;
  size: Size;
};

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        recipeItems: {
          include: { ingredient: true },
          orderBy: { ingredientId: 'asc' },
        },
      },
    });
    if (!product)
      throw new NotFoundException(`Product ${productId} was not found`);
    return product;
  }

  async replace(productId: number, items: readonly RecipeInput[]) {
    if (
      items.length === 0 ||
      new Set(items.map((item) => `${item.size}:${item.ingredientId}`)).size !==
        items.length
    ) {
      throw new BadRequestException('Recipe must contain unique ingredients');
    }
    if (
      Object.values(Size).some(
        (size) => !items.some((item) => item.size === size),
      )
    ) {
      throw new BadRequestException(
        'Công thức phải có định lượng cho size S, M và L',
      );
    }
    const ingredientIds = [...new Set(items.map((item) => item.ingredientId))];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            if (
              !(await tx.product.findUnique({
                where: { id: productId },
                select: { id: true },
              }))
            ) {
              throw new NotFoundException(`Product ${productId} was not found`);
            }
            const count = await tx.ingredient.count({
              where: { id: { in: ingredientIds } },
            });
            if (count !== ingredientIds.length)
              throw new BadRequestException(
                'Recipe contains unknown ingredients',
              );
            await tx.recipeItem.deleteMany({ where: { productId } });
            await tx.recipeItem.createMany({
              data: items.map((item) => ({
                productId,
                ingredientId: item.ingredientId,
                size: item.size,
                amountRequired: item.amountRequired,
              })),
            });
            return tx.product.findUniqueOrThrow({
              where: { id: productId },
              include: {
                recipeItems: {
                  include: { ingredient: true },
                  orderBy: { ingredientId: 'asc' },
                },
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !['P2034', 'P2002'].includes((error as { code?: string }).code ?? '')
        )
          throw error;
      }
    }
    throw new ConflictException('Recipe changed repeatedly; please retry');
  }
}
