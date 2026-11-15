import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaCatalogRepository } from '../adapters/prisma-catalog.repository';
import { PrismaPromotionRepository } from '../adapters/prisma-promotion.repository';
import { ValidateCartDto } from '../dto/validate-cart.dto';
import { PromotionsService } from '../promotions.service';

/**
 * [S2][Task 5.2][TV3] Issue #25
 *
 * Kiểm tra luồng báo giá với PrismaCatalogRepository + PrismaPromotionRepository THẬT
 * (chỉ giả lập PrismaService) và dữ liệu giống prisma/seed.ts.
 * Khác với các spec khác dùng InMemory fixtures (giá size M = +6.000), ở đây giá theo adapter thật:
 * size S/M/L có id 1/2/3, phụ thu 0/5.000/10.000, topping 1 và 2 giá 5.000.
 */

const NOW = new Date('2026-11-14T12:00:00Z');
const EXPIRES = new Date('2026-12-31T23:59:59.999Z');
const SIZE_S = 1;
const SIZE_M = 2;

type Size = 'S' | 'M' | 'L';
const recipe = (size: Size, amountRequired: number, stockQuantity: number) => ({
  size,
  amountRequired,
  ingredient: { stockQuantity },
});

// Giống seed.ts: Cà phê sữa 29.000 (Cà phê hạt tồn 2000, Sữa đặc tồn 2500), có công thức cho S/M/L
const PRODUCT_ROWS = [
  {
    id: 1,
    name: 'Cà phê sữa',
    imageUrl: '/image/Picture1.png',
    price: 29_000,
    stock: 10,
    recipeItems: [
      recipe('S', 20, 2000), recipe('S', 35, 2500),
      recipe('M', 25, 2000), recipe('M', 40, 2500),
      recipe('L', 30, 2000), recipe('L', 50, 2500),
    ],
  },
  // Không có công thức: dùng Product.stock làm tồn kho từng size
  { id: 8, name: 'Trà chanh sả', imageUrl: '/image/Picture4.png', price: 35_000, stock: 10, recipeItems: [] },
  { id: 9, name: 'Trà dâu tằm', imageUrl: '/image/Picture7.png', price: 42_000, stock: 0, recipeItems: [] },
];

// GIAM10, BREW20 giống seed.ts; HETLUOT chỉ dùng trong test (usageLeft = 0)
const PROMO_ROWS = [
  { id: 1, code: 'GIAM10', percent: 10, expiresAt: EXPIRES, usageLeft: 100 },
  { id: 2, code: 'BREW20', percent: 20, expiresAt: EXPIRES, usageLeft: 5 },
  { id: 3, code: 'HETLUOT', percent: 10, expiresAt: EXPIRES, usageLeft: 0 },
];

