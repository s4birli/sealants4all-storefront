import "server-only";

import type { Product } from "@/lib/data/types";
import { getAllProducts, getProductsBySkus } from "@/lib/catalog";
import { buildSearchIndex, searchWithIndex } from "@/lib/search";

/** How many products to inject into the model context per request. */
export const RETRIEVAL_LIMIT = 12;

export type Retrieval = {
  /** The products selected by the search, in rank order. */
  products: Product[];
  /** Compact one-line descriptions for the system context. */
  lines: string[];
  /** Quick SKU -> Product lookup over the retrieved set. */
  bySku: Map<string, Product>;
};

const STOCK_LABEL: Record<Product["stock"], string> = {
  in: "in stock",
  low: "low stock",
  out: "out of stock",
};

/** Trim a free-text field to a short, single-line snippet for the context. */
function snippet(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Format one retrieved product as a compact context line:
 *   SKU | name | brand | £price ex VAT | stock | short use
 * Price is omitted (shown as "POA") when the product has no public price.
 */
export function formatProductLine(p: Product): string {
  const price = p.priceAvailable ? `£${p.price.toFixed(2)} ex VAT` : "POA";
  const use = snippet(p.use || p.shortDescription || "");
  const parts = [p.sku, p.name, p.brand, price, STOCK_LABEL[p.stock]];
  if (use) parts.push(use);
  return parts.join(" | ");
}

/**
 * v1 retrieval (the cheap architecture): per request, build a Fuse index over
 * the full catalogue and pull the top {@link RETRIEVAL_LIMIT} hits for the
 * user's latest message. Only these products are injected into the model.
 *
 * If the query is empty (or nothing matches) we return an empty set rather than
 * stuffing the catalogue — the guardrails tell the model to hand off.
 */
export async function retrieveForQuery(query: string): Promise<Retrieval> {
  const products = await getAllProducts();
  const q = query.trim();
  if (!q) return { products: [], lines: [], bySku: new Map() };

  const index = buildSearchIndex(products);
  const hits = searchWithIndex(index, q, RETRIEVAL_LIMIT);
  const hitProducts = hits.map((h) => h.product);

  return {
    products: hitProducts,
    lines: hitProducts.map(formatProductLine),
    bySku: new Map(hitProducts.map((p) => [p.sku, p])),
  };
}

/**
 * Resolve a SKU to a Product for the get_quote tool. Prefer the already-loaded
 * retrieved set (no extra fetch); fall back to a catalogue lookup so a valid
 * SKU still resolves even if it fell outside the top hits. Returns null for an
 * unknown SKU — the tool reports that back to the model rather than inventing.
 */
export async function resolveSku(
  sku: string,
  retrieval: Retrieval,
): Promise<Product | null> {
  const key = sku.trim();
  if (!key) return null;
  const fromRetrieval = retrieval.bySku.get(key);
  if (fromRetrieval) return fromRetrieval;
  const [found] = await getProductsBySkus([key]);
  return found ?? null;
}
