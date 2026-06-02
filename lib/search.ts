import Fuse from "fuse.js";
import type { IFuseOptions, FuseResult } from "fuse.js";
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

/** Build a reusable Fuse index over a product list. */
export function buildSearchIndex(products: Product[]): Fuse<Product> {
  return new Fuse(products, fuseOptions);
}

/** Run a search against a prepared index. */
export function searchWithIndex(
  index: Fuse<Product>,
  query: string,
  limit = 8,
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const results: FuseResult<Product>[] = index.search(q, { limit });
  return results.map((r) => ({
    product: r.item,
    score: r.score ?? 1,
    matches: (r.matches || []).flatMap((m) =>
      typeof m.value === "string" ? [m.value] : [],
    ),
  }));
}
