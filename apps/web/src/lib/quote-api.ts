import { SIZE_IDS, TOPPING_IDS } from "./catalog-ids";
import { unitPriceOf, type CartItem } from "./cart";
import type { Quote } from "./quote-types";

export type QuoteRequest = {
  items: {
    productId: number;
    sizeId: number;
    toppingIds: number[];
    quantity: number;
    clientUnitPrice?: number;
    note?: string;
  }[];
  promotionCode?: string;
};

export function buildQuoteRequest(
  items: CartItem[],
  promotionCode: string | null,
): QuoteRequest {
  const request: QuoteRequest = {
    items: items.map((i) => {
      const note = i.note?.trim();
      const toppingIds =
        i.toppingIds ??
        i.toppings
          .map((t) => TOPPING_IDS[t])
          .filter((id): id is number => Number.isInteger(id));

      return {
        productId: i.productId,
        sizeId: i.sizeId ?? SIZE_IDS[i.size],
        toppingIds,
        quantity: i.qty,
        clientUnitPrice: i.clientUnitPrice ?? unitPriceOf(i),
        ...(note ? { note } : {}),
      };
    }),
  };
  if (promotionCode) request.promotionCode = promotionCode;
  return request;
}

export async function fetchQuote(
  request: QuoteRequest,
  signal?: AbortSignal,
  baseUrl: string = getApiBase()
): Promise<Quote> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/promotions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (e) {
    if (e instanceof TypeError) throw new Error("Không kết nối được máy chủ.");
    throw e;
  }
  if (!res.ok) throw new Error(`Không thể báo giá (mã lỗi ${res.status}).`);
  return (await res.json()) as Quote;
}
