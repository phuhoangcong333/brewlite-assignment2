import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventorySnapshot, InventoryUpdate } from './inventory.plan';
import { InventoryRepository } from './inventory.repository';

class StaleInventoryUpdateError extends Error {}

@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getMany(
    productIds: readonly number[],
  ): Promise<InventorySnapshot[]> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...productIds] } },
      select: { id: true, stock: true, version: true },
    });

    return products.map(({ id, stock, version }) => ({
      productId: id,
      stock,
      version,
    }));
  }

  async applyUpdates(updates: readonly InventoryUpdate[]): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const applied = await this.applyUpdatesInTransaction(
          transaction,
          updates,
        );
        if (!applied) {
          throw new StaleInventoryUpdateError();
        }
      });

      return true;
    } catch (error) {
      if (error instanceof StaleInventoryUpdateError) {
        return false;
      }
      throw error;
    }
  }

  async applyUpdatesInTransaction(
    transaction: Prisma.TransactionClient,
    updates: readonly InventoryUpdate[],
  ): Promise<boolean> {
    for (const update of updates) {
      this.validateUpdate(update);

      const applied = await this.updateProduct(transaction, update);
      if (!applied) {
        return false;
      }
    }

    return true;
  }

  private validateUpdate(update: InventoryUpdate): void {
    if (
      !Number.isSafeInteger(update.qty) ||
      update.qty <= 0 ||
      update.stock < 0 ||
      update.version !== update.expectedVersion + 1
    ) {
      throw new RangeError('Invalid inventory update');
    }
  }

  private async updateProduct(
    transaction: Prisma.TransactionClient,
    update: InventoryUpdate,
  ): Promise<boolean> {
    const result = await transaction.product.updateMany({
      where: {
        id: update.productId,
        version: update.expectedVersion,
        ...(update.operation === 'reserve'
          ? { stock: { gte: update.qty } }
          : {}),
      },
      data: {
        stock: update.stock,
        version: { increment: 1 },
      },
    });

    return result.count === 1;
  }
}
