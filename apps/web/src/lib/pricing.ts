import type { Size } from "./types";

export const SIZE_EXTRA: Record<Size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

type ToppingPrice = { id: string; price: number };

export function calculateUnitPrice(
  basePrice: number,
  sizeAdditionalPrice: number,
  toppings: readonly { additionalPrice: number }[],
) {
  return (
    basePrice +
    sizeAdditionalPrice +
    toppings.reduce(
      (total, topping) => total + topping.additionalPrice,
      0,
    )
  );
}


export function calcUnitPrice(
  basePrice: number,
  size: Size,
  toppingIds: string[],
  toppings: readonly ToppingPrice[] = [],
) {
  const toppingPriceById = new Map(toppings.map((topping) => [topping.id, topping.price]));
  return calculateUnitPrice(
    basePrice,
    SIZE_EXTRA[size],
    toppingIds.map((id) => ({
      additionalPrice: toppingPriceById.get(id) ?? 0,
    })),
  );
}

export const formatVND = (amount: number) =>
  amount.toLocaleString("vi-VN") + "đ";