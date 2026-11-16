import { computeDiscount, evaluatePromotion, normalizeCode } from '../promotion-rules';
import { NOW, T, promo } from './fixtures';

describe('normalizeCode', () => {
  it('cắt khoảng trắng và viết hoa; rỗng thì null', () => {
    expect(normalizeCode('  brew2026 ')).toBe('BREW2026');
    expect(normalizeCode('   ')).toBeNull();
    expect(normalizeCode(undefined)).toBeNull();
  });
});

describe('computeDiscount (BR-08)', () => {
  it('PERCENT làm tròn xuống', () => {
    expect(computeDiscount(promo({ discountValue: 10 }), 112000)).toBe(11200);
    expect(computeDiscount(promo({ discountValue: 10 }), 99999)).toBe(9999);
    expect(computeDiscount(promo({ discountValue: 15 }), 33333)).toBe(4999);
  });

  it('PERCENT không vượt mức giảm tối đa', () => {
    expect(computeDiscount(promo({ discountValue: 10, maxDiscountAmount: 20000 }), 500000)).toBe(20000);
    expect(computeDiscount(promo({ discountValue: 10, maxDiscountAmount: 20000 }), 100000)).toBe(10000);
  });

  it('FIXED_AMOUNT dùng số tiền cố định', () => {
    expect(computeDiscount(promo({ discountType: 'FIXED_AMOUNT', discountValue: 15000 }), 100000)).toBe(15000);
  });

  it('giảm giá không bao giờ vượt tạm tính', () => {
    expect(computeDiscount(promo({ discountType: 'FIXED_AMOUNT', discountValue: 50000 }), 30000)).toBe(30000);
    expect(computeDiscount(promo({ discountValue: 100 }), 0)).toBe(0);
  });
});

describe('evaluatePromotion (BR-07)', () => {
  const run = (p: ReturnType<typeof promo> | null, subtotal = 112000, now = NOW) =>
    evaluatePromotion('BREW2026', p, subtotal, now);

  it('mã hợp lệ trả số tiền giảm', () => {
    expect(run(promo())).toEqual({ code: 'BREW2026', valid: true, discountAmount: 11200, reason: null, message: null });
  });

  it('không tìm thấy mã hoặc mã bị tắt: PROMO_NOT_FOUND', () => {
    expect(run(null).reason).toBe('PROMO_NOT_FOUND');
    expect(run(promo({ isActive: false })).reason).toBe('PROMO_NOT_FOUND');
  });

  it('chưa đến hạn: PROMO_NOT_STARTED', () => {
    expect(run(promo({ startsAt: T('2026-11-09T00:00:00Z') })).reason).toBe('PROMO_NOT_STARTED');
  });

  it('quá hạn: PROMO_EXPIRED', () => {
    const r = run(promo({ expiresAt: T('2026-11-07T00:00:00Z') }));
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('PROMO_EXPIRED');
    expect(r.message).toBe('Mã đã hết hạn');
    expect(r.discountAmount).toBe(0);
  });

  it('đúng thời điểm bắt đầu và kết thúc vẫn hợp lệ (biên bao gồm)', () => {
    expect(run(promo({ startsAt: NOW })).valid).toBe(true);
    expect(run(promo({ expiresAt: NOW })).valid).toBe(true);
  });

  it('thiếu giá trị tối thiểu: PROMO_MIN_ORDER_NOT_MET kèm mức tối thiểu', () => {
    const r = run(promo({ minOrderValue: 50000 }), 30000);
    expect(r.reason).toBe('PROMO_MIN_ORDER_NOT_MET');
    expect(r.message).toContain('50.000');
    expect(run(promo({ minOrderValue: 50000 }), 50000).valid).toBe(true);
  });

  it('hết lượt dùng: PROMO_USAGE_LIMIT_REACHED; chưa hết thì hợp lệ; null là không giới hạn', () => {
    expect(run(promo({ usageLimit: 100, usedCount: 100 })).reason).toBe('PROMO_USAGE_LIMIT_REACHED');
    expect(run(promo({ usageLimit: 100, usedCount: 99 })).valid).toBe(true);
    expect(run(promo({ usageLimit: null, usedCount: 99999 })).valid).toBe(true);
  });
});
