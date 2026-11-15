// SRS BR-6.7: use the final payable total after discounts, in VND.
export function calculateLoyaltyPoints(totalPaid: number): number {
  if (!Number.isSafeInteger(totalPaid) || totalPaid < 0) {
    throw new RangeError('Total paid must be a non-negative safe integer');
  }
  return Math.floor(totalPaid / 10_000);
}
