import { readFileSync } from "fs";
import { resolve } from "path";
import { SyncProduct } from "./types";

type RawProduct = {
  id: number;
  sku?: string;
  slug: string;
  name: string;
  permalink: string;
  short_description?: string;
  description?: string;
  on_sale?: boolean;
  is_in_stock?: boolean;
  low_stock_remaining?: number | null;
  prices?: {
    price?: string | null;
    regular_price?: string | null;
    sale_price?: string | null;
    currency_minor_unit?: number;
  };
  images?: ({ src?: string } | string)[];
  categories?: { slug: string; name: string }[];
  weight?: string;
};

const HTML_ENTITY: Record<string, string> = {
  "&amp;": "&",
  "&#038;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&pound;": "GBP ",
  "&hellip;": "...",
};

const BRAND_PATTERNS: { brand: string; keys: string[] }[] = [
  { brand: "Sika", keys: ["sika", "sikaflex", "sikabond", "sikadur"] },
  { brand: "Fischer", keys: ["fischer", "fis v", "ftk", "fnp", "fbn"] },
  { brand: "Soudal", keys: ["soudal", "souadal", "soudafix", "soudaseal", "fix all"] },
  { brand: "Teroson", keys: ["teroson"] },
  {
    brand: "Terraco",
    keys: [
      "terraco",
      "terol",
      "terralite",
      "renderlite",
      "monocote",
      "terranova",
      "terratherm",
      "terrablock",
      "terrabond",
      "terrastyle",
      "texstone",
      "terracryl",
      "terraplaster",
      "ecoroc",
      "texlite",
      "decorit",
      "tyrolean",
      "graffiato",
      "pebbletex",
    ],
  },
  { brand: "Everbuild", keys: ["everbuild"] },
  { brand: "S4ALL Pro", keys: ["s4all", "s4 all", "s4pro", "s4proof"] },
];

function decode(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITY[m] ?? m)
    .trim();
}

function stripHtml(value: string | undefined | null): string {
  return decode((value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function priceFromMinor(value: string | null | undefined, minorUnit = 2): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((parsed / Math.pow(10, minorUnit)) * 100) / 100;
}

function deriveBrand(name: string, categorySlugs: string[]): string {
  const normalized = name.toLowerCase();
  for (const { brand, keys } of BRAND_PATTERNS) {
    if (keys.some((key) => normalized.includes(key))) return brand;
  }

  if (categorySlugs.some((slug) => ["decorative-renders", "stone-coatings", "textured-coatings"].includes(slug))) {
    return "Terraco";
  }

  return "Sealants4All";
}

function numericWeightGrams(weight: string | undefined): number {
  if (!weight) return 500;
  const parsed = Number(weight);
  if (!Number.isFinite(parsed) || parsed <= 0) return 500;
  return Math.round(parsed * 1000);
}

function stockQuantity(product: RawProduct): number {
  if (product.is_in_stock === false) return 0;
  if (typeof product.low_stock_remaining === "number") return Math.max(0, product.low_stock_remaining);
  return 100;
}

export function loadSyncProducts(): SyncProduct[] {
  const dataPath = resolve(__dirname, "..", "data", "products.json");
  const rawProducts = JSON.parse(readFileSync(dataPath, "utf8")) as RawProduct[];

  return rawProducts.map((product) => {
    const categoryNames = (product.categories || []).map((category) => decode(category.name));
    const categorySlugs = (product.categories || []).map((category) => category.slug);
    const minor = product.prices?.currency_minor_unit ?? 2;
    const price =
      priceFromMinor(product.prices?.price, minor) ??
      priceFromMinor(product.prices?.regular_price, minor) ??
      0;
    const regularPrice = priceFromMinor(product.prices?.regular_price, minor);
    const images = (product.images || [])
      .map((image) => (typeof image === "string" ? image : image?.src))
      .filter((url): url is string => Boolean(url));
    const title = decode(product.name);
    const brand = deriveBrand(title, categorySlugs);
    const sku = product.sku || product.slug || `S4A-${product.id}`;

    return {
      source_id: product.id,
      sku,
      handle: product.slug,
      title,
      description_html: product.description || product.short_description || "",
      description_text: stripHtml(product.description || product.short_description),
      brand,
      category_names: categoryNames,
      tags: Array.from(new Set([brand, ...categoryNames, "Sealants4All"].filter(Boolean))),
      source_url: product.permalink,
      image_urls: images,
      price,
      compare_at_price:
        product.on_sale && regularPrice && regularPrice > price ? regularPrice : null,
      currency_code: "GBP",
      in_stock: product.is_in_stock !== false,
      inventory_quantity: stockQuantity(product),
      weight_grams: numericWeightGrams(product.weight),
    };
  });
}
