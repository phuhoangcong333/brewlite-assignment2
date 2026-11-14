export type Size = "S" | "M" | "L";

export type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  availableQuantityBySize: Record<Size, number>;
};

export type ProductSizeOption = {
  id: number;
  code: Size;
  additionalPrice: number;
};

export type ProductToppingOption = {
  id: number;
  code: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
};

export type ProductDetail = Product & {
  description: string | null;
  sizes: ProductSizeOption[];
  toppings: ProductToppingOption[];
};
