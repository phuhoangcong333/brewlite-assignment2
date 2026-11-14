import { IsIn } from 'class-validator';
import type { OrderStatus } from '../order-state';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({ enum: ORDER_STATUSES, example: 'PREPARING' })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}
