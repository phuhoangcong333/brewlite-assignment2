import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProduct } from "@/lib/api";
import { useToppings } from "@/lib/use-toppings";
import ProductDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/lib/api", () => ({ getProduct: vi.fn() }));
vi.mock("@/lib/use-toppings", () => ({ useToppings: vi.fn() }));

const toppingCatalog = [
  {
    id: "pearl",
    name: "Trân châu",
    price: 5000,
    amountPerPortion: 50,
    unit: "g",
    stockQuantity: 100,
    availableQuantity: 2,
  },
  {
    id: "cream",
    name: "Kem",
    price: 5000,
    amountPerPortion: 30,
    unit: "g",
    stockQuantity: 0,
    availableQuantity: 0,
  },
];

beforeEach(() => {
  vi.mocked(useToppings).mockReturnValue({
    toppings: toppingCatalog,
    loading: false,
    error: null,
  });
});

const productDetail = {
  id: 1,
  name: "Cà phê sữa",
  description: null,
  price: 35000,
  imageUrl: null,
  availableQuantityBySize: { S: 5, M: 2, L: 1 },
  sizes: [
    { id: 1, code: "S" as const, additionalPrice: 0 },
    { id: 2, code: "M" as const, additionalPrice: 5000 },
    { id: 3, code: "L" as const, additionalPrice: 10000 },
  ],
  toppings: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("trang chi tiết sản phẩm", () => {
  it("hiển thị và giới hạn số lượng theo số ly có thể pha", async () => {
    vi.mocked(getProduct).mockResolvedValue(productDetail);

    render(<ProductDetailPage />);

    expect(
      await screen.findByText("Có thể pha: 2 ly (Size M)"),
    ).toBeTruthy();

    const increaseButton = screen.getByRole("button", { name: "+" });

    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);

    expect(screen.getByText("2")).toBeTruthy();
    expect((increaseButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^L/ }));

    expect(screen.getByText("Có thể pha: 1 ly (Size L)")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("chặn mua món không thể pha", async () => {
    vi.mocked(getProduct).mockResolvedValue({
      ...productDetail,
      availableQuantityBySize: { S: 0, M: 0, L: 0 },
    });

    render(<ProductDetailPage />);

    expect(
      await screen.findByText("Hết hàng (Size M)"),
    ).toBeTruthy();

    expect(
      (screen.getByRole("button", { name: "Hết hàng" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("uses backend topping prices and disables toppings with no portions left", async () => {
    vi.mocked(getProduct).mockResolvedValue(productDetail);

    render(<ProductDetailPage />);

    const pearl = await screen.findByLabelText(/Trân châu/);
    const cream = screen.getByLabelText(/Kem/);
    expect((cream as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(pearl);
    expect(
      screen.getByRole("button", { name: "Thêm vào giỏ - 45.000đ" }),
    ).toBeTruthy();
  });
});
