import { IsIn } from 'class-validator';
import type { OrderStatus } from '../order-state';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'PAYMENT_FAILED',
  'CANCELLED',
];

export class TransitionOrderDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}
