import { InventorySnapshot, InventoryUpdate } from './inventory.plan';

export abstract class InventoryRepository {
  abstract getMany(
    productIds: readonly number[],
  ): Promise<InventorySnapshot[]>;

  abstract applyUpdates(updates: readonly InventoryUpdate[]): Promise<boolean>;
}
