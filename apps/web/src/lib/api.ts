import type { Product } from "./types";
import { MOCK_PRODUCTS } from "./products.mock";
import { apiRequest, ApiError, USE_MOCK_DATA } from "./api-client";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getProducts(category?: string): Promise<Product[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    if (category && category !== "ALL") {
      return MOCK_PRODUCTS.filter(
        (p) => (p as Product & { category?: string }).category === category,
      );
    }
    return MOCK_PRODUCTS;
  }

  const path =
    category && category !== "ALL"
      ? `/products?category=${encodeURIComponent(category)}`
      : "/products";

  return apiRequest<Product[]>(path);
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