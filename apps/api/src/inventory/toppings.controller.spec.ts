import type { PrismaService } from '../prisma/prisma.service';
import { ToppingsController } from './toppings.controller';

describe('ToppingsController', () => {
  it('returns stock and available portions from the linked ingredient', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'pearl',
        name: 'Trân châu',
        price: 5_000,
        amountPerPortion: 50,
        ingredient: { unit: 'g', stockQuantity: 125 },
      },
    ]);
    const controller = new ToppingsController({
      topping: { findMany },
    } as unknown as PrismaService);

    await expect(controller.findAll()).resolves.toEqual([
      {
        id: 'pearl',
        name: 'Trân châu',
        price: 5_000,
        amountPerPortion: 50,
        unit: 'g',
        stockQuantity: 125,
        availableQuantity: 2,
      },
    ]);
  });

  it('updates portion configuration and recalculates available portions', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'cream' });
    const update = jest.fn().mockResolvedValue({
      id: 'cream',
      name: 'Kem',
      price: 5_000,
      amountPerPortion: 40,
      ingredient: { unit: 'g', stockQuantity: 500 },
    });
    const controller = new ToppingsController({
      topping: { findUnique, update },
    } as unknown as PrismaService);

    await expect(
      controller.updatePortion('cream', { amountPerPortion: 40 }),
    ).resolves.toMatchObject({
      id: 'cream',
      amountPerPortion: 40,
      availableQuantity: 12,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'cream' },
      data: { amountPerPortion: 40 },
      include: { ingredient: true },
    });
  });
});
