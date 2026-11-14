import type { Size } from "./types";

export const SIZE_EXTRA: Record<Size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

export const TOPPINGS = [
  { id: "pearl", name: "Trân châu", price: 5000 },
  { id: "cream", name: "Kem", price: 5000 },
];

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
) {
  const selectedToppings = TOPPINGS.filter((topping) => {
    if (topping.id === "pearl") {
      return toppingIds.some((id) =>
        ["pearl", "TRAN_CHAU", "Trân châu"].includes(id),
      );
    }

    if (topping.id === "cream") {
      return toppingIds.some((id) =>
        ["cream", "KEM", "Kem"].includes(id),
      );
    }

    return false;
  }).map((topping) => ({
    additionalPrice: topping.price,
  }));

  return calculateUnitPrice(
    basePrice,
    SIZE_EXTRA[size],
    selectedToppings,
  );
}

export const formatVND = (amount: number) =>
  amount.toLocaleString("vi-VN") + "đ";