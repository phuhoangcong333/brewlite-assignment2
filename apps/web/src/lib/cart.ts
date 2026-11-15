"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calcUnitPrice } from "./pricing";
import type { Size } from "./types";

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;

const SIZES: readonly Size[] = ["S", "M", "L"];

export type CartItem = {
  key: string;
  productId: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  size: Size;
  sizeId?: number;
  toppings: string[];
  qty: number;
  toppingIds?: number[];
  clientUnitPrice?: number;
  note?: string;
};

export type NewCartItem = Omit<CartItem, "key">;

export type CartResult = { ok: true } | { ok: false; error: string };

const makeKey = (i: NewCartItem) => {
  const toppingKey =
    i.toppingIds && i.toppingIds.length > 0
      ? [...i.toppingIds].sort((a, b) => a - b).join(",")
      : [...i.toppings].sort().join(",");

  return `${i.productId}|${i.sizeId ?? i.size}|${toppingKey}|${i.note?.trim() ?? ""}`;
};

/* ---------- Hàm thuần (dễ test, không phụ thuộc store) ---------- */

export function addItem(
  items: CartItem[],
  item: NewCartItem
): { items: CartItem[]; error: string | null } {
  if (!Number.isInteger(item.qty) || item.qty < 1) {
    return { items, error: "Số lượng phải từ 1 trở lên." };
  }
  const key = makeKey(item);
  const existing = items.find((i) => i.key === key);
  if (existing) {
    const qty = existing.qty + item.qty;
    if (qty > MAX_QTY_PER_LINE) {
      return { items, error: `Mỗi món tối đa ${MAX_QTY_PER_LINE} ly.` };
    }
    return {
      items: items.map((i) => (i.key === key ? { ...i, qty } : i)),
      error: null,
    };
  }
  if (item.qty > MAX_QTY_PER_LINE) {
    return { items, error: `Mỗi món tối đa ${MAX_QTY_PER_LINE} ly.` };
  }
  if (items.length >= MAX_LINES) {
    return { items, error: `Giỏ hàng tối đa ${MAX_LINES} món khác nhau.` };
  }
  return { items: [...items, { ...item, key }], error: null };
}

export function setItemQty(items: CartItem[], key: string, qty: number): CartItem[] {
  if (!Number.isFinite(qty)) return items;
  if (qty <= 0) return items.filter((i) => i.key !== key);
  const next = Math.min(Math.floor(qty), MAX_QTY_PER_LINE);
  return items.map((i) => (i.key === key ? { ...i, qty: next } : i));
}

export function removeItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((i) => i.key !== key);
}

function isNewCartItem(r: unknown): r is NewCartItem {
  if (typeof r !== "object" || r === null) return false;
  const o = r as Record<string, unknown>;
  return (
    Number.isInteger(o.productId) &&
    (o.productId as number) > 0 &&
    typeof o.name === "string" &&
    (o.imageUrl === null || typeof o.imageUrl === "string") &&
    typeof o.basePrice === "number" &&
    Number.isFinite(o.basePrice) &&
    o.basePrice >= 0 &&
    SIZES.includes(o.size as Size) &&
    Array.isArray(o.toppings) &&
    o.toppings.every((t) => typeof t === "string") &&
    Number.isInteger(o.qty) &&
    (o.qty as number) >= 1
  );
}

/** Làm sạch dữ liệu đọc từ localStorage: bỏ dòng hỏng, gộp trùng, ép số lượng về giới hạn. */
export function sanitizeItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CartItem[] = [];
  for (const r of raw) {
    if (out.length >= MAX_LINES) break;
    if (!isNewCartItem(r)) continue;
    const key = makeKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      productId: r.productId,
      name: r.name,
      imageUrl: r.imageUrl,
      basePrice: r.basePrice,
      size: r.size,
      sizeId: Number.isInteger(r.sizeId) ? r.sizeId : undefined,
      toppings: [...r.toppings],
      toppingIds: Array.isArray(r.toppingIds)
        ? r.toppingIds.filter((id): id is number => Number.isInteger(id))
        : undefined,
      clientUnitPrice:
        typeof r.clientUnitPrice === "number" &&
        Number.isFinite(r.clientUnitPrice)
          ? r.clientUnitPrice
          : undefined,
      note: typeof r.note === "string" ? r.note : undefined,
      qty: Math.min(r.qty, MAX_QTY_PER_LINE),
    });
  }
  return out;
}

/** Cùng quy tắc chuẩn hóa với server: viết hoa, bỏ khoảng trắng. */
export function sanitizePromotionCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/\s+/g, "").toUpperCase().slice(0, 50);
  return code || null;
}

/* ---------- Store ---------- */

type CartState = {
  items: CartItem[];
  promotionCode: string | null;
  /** Lý do mã bị gỡ (không lưu vào localStorage). */
  promoNotice: string | null;
  add: (item: NewCartItem) => CartResult;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setPromotionCode: (code: string | null) => void;
  rejectPromotion: (message: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promotionCode: null,
      promoNotice: null,
      add: (item) => {
        const { items, error } = addItem(get().items, item);
        if (error) return { ok: false, error };
        set({ items });
        return { ok: true };
      },
      setQty: (key, qty) => set((s) => ({ items: setItemQty(s.items, key, qty) })),
      remove: (key) => set((s) => ({ items: removeItem(s.items, key) })),
      clear: () => set({ items: [], promotionCode: null, promoNotice: null }),
      setPromotionCode: (code) =>
        set({ promotionCode: sanitizePromotionCode(code), promoNotice: null }),
      rejectPromotion: (message) => set({ promotionCode: null, promoNotice: message }),
    }),
    {
      name: "brewlite-cart",
      version: 3,
      partialize: (s) => ({ items: s.items, promotionCode: s.promotionCode }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { items?: unknown; promotionCode?: unknown };
        return {
          ...current,
          items: sanitizeItems(p.items),
          promotionCode: sanitizePromotionCode(p.promotionCode),
        };
      },
    }
  )
);

/* Giá ước tính phía client, chỉ để gửi `clientUnitPrice`. Giá hiển thị lấy từ server. */
export const unitPriceOf = (i: CartItem) =>
  i.clientUnitPrice ??
  calcUnitPrice(i.basePrice, i.size, i.toppings);
export const lineTotalOf = (i: CartItem) => unitPriceOf(i) * i.qty;
export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + lineTotalOf(i), 0);
export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.qty, 0);

const subscribeNothing = () => () => {};

/** true sau khi trang đã chạy trên trình duyệt (tránh lệch dữ liệu giữa server và client). */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}
