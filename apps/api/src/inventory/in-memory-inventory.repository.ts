import {
  InventorySnapshot,
  InventoryUpdate,
} from './inventory.plan';
import { InventoryRepository } from './inventory.repository';

export class InMemoryInventoryRepository extends InventoryRepository {
  private readonly inventory = new Map<number, InventorySnapshot>();

  constructor(initial: readonly InventorySnapshot[]) {
    super();
    for (const item of initial) {
      this.inventory.set(item.productId, { ...item });
    }
  }

  async getMany(
    productIds: readonly number[],
  ): Promise<InventorySnapshot[]> {
    return productIds.flatMap((productId) => {
      const item = this.inventory.get(productId);
      return item ? [{ ...item }] : [];
    });
  }

  async applyUpdates(updates: readonly InventoryUpdate[]): Promise<boolean> {
    for (const update of updates) {
      const current = this.inventory.get(update.productId);
      if (!current) {
        return false;
      }
      if (current.version !== update.expectedVersion) {
        return false;
      }
      if (update.operation === 'reserve' && current.stock < update.qty) {
        return false;
      }
    }

    for (const update of updates) {
      this.inventory.set(update.productId, {
        productId: update.productId,
        stock: update.stock,
        version: update.version,
      });
    }
    return true;
  }
}