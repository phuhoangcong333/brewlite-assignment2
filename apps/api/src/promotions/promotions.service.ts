import { Injectable } from '@nestjs/common';
import { ValidateCartDto } from './dto/validate-cart.dto';
import { buildQuote } from './pricing';
import { normalizeCode } from './promotion-rules';
import { Quote } from './promotion.types';
import { CatalogRepository, PromotionRepository } from './repositories';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly promotions: PromotionRepository,
  ) {}

  /** Báo giá giỏ hàng và kiểm tra mã. Chỉ đọc dữ liệu: không trừ kho, không tăng usedCount. */
  async validate(dto: ValidateCartDto, now: Date = new Date()): Promise<Quote> {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds ?? []))];
    const code = normalizeCode(dto.promotionCode);

    const [products, toppings, promotion] = await Promise.all([
      this.catalog.findProducts(productIds),
      toppingIds.length > 0 ? this.catalog.findToppings(toppingIds) : Promise.resolve([]),
      code ? this.promotions.findByCode(code) : Promise.resolve(null),
    ]);

    return buildQuote({
      items: dto.items.map((i) => ({ ...i, toppingIds: i.toppingIds ?? [] })),
      products,
      toppings,
      promotionCode: code,
      promotion,
      now,
    });
  }
}
