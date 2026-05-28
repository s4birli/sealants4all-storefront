"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { PRODUCT_BY_SKU } from "@/lib/data/products";
import { tierForQty } from "@/lib/fmt";

export type CartItem = { sku: string; qty: number };

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (sku: string, qty?: number) => void;
  update: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (sku, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.sku === sku);
          if (idx >= 0) {
            const next = [...state.items];
            next[idx] = { ...next[idx], qty: next[idx].qty + qty };
            return { items: next };
          }
          return { items: [...state.items, { sku, qty }] };
        }),
      update: (sku, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.sku === sku ? { ...i, qty: Math.max(0, qty) } : i))
            .filter((i) => i.qty > 0),
        })),
      remove: (sku) =>
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      clear: () => set({ items: [] }),
      setOpen: (v) => set({ open: v }),
    }),
    {
      name: "s4a-v2:cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export type CartTotals = {
  units: number;
  sub: number;
  vat: number;
  total: number;
  savings: number;
};

export function computeTotals(items: CartItem[]): CartTotals {
  let units = 0;
  let sub = 0;
  let savings = 0;
  for (const it of items) {
    const p = PRODUCT_BY_SKU.get(it.sku);
    if (!p) continue;
    const t = tierForQty(p.tiers, it.qty);
    sub += t.price * it.qty;
    savings += (p.tiers[0].price - t.price) * it.qty;
    units += it.qty;
  }
  const vat = sub * 0.2;
  return { units, sub, vat, total: sub + vat, savings };
}

export function useCartTotals(): CartTotals {
  return useCart(useShallow((s) => computeTotals(s.items)));
}

export function useCartCount(): number {
  return useCart((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
}
