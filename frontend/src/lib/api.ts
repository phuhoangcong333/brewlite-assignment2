import type { Product } from "./types";
import { MOCK_PRODUCTS } from "./products.mock";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const USE_MOCK = false;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getProducts(): Promise<Product[]> {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_PRODUCTS;
  }
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error("Không tải được menu");
  return res.json();
}

export async function getProduct(id: number): Promise<Product | null> {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
  }
  const res = await fetch(`${API_URL}/products/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Không tải được sản phẩm");
  return res.json();
}