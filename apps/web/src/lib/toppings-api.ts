import { apiRequest } from "./api-client";

export type Topping = {
  id: string;
  name: string;
  price: number;
  amountPerPortion: number;
  unit: string;
  stockQuantity: number;
  availableQuantity: number;
};

export function getToppings(): Promise<Topping[]> {
  return apiRequest<Topping[]>("/toppings");
}

export function updateToppingPortion(
  id: string,
  amountPerPortion: number,
): Promise<Topping> {
  return apiRequest<Topping>(`/toppings/${encodeURIComponent(id)}/portion`, {
    method: "PATCH",
    body: JSON.stringify({ amountPerPortion }),
  });
}
