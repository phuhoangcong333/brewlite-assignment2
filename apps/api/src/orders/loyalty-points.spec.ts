import { calculateLoyaltyPoints } from './loyalty-points';

describe('Loyalty points (SRS BR-6.7)', () => {
  it.each([
    [0, 0],
    [1, 0],
    [9_999, 0],
    [10_000, 1],
    [19_999, 1],
    [20_000, 2],
    [25_000, 2],
    [45_000, 4],
  ])('awards %i VND as %i whole points', (total, expected) => {
    expect(calculateLoyaltyPoints(total)).toBe(expected);
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid payable total %p',
    (total) => {
      expect(() => calculateLoyaltyPoints(total)).toThrow(RangeError);
    },
  );
});
