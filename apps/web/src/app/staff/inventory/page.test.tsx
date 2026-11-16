import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "@/lib/auth";
import {
  adjustIngredientStock,
  getIngredients,
  getInventoryProducts,
  restockIngredient,
  updateProductRecipe,
} from "@/lib/inventory-api";
import { getCurrentUser } from "@/lib/orders-api";
import {
  getToppings,
  updateToppingPortion,
} from "@/lib/toppings-api";
import StaffInventoryPage from "./page";

vi.mock("next/navigation", () => {
  const router = { replace: vi.fn() };
  return { useRouter: () => router };
});

vi.mock("@/lib/auth", () => ({ getToken: vi.fn() }));

vi.mock("@/lib/auth-context", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/orders-api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/inventory-api", () => ({
  adjustIngredientStock: vi.fn(),
  getIngredients: vi.fn(),
  getInventoryProducts: vi.fn(),
  restockIngredient: vi.fn(),
  updateProductRecipe: vi.fn(),
}));
vi.mock("@/lib/toppings-api", () => ({
  getToppings: vi.fn(),
  updateToppingPortion: vi.fn(),
}));

const ingredient = {
  id: 1,
  name: "Bột cà phê",
  unit: "g",
  stockQuantity: 100,
};
const topping = {
  id: "pearl",
  name: "Trân châu",
  price: 5000,
  amountPerPortion: 50,
  unit: "g",
  stockQuantity: 500,
  availableQuantity: 10,
};

const product = {
  id: 2,
  name: "Cà phê sữa",
  price: 35000,
  imageUrl: null,
  availableQuantityBySize: { S: 5, M: 4, L: 3 },
  recipeItems: [
    {
      ingredientId: ingredient.id,
      size: "S" as const,
      amountRequired: 20,
      ingredient,
    },
    {
      ingredientId: ingredient.id,
      size: "M" as const,
      amountRequired: 20,
      ingredient,
    },
    {
      ingredientId: ingredient.id,
      size: "L" as const,
      amountRequired: 20,
      ingredient,
    },
  ],
};

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("staff-token");
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 1,
    email: "staff@brewlite.local",
    role: "STAFF",
  });
  vi.mocked(getIngredients).mockResolvedValue([ingredient]);
  vi.mocked(getInventoryProducts).mockResolvedValue([product]);
  vi.mocked(adjustIngredientStock).mockResolvedValue({
    ...ingredient,
    stockQuantity: 40,
  });
  vi.mocked(getToppings).mockResolvedValue([topping]);
  vi.mocked(updateToppingPortion).mockResolvedValue({
    ...topping,
    amountPerPortion: 60,
    availableQuantity: 8,
  });
  vi.mocked(restockIngredient).mockResolvedValue({
    ...ingredient,
    stockQuantity: 150,
  });
  vi.mocked(updateProductRecipe).mockResolvedValue({ id: product.id });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("trang kho nguyên liệu", () => {
  it("nhập kho bằng lượng đã nhập và cập nhật tồn kho hiển thị", async () => {
    render(<StaffInventoryPage />);

    expect(await screen.findByText("100 g", { selector: "span" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Số lượng nhập thêm Bột cà phê"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nhập kho" }));

    expect(await screen.findByText("150 g", { selector: "span" })).toBeTruthy();
    expect(restockIngredient).toHaveBeenCalledWith(ingredient.id, 50);
    expect((await screen.findByRole("status")).textContent).toContain(
      "Đã nhập thêm 50 g Bột cà phê.",
    );
  });

  it("cho phép điều chỉnh âm tồn kho và cảnh báo đỏ khi còn ít", async () => {
    render(<StaffInventoryPage />);

    const stockBadge = await screen.findByText("100 g", { selector: "span" });
    expect(stockBadge.className).toContain("bg-yellow-100");
    fireEvent.change(
      screen.getByLabelText("Điều chỉnh tồn kho Bột cà phê"),
      { target: { value: "-60" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Cập nhật thực tế" }),
    );

    expect(adjustIngredientStock).toHaveBeenCalledWith(ingredient.id, -60);
    const lowStockBadge = await screen.findByText("40 g", { selector: "span" });
    expect(lowStockBadge.className).toContain("bg-red-100");
    expect((await screen.findByRole("status")).textContent).toContain(
      "Đã điều chỉnh tồn kho Bột cà phê -60 g.",
    );
  });

  it("lưu định lượng công thức dưới dạng số nguyên", async () => {
    render(<StaffInventoryPage />);

    const amountInput = await screen.findByLabelText(
      "Định lượng size M nguyên liệu 1 cho Cà phê sữa",
    );
    fireEvent.change(amountInput, { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu công thức" }));

    await waitFor(() => {
      expect(updateProductRecipe).toHaveBeenCalledWith(product.id, [
        { size: "S", ingredientId: ingredient.id, amountRequired: 20 },
        { size: "M", ingredientId: ingredient.id, amountRequired: 25 },
        { size: "L", ingredientId: ingredient.id, amountRequired: 20 },
      ]);
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "Đã cập nhật công thức cho Cà phê sữa.",
    );
  });

  it("cập nhật định lượng cho mỗi phần topping", async () => {
    render(<StaffInventoryPage />);

    fireEvent.change(
      await screen.findByLabelText("Định lượng mỗi phần Trân châu"),
      { target: { value: "60" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu định lượng" }));

    await waitFor(() => {
      expect(updateToppingPortion).toHaveBeenCalledWith("pearl", 60);
    });
    expect(await screen.findByText(/Có thể bán: 8 phần/)).toBeTruthy();
  });
});
