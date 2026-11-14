export type Size = "S" | "M" | "L";

export type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  availableQuantity: number;
};