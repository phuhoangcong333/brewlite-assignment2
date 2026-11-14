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
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
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
      availableQuantityBySize: { S: 5, M: 2, L: 1 },
    });

    render(<ProductDetailPage />);

    expect(await screen.findByText("Có thể pha: 2 ly (Size M)")).toBeTruthy();
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
      id: 1,
      name: "Cà phê sữa",
      price: 35000,
      imageUrl: null,
      availableQuantityBySize: { S: 0, M: 0, L: 0 },
    });

    render(<ProductDetailPage />);

    expect(await screen.findAllByText("Hết hàng (Size M)")).toHaveLength(1);
    expect(
      (screen.getByRole("button", { name: "Hết hàng" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
