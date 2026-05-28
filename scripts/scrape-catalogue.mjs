#!/usr/bin/env node
// Pulls the full catalogue from sealants4all.co.uk's WooCommerce Store API.
// No auth required. Writes:
//   data/scraped/products.json   — full per-product detail (one fetch per SKU)
//   data/scraped/categories.json — all categories
//   data/scraped/raw-list.json   — paginated list response (for cross-check)
//   data/scraped/meta.json       — totals + timestamp

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "data", "scraped");
mkdirSync(OUT, { recursive: true });

const BASE = "https://sealants4all.co.uk/wp-json/wc/store/v1";
const PER_PAGE = 50;
const CONCURRENCY = 6;

async function jget(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "s4a-storefront-importer/1.0" },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return { body: await res.json(), headers: res.headers };
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchAllPages(url) {
  let page = 1;
  let total = Infinity;
  const all = [];
  while (all.length < total) {
    const sep = url.includes("?") ? "&" : "?";
    const { body, headers } = await jget(`${url}${sep}page=${page}&per_page=${PER_PAGE}`);
    if (!Array.isArray(body)) throw new Error(`expected array at ${url}, got ${typeof body}`);
    all.push(...body);
    total = parseInt(headers.get("x-wp-total") || "0", 10) || all.length;
    if (body.length < PER_PAGE) break;
    page += 1;
  }
  return { all, total };
}

console.log("→ categories");
const { all: categories, total: catTotal } = await fetchAllPages(`${BASE}/products/categories`);
console.log(`  fetched ${categories.length} / ${catTotal}`);
writeFileSync(resolve(OUT, "categories.json"), JSON.stringify(categories, null, 2));

console.log("→ products (list)");
const { all: list, total: prodTotal } = await fetchAllPages(`${BASE}/products`);
console.log(`  fetched ${list.length} / ${prodTotal}`);
writeFileSync(resolve(OUT, "raw-list.json"), JSON.stringify(list, null, 2));

// Cache: if a product is already in products.json with the same name + image, skip refetch.
const cachePath = resolve(OUT, "products.json");
const cache = new Map();
if (existsSync(cachePath)) {
  try {
    const prev = JSON.parse(readFileSync(cachePath, "utf8"));
    for (const p of prev) cache.set(p.id, p);
  } catch {
    /* ignore */
  }
}

console.log(`→ products (detail) × ${list.length} (concurrency=${CONCURRENCY})`);
let done = 0;
const detailed = await pool(list, CONCURRENCY, async (p) => {
  const cached = cache.get(p.id);
  if (cached && cached.name === p.name && (cached.images?.[0]?.src || "") === (p.images?.[0]?.src || "")) {
    done++;
    if (done % 25 === 0 || done === list.length) process.stdout.write(`  ${done}/${list.length}\r`);
    return cached;
  }
  try {
    const { body } = await jget(`${BASE}/products/${p.id}`);
    done++;
    if (done % 25 === 0 || done === list.length) process.stdout.write(`  ${done}/${list.length}\r`);
    return body;
  } catch (e) {
    console.warn(`  ! ${p.id} ${p.name}: ${e.message}`);
    done++;
    return p; // fall back to list shape
  }
});
process.stdout.write("\n");

writeFileSync(cachePath, JSON.stringify(detailed, null, 2));

const meta = {
  scrapedAt: new Date().toISOString(),
  source: "https://sealants4all.co.uk/wp-json/wc/store/v1",
  productsTotal: prodTotal,
  productsFetched: detailed.length,
  categoriesTotal: catTotal,
  categoriesFetched: categories.length,
};
writeFileSync(resolve(OUT, "meta.json"), JSON.stringify(meta, null, 2));

console.log("\n✓ done");
console.log(meta);
