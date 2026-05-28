import type { Tier } from "@/lib/data/types";

export const plain2 = (n: number): string =>
  Number(n || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const gbp = (n: number): string => `£${plain2(n)}`;

export const tierForQty = (tiers: Tier[], qty: number): Tier => {
  let cur = tiers[0];
  for (const t of tiers) if (qty >= t.min) cur = t;
  return cur;
};
