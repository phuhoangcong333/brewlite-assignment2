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
      quantity,
      recipes: { create: { productId, quantity: 1 } },
    },
  });
  createdIds.push(ingredient.id);
  return ingredient.id;
}

export async function ingredientQuantity(
  prisma: PrismaClient,
  productId: number,
) {
  const recipe = await prisma.recipe.findFirstOrThrow({
    where: { productId },
    include: { ingredient: true },
  });
  return recipe.ingredient.quantity.toNumber();
}
