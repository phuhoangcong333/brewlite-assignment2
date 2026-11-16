import {
  InventorySnapshot,
  InventoryUpdate,
  InventoryWant,
  planRelease,
} from '../inventory/inventory.plan';
import {
  assertCanCancelOrder,
  CancellationActor,
  OrderStatus,
} from './order-state';

export function planCancel(
  status: OrderStatus,
  items: readonly InventoryWant[],
  current: readonly InventorySnapshot[],
  actor: CancellationActor = 'CUSTOMER',
): InventoryUpdate[] {
  assertCanCancelOrder(status, actor);
  return planRelease(items, current);
}
