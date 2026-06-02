import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/catalog";
import { CATEGORIES, CATEGORIES_FULL } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    "",
    "/search",
    "/trade",
  ].map((path) => ({ url: `${BASE}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.6 }));

  const categorySlugs = Array.from(
    new Set([...CATEGORIES.map((c) => c.id), ...CATEGORIES_FULL.map((c) => c.slug)]),
  );
  const categoryEntries: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${BASE}/category/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllProducts();
    productEntries = products.map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // If Medusa is unreachable, still emit static + category routes.
  }

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
