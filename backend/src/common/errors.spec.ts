import {
  InventoryConcurrencyException,
  InvalidTransitionException,
  OutOfStockException,
} from './errors';

describe('domain conflict exceptions', () => {
  it('returns HTTP 409 and a descriptive message for invalid transitions', () => {
    const exception = new InvalidTransitionException('PAID', 'PENDING');

    expect(exception.getStatus()).toBe(409);
    expect(exception.message).toBe(
      'Cannot transition order from PAID to PENDING',
    );
    expect(exception.getResponse()).toEqual({
      message: 'Cannot transition order from PAID to PENDING',
      error: 'Conflict',
      statusCode: 409,
    });
  });

  it('returns HTTP 409 and a descriptive message for insufficient stock', () => {
    const exception = new OutOfStockException(123);

    expect(exception.getStatus()).toBe(409);
    expect(exception.message).toBe('Insufficient stock for product 123');
    expect(exception.getResponse()).toEqual({
      message: 'Insufficient stock for product 123',
      error: 'Conflict',
      statusCode: 409,
    });
  });

  it('returns HTTP 409 when inventory keeps changing during retries', () => {
    const exception = new InventoryConcurrencyException();

    expect(exception.getStatus()).toBe(409);
    expect(exception.message).toBe(
      'Inventory changed repeatedly while reserving stock; please retry',
    );
    expect(exception.getResponse()).toEqual({
      message: 'Inventory changed repeatedly while reserving stock; please retry',
      error: 'Conflict',
      statusCode: 409,
    });
  });
});
