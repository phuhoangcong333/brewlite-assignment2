import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import {
  getIngredients,
  getInventoryProducts,
  restockIngredient,
  updateProductRecipe,
} from "./inventory-api";

vi.mock("./api-client", () => ({ apiRequest: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("inventory API", () => {
  it("loads ingredients and products from their collection endpoints", () => {
    void getIngredients();
    void getInventoryProducts();

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/ingredients");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/products");
  });

  it("restocks an ingredient through PATCH with the amount field", () => {
    void restockIngredient(7, 250);

    expect(apiRequest).toHaveBeenCalledWith("/ingredients/7/restock", {
      method: "PATCH",
      body: JSON.stringify({ amount: 250 }),
    });
  });

  it("updates a product recipe through PUT with the items payload", () => {
    const items = [{ size: "M" as const, ingredientId: 7, amountRequired: 20 }];
    void updateProductRecipe(4, items);

    expect(apiRequest).toHaveBeenCalledWith("/ingredients/recipes/4", {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  });
});
