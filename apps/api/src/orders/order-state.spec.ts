import { InvalidTransitionException } from '../common/errors';
import {
  assertTransition,
  canTransition,
  canCancelOrder,
  assertCanCancelOrder,
  OrderStatus,
} from './order-state';

const statuses: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'PAYMENT_FAILED',
  'CANCELLED',
];

const validTransitions: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ['PENDING', 'PAID'],
  ['PENDING', 'PAYMENT_FAILED'],
  ['PENDING', 'CANCELLED'],
  ['PAYMENT_FAILED', 'PENDING'],
  ['PAYMENT_FAILED', 'CANCELLED'],
  ['PAID', 'PREPARING'],
  ['PREPARING', 'READY'],
  ['READY', 'COMPLETED'],
];

describe('assertTransition', () => {
  it('rejects the demo-invalid transition PENDING -> READY', () => {
    expect(canTransition('PENDING', 'READY')).toBe(false);
    expect(() => assertTransition('PENDING', 'READY')).toThrow(
      new InvalidTransitionException('PENDING', 'READY'),
    );
  });

  it.each(
    statuses.flatMap((from) => statuses.map((to) => [from, to] as const)),
  )('checks transition %s -> %s', (from, to) => {
    const isValid = validTransitions.some(
      ([validFrom, validTo]) => validFrom === from && validTo === to,
    );

    if (isValid) {
      expect(() => assertTransition(from, to)).not.toThrow();
    } else {
      expect(() => assertTransition(from, to)).toThrow(
        new InvalidTransitionException(from, to),
      );
    }
  });
});

describe('cancellation by actor', () => {
  it.each(
    statuses.flatMap((status) =>
      (['CUSTOMER', 'STAFF'] as const).map((actor) => [status, actor] as const),
    ),
  )('%s cancellation by %s', (status, actor) => {
    const allowed = (
      actor === 'STAFF'
        ? ['PENDING', 'PREPARING']
        : ['PENDING', 'PAYMENT_FAILED']
    ).includes(status);
    expect(canCancelOrder(status, actor)).toBe(allowed);
    if (allowed)
      expect(() => assertCanCancelOrder(status, actor)).not.toThrow();
    else
      expect(() => assertCanCancelOrder(status, actor)).toThrow(
        InvalidTransitionException,
      );
  });
});
