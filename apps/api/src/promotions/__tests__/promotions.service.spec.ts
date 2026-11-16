import { ValidateCartDto } from '../dto/validate-cart.dto';
import { PromotionsService } from '../promotions.service';
import { InMemoryCatalog, InMemoryPromotions, NOW, promo } from './fixtures';

const dto = (over: Partial<ValidateCartDto> = {}): ValidateCartDto => ({
  items: [{ productId: 1, sizeId: 1, toppingIds: ['pearl'], quantity: 2 }],
  ...over,
});

describe('PromotionsService.validate', () => {
  const make = (list = [promo()]) => {
    const promotions = new InMemoryPromotions(list);
    return { service: new PromotionsService(new InMemoryCatalog(), promotions), promotions };
  };

  it('báo giá không có mã: không tra cứu mã khuyến mãi', async () => {
    const { service, promotions } = make();
    const q = await service.validate(dto(), NOW);
    expect(q.total).toBe(100000);
    expect(q.promotion).toBeNull();
    expect(promotions.lookups).toHaveLength(0);
  });

  it('mã không phân biệt hoa/thường và cắt khoảng trắng', async () => {
    const { service, promotions } = make();
    const q = await service.validate(dto({ promotionCode: '  brew2026 ' }), NOW);
    expect(promotions.lookups).toEqual(['BREW2026']);
    expect(q.promotion).toMatchObject({ code: 'BREW2026', valid: true, discountAmount: 10000 });
    expect(q.total).toBe(90000);
  });

  it('mã chỉ chứa khoảng trắng được coi như không có mã', async () => {
    const { service, promotions } = make();
    const q = await service.validate(dto({ promotionCode: '   ' }), NOW);
    expect(q.promotion).toBeNull();
    expect(promotions.lookups).toHaveLength(0);
  });

  it('mã không tồn tại: valid=false, tổng không đổi', async () => {
    const { service } = make();
    const q = await service.validate(dto({ promotionCode: 'KHONGCO' }), NOW);
    expect(q.promotion).toMatchObject({ valid: false, reason: 'PROMO_NOT_FOUND' });
    expect(q.total).toBe(100000);
  });

  it('không thay đổi dữ liệu: usedCount giữ nguyên sau khi báo giá', async () => {
    const p = promo({ usageLimit: 5, usedCount: 4 });
    const { service } = make([p]);
    await service.validate(dto({ promotionCode: 'BREW2026' }), NOW);
    await service.validate(dto({ promotionCode: 'BREW2026' }), NOW);
    expect(p.usedCount).toBe(4);
  });

  it('nhiều dòng cùng sản phẩm khác size được báo giá riêng', async () => {
    const { service } = make();
    const q = await service.validate(
      dto({ items: [{ productId: 1, sizeId: 1, toppingIds: [], quantity: 1 }, { productId: 1, sizeId: 2, toppingIds: [], quantity: 1 }] }),
      NOW,
    );
    expect(q.items.map((i) => i.unitPrice)).toEqual([45000, 51000]);
    expect(q.subtotal).toBe(96000);
  });
});
