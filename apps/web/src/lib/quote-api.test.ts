import { afterEach, describe, expect, it, vi } from "vitest";
import { addItem, type NewCartItem } from "./cart";
import { buildQuoteRequest, fetchQuote } from "./quote-api";

const base: NewCartItem = {
  productId: 7,
  name: "Hồng trà",
  imageUrl: null,
  basePrice: 30000,
  size: "L",
  toppings: ["pearl", "cream"],
  qty: 2,
};

afterEach(() => vi.unstubAllGlobals());

describe("buildQuoteRequest", () => {
  const items = addItem([], base).items;

  it("đổi size, giữ topping id do backend cấp, đổi qty thành quantity", () => {
    const req = buildQuoteRequest(items, null);
    expect(req.items[0]).toMatchObject({
      productId: 7,
      sizeId: 3,
      toppingIds: ["pearl", "cream"],
      quantity: 2,
    });
  });

  it("không gửi tên hay giá cơ bản", () => {
    const sent = JSON.stringify(buildQuoteRequest(items, null));
    expect(sent).not.toContain("Hồng trà");
    expect(sent).not.toContain("basePrice");
  });

  it("không gửi giá client có topping để tránh dùng giá catalog cũ", () => {
    expect(buildQuoteRequest(items, null).items[0]).not.toHaveProperty("clientUnitPrice");
  });

  it("chỉ thêm promotionCode khi có mã", () => {
    expect(buildQuoteRequest(items, null)).not.toHaveProperty("promotionCode");
    expect(buildQuoteRequest(items, "BREW2026").promotionCode).toBe("BREW2026");
  });
});

describe("fetchQuote", () => {
  const request = buildQuoteRequest(addItem([], base).items, null);

  it("gửi POST JSON tới /promotions/validate và trả về kết quả", async () => {
    const quote = { items: [], subtotal: 0, promotion: null, discount: 0, total: 0 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => quote });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchQuote(request, undefined, "http://api.test");

    expect(result).toEqual(quote);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/promotions/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("báo lỗi kèm mã trạng thái khi server trả lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(fetchQuote(request, undefined, "http://api.test")).rejects.toThrow("400");
  });

  it("báo lỗi dễ hiểu khi mất kết nối", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchQuote(request, undefined, "http://api.test")).rejects.toThrow(
      "Không kết nối được máy chủ."
    );
  });
});
