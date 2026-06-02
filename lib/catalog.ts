import "server-only";

import { cache } from "react";
import type { Product } from "@/lib/data/types";
import {
  fetchAllMedusaProducts,
  fetchMedusaProductByHandle,
} from "@/lib/medusa";
import { toProduct } from "@/lib/medusa-map";
import { matchesCurated } from "@/lib/curated-categories";

/**
 * Every product, mapped to the storefront domain model.
 * Wrapped in React cache() so the many callers in a single render (homepage
 * curated lists + counts, category filters) share ONE catalogue fetch.
 */
export const getAllProducts = cache(async (): Promise<Product[]> => {
  const medusa = await fetchAllMedusaProducts();
  return medusa.map(toProduct);
});

/** A single product by handle (slug), or null. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const m = await fetchMedusaProductByHandle(slug);
  return m ? toProduct(m) : null;
}

/** Products in a real Medusa category (matched by handle). */
export async function getProductsByCategory(handle: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.categories.some((c) => c.id === handle));
}

/** Products in a real Medusa collection (matched by handle). */
export async function getProductsByCollection(handle: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.collectionHandle === handle);
}

/** Products in an editorial "curated" category bucket (rule-based membership). */
export async function getProductsByCuratedCategory(id: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) =>
    matchesCurated(
      id,
      p.categories.map((c) => c.id),
      p.name,
    ),
  );
}

/** Live product count for each curated bucket id (for homepage tiles). */
export async function getCuratedCounts(ids: string[]): Promise<Record<string, number>> {
  const all = await getAllProducts();
  const counts: Record<string, number> = {};
  for (const id of ids) {
    counts[id] = all.filter((p) =>
      matchesCurated(
        id,
        p.categories.map((c) => c.id),
        p.name,
      ),
    ).length;
  }
  return counts;
}

/** Resolve an ordered list of SKUs to products, dropping any that are missing. */
export async function getProductsBySkus(skus: string[]): Promise<Product[]> {
  const bySku = new Map((await getAllProducts()).map((p) => [p.sku, p]));
  return skus.map((sku) => bySku.get(sku)).filter((p): p is Product => !!p);
}
