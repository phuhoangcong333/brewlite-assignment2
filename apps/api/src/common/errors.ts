import { ConflictException } from '@nestjs/common';

export class InvalidTransitionException extends ConflictException {
  constructor(from: string, to: string) {
    super(`Cannot transition order from ${from} to ${to}`);
  }
}

export class OutOfStockException extends ConflictException {
  constructor(productId: number) {
    super(`Insufficient stock for product ${productId}`);
  }
}

export class InventoryConcurrencyException extends ConflictException {
  constructor() {
    super('Inventory changed repeatedly while reserving stock; please retry');
  }
}

export class OrderTransitionConflictException extends ConflictException {
  constructor(orderId: number) {
    super(`Order ${orderId} status changed before the transition completed`);
  }
}