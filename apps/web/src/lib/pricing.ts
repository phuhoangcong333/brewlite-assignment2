import type { Size } from "./types";

export const SIZE_EXTRA: Record<Size, number> = { S: 0, M: 5000, L: 10000 };

type ToppingPrice = { id: string; price: number };

export function calcUnitPrice(
  basePrice: number,
  size: Size,
  toppingIds: string[],
  toppings: readonly ToppingPrice[] = [],
) {
  const toppingPriceById = new Map(toppings.map((topping) => [topping.id, topping.price]));
  const toppingTotal = toppingIds.reduce(
    (sum, id) => sum + (toppingPriceById.get(id) ?? 0),
    0,
  );
  return basePrice + SIZE_EXTRA[size] + toppingTotal;
}

export const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";