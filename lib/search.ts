import Fuse from "fuse.js";
import type { IFuseOptions, FuseResult } from "fuse.js";
import { PRODUCTS } from "@/lib/data/products";
import type { Product } from "@/lib/data/types";

export type SearchHit = {
  product: Product;
  score: number;
  matches: string[];
};

const fuseOptions: IFuseOptions<Product> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "name", weight: 0.45 },
    { name: "brand", weight: 0.18 },
    { name: "sku", weight: 0.15 },
    { name: "use", weight: 0.08 },
    { name: "shortDescription", weight: 0.07 },
    { name: "categories.name", weight: 0.07 },
  ],
};

// Single shared index across the app
let fuseInstance: Fuse<Product> | null = null;
function getFuse(): Fuse<Product> {
  if (!fuseInstance) fuseInstance = new Fuse(PRODUCTS, fuseOptions);
  return fuseInstance;
}

export function searchProducts(query: string, limit = 8): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const results: FuseResult<Product>[] = getFuse().search(q, { limit });
  return results.map((r) => ({
    product: r.item,
    score: r.score ?? 1,
    matches: (r.matches || []).flatMap((m) =>
      typeof m.value === "string" ? [m.value] : [],
    ),
  }));
}

export function totalProductCount(): number {
  return PRODUCTS.length;
}
