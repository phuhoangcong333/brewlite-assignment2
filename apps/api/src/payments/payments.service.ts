import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertTransition } from '../orders/order-state';
import { CreatePaymentDto } from './dto/create-payment.dto';

// P2034: Postgres hủy transaction do xung đột ghi (serialization failure).
const isSerializationFailure = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2034';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) { }

  async processPayment(
    dto: CreatePaymentDto,
    idempotencyKey: string | undefined,
    userId: number,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) throw new BadRequestException('Thiếu Idempotency-Key');
    if (key.length > 200)
      throw new BadRequestException('Idempotency-Key quá dài');

    if (dto.method !== 'CARD' && dto.method !== 'WALLET')
      throw new BadRequestException('method phải là CARD hoặc WALLET');
    const method: PaymentMethod = dto.method;
    const rawReference = method === 'CARD' ? dto.cardNumber : dto.walletId;
    const reference =
      typeof rawReference === 'string' ? rawReference.trim() : '';
    if (!reference)
      throw new BadRequestException(
        method === 'CARD' ? 'Thiếu cardNumber' : 'Thiếu walletId',
      );

    // Demo-only mock: suffix 0000 simulates failure. Never store full card details.
    // Bảng Payment không có cột requestFingerprint: "cùng yêu cầu" được xác định
    // bằng orderId + method đã lưu. Cùng key mà khác đơn/khác phương thức -> 409.
    const sameRequest = (p: { orderId: number; method: PaymentMethod }) =>
      p.orderId === dto.orderId && p.method === method;
    const success = reference.slice(-4) !== '0000';
    const paymentStatus: PaymentStatus = success ? 'SUCCESS' : 'FAILED';
    const targetOrderStatus: OrderStatus = success ? 'PAID' : 'PAYMENT_FAILED';

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.payment.findUnique({
            where: { idempotencyKey: key },
          });
          if (existing) {
            const ownedOrder = await tx.order.findFirst({
              where: { id: existing.orderId, userId },
              select: { status: true },
            });
            if (!ownedOrder)
              throw new NotFoundException(
                `Không tìm thấy đơn hàng #${existing.orderId}`,
              );
            if (!sameRequest(existing)) {
              throw new ConflictException(
                'Idempotency-Key đã được dùng cho yêu cầu khác',
              );
            }
            return this.toReplay(existing, ownedOrder.status);
          }

          const order = await tx.order.findFirst({
            where: { id: dto.orderId, userId },
            select: { id: true, userId: true, total: true, status: true },
          });
          if (!order)
            throw new NotFoundException(
              `Không tìm thấy đơn hàng #${dto.orderId}`,
            );
          if (dto.amount !== undefined && dto.amount !== order.total) {
            throw new BadRequestException('Số tiền thanh toán không khớp với tổng đơn hàng');
          }
          // Only one active transition can win. Inventory was reserved at order creation,
          // so payment deliberately does not reserve/decrement stock again.
          // A failed order must pass through PENDING before a retry can settle it.
          if (order.status === 'PAYMENT_FAILED') {
            assertTransition(order.status, 'PENDING');
            const reset = await tx.order.updateMany({
              where: { id: order.id, userId, status: 'PAYMENT_FAILED' },
              data: { status: 'PENDING' },
            });
            if (reset.count !== 1)
              throw new ConflictException(
                'Đơn hàng vừa được xử lý; hãy tải lại trạng thái',
              );
          }
          if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
            assertTransition(order.status, targetOrderStatus);
          }
          const changed = await tx.order.updateMany({
            where: { id: order.id, userId, status: 'PENDING' },
            data: { status: targetOrderStatus },
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'Đơn hàng vừa được xử lý; hãy tải lại trạng thái',
            );

          if (success) {
            const earnedPoints = Math.floor(order.total / 10_000);
            if (earnedPoints > 0) {
              await tx.user.update({
                where: { id: order.userId },
                data: { loyaltyPoints: { increment: earnedPoints } },
              });
            }
          }

          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              idempotencyKey: key,
              amount: order.total,
              method,
              status: paymentStatus,
            },
          });
          return {
            paymentId: payment.id,
            orderId: order.id,
            amount: order.total,
            method,
            payment_status: success ? 'PAID' : 'PAYMENT_FAILED',
            order_status: targetOrderStatus,
            message: success
              ? 'Thanh toán thành công (mock)'
              : 'Thanh toán thất bại (mock)',
            replayed: false,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      // Unique-key races (P2002) hoặc serialization failure (P2034): nếu request cùng key
      // đã commit thì trả lại đúng kết quả gốc (replay).
      const existing = await this.prisma.payment
        .findUnique({ where: { idempotencyKey: key } })
        .catch(() => null);
      if (existing) {
        // Check ownership before request details so another user cannot learn
        // whether the key matches an existing payment.
        const order = await this.prisma.order.findUnique({
          where: { id: existing.orderId },
          select: { status: true, userId: true },
        });
        if (!order || order.userId !== userId)
          throw new NotFoundException(
            `Không tìm thấy đơn hàng #${existing.orderId}`,
          );
        if (!sameRequest(existing))
          throw new ConflictException(
            'Idempotency-Key đã được dùng cho yêu cầu khác',
          );
        return this.toReplay(existing, order.status);
      }
      // Hai thanh toán khác key cùng lúc cho một đơn: bên thua bị Postgres hủy (P2034).
      // Đây là xung đột bình thường -> 409 để client tải lại trạng thái, không phải 500.
      if (isSerializationFailure(error)) {
        throw new ConflictException(
          'Đơn hàng đang được xử lý bởi yêu cầu khác; hãy tải lại trạng thái',
        );
      }
      throw error;
    }
  }

  /** Kết quả trả lại khi gửi lại cùng Idempotency-Key: không tạo payment mới. */
  private toReplay(
    existing: {
      id: number;
      orderId: number;
      amount: number;
      method: PaymentMethod;
      status: PaymentStatus;
    },
    orderStatus: OrderStatus,
  ) {
    const success = existing.status === 'SUCCESS';
    return {
      paymentId: existing.id,
      orderId: existing.orderId,
      amount: existing.amount,
      method: existing.method,
      payment_status: success ? 'PAID' : 'PAYMENT_FAILED',
      order_status: orderStatus,
      message: success
        ? 'Thanh toán thành công (mock)'
        : 'Thanh toán thất bại (mock)',
      replayed: true,
    };
  }
}
