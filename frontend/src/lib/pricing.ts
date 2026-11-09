import type { Size } from "./types";

export const SIZE_EXTRA: Record<Size, number> = { S: 0, M: 5000, L: 10000 };

export const TOPPINGS = [
  { id: "pearl", name: "Trân châu", price: 5000 },
  { id: "cream", name: "Kem", price: 5000 },
];

export function calcUnitPrice(
  basePrice: number,
  size: Size,
  toppingIds: string[]
) {
  const toppingTotal = TOPPINGS.filter((t) => toppingIds.includes(t.id)).reduce(
    (sum, t) => sum + t.price,
    0
  );
  return basePrice + SIZE_EXTRA[size] + toppingTotal;
}

export const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";