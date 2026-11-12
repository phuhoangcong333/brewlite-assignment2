import { CatalogProduct, CatalogTopping, Promotion } from './promotion.types';

/** Cổng đọc dữ liệu sản phẩm/topping. Bản cài đặt thật dùng Prisma (xem adapters/). */
export abstract class CatalogRepository {
  abstract findProducts(ids: number[]): Promise<CatalogProduct[]>;
  abstract findToppings(ids: number[]): Promise<CatalogTopping[]>;
}

/** Cổng đọc mã khuyến mãi. Chỉ đọc: endpoint báo giá không bao giờ ghi dữ liệu. */
export abstract class PromotionRepository {
  abstract findByCode(code: string): Promise<Promotion | null>;
}
