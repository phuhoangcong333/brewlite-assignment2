import { Prisma } from '@prisma/client';

export type RecipeStock = {
  quantity: Prisma.Decimal;
  ingredient: { quantity: Prisma.Decimal };
};

export function availableQuantity(recipe: readonly RecipeStock[]): number {
  if (recipe.length === 0) return 0;
  return Math.min(
    ...recipe.map((entry) =>
      entry.quantity.gt(0)
        ? entry.ingredient.quantity.div(entry.quantity).floor().toNumber()
        : 0,
    ),
  );
}
