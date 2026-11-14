import { evaluatePromotion } from './promotion-rules';
import {
  CartItemInput,
  CatalogProduct,
  CatalogTopping,
  Promotion,
  PromotionResult,
  Quote,
  QuoteItem,
} from './promotion.types';

/**
 * Tính một dòng giỏ (BR-02): đơn giá = giá cơ bản + phụ thu size + tổng giá topping;
 * thành tiền = đơn giá × số lượng. Dòng hết hàng hoặc không bán được có thành tiền 0.
 * Giá luôn lấy từ dữ liệu server; `clientUnitPrice` chỉ dùng để đặt cờ `priceChanged`.
 */
export function priceItem(
  input: CartItemInput,
  product: CatalogProduct | undefined,
  toppings: Map<number, CatalogTopping>,
): QuoteItem {
  const base = {
    productId: input.productId,
    sizeId: input.sizeId,
    toppingIds: input.toppingIds,
    quantity: input.quantity,
    unavailableToppingIds: [] as number[],
  };
  const notFound: QuoteItem = {
    ...base,
    productName: 'Sản phẩm không tồn tại',
    imageUrl: null,
    status: 'PRODUCT_NOT_FOUND',
    unitPrice: 0,
    lineTotal: 0,
    priceChanged: false,
  };
  if (!product) return notFound;
  const size = product.sizes.find((s) => s.id === input.sizeId);
  const chosen = input.toppingIds.map((id) => toppings.get(id));
  if (!size || chosen.some((t) => t === undefined)) return { ...notFound, productName: product.name, imageUrl: product.imageUrl };

  const tops = chosen as CatalogTopping[];
  const unitPrice = product.basePrice + size.extraPrice + tops.reduce((s, t) => s + t.price, 0);
  const unavailableToppingIds = tops.filter((t) => t.stock < input.quantity).map((t) => t.id);

  let status: QuoteItem['status'] = 'AVAILABLE';
  if (size.stock < input.quantity) status = 'OUT_OF_STOCK';
  else if (unavailableToppingIds.length > 0) status = 'TOPPING_OUT_OF_STOCK';

  return {
    ...base,
    productName: product.name,
    imageUrl: product.imageUrl,
    status,
    unavailableToppingIds: status === 'TOPPING_OUT_OF_STOCK' ? unavailableToppingIds : [],
    unitPrice,
    lineTotal: status === 'AVAILABLE' ? unitPrice * input.quantity : 0,
    priceChanged: input.clientUnitPrice != null && input.clientUnitPrice !== unitPrice,
  };
}

export interface BuildQuoteParams {
  items: CartItemInput[];
  products: CatalogProduct[];
  toppings: CatalogTopping[];
  /** Mã đã chuẩn hóa (hoa, không khoảng trắng), null nếu không dùng mã. */
  promotionCode: string | null;
  /** Kết quả tra cứu mã trong DB; null nếu không có mã hoặc không tìm thấy. */
  promotion: Promotion | null;
  now: Date;
}

/** Tính toàn bộ báo giá: tạm tính chỉ gồm dòng AVAILABLE, giảm giá không vượt tạm tính, tổng không âm. */
export function buildQuote(p: BuildQuoteParams): Quote {
  const productMap = new Map(p.products.map((x) => [x.id, x]));
  const toppingMap = new Map(p.toppings.map((x) => [x.id, x]));
  const items = p.items.map((i) => priceItem(i, productMap.get(i.productId), toppingMap));
  const subtotal = items.reduce((s, i) => s + (i.status === 'AVAILABLE' ? i.lineTotal : 0), 0);
  const promotion: PromotionResult | null = p.promotionCode
    ? evaluatePromotion(p.promotionCode, p.promotion, subtotal, p.now)
    : null;
  const discount = promotion?.valid ? promotion.discountAmount : 0;
  return { items, subtotal, promotion, discount, total: Math.max(0, subtotal - discount) };
}
