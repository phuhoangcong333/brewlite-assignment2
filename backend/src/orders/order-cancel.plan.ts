import {
  InventorySnapshot,
  InventoryUpdate,
  InventoryWant,
  planRelease,
} from '../inventory/inventory.plan';
import { assertTransition, OrderStatus } from './order-state';

export function planCancel(
  status: OrderStatus,
  items: readonly InventoryWant[],
  current: readonly InventorySnapshot[],
): InventoryUpdate[] {
  assertTransition(status, 'CANCELLED');
  return planRelease(items, current);
}
