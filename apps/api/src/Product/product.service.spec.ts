import { Size } from '@prisma/client';
import { computeAvailableQuantities } from './product.service';

describe('computeAvailableQuantities', () => {
  it('calculates independent recipe capacity for each size', () => {
    const recipeItems = [
      {
        size: Size.S,
        amountRequired: 10,
        ingredient: { stockQuantity: 100 },
      },
      {
        size: Size.S,
        amountRequired: 25,
        ingredient: { stockQuantity: 100 },
      },
      {
        size: Size.M,
        amountRequired: 20,
        ingredient: { stockQuantity: 100 },
      },
    ];

    expect(computeAvailableQuantities(recipeItems, 50)).toEqual({
      S: 4,
      M: 5,
      L: 0,
    });
  });

  it('uses the legacy product stock for every size when no recipe exists', () => {
    expect(computeAvailableQuantities([], 12)).toEqual({
      S: 12,
      M: 12,
      L: 12,
    });
  });
});
