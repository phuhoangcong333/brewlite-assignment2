import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_LINES,
  MAX_QTY_PER_LINE,
  addItem,
  cartCount,
  cartSubtotal,
  lineTotalOf,
  removeItem,
  sanitizeItems,
  sanitizePromotionCode,
  setItemQty,
  unitPriceOf,
  useCart,
  type CartItem,
  type NewCartItem,
} from "./cart";

const item = (over: Partial<NewCartItem> = {}): NewCartItem => ({
  productId: 1,
  name: "Trà sữa trân châu",
  imageUrl: null,
  basePrice: 45000,
  size: "M",
  toppings: [],
  qty: 1,
  ...over,
});

const lines = (n: number): CartItem[] => {
  let items: CartItem[] = [];

  for (let productId = 1; productId <= n; productId++) {
    items = addItem(items, item({ productId })).items;
  }

  return items;
};

describe("addItem", () => {
  it("thêm dòng mới kèm key", () => {
    const { items, error } = addItem([], item());

    expect(error).toBeNull();
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe("1|M||");
  });

  it("gộp cùng món, size, topping dù khác thứ tự topping", () => {
    let items = addItem(
      [],
      item({ toppings: ["pearl", "cream"] }),
    ).items;

    items = addItem(
      items,
      item({ toppings: ["cream", "pearl"] }),
    ).items;

    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });

  it("khác size thì thành dòng riêng", () => {
    let items = addItem([], item({ size: "M" })).items;
    items = addItem(items, item({ size: "L" })).items;

    expect(items).toHaveLength(2);
  });

  it("ghi chú khác nhau là hai dòng riêng", () => {
    let items = addItem([], item({ note: "Ít đá" })).items;
    items = addItem(items, item({ note: "Ít ngọt" })).items;

    expect(items).toHaveLength(2);
  });

  it("từ chối khi gộp vượt giới hạn số lượng mỗi dòng", () => {
    const start = addItem([], item({ qty: MAX_QTY_PER_LINE })).items;
    const { items, error } = addItem(start, item());

    expect(error).toMatch(/tối đa/);
    expect(items).toBe(start);
  });

  it("từ chối dòng thứ 21", () => {
    const full = lines(MAX_LINES);
    const { items, error } = addItem(full, item({ productId: 999 }));

    expect(full).toHaveLength(MAX_LINES);
    expect(error).toMatch(/tối đa/);
    expect(items).toBe(full);
  });

  it("từ chối số lượng không hợp lệ", () => {
    expect(addItem([], item({ qty: 0 })).error).not.toBeNull();
    expect(addItem([], item({ qty: 1.5 })).error).not.toBeNull();
    expect(
      addItem([], item({ qty: MAX_QTY_PER_LINE + 1 })).error,
    ).not.toBeNull();
  });
});

describe("setItemQty và removeItem", () => {
  const base = addItem([], item({ qty: 2 })).items;
  const key = base[0].key;

  it("đổi số lượng", () => {
    expect(setItemQty(base, key, 5)[0].qty).toBe(5);
  });

  it("số lượng 0 hoặc âm thì xóa dòng", () => {
    expect(setItemQty(base, key, 0)).toEqual([]);
    expect(setItemQty(base, key, -1)).toEqual([]);
  });

  it("ép về giới hạn tối đa", () => {
    expect(setItemQty(base, key, 99)[0].qty).toBe(MAX_QTY_PER_LINE);
  });

  it("bỏ qua giá trị không phải số", () => {
    expect(setItemQty(base, key, Number.NaN)).toBe(base);
  });

  it("removeItem xóa đúng dòng", () => {
    expect(removeItem(base, key)).toEqual([]);
    expect(removeItem(base, "khong-co")).toHaveLength(1);
  });
});

describe("tính tiền ước tính", () => {
  it("đơn giá = giá gốc + size + topping", () => {
    const [cartItem] = addItem(
      [],
      item({ size: "M", toppings: ["pearl"], qty: 2 }),
    ).items;

    expect(unitPriceOf(cartItem)).toBe(45000 + 5000 + 5000);
    expect(lineTotalOf(cartItem)).toBe(110000);
  });

  it("tạm tính và tổng số ly", () => {
    let items = addItem([], item({ size: "S", qty: 2 })).items;

    items = addItem(
      items,
      item({ productId: 2, basePrice: 30000, size: "S", qty: 1 }),
    ).items;

    expect(cartSubtotal(items)).toBe(45000 * 2 + 30000);
    expect(cartCount(items)).toBe(3);
  });
});

describe("sanitizeItems", () => {
  it("không phải mảng thì trả về rỗng", () => {
    expect(sanitizeItems(null)).toEqual([]);
    expect(sanitizeItems({})).toEqual([]);
  });

  it("bỏ dòng hỏng, giữ dòng đúng", () => {
    const good = { ...item(), key: "x" };

    const out = sanitizeItems([
      good,
      { ...good, productId: "abc" },
      { ...good, size: "XL" },
      { ...good, toppings: [1] },
      null,
      "rác",
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("1|M||");
  });

  it("gộp dòng trùng và ép số lượng về giới hạn", () => {
    const out = sanitizeItems([
      { ...item({ qty: 50 }), key: "a" },
      { ...item({ qty: 1 }), key: "b" },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].qty).toBe(MAX_QTY_PER_LINE);
  });
});

describe("sanitizePromotionCode", () => {
  it("viết hoa và bỏ khoảng trắng", () => {
    expect(sanitizePromotionCode("  brew 2026 ")).toBe("BREW2026");
  });

  it("rỗng hoặc sai kiểu thì null", () => {
    expect(sanitizePromotionCode("   ")).toBeNull();
    expect(sanitizePromotionCode(123)).toBeNull();
  });
});

describe("store useCart", () => {
  beforeEach(() => {
    localStorage.clear();
    useCart.setState({
      items: [],
      promotionCode: null,
      promoNotice: null,
    });
  });

  it("add trả về lỗi khi vượt giới hạn và không đổi giỏ", () => {
    useCart.getState().add(item({ qty: MAX_QTY_PER_LINE }));

    const result = useCart.getState().add(item());

    expect(result.ok).toBe(false);
    expect(useCart.getState().items[0].qty).toBe(MAX_QTY_PER_LINE);
  });

  it("setPromotionCode chuẩn hóa mã và xóa thông báo cũ", () => {
    useCart.setState({ promoNotice: "cũ" });

    useCart.getState().setPromotionCode(" brew2026 ");

    expect(useCart.getState().promotionCode).toBe("BREW2026");
    expect(useCart.getState().promoNotice).toBeNull();
  });

  it("rejectPromotion gỡ mã và giữ lý do", () => {
    useCart.getState().setPromotionCode("SAI");
    useCart.getState().rejectPromotion("Mã đã hết hạn.");

    expect(useCart.getState().promotionCode).toBeNull();
    expect(useCart.getState().promoNotice).toBe("Mã đã hết hạn.");
  });

  it("clear xóa cả giỏ lẫn mã", () => {
    useCart.getState().add(item());
    useCart.getState().setPromotionCode("ABC");

    useCart.getState().clear();

    expect(useCart.getState().items).toEqual([]);
    expect(useCart.getState().promotionCode).toBeNull();
  });
});