import { PrismaClient } from '@prisma/client';

export async function attachIngredient(
  prisma: PrismaClient,
  productId: number,
  quantity: number,
  createdIds: number[],
): Promise<number> {
  const ingredient = await prisma.ingredient.create({
    data: {
      name: `fixture-${productId}-${Date.now()}-${Math.random()}`,
      unit: 'g',
      stockQuantity: quantity,
      recipeItems: { create: { productId, amountRequired: 1 } },
    },
  });
  createdIds.push(ingredient.id);
  return ingredient.id;
}

export async function ingredientQuantity(
  prisma: PrismaClient,
  productId: number,
) {
  const recipe = await prisma.recipeItem.findFirstOrThrow({
    where: { productId },
    include: { ingredient: true },
  });
  return recipe.ingredient.stockQuantity;
}
