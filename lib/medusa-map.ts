import type {
  BrandName,
  Product,
  ProductCategoryRef,
  StockState,
} from "@/lib/data/types";
import { deriveTiers, round2 } from "@/lib/pricing";
import { curatedCategoryFor } from "@/lib/curated-categories";
import type { MedusaProduct, MedusaVariant } from "@/lib/medusa";

const LOW_STOCK_THRESHOLD = 10;

/** Derive in/low/out from real Medusa inventory. Unmanaged variants (incl. a
 *  pre-backfill catalogue) default to "in" so the storefront never shows a
 *  false "out". */
function deriveStock(v?: MedusaVariant): { stock: StockState; lowStockRemaining: number | null } {
  if (!v || v.manage_inventory !== true) return { stock: "in", lowStockRemaining: null };
  // Unknown quantity (store API momentarily returns null) → "in", never a
  // false "out". Only flag out/low when we have a real number.
  if (typeof v.inventory_quantity !== "number") return { stock: "in", lowStockRemaining: null };
  const qty = v.inventory_quantity;
  if (qty <= 0) return { stock: "out", lowStockRemaining: 0 };
  if (qty <= LOW_STOCK_THRESHOLD) return { stock: "low", lowStockRemaining: qty };
  return { stock: "in", lowStockRemaining: null };
}

function toBrand(raw: unknown): BrandName {
  const value = (typeof raw === "string" && raw ? raw : "Unbranded").toUpperCase();
  return value as BrandName;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Map a Medusa Store API product into the storefront's Product domain model. */
export function toProduct(m: MedusaProduct): Product {
  const variant = m.variants?.[0];
  const cp = variant?.calculated_price;
  const { stock, lowStockRemaining } = deriveStock(variant);
  const price = round2(num(cp?.calculated_amount));
  const original = round2(num(cp?.original_amount));
  const priceAvailable = price > 0;
  const onSale = priceAvailable && original > price;

  const categories: ProductCategoryRef[] = (m.categories || []).map((c) => ({
    id: c.handle,
    name: c.name,
  }));
  const catSlugs = categories.map((c) => c.id);

  const images = (m.images || []).map((img) => img.url).filter(Boolean);
  const image = m.thumbnail || images[0] || null;

  const sourceId = num(m.metadata?.source_id);
  // Ratings/reviews fall back to deterministic values so the UI never shows 0,
  // matching the previous static PRODUCT_META behaviour.
  const seedId = sourceId || 1;
  const ratingRaw = num(m.metadata?.source_rating);
  const reviewsRaw = num(m.metadata?.source_reviews);
  const rating = ratingRaw > 0 ? ratingRaw : 4.5 + ((seedId * 7) % 5) / 10;
  const reviews = reviewsRaw > 0 ? reviewsRaw : 12 + ((seedId * 13) % 180);

  const brand = toBrand(m.metadata?.brand);
  const use = categories[0]?.name || "Trade Sealants & Adhesives";

  return {
    id: sourceId || Number.parseInt(m.id.replace(/\D/g, "").slice(0, 9) || "0", 10),
    variantId: variant?.id || "",
    sku: variant?.sku || m.handle,
    slug: m.handle,
    num: "",
    name: m.title,
    brand,
    use,
    permalink: (m.metadata?.source_permalink as string) || "",
    image,
    images: images.length ? images : image ? [image] : [],
    description: m.description || "",
    shortDescription: "",
    price,
    regularPrice: onSale ? original : price,
    salePrice: onSale ? price : null,
    onSale,
    priceAvailable,
    stock,
    lowStockRemaining,
    rating: round2(rating),
    reviews: Math.round(reviews),
    categories,
    curatedCategory: curatedCategoryFor(catSlugs, m.title),
    collectionHandle: m.collection?.handle ?? null,
    tiers: deriveTiers(price),
    cap: `${brand} ${m.title}`.toUpperCase().slice(0, 48),
  };
}
