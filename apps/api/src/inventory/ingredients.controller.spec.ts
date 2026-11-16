import type { PrismaService } from '../prisma/prisma.service';
import { IngredientsController } from './ingredients.controller';

describe('IngredientsController.adjustStock', () => {
  it('applies positive adjustments and increments the inventory version', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 7,
      stockQuantity: 100,
      version: 3,
    });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 7,
      stockQuantity: 125,
      version: 4,
    });
    const controller = new IngredientsController({
      ingredient: { findUnique, updateMany, findUniqueOrThrow },
    } as unknown as PrismaService);

    await expect(
      controller.adjustStock(7, { amount: 25 }),
    ).resolves.toMatchObject({ stockQuantity: 125, version: 4 });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        version: 3,
        stockQuantity: { lte: 2_147_483_622 },
      },
      data: {
        stockQuantity: { increment: 25 },
        version: { increment: 1 },
      },
    });
  });

  it('rejects reductions that would make stock negative', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 7, stockQuantity: 10, version: 3 })
      .mockResolvedValueOnce({ stockQuantity: 10 });
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const controller = new IngredientsController({
      ingredient: { findUnique, updateMany },
    } as unknown as PrismaService);

    await expect(
      controller.adjustStock(7, { amount: -11 }),
    ).rejects.toThrow('Số lượng điều chỉnh làm tồn kho nhỏ hơn 0');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 7, version: 3, stockQuantity: { gte: 11 } },
      data: {
        stockQuantity: { decrement: 11 },
        version: { increment: 1 },
      },
    });
  });
});
