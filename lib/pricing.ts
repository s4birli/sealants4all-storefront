import type { Tier } from "@/lib/data/types";

/**
 * Bulk-tier multipliers applied to a product's unit price. These reproduce the
 * tiers that the original static catalogue baked in, so the storefront keeps
 * its bulk-pricing UI without storing tiers in Medusa.
 */
const TIER_RULES: ReadonlyArray<readonly [min: number, multiplier: number]> = [
  [1, 1],
  [12, 0.95],
  [24, 0.88],
  [100, 0.82],
  [500, 0.75],
];

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function deriveTiers(basePrice: number): Tier[] {
  if (!basePrice || basePrice <= 0) return [{ min: 1, price: 0 }];
  return TIER_RULES.map(([min, multiplier]) => ({
    min,
    price: round2(basePrice * multiplier),
  }));
}
