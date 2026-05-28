#!/usr/bin/env node
// Transforms data/scraped/*.json into typed TS modules under lib/data/.
// Run after scrape-catalogue.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCRAPED = resolve(ROOT, "data", "scraped");
const OUT = resolve(ROOT, "lib", "data");

const products = JSON.parse(readFileSync(resolve(SCRAPED, "products.json"), "utf8"));
const categories = JSON.parse(readFileSync(resolve(SCRAPED, "categories.json"), "utf8"));

// ── Helpers ────────────────────────────────────────────────────────────────

const HTML_ENTITY = {
  "&amp;": "&", "&#038;": "&", "&quot;": '"', "&#039;": "'", "&apos;": "'",
  "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&#8211;": "–", "&#8212;": "—",
  "&#8216;": "‘", "&#8217;": "’", "&#8220;": "“", "&#8221;": "”",
  "&pound;": "£", "&euro;": "€", "&copy;": "©", "&reg;": "®", "&trade;": "™",
  "&hellip;": "…", "&middot;": "·", "&times;": "×", "&divide;": "÷",
};
function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITY[m] ?? m)
    .trim();
}

function stripHtml(s) {
  return decodeEntities((s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

const LS = " "; // line separator
const PS = " "; // paragraph separator
function jsString(s) {
  // Safe for double-quoted JS string literal
  const str = String(s);
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const code = str.charCodeAt(i);
    if (c === "\\") out += "\\\\";
    else if (c === '"') out += '\\"';
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === LS) out += "\\u2028";
    else if (c === PS) out += "\\u2029";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else out += c;
  }
  return `"${out}"`;
}

// ── Brand detection ────────────────────────────────────────────────────────

const BRAND_PATTERNS = [
  { brand: "SIKA",      keys: ["sika", "sikaflex", "sikabond", "sikadur"] },
  { brand: "FISCHER",   keys: ["fischer", "fis v", "ftk", "fnp", "fbn"] },
  { brand: "SOUDAL",    keys: ["soudal", "souadal", "soudafix", "soudaseal", "fix all"] },
  { brand: "TEROSON",   keys: ["teroson"] },
  { brand: "TERRACO",   keys: [
      "terraco", "terol", "terralite", "renderlite", "monocote",
      "terranova", "terratherm", "terrablock", "terrabond", "terrastyle",
      "texstone", "terracryl", "terraplaster", "ecoroc", "texlite",
      "decorit", "tyrolean", "graffiato", "pebbletex",
    ] },
  { brand: "EVERBUILD", keys: ["everbuild"] },
  { brand: "S4ALL PRO", keys: ["s4all", "s4 all", "s4pro", "s4proof"] },
];

const TERRACO_ONLY_CATS = new Set([
  "decorative-renders",
  "stone-coatings",
  "textured-coatings",
]);

function deriveBrand(product) {
  const n = (product.name || "").toLowerCase();
  for (const { brand, keys } of BRAND_PATTERNS) {
    for (const k of keys) if (n.includes(k)) return brand;
  }
  const slugs = (product.categories || []).map((c) => c.slug);
  if (slugs.some((s) => TERRACO_ONLY_CATS.has(s))) return "TERRACO";
  return "UNBRANDED";
}

// ── Curated 8-category map for the homepage CategoryGrid ───────────────────

const CURATED_CATEGORIES = [
  { id: "caravan",  name: "Caravan & Marine",     icon: "caravan", match: (slugs, name) => /caravan|marine|motorhome/.test(name) || slugs.includes("caravan-sealants") },
  { id: "joint",    name: "Joint Sealing",         icon: "joint",   match: (slugs) => slugs.includes("joint-sealing") || slugs.includes("adhesives-sealants") },
  { id: "fire",     name: "Fire Protection",       icon: "flame",   match: (slugs, name) => /fire|intumescent|firecryl/.test(name) || slugs.some((s) => s.includes("fire")) },
  { id: "ewi",      name: "EWI Systems",           icon: "wall",    match: (slugs) => slugs.includes("ewi-systems") || slugs.includes("decorative-renders") },
  { id: "fixing",   name: "Fixing & Anchoring",    icon: "anchor",  match: (slugs) => slugs.includes("fixing") || slugs.includes("accessories-for-direct-fastening") },
  { id: "water",    name: "Waterproofing",         icon: "drop",    match: (slugs) => slugs.includes("waterproofing-materials") || slugs.includes("floor-systems") },
  { id: "primers",  name: "Primers & Cleaners",    icon: "beaker",  match: (slugs) => slugs.includes("pre-treatments-and-primers") || slugs.includes("cleaning") },
  { id: "tools",    name: "Tools & Applicators",   icon: "tool",    match: (slugs) => /tools|guns|applicator/.test(slugs.join(" ")) },
];

// ── Transform products ────────────────────────────────────────────────────

function priceFromMinor(s, minorUnit = 2) {
  if (s == null || s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n / Math.pow(10, minorUnit);
}

function round2(n) { return Math.round(n * 100) / 100; }

function synthTiers(base) {
  return [
    { min: 1,   price: round2(base * 1.00) },
    { min: 12,  price: round2(base * 0.95) },
    { min: 24,  price: round2(base * 0.88) },
    { min: 100, price: round2(base * 0.82) },
    { min: 500, price: round2(base * 0.75) },
  ];
}

const transformed = products.map((p, idx) => {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const display = priceFromMinor(p.prices?.price, minor);
  const regular = priceFromMinor(p.prices?.regular_price, minor);
  const sale = p.on_sale ? priceFromMinor(p.prices?.sale_price, minor) : null;
  const base = display ?? regular ?? 0;
  const brand = deriveBrand(p);
  const name = decodeEntities(p.name);
  const cats = (p.categories || []).map((c) => ({ id: c.slug, name: decodeEntities(c.name) }));
  const catSlugs = cats.map((c) => c.id);
  const curatedCat = CURATED_CATEGORIES.find((c) => c.match(catSlugs, name.toLowerCase()));
  const images = (p.images || []).map((img) => (typeof img === "string" ? img : img.src)).filter(Boolean);
  const stockState = p.is_in_stock === false ? "out"
    : (p.low_stock_remaining != null && p.low_stock_remaining <= 5) ? "low" : "in";
  return {
    id: p.id,
    sku: p.sku || p.slug || `S4A-${p.id}`,
    slug: p.slug,
    num: String(idx + 1).padStart(3, "0"),
    name,
    brand,
    use: cats[0]?.name || "Sealants & Adhesives",
    permalink: p.permalink,
    image: images[0] || null,
    images,
    description: stripHtml(p.description),
    shortDescription: stripHtml(p.short_description),
    price: base,
    regularPrice: regular ?? base,
    salePrice: sale,
    onSale: !!p.on_sale && base > 0,
    priceAvailable: base > 0,
    stock: stockState,
    lowStockRemaining: p.low_stock_remaining ?? null,
    rating: parseFloat(p.average_rating || "0") || 0,
    reviews: p.review_count || 0,
    categories: cats,
    curatedCategory: curatedCat?.id || null,
    tiers: base > 0 ? synthTiers(base) : [],
    cap: `${brand} / ${name.toUpperCase().slice(0, 28)}`,
  };
});

// Dedupe SKUs (some products share SKU or have no SKU)
const skuSeen = new Map();
for (const t of transformed) {
  if (!t.sku || skuSeen.has(t.sku)) t.sku = `${t.sku || "S4A"}-${t.id}`;
  skuSeen.set(t.sku, true);
}

// ── Derived lists ─────────────────────────────────────────────────────────

const bestSku = (() => {
  const tagged = transformed.filter((t) =>
    t.categories.some((c) => /best.?selling/i.test(c.name)),
  );
  const result = tagged.map((t) => t.sku);
  if (result.length < 8) {
    // Pad with top-priced branded products, brand-distributed
    const seen = new Set(result);
    const brandQueues = new Map();
    for (const t of transformed) {
      if (!t.priceAvailable || t.brand === "UNBRANDED" || seen.has(t.sku)) continue;
      if (!brandQueues.has(t.brand)) brandQueues.set(t.brand, []);
      brandQueues.get(t.brand).push(t);
    }
    for (const q of brandQueues.values()) q.sort((a, b) => b.price - a.price);
    // Round-robin across brands
    while (result.length < 12) {
      let added = false;
      for (const q of brandQueues.values()) {
        const next = q.shift();
        if (!next) continue;
        if (seen.has(next.sku)) continue;
        result.push(next.sku);
        seen.add(next.sku);
        added = true;
        if (result.length >= 12) break;
      }
      if (!added) break;
    }
  }
  return Array.from(new Set(result)).slice(0, 12);
})();

const dealsSku = transformed
  .filter((t) => t.onSale && t.priceAvailable)
  .map((t) => t.sku)
  .slice(0, 12);

const newSku = transformed
  .filter((t) => t.priceAvailable)
  .sort((a, b) => b.id - a.id)
  .slice(0, 12)
  .map((t) => t.sku);

// ── Category list ─────────────────────────────────────────────────────────

const cleanedCategories = categories
  .map((c) => ({
    id: c.slug,
    name: decodeEntities(c.name),
    slug: c.slug,
    count: c.count || 0,
    parent: c.parent || 0,
    image: c.image?.src || null,
    permalink: c.permalink,
  }))
  .filter((c) => c.id !== "uncategorized" && c.count > 0)
  .sort((a, b) => b.count - a.count);

const curated = CURATED_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  count: transformed.filter((t) => t.curatedCategory === c.id).length,
}));

