import { Promotion, PromotionResult } from './promotion.types';

export function normalizeCode(code: string | null | undefined): string | null {
  const c = (code ?? '').trim().toUpperCase();
  return c === '' ? null : c;
}

function formatVnd(n: number): string {
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

/** Số tiền giảm (BR-08): PERCENT làm tròn xuống và không vượt mức tối đa; không bao giờ vượt tạm tính. */
export function computeDiscount(promo: Promotion, subtotal: number): number {
  let discount: number;
  if (promo.discountType === 'PERCENT') {
    discount = Math.floor((subtotal * promo.discountValue) / 100);
    if (promo.maxDiscountAmount !== null) discount = Math.min(discount, promo.maxDiscountAmount);
  } else {
    discount = promo.discountValue;
  }
  return Math.max(0, Math.min(discount, subtotal));
}

/**
 * Kiểm tra mã theo BR-07 và tính số tiền giảm. Hàm thuần, không đổi dữ liệu (không tăng usedCount).
 * `promo` là null nếu không tìm thấy mã.
 */
export function evaluatePromotion(
  code: string,
  promo: Promotion | null,
  subtotal: number,
  now: Date,
): PromotionResult {
  const reject = (reason: NonNullable<PromotionResult['reason']>, message: string): PromotionResult => ({
    code,
    valid: false,
    discountAmount: 0,
    reason,
    message,
  });
  if (!promo || !promo.isActive) return reject('PROMO_NOT_FOUND', 'Mã khuyến mãi không tồn tại');
  if (now < promo.startsAt) return reject('PROMO_NOT_STARTED', 'Mã chưa đến thời gian áp dụng');
  if (now > promo.expiresAt) return reject('PROMO_EXPIRED', 'Mã đã hết hạn');
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return reject('PROMO_USAGE_LIMIT_REACHED', 'Mã đã hết lượt sử dụng');
  }
  if (subtotal < promo.minOrderValue) {
    return reject('PROMO_MIN_ORDER_NOT_MET', `Đơn hàng tối thiểu ${formatVnd(promo.minOrderValue)} để dùng mã này`);
  }
  return { code, valid: true, discountAmount: computeDiscount(promo, subtotal), reason: null, message: null };
}
