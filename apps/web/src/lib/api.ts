import type { Product } from "./types";
import { MOCK_PRODUCTS } from "./products.mock";
import { apiRequest, ApiError, USE_MOCK_DATA } from "./api-client";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getProducts(): Promise<Product[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return MOCK_PRODUCTS;
  }
  return apiRequest<Product[]>("/products");
}

export async function getProduct(id: number): Promise<Product | null> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
  }
  try {
    return await apiRequest<Product>(`/products/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}