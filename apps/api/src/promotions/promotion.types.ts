export type DiscountType = 'PERCENT' | 'FIXED_AMOUNT';

/** Khớp model Promotion trong class diagram (xem prisma/promotion.prisma). */
export interface Promotion {
  id: number;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  startsAt: Date;
  expiresAt: Date;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export type PromotionReason =
  | 'PROMO_NOT_FOUND'
  | 'PROMO_NOT_STARTED'
  | 'PROMO_EXPIRED'
  | 'PROMO_MIN_ORDER_NOT_MET'
  | 'PROMO_USAGE_LIMIT_REACHED';

export interface PromotionResult {
  code: string;
  valid: boolean;
  discountAmount: number;
  reason: PromotionReason | null;
  message: string | null;
}

export type QuoteItemStatus =
  'AVAILABLE' | 'OUT_OF_STOCK' | 'TOPPING_OUT_OF_STOCK' | 'PRODUCT_NOT_FOUND';

export interface QuoteItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  sizeId: number;
  toppingIds: number[];
  quantity: number;
  status: QuoteItemStatus;
  unavailableToppingIds: number[];
  unitPrice: number;
  lineTotal: number;
  priceChanged: boolean;
}

export interface Quote {
  items: QuoteItem[];
  subtotal: number;
  promotion: PromotionResult | null;
  discount: number;
  total: number;
}

/** Dòng giỏ đã qua validate (không có trường giá nào ngoài clientUnitPrice). */
export interface CartItemInput {
  productId: number;
  sizeId: number;
  toppingIds: number[];
  quantity: number;
  note?: string | null;
  clientUnitPrice?: number | null;
}

/** Dữ liệu giá và tồn kho đọc từ cơ sở dữ liệu (TV1/TV2 sở hữu bảng). */
export interface CatalogProduct {
  id: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  sizes: { id: number; extraPrice: number; stock: number }[];
}

export interface CatalogTopping {
  id: number;
  price: number;
  stock: number;
}
