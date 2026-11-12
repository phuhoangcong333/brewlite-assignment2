import { buildQuote, priceItem } from '../pricing';
import { NOW, PRODUCTS, TOPPINGS, promo } from './fixtures';
import { CartItemInput } from '../promotion.types';

const toppingMap = new Map(TOPPINGS.map((t) => [t.id, t]));
const item = (over: Partial<CartItemInput> = {}): CartItemInput => ({
  productId: 1, sizeId: 1, toppingIds: [], quantity: 1, ...over,
});
const quote = (items: CartItemInput[], code: string | null = null, p = code ? promo() : null) =>
  buildQuote({ items, products: PRODUCTS, toppings: TOPPINGS, promotionCode: code, promotion: p, now: NOW });

describe('priceItem – công thức giá (BR-02)', () => {
  it('đơn giá = giá cơ bản + phụ thu size + tổng giá topping', () => {
    const r = priceItem(item({ sizeId: 2, toppingIds: [1, 2], quantity: 2 }), PRODUCTS[0], toppingMap);
    expect(r.unitPrice).toBe(45000 + 6000 + 5000 + 7000);
    expect(r.lineTotal).toBe(r.unitPrice * 2);
    expect(r.status).toBe('AVAILABLE');
    expect(r.productName).toBe('Trà sữa trân châu');
  });

  it('size mặc định không phụ thu, không topping', () => {
    const r = priceItem(item(), PRODUCTS[0], toppingMap);
    expect(r.unitPrice).toBe(45000);
  });

  it('hết hàng: giữ đơn giá nhưng thành tiền 0', () => {
    const r = priceItem(item({ productId: 3 }), PRODUCTS[2], toppingMap);
    expect(r.status).toBe('OUT_OF_STOCK');
    expect(r.unitPrice).toBe(35000);
    expect(r.lineTotal).toBe(0);
  });

  it('tồn kho ít hơn số lượng đặt cũng coi là hết hàng', () => {
    const r = priceItem(item({ productId: 2, quantity: 6 }), PRODUCTS[1], toppingMap);
    expect(r.status).toBe('OUT_OF_STOCK');
    expect(priceItem(item({ productId: 2, quantity: 5 }), PRODUCTS[1], toppingMap).status).toBe('AVAILABLE');
  });

  it('topping hết hàng: TOPPING_OUT_OF_STOCK kèm danh sách topping hết', () => {
    const r = priceItem(item({ toppingIds: [1, 3] }), PRODUCTS[0], toppingMap);
    expect(r.status).toBe('TOPPING_OUT_OF_STOCK');
    expect(r.unavailableToppingIds).toEqual([3]);
    expect(r.lineTotal).toBe(0);
  });

  it('sản phẩm, size hoặc topping không tồn tại: PRODUCT_NOT_FOUND', () => {
    expect(priceItem(item({ productId: 99 }), undefined, toppingMap).status).toBe('PRODUCT_NOT_FOUND');
    expect(priceItem(item({ sizeId: 9 }), PRODUCTS[0], toppingMap).status).toBe('PRODUCT_NOT_FOUND');
    expect(priceItem(item({ toppingIds: [77] }), PRODUCTS[0], toppingMap).status).toBe('PRODUCT_NOT_FOUND');
  });

  it('clientUnitPrice chỉ để phát hiện giá đổi, không ảnh hưởng giá tính', () => {
    const same = priceItem(item({ clientUnitPrice: 45000 }), PRODUCTS[0], toppingMap);
    expect(same.priceChanged).toBe(false);
    const diff = priceItem(item({ clientUnitPrice: 1 }), PRODUCTS[0], toppingMap);
    expect(diff.priceChanged).toBe(true);
    expect(diff.unitPrice).toBe(45000);
    expect(priceItem(item(), PRODUCTS[0], toppingMap).priceChanged).toBe(false);
  });
});

describe('buildQuote – tổng tiền (FR-06)', () => {
  it('tạm tính là tổng thành tiền các dòng, tổng = tạm tính khi không có mã', () => {
    const q = quote([item({ quantity: 2, toppingIds: [1] }), item({ productId: 2, quantity: 1 })]);
    expect(q.subtotal).toBe(2 * 50000 + 30000);
    expect(q.discount).toBe(0);
    expect(q.total).toBe(130000);
    expect(q.promotion).toBeNull();
  });

  it('dòng không AVAILABLE không tính vào tạm tính', () => {
    const q = quote([item({ quantity: 2 }), item({ productId: 3 }), item({ toppingIds: [3] })]);
    expect(q.subtotal).toBe(90000);
    expect(q.items.map((i) => i.status)).toEqual(['AVAILABLE', 'OUT_OF_STOCK', 'TOPPING_OUT_OF_STOCK']);
  });

  it('mã hợp lệ: trừ giảm giá khỏi tạm tính', () => {
    const q = quote([item({ sizeId: 2, toppingIds: [1, 2], quantity: 2 })], 'BREW2026');
    expect(q.subtotal).toBe(126000);
    expect(q.discount).toBe(12600);
    expect(q.total).toBe(113400);
    expect(q.promotion).toMatchObject({ valid: true, discountAmount: 12600 });
  });

  it('mã không hợp lệ: vẫn trả báo giá, tổng không đổi', () => {
    const q = quote([item({ quantity: 2 })], 'HETHAN', null);
    expect(q.promotion).toMatchObject({ valid: false, reason: 'PROMO_NOT_FOUND' });
    expect(q.discount).toBe(0);
    expect(q.total).toBe(q.subtotal);
  });

  it('mã đòi giá trị tối thiểu: tính trên tạm tính sau khi loại dòng hết hàng', () => {
    const p = promo({ minOrderValue: 100000 });
    const q = quote([item({ quantity: 2 }), item({ productId: 3, quantity: 5 })], 'BREW2026', p);
    expect(q.subtotal).toBe(90000);
    expect(q.promotion?.reason).toBe('PROMO_MIN_ORDER_NOT_MET');
    expect(q.total).toBe(90000);
  });

  it('giảm cố định lớn hơn tạm tính: tổng không âm', () => {
    const q = quote([item()], 'BREW2026', promo({ discountType: 'FIXED_AMOUNT', discountValue: 999999 }));
    expect(q.discount).toBe(45000);
    expect(q.total).toBe(0);
  });

  it('giỏ toàn dòng hết hàng: tạm tính 0, tổng 0', () => {
    const q = quote([item({ productId: 3 })]);
    expect(q.subtotal).toBe(0);
    expect(q.total).toBe(0);
  });

  it('tiền là số nguyên', () => {
    const q = quote([item({ quantity: 3, toppingIds: [1, 2] })], 'BREW2026', promo({ discountValue: 7 }));
    for (const n of [q.subtotal, q.discount, q.total, ...q.items.map((i) => i.lineTotal)]) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });
});
