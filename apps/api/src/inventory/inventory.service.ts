import { Inject, Injectable } from '@nestjs/common';
import { InventoryConcurrencyException } from '../common/errors';
import { InventoryWant, planReserve } from './inventory.plan';
import { InventoryRepository } from './inventory.repository';

const MAX_RESERVE_ATTEMPTS = 3;

@Injectable()
export class InventoryService {
  constructor(
    @Inject(InventoryRepository)
    private readonly repository: InventoryRepository,
  ) {}

  async reserve(wants: readonly InventoryWant[]): Promise<void> {
    const requestedProductIds = [
      ...new Set(wants.map(({ productId }) => productId)),
    ];

    for (let attempt = 0; attempt < MAX_RESERVE_ATTEMPTS; attempt += 1) {
      const current = await this.repository.getMany(requestedProductIds);
      const updates = planReserve(wants, current);

      if (await this.repository.applyUpdates(updates)) {
        return;
      }
    }

    throw new InventoryConcurrencyException();
  }
}
