"use client";
 
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calcUnitPrice } from "./pricing";
import type { Size } from "./types";
 
export type CartItem = {
  key: string;
  productId: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  size: Size;
  toppings: string[];
  qty: number;
};
 
export type NewCartItem = Omit<CartItem, "key">;
 
type CartState = {
  items: CartItem[];
  add: (item: NewCartItem) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};
 
const makeKey = (i: NewCartItem) =>
  `${i.productId}|${i.size}|${[...i.toppings].sort().join(",")}`;
 
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const key = makeKey(item);
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, qty: i.qty + item.qty } : i
              ),
            };
          }
          return { items: [...s.items, { ...item, key }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, qty } : i)),
        })),
      remove: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: "brewlite-cart" }
  )
);
 
export const unitPriceOf = (i: CartItem) =>
  calcUnitPrice(i.basePrice, i.size, i.toppings);
export const lineTotalOf = (i: CartItem) => unitPriceOf(i) * i.qty;
export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + lineTotalOf(i), 0);
export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.qty, 0);
 
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
 