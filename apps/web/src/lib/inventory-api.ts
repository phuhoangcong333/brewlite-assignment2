import { apiRequest } from "./api-client";
import type { Product } from "./types";

export type InventoryIngredient = {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
};

export type RecipeItem = {
  ingredientId: number;
  amountRequired: number;
  ingredient: InventoryIngredient;
};

export type InventoryProduct = Product & {
  recipeItems: RecipeItem[];
};

export type RecipeItemInput = {
  ingredientId: number;
  amountRequired: number;
};

export function getIngredients(): Promise<InventoryIngredient[]> {
  return apiRequest<InventoryIngredient[]>("/ingredients");
}

export function getInventoryProducts(): Promise<InventoryProduct[]> {
  return apiRequest<InventoryProduct[]>("/products");
}

export function restockIngredient(
  ingredientId: number,
  amount: number,
): Promise<InventoryIngredient> {
  return apiRequest<InventoryIngredient>(
    `/ingredients/${ingredientId}/restock`,
    {
      method: "PATCH",
      body: JSON.stringify({ amount }),
    },
  );
}

export function updateProductRecipe(
  productId: number,
  items: RecipeItemInput[],
): Promise<{ id: number }> {
  return apiRequest<{ id: number }>(
    `/ingredients/recipes/${productId}`,
    {
      method: "PUT",
      body: JSON.stringify({ items }),
    },
  );
}
