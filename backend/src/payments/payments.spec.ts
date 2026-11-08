import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describeDb } from '../../test/helpers/describe-db';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

// Cùng công thức với PaymentsService để dựng sẵn "payment đã tồn tại" trong unit test.
const fingerprintOf = (orderId: number, method: string, reference: string) =>
  JSON.stringify({ orderId, method, last4: reference.slice(-4) });

const wallet = (
  orderId: number,
  walletId = 'WALLET-1234',
): CreatePaymentDto => ({ orderId, method: 'WALLET', walletId });
const card = (orderId: number, cardNumber: string): CreatePaymentDto => ({
  orderId,
  method: 'CARD',
  cardNumber,
});

/* ------------------------------------------------------------------ *
 * A. Unit test - KHÔNG cần database (Prisma giả lập)
 * ------------------------------------------------------------------ */
describe('PaymentsService (unit, không DB)', () => {
  function build(
    overrides: {
      transaction?: jest.Mock;
      existingPayment?: unknown;
      order?: unknown;
    } = {},
  ) {
    const prisma = {
      $transaction: overrides.transaction ?? jest.fn(),
      payment: {
        findUnique: jest.fn(async () => overrides.existingPayment ?? null),
      },
      order: { findUnique: jest.fn(async () => overrides.order ?? null) },
    };
    return {
      prisma,
      service: new PaymentsService(prisma as unknown as PrismaService),
    };
  }

  it('thiếu hoặc rỗng Idempotency-Key -> 400', async () => {
    const { service } = build();
    await expect(
      service.processPayment(wallet(1), undefined, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.processPayment(wallet(1), '   ', 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Idempotency-Key dài hơn 200 ký tự -> 400', async () => {
    const { service } = build();
    await expect(
      service.processPayment(wallet(1), 'k'.repeat(201), 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('method CARD thiếu cardNumber / WALLET thiếu walletId -> 400', async () => {
    const { service } = build();
    await expect(
      service.processPayment({ orderId: 1, method: 'CARD' }, 'k1', 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.processPayment({ orderId: 1, method: 'WALLET' }, 'k1', 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('[sửa lỗi 3] serialization failure P2034 (2 thanh toán khác key cùng lúc) -> 409, không phải 500', async () => {
    const { service } = build({
      transaction: jest.fn().mockRejectedValue({ code: 'P2034' }),
    });
    await expect(
      service.processPayment(wallet(1), 'k-race', 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lỗi hệ thống khác vẫn được ném nguyên bản (không bị nuốt thành 409)', async () => {
    const boom = new Error('db down');
    const { service } = build({
      transaction: jest.fn().mockRejectedValue(boom),
    });
    await expect(service.processPayment(wallet(1), 'k1', 1)).rejects.toBe(boom);
  });

  it('cùng key chạy song song (P2002): bên thua nhận lại kết quả gốc với replayed=true', async () => {
    const existing = {
      id: 7,
      orderId: 1,
      amount: 25000,
      method: 'WALLET',
      status: 'SUCCESS',
      requestFingerprint: fingerprintOf(1, 'WALLET', 'WALLET-1234'),
    };
    const { service } = build({
      transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      existingPayment: existing,
      order: { status: 'PAID', userId: 1 },
    });
    await expect(
      service.processPayment(wallet(1), 'k1', 1),
    ).resolves.toMatchObject({
      paymentId: 7,
      orderId: 1,
      payment_status: 'PAID',
      order_status: 'PAID',
      replayed: true,
    });
  });

  it('[sửa lỗi] user khác dùng lại key của người khác không đọc được kết quả -> 404', async () => {
    const existing = {
      id: 7,
      orderId: 1,
      amount: 25000,
      method: 'WALLET',
      status: 'SUCCESS',
      requestFingerprint: fingerprintOf(1, 'WALLET', 'WALLET-1234'),
    };
    const { service } = build({
      transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      existingPayment: existing,
      order: { status: 'PAID', userId: 1 }, // chủ đơn là user 1
    });
    await expect(
      service.processPayment(wallet(1), 'k1', 2),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('user khác không nhận được 409 khi key trùng cả đơn và method', async () => {
    const existing = {
      id: 7,
      orderId: 1,
      amount: 25000,
      method: 'WALLET',
      status: 'SUCCESS',
    };
    const { service } = build({
      transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      existingPayment: existing,
      order: { status: 'PAID', userId: 1 },
    });

    await expect(
      service.processPayment(wallet(1), 'k1', 2),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cùng key nhưng nội dung khác (khác orderId) -> 409', async () => {
    const existing = {
      id: 7,
      orderId: 1,
      amount: 25000,
      method: 'WALLET',
      status: 'SUCCESS',
      requestFingerprint: fingerprintOf(1, 'WALLET', 'WALLET-1234'),
    };
    const { service } = build({
      transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      existingPayment: existing,
      order: { status: 'PAID', userId: 1 },
    });
    await expect(
      service.processPayment(wallet(2), 'k1', 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

/* ------------------------------------------------------------------ *
 * B. Integration test với PostgreSQL thật (giống order.service.spec.ts)
 * ------------------------------------------------------------------ */
describeDb('PaymentsService with PostgreSQL', () => {
  const prisma = new PrismaService();
  const service = new PaymentsService(prisma);
  const tag = `payment-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userIds: number[] = [];
  const productIds: number[] = [];
  let seq = 0;

  const newKey = () => `${tag}-key-${(seq += 1)}`;

  async function createUser() {
    const user = await prisma.user.create({
      data: {
        email: `${tag}-${(seq += 1)}@example.test`,
        passwordHash: 'test-password-hash',
      },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function createOrder(
    userId: number,
    status: 'PENDING' | 'PAID' | 'PAYMENT_FAILED' = 'PENDING',
    total = 25_000,
  ) {
    const product = await prisma.product.create({
      data: {
        name: `${tag}-product-${(seq += 1)}`,
        price: total,
        stock: 10,
        version: 1,
      },
      select: { id: true },
    });
    productIds.push(product.id);
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status,
        items: {
          create: {
            productId: product.id,
            size: 'M',
            qty: 1,
            toppings: [],
            lineTotal: total,
          },
        },
      },
      select: { id: true },
    });
    return order.id;
  }

  const statusOf = async (orderId: number) =>
    (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status;
  const paymentsOf = (orderId: number) =>
    prisma.payment.findMany({ where: { orderId } });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('Task 8: thanh toán ví thành công -> payment PAID, đơn PAID, số tiền lấy từ đơn', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId, 'PENDING', 42_000);

    const result = await service.processPayment(
      wallet(orderId),
      newKey(),
      userId,
    );

    expect(result).toMatchObject({
      orderId,
      amount: 42_000,
      method: 'WALLET',
      payment_status: 'PAID',
      order_status: 'PAID',
      replayed: false,
    });
    expect(await statusOf(orderId)).toBe('PAID');
    expect(await paymentsOf(orderId)).toHaveLength(1);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 4 });
  });

  it('Task 8: thẻ có số cuối 0000 -> PAYMENT_FAILED, vẫn ghi 1 payment FAILED', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);

    const result = await service.processPayment(
      card(orderId, '4111111111110000'),
      newKey(),
      userId,
    );

    expect(result).toMatchObject({
      payment_status: 'PAYMENT_FAILED',
      order_status: 'PAYMENT_FAILED',
      replayed: false,
    });
    expect(await statusOf(orderId)).toBe('PAYMENT_FAILED');
    expect((await paymentsOf(orderId)).map((p) => p.status)).toEqual([
      'FAILED',
    ]);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 0 });
  });

  it('Task 8: sau khi thất bại, thử lại bằng key MỚI và thẻ hợp lệ -> PAID', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    await service.processPayment(
      card(orderId, '4111111111110000'),
      newKey(),
      userId,
    );

    const retry = await service.processPayment(
      card(orderId, '4111111111111111'),
      newKey(),
      userId,
    );

    expect(retry).toMatchObject({
      payment_status: 'PAID',
      order_status: 'PAID',
      replayed: false,
    });
    expect(await statusOf(orderId)).toBe('PAID');
    expect(await paymentsOf(orderId)).toHaveLength(2);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 2 });
  });

  it('Task 10 (idempotency): gửi 2 lần cùng Idempotency-Key -> chỉ có 1 payment, lần 2 trả kết quả cũ', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    const key = newKey();

    const first = await service.processPayment(wallet(orderId), key, userId);
    const second = await service.processPayment(wallet(orderId), key, userId);

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.paymentId).toBe(first.paymentId);
    expect(second.order_status).toBe('PAID');
    expect(await paymentsOf(orderId)).toHaveLength(1);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
    ).resolves.toEqual({ loyaltyPoints: 2 });
  });

  it('Task 10 (idempotency): thanh toán thất bại rồi gửi lại cùng key -> vẫn trả PAYMENT_FAILED, không tạo payment mới', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    const key = newKey();

    await service.processPayment(
      card(orderId, '4111111111110000'),
      key,
      userId,
    );
    const replay = await service.processPayment(
      card(orderId, '4111111111110000'),
      key,
      userId,
    );

    expect(replay).toMatchObject({
      replayed: true,
      payment_status: 'PAYMENT_FAILED',
    });
    expect(await paymentsOf(orderId)).toHaveLength(1);
  });

  it('Task 10 (idempotency): 5 request cùng key chạy đồng thời -> chỉ 1 payment, không có lỗi 500', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    const key = newKey();

    const settled = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.processPayment(wallet(orderId), key, userId),
      ),
    );

    expect(await paymentsOf(orderId)).toHaveLength(1);
    expect(await statusOf(orderId)).toBe('PAID');
    const ids = new Set<number>();
    for (const r of settled) {
      if (r.status === 'fulfilled') ids.add(r.value.paymentId);
      else expect(r.reason).toBeInstanceOf(ConflictException); // chỉ chấp nhận 409, không chấp nhận lỗi khác
    }
    expect(ids.size).toBe(1);
  });

  it('[sửa lỗi 3] 5 request KHÁC key cho cùng 1 đơn chạy đồng thời -> đúng 1 thành công, còn lại 400/409, không có 500', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);

    const settled = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.processPayment(wallet(orderId), newKey(), userId),
      ),
    );

    expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of settled) {
      if (r.status === 'rejected') {
        expect(
          [BadRequestException, ConflictException].some(
            (E) => r.reason instanceof E,
          ),
        ).toBe(true);
      }
    }
    expect(await paymentsOf(orderId)).toHaveLength(1);
    expect(await statusOf(orderId)).toBe('PAID');
  });

  it('cùng key nhưng đổi orderId -> 409, không đụng tới đơn thứ hai', async () => {
    const userId = await createUser();
    const orderA = await createOrder(userId);
    const orderB = await createOrder(userId);
    const key = newKey();
    await service.processPayment(wallet(orderA), key, userId);

    await expect(
      service.processPayment(wallet(orderB), key, userId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await statusOf(orderB)).toBe('PENDING');
    expect(await paymentsOf(orderB)).toHaveLength(0);
  });

  it('đơn đã PAID, thanh toán lại bằng key mới -> 400 và không tạo payment thứ hai', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    await service.processPayment(wallet(orderId), newKey(), userId);

    await expect(
      service.processPayment(wallet(orderId), newKey(), userId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await paymentsOf(orderId)).toHaveLength(1);
  });

  it('đơn đã CANCELLED/COMPLETED -> không thanh toán được (409)', async () => {
    const userId = await createUser();
    const orderId = await createOrder(userId);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    await expect(
      service.processPayment(wallet(orderId), newKey(), userId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('đơn của người khác -> 404 và đơn giữ nguyên trạng thái', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const orderId = await createOrder(owner);

    await expect(
      service.processPayment(wallet(orderId), newKey(), stranger),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await statusOf(orderId)).toBe('PENDING');
  });

  it('user khác dùng lại Idempotency-Key của chủ đơn -> 404, không lộ kết quả', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const orderId = await createOrder(owner);
    const key = newKey();
    await service.processPayment(wallet(orderId), key, owner);

    await expect(
      service.processPayment(wallet(orderId), key, stranger),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('đơn không tồn tại -> 404', async () => {
    const userId = await createUser();
    await expect(
      service.processPayment(wallet(2_147_000_000), newKey(), userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