describe('PromotionsService + Prisma adapters (dữ liệu giống seed)', () => {
  const findUnique = jest.fn(async ({ where }: { where: { code: string } }) =>
    PROMO_ROWS.find((r) => r.code === where.code) ?? null,
  );
  const update = jest.fn();
  const prisma = {
    product: {
      findMany: jest.fn(async ({ where }: { where: { id: { in: number[] } } }) =>
        PRODUCT_ROWS.filter((p) => where.id.in.includes(p.id)),
      ),
    },
    promotion: { findUnique, update },
  } as unknown as PrismaService;

  const service = new PromotionsService(
    new PrismaCatalogRepository(prisma),
    new PrismaPromotionRepository(prisma),
  );

  const dto = (over: Partial<ValidateCartDto> = {}): ValidateCartDto => ({
    items: [{ productId: 1, sizeId: SIZE_M, toppingIds: [], quantity: 2 }],
    ...over,
  });

  beforeEach(() => jest.clearAllMocks());

  it('không có mã: 2 ly Cà phê sữa size M = 2 × (29.000 + 5.000) = 68.000', async () => {
    const q = await service.validate(dto(), NOW);
    expect(q.items[0]).toMatchObject({ unitPrice: 34_000, lineTotal: 68_000, status: 'AVAILABLE' });
    expect(q).toMatchObject({ subtotal: 68_000, discount: 0, total: 68_000, promotion: null });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('GIAM10 (10%): giảm 6.800, tổng 61.200', async () => {
    const q = await service.validate(dto({ promotionCode: 'GIAM10' }), NOW);
    expect(q.promotion).toMatchObject({ code: 'GIAM10', valid: true, discountAmount: 6_800 });
    expect(q).toMatchObject({ subtotal: 68_000, discount: 6_800, total: 61_200 });
  });

  it('BREW20 (20%): giảm 13.600, tổng 54.400', async () => {
    const q = await service.validate(dto({ promotionCode: 'BREW20' }), NOW);
    expect(q).toMatchObject({ discount: 13_600, total: 54_400 });
  });

  it('có topping: (29.000 + 5.000 + 5.000) × 2 = 78.000, GIAM10 giảm 7.800, tổng 70.200', async () => {
    const q = await service.validate(
      dto({ items: [{ productId: 1, sizeId: SIZE_M, toppingIds: [1], quantity: 2 }], promotionCode: 'GIAM10' }),
      NOW,
    );
    expect(q).toMatchObject({ subtotal: 78_000, discount: 7_800, total: 70_200 });
  });

  it('mã viết thường và có khoảng trắng vẫn nhận ra', async () => {
    const q = await service.validate(dto({ promotionCode: '  giam10 ' }), NOW);
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'GIAM10' } });
    expect(q.promotion?.valid).toBe(true);
  });

  it('mã không tồn tại: PROMO_NOT_FOUND, tổng không đổi', async () => {
    const q = await service.validate(dto({ promotionCode: 'KHONGCO' }), NOW);
    expect(q.promotion).toMatchObject({ valid: false, reason: 'PROMO_NOT_FOUND', discountAmount: 0 });
    expect(q.total).toBe(68_000);
  });

  it('mã hết hạn (sau 31/12/2026): PROMO_EXPIRED', async () => {
    const q = await service.validate(dto({ promotionCode: 'GIAM10' }), new Date('2027-01-01T00:00:00Z'));
    expect(q.promotion).toMatchObject({ valid: false, reason: 'PROMO_EXPIRED' });
    expect(q.total).toBe(68_000);
  });

  it('mã hết lượt (usageLeft = 0): PROMO_USAGE_LIMIT_REACHED', async () => {
    const q = await service.validate(dto({ promotionCode: 'HETLUOT' }), NOW);
    expect(q.promotion).toMatchObject({ valid: false, reason: 'PROMO_USAGE_LIMIT_REACHED' });
  });

  it('báo giá không trừ lượt dùng (không gọi update trên bảng Promotion)', async () => {
    await service.validate(dto({ promotionCode: 'BREW20' }), NOW);
    expect(update).not.toHaveBeenCalled();
  });

  it('sản phẩm hết hàng (stock 0, không công thức): OUT_OF_STOCK, tổng 0', async () => {
    const q = await service.validate(
      dto({ items: [{ productId: 9, sizeId: SIZE_S, toppingIds: [], quantity: 1 }] }),
      NOW,
    );
    expect(q.items[0]).toMatchObject({ status: 'OUT_OF_STOCK', lineTotal: 0 });
    expect(q).toMatchObject({ subtotal: 0, total: 0 });
  });

  it('topping không hỗ trợ (id 3) hoặc sản phẩm/size không tồn tại: PRODUCT_NOT_FOUND', async () => {
    const q = await service.validate(
      dto({
        items: [
          { productId: 1, sizeId: SIZE_M, toppingIds: [3], quantity: 1 },
          { productId: 1, sizeId: 99, toppingIds: [], quantity: 1 },
          { productId: 777, sizeId: SIZE_S, toppingIds: [], quantity: 1 },
        ],
      }),
      NOW,
    );
    expect(q.items.map((i) => i.status)).toEqual([
      'PRODUCT_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'PRODUCT_NOT_FOUND',
    ]);
    expect(q.subtotal).toBe(0);
  });

  it('GIỚI HẠN CỦA DỮ LIỆU THẬT: bảng Promotion không có minOrderValue, nên đơn nhỏ vẫn được giảm', async () => {
    // 1 ly size S = 29.000 vẫn dùng được BREW20. Quy tắc "đơn tối thiểu" chỉ kiểm thử được ở mức
    // unit test (promotion-rules.spec.ts), không kiểm thử end-to-end được với DB hiện tại.
    const q = await service.validate(
      dto({ items: [{ productId: 1, sizeId: SIZE_S, toppingIds: [], quantity: 1 }], promotionCode: 'BREW20' }),
      NOW,
    );
    expect(q.promotion).toMatchObject({ valid: true, discountAmount: 5_800 });
  });

  // Câu hỏi cho nhóm: stock được kiểm tra riêng từng dòng, hai dòng cùng sản phẩm + size có thể
  // cộng lại vượt tồn kho (vd Trà chanh sả tồn 10, hai dòng × 10 ly đều AVAILABLE).
  it.todo('tổng số lượng của các dòng cùng sản phẩm + size không được vượt tồn kho');
});
