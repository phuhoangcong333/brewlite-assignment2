import { OutOfStockException } from '../common/errors';
import {
  InventorySnapshot,
  planReserve,
} from './inventory.plan';

const oneProductRequest = [{ productId: 1, qty: 2 }];
const availableProduct = [{ productId: 1, stock: 5, version: 7 }];

describe('planReserve', () => {
  it('reserves stock when enough inventory is available', () => {
    expect(
      planReserve(
        oneProductRequest,
        availableProduct,
      ),
    ).toEqual([
      {
        operation: 'reserve',
        productId: 1,
        expectedVersion: 7,
        qty: 2,
        stock: 3,
        version: 8,
      },
    ]);
  });

  it('throws OutOfStockException when inventory is insufficient', () => {
    expect(() =>
      planReserve(
        oneProductRequest,
        [{ productId: 1, stock: 1, version: 0 }],
      ),
    ).toThrow(OutOfStockException);
  });

  it('plans multiple products all-or-nothing', () => {
    const current: InventorySnapshot[] = [
      { productId: 1, stock: 5, version: 0 },
      { productId: 2, stock: 1, version: 3 },
    ];

    expect(() =>
      planReserve(
        [
          { productId: 1, qty: 2 },
          { productId: 2, qty: 2 },
        ],
        current,
      ),
    ).toThrow(OutOfStockException);
    expect(current).toEqual([
      { productId: 1, stock: 5, version: 0 },
      { productId: 2, stock: 1, version: 3 },
    ]);
  });
});
