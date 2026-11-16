import type { Product, ProductDetail, Size } from './types';
import { SIZE_EXTRA } from './pricing';
import { SIZE_IDS } from './catalog-ids';
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

export async function getProduct(id: number): Promise<ProductDetail | null> {
  if (USE_MOCK_DATA) {
    await delay(300);

    const product = MOCK_PRODUCTS.find((item) => item.id === id);
    if (!product) return null;

    return {
      ...product,
      description: null,
      sizes: (['S', 'M', 'L'] as Size[]).map((code) => ({
        id: SIZE_IDS[code],
        code,
        additionalPrice: SIZE_EXTRA[code],
      })),
      toppings: [],
    };
  }

  try {
    return await apiRequest<ProductDetail>(`/products/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}