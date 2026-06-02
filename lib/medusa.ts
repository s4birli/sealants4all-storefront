import "server-only";

/**
 * Thin server-side client for the Medusa Store API. Medusa is the source of
 * truth; the storefront reads everything live through these helpers.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

// How long (seconds) the catalogue stays cached before revalidating.
// Override with NEXT_PUBLIC_CATALOG_REVALIDATE; 0 = always fresh (slowest).
const CATALOG_REVALIDATE = Number(process.env.NEXT_PUBLIC_CATALOG_REVALIDATE ?? 60);

// Fields pulled for every product. Includes pricing (needs a region), media,
// categories, variants, and the metadata the seed stored (brand, ratings…).
export const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "status",
  "metadata",
  "*images",
  "*categories",
  "*variants",
  "*variants.calculated_price",
  "variants.manage_inventory",
  "variants.inventory_quantity",
  "collection.id",
  "collection.handle",
  "collection.title",
].join(",");

export type MedusaCalculatedPrice = {
  calculated_amount?: number | null;
  original_amount?: number | null;
  currency_code?: string | null;
};

export type MedusaVariant = {
  id: string;
  sku: string | null;
  inventory_quantity?: number | null;
  manage_inventory?: boolean | null;
  calculated_price?: MedusaCalculatedPrice | null;
};

export type MedusaProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  metadata: Record<string, unknown> | null;
  images?: { url: string }[];
  categories?: { id: string; name: string; handle: string }[];
  collection?: { id: string; handle: string; title: string } | null;
  variants?: MedusaVariant[];
};

async function storeFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${BACKEND_URL}/store/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString(), {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    // Cache in the Next Data Cache and revalidate periodically. Tagged so a
    // product change can revalidate on demand (revalidateTag("catalog")).
    next: { revalidate: CATALOG_REVALIDATE, tags: ["catalog"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Medusa store/${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

let regionIdPromise: Promise<string> | null = null;

/** Resolve (and memoise) the GBP region id required for price calculation. */
export function getRegionId(): Promise<string> {
  if (!regionIdPromise) {
    regionIdPromise = storeFetch<{ regions: { id: string; currency_code: string }[] }>(
      "regions",
    ).then(({ regions }) => {
      const gbp = regions.find((r) => r.currency_code === "gbp") || regions[0];
      if (!gbp) throw new Error("No Medusa region configured");
      return gbp.id;
    });
  }
  return regionIdPromise;
}

/** Fetch every published product (paginated) with prices in the GBP region. */
export async function fetchAllMedusaProducts(): Promise<MedusaProduct[]> {
  const region_id = await getRegionId();
  const limit = 100;
  const all: MedusaProduct[] = [];
  let offset = 0;
  for (;;) {
    const { products, count } = await storeFetch<{
      products: MedusaProduct[];
      count: number;
    }>("products", { region_id, limit, offset, fields: PRODUCT_FIELDS });
    all.push(...products);
    offset += products.length;
    if (products.length === 0 || all.length >= count) break;
  }
  return all;
}

/** Fetch a single product by its handle, or null if it does not exist. */
export async function fetchMedusaProductByHandle(
  handle: string,
): Promise<MedusaProduct | null> {
  const region_id = await getRegionId();
  // A malformed handle (e.g. a raw null byte) can make Medusa answer 5xx.
  // Treat any failed handle lookup as "not found" so the page renders a clean
  // 404 instead of a 500. Scoped to this single-handle lookup only — the
  // catalogue list and region calls still surface their errors.
  try {
    const { products } = await storeFetch<{ products: MedusaProduct[] }>("products", {
      region_id,
      handle,
      limit: 1,
      fields: PRODUCT_FIELDS,
    });
    return products[0] ?? null;
  } catch {
    return null;
  }
}
