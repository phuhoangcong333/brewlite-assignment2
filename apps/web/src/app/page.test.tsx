import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MenuPage from "./page";
import { getProducts } from "@/lib/api";
import type { Product } from "@/lib/types";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock("@/lib/api", () => ({
  getProducts: vi.fn(),
}));

const sampleProducts = [
  {
    id: 1,
    name: "Cà phê sữa",
    price: 29000,
    category: "COFFEE",
    imageUrl: null,
    stock: 8,
    availableQuantity: 8,
  },
  {
    id: 9,
    name: "Trà dâu tằm",
    price: 42000,
    category: "FRUIT_TEA",
    imageUrl: null,
    stock: 0,
    availableQuantity: 0,
  },
] as unknown as Product[];

describe("Task 4.3 - MenuPage Component Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access_token", "valid-test-token");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("hiển thị trạng thái loading, sau đó render danh sách món và trạng thái hết hàng", async () => {
    vi.mocked(getProducts).mockResolvedValueOnce(sampleProducts);

    render(<MenuPage />);

    expect(screen.getByText("Đang tải menu...")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Cà phê sữa")).toBeTruthy();
      expect(screen.getByText("Trà dâu tằm")).toBeTruthy();
    });

    expect(screen.getByText("Có thể pha: 8 ly")).toBeTruthy();

    const outOfStockBtn = screen.getByRole("button", { name: "Hết hàng" });
    expect((outOfStockBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("gọi lại API lọc theo danh mục khi người dùng bấm chọn tab danh mục", async () => {
    vi.mocked(getProducts).mockResolvedValue(sampleProducts);

    render(<MenuPage />);

    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledWith("ALL");
    });

    fireEvent.click(screen.getByRole("button", { name: "Cà phê" }));

    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledWith("COFFEE");
    });
  });

  it("hiển thị trạng thái empty khi không có món nào", async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([]);

    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText("Hiện chưa có sản phẩm nào.")).toBeTruthy();
    });
  });

  it("hiển thị trạng thái error khi gọi API thất bại", async () => {
    vi.mocked(getProducts).mockRejectedValueOnce(new Error("Lỗi kết nối server"));

    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText("Lỗi kết nối server")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
    });
  });
});