// ── Emit TS ───────────────────────────────────────────────────────────────

function emitProducts(arr) {
  const items = arr.map((p) => {
    const tiers = p.tiers.length
      ? `[${p.tiers.map((t) => `{ min: ${t.min}, price: ${t.price.toFixed(2)} }`).join(", ")}]`
      : "[]";
    const images = `[${p.images.map(jsString).join(", ")}]`;
    const cats = `[${p.categories.map((c) => `{ id: ${jsString(c.id)}, name: ${jsString(c.name)} }`).join(", ")}]`;
    return `  {
    id: ${p.id},
    sku: ${jsString(p.sku)},
    slug: ${jsString(p.slug)},
    num: ${jsString(p.num)},
    name: ${jsString(p.name)},
    brand: ${jsString(p.brand)},
    use: ${jsString(p.use)},
    permalink: ${jsString(p.permalink)},
    image: ${p.image ? jsString(p.image) : "null"},
    images: ${images},
    description: ${jsString(p.description)},
    shortDescription: ${jsString(p.shortDescription)},
    price: ${p.price.toFixed(2)},
    regularPrice: ${p.regularPrice.toFixed(2)},
    salePrice: ${p.salePrice != null ? p.salePrice.toFixed(2) : "null"},
    onSale: ${p.onSale},
    priceAvailable: ${p.priceAvailable},
    stock: ${jsString(p.stock)},
    lowStockRemaining: ${p.lowStockRemaining ?? "null"},
    rating: ${p.rating},
    reviews: ${p.reviews},
    categories: ${cats},
    curatedCategory: ${p.curatedCategory ? jsString(p.curatedCategory) : "null"},
    tiers: ${tiers},
    cap: ${jsString(p.cap)},
  }`;
  });
  return `// AUTO-GENERATED by scripts/transform-catalogue.mjs from data/scraped/products.json
// Do not edit by hand — re-run \`pnpm scrape && pnpm transform\` to refresh.
import type { Product } from "./types";

export const PRODUCTS: Product[] = [
${items.join(",\n")}
];

export const PRODUCT_BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));
export const PRODUCT_BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export const BEST_SKU: string[] = [
${bestSku.map((s) => "  " + jsString(s)).join(",\n")}
];

export const NEW_SKU: string[] = [
${newSku.map((s) => "  " + jsString(s)).join(",\n")}
];

export const DEALS_SKU: string[] = [
${dealsSku.map((s) => "  " + jsString(s)).join(",\n")}
];

export const PRODUCT_META = Object.fromEntries(
  PRODUCTS.map((p) => [
    p.sku,
    {
      rating: p.rating > 0 ? p.rating : 4.5 + ((p.id * 7) % 5) / 10,
      reviews: p.reviews > 0 ? p.reviews : 12 + ((p.id * 13) % 180),
      stock: p.lowStockRemaining ?? (p.stock === "out" ? 0 : 100 + ((p.id * 17) % 400)),
      saving: p.onSale && p.regularPrice > p.price
        ? Math.round(((p.regularPrice - p.price) / p.regularPrice) * 100)
        : 0,
    },
  ]),
);
`;
}

function emitCategories() {
  const curatedItems = curated.map((c) => `  { id: ${jsString(c.id)}, name: ${jsString(c.name)}, count: ${c.count}, icon: ${jsString(c.icon)} }`).join(",\n");
  const fullItems = cleanedCategories.map((c) => `  { id: ${jsString(c.id)}, name: ${jsString(c.name)}, slug: ${jsString(c.slug)}, count: ${c.count}, parent: ${c.parent}, image: ${c.image ? jsString(c.image) : "null"}, permalink: ${jsString(c.permalink)} }`).join(",\n");
  return `// AUTO-GENERATED by scripts/transform-catalogue.mjs
import type { Category, CategoryFull } from "./types";

export const CATEGORIES: Category[] = [
${curatedItems}
];

export const CATEGORIES_FULL: CategoryFull[] = [
${fullItems}
];
`;
}

function emitMeta() {
  return JSON.stringify({
    transformedAt: new Date().toISOString(),
    productsTotal: transformed.length,
    productsWithPrice: transformed.filter((p) => p.priceAvailable).length,
    productsOnSale: transformed.filter((p) => p.onSale).length,
    categoriesTotal: cleanedCategories.length,
    bestSku: bestSku.length,
    newSku: newSku.length,
    dealsSku: dealsSku.length,
    brandCounts: Object.fromEntries(
      ["SIKA","FISCHER","SOUDAL","TEROSON","TERRACO","EVERBUILD","S4ALL PRO","UNBRANDED"]
        .map((b) => [b, transformed.filter((p) => p.brand === b).length]),
    ),
  }, null, 2);
}

writeFileSync(resolve(OUT, "products.ts"), emitProducts(transformed));
writeFileSync(resolve(OUT, "categories.ts"), emitCategories());
writeFileSync(resolve(SCRAPED, "transform-meta.json"), emitMeta());

console.log(`✓ wrote lib/data/products.ts (${transformed.length} products)`);
console.log(`✓ wrote lib/data/categories.ts (8 curated + ${cleanedCategories.length} full)`);
console.log("\nBrand breakdown:");
for (const b of ["SIKA","FISCHER","SOUDAL","TEROSON","TERRACO","EVERBUILD","S4ALL PRO","UNBRANDED"]) {
  console.log(`  ${b.padEnd(10)} ${transformed.filter((p) => p.brand === b).length}`);
}
console.log("\nCurated category counts:");
for (const c of curated) console.log(`  ${c.id.padEnd(8)} ${c.count}`);
console.log(`\nLists: best=${bestSku.length} new=${newSku.length} deals=${dealsSku.length}`);
