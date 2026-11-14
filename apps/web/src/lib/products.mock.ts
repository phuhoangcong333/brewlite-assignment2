import type { Product } from "./types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Cà phê sữa",
    price: 35000,
    imageUrl: "/image/Picture1.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 2,
    name: "Americano",
    price: 40000,
    imageUrl: "/image/Picture2.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 3,
    name: "Cappuccino",
    price: 45000,
    imageUrl: "/image/Picture3.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 4,
    name: "Trà đào",
    price: 39000,
    imageUrl: "/image/Picture4.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 5,
    name: "Latte",
    price: 45000,
    imageUrl: "/image/Picture5.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 6,
    name: "Trà vải",
    price: 39000,
    imageUrl: "/image/Picture6.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 7,
    name: "Bạc xỉu",
    price: 38000,
    imageUrl: "/image/Picture7.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
  {
    id: 8,
    name: "Matcha latte",
    price: 49000,
    imageUrl: "/image/Picture8.png",
    availableQuantityBySize: { S: 50, M: 50, L: 50 },
  },
];
