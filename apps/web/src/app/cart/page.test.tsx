import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCart, type CartItem } from "@/lib/cart";
import type { Quote, QuoteItem } from "@/lib/quote-types";
import { useQuote } from "@/lib/use-quote";
import CartPage from "./page";

vi.mock("@/lib/use-quote", () => ({ useQuote: vi.fn() }));

const cartItem: CartItem = {
  key: "1|M|pearl",
  productId: 1,
  name: "Trà sữa trân châu",
  imageUrl: null,
  basePrice: 45000,
  size: "M",
  toppings: ["pearl"],
  qty: 2,
};

const quoteItem = (over: Partial<QuoteItem> = {}): QuoteItem => ({
  productId: 1,
  productName: "Trà sữa trân châu",
  imageUrl: null,
  sizeId: 2,
  toppingIds: [1],
  quantity: 2,
  status: "AVAILABLE",
  unavailableToppingIds: [],
  unitPrice: 56000,
  lineTotal: 112000,
  priceChanged: false,
  ...over,
});

const quote = (over: Partial<Quote> = {}): Quote => ({
  items: [quoteItem()],
  subtotal: 112000,
  promotion: null,
  discount: 0,
  total: 112000,
  ...over,
});

const mockQuote = (state: Partial<ReturnType<typeof useQuote>>) =>
  vi.mocked(useQuote).mockReturnValue({
    quote: null,
    error: null,
    loading: false,
    retry: vi.fn(),
    ...state,
  });

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [cartItem], promotionCode: null, promoNotice: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("trang giỏ hàng", () => {
  it("giỏ rỗng thì báo trống", () => {
    useCart.setState({ items: [] });
    mockQuote({});
    render(<CartPage />);
    expect(screen.getByText("Giỏ hàng đang trống.")).toBeTruthy();
  });

  it("hiển thị giá do server tính và cho thanh toán", () => {
    mockQuote({ quote: quote() });
    render(<CartPage />);
    expect(screen.getAllByText(/112\.000/).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: "Tiến hành thanh toán" });
    expect(link.getAttribute("href")).toBe("/checkout");
  });

  it("món hết hàng thì báo lỗi và chặn thanh toán", () => {
    mockQuote({
      quote: quote({
        items: [quoteItem({ status: "OUT_OF_STOCK", lineTotal: 0 })],
        subtotal: 0,
        total: 0,
      }),
    });
    render(<CartPage />);
    expect(screen.getByText(/đã hết hoặc không đủ số lượng/)).toBeTruthy();
    const button = screen.getByRole("button", { name: "Tiến hành thanh toán" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("đang tải giá thì chặn thanh toán", () => {
    mockQuote({ loading: true });
    render(<CartPage />);
    expect(screen.getByText(/Đang tính giá/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Tiến hành thanh toán" })).toBeNull();
  });

  it("lỗi mạng thì hiện lỗi và nút thử lại", () => {
    const retry = vi.fn();
    mockQuote({ error: "Không kết nối được máy chủ.", retry });
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("hiện số tiền giảm khi mã hợp lệ", () => {
    useCart.setState({ promotionCode: "BREW2026" });
    mockQuote({
      quote: quote({
        promotion: { code: "BREW2026", valid: true, discountAmount: 11200, reason: null, message: null },
        discount: 11200,
        total: 100800,
      }),
    });
    render(<CartPage />);
    expect(screen.getAllByText(/11\.200/).length).toBeGreaterThan(0);
    expect(screen.getByText(/100\.800/)).toBeTruthy();
  });

  it("mã bị từ chối thì tự gỡ và hiện lý do", () => {
    useCart.setState({ promotionCode: "SAI" });
    mockQuote({
      quote: quote({
        promotion: {
          code: "SAI",
          valid: false,
          discountAmount: 0,
          reason: "PROMO_NOT_FOUND",
          message: "Mã khuyến mãi không tồn tại.",
        },
      }),
    });
    render(<CartPage />);
    expect(useCart.getState().promotionCode).toBeNull();
    expect(screen.getByText("Mã khuyến mãi không tồn tại.")).toBeTruthy();
  });

  it("nhập mã rồi bấm Áp dụng thì lưu mã đã chuẩn hóa", () => {
    mockQuote({ quote: quote() });
    render(<CartPage />);
    fireEvent.change(screen.getByLabelText("Mã khuyến mãi"), { target: { value: "brew2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(useCart.getState().promotionCode).toBe("BREW2026");
  });

  it("Xóa tất cả cần xác nhận", () => {
    mockQuote({ quote: quote() });
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả" }));
    expect(useCart.getState().items).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    expect(useCart.getState().items).toHaveLength(0);
  });

  it("nút tăng bị khóa khi đạt giới hạn số lượng", () => {
    useCart.setState({ items: [{ ...cartItem, qty: 10 }] });
    mockQuote({ quote: quote() });
    render(<CartPage />);
    const plus = screen.getByRole("button", { name: "Tăng số lượng Trà sữa trân châu" });
    expect((plus as HTMLButtonElement).disabled).toBe(true);
  });
});
