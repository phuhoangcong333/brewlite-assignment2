// Khớp với apps/api/src/promotions/promotion.types.ts (đối tượng Quote do server trả về).

export type PromotionReason =
  | "PROMO_NOT_FOUND"
  | "PROMO_NOT_STARTED"
  | "PROMO_EXPIRED"
  | "PROMO_MIN_ORDER_NOT_MET"
  | "PROMO_USAGE_LIMIT_REACHED";

export type PromotionResult = {
  code: string;
  valid: boolean;
  discountAmount: number;
  reason: PromotionReason | null;
  message: string | null;
};

export type QuoteItemStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "TOPPING_OUT_OF_STOCK"
  | "PRODUCT_NOT_FOUND";

export type QuoteItem = {
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
};

export type Quote = {
  items: QuoteItem[];
  subtotal: number;
  promotion: PromotionResult | null;
  discount: number;
  total: number;
};
