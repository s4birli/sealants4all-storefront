"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type Fuse from "fuse.js";
import type { Product } from "@/lib/data/types";
import { buildSearchIndex, searchWithIndex, type SearchHit } from "@/lib/search";

type CatalogSearchValue = {
  ready: boolean;
  count: number;
  search: (query: string, limit?: number) => SearchHit[];
  /** Resolve a SKU to its product from the warmed catalogue (or null). */
  getBySku: (sku: string) => Product | null;
};

const CatalogSearchContext = createContext<CatalogSearchValue | null>(null);

/**
 * Fetches the live catalogue once and exposes client-side fuzzy search. Used by
 * the global header search box and the /search results page.
 */
export function CatalogSearchProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const indexRef = useRef<Fuse<Product> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        if (!cancelled) setProducts(data.products || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CatalogSearchValue>(() => {
    indexRef.current = products.length ? buildSearchIndex(products) : null;
    const bySku = new Map(products.map((p) => [p.sku, p]));
    return {
      ready: products.length > 0,
      count: products.length,
      search: (query: string, limit = 8) =>
        indexRef.current ? searchWithIndex(indexRef.current, query, limit) : [],
      getBySku: (sku: string) => bySku.get(sku) ?? null,
    };
  }, [products]);

  return (
    <CatalogSearchContext.Provider value={value}>
      {children}
    </CatalogSearchContext.Provider>
  );
}

export function useCatalogSearch(): CatalogSearchValue {
  const ctx = useContext(CatalogSearchContext);
  if (!ctx) {
    return { ready: false, count: 0, search: () => [], getBySku: () => null };
  }
  return ctx;
}
