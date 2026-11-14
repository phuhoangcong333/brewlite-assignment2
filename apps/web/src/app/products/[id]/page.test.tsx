import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProduct } from "@/lib/api";
import ProductDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href }, children),
}));

vi.mock("@/lib/api", () => ({ getProduct: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("trang chi tiết sản phẩm", () => {
  it("hiển thị và giới hạn số lượng theo số ly có thể pha", async () => {
    vi.mocked(getProduct).mockResolvedValue({
      id: 1,
      name: "Cà phê sữa",
      price: 35000,
      imageUrl: null,
      availableQuantity: 2,
    });

    render(<ProductDetailPage />);

    expect(await screen.findByText("Có thể pha: 2 ly")).toBeTruthy();
    const increaseButton = screen.getByRole("button", { name: "+" });
    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);

    expect(screen.getByText("2")).toBeTruthy();
    expect((increaseButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("chặn mua món không thể pha", async () => {
    vi.mocked(getProduct).mockResolvedValue({
      id: 1,
      name: "Cà phê sữa",
      price: 35000,
      imageUrl: null,
      availableQuantity: 0,
    });

    render(<ProductDetailPage />);

    expect(await screen.findAllByText("Hết hàng")).toHaveLength(2);
    expect(
      (screen.getByRole("button", { name: "Hết hàng" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
