import { InvalidTransitionException } from '../common/errors';
import { InventorySnapshot } from '../inventory/inventory.plan';
import { OrderStatus } from './order-state';
import { planCancel } from './order-cancel.plan';

const allowedStatuses: OrderStatus[] = [
  'PENDING',
  'PAYMENT_FAILED',
];
const blockedStatuses: OrderStatus[] = [
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];
const orderItems = [{ productId: 1, qty: 2 }];
const currentInventory = [{ productId: 1, stock: 3, version: 4 }];
const releasedInventory = [
  {
    operation: 'release' as const,
    productId: 1,
    expectedVersion: 4,
    qty: 2,
    stock: 5,
    version: 5,
  },
];

describe('planCancel', () => {
  it.each(allowedStatuses)(
    'plans inventory release when cancelling %s',
    (status) => {
      expect(
        planCancel(status, orderItems, currentInventory),
      ).toEqual(releasedInventory);
    },
  );

  it.each(blockedStatuses)(
    'rejects cancellation from %s without producing inventory updates',
    (status) => {
      const current: InventorySnapshot[] = [...currentInventory];

      expect(() =>
        planCancel(status, orderItems, current),
      ).toThrow(InvalidTransitionException);
      expect(current).toEqual(currentInventory);
    },
  );
});
