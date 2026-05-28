import { ExecArgs } from "@medusajs/framework/types";
import {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import { readFileSync } from "fs";
import { resolve } from "path";

type RawProduct = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  permalink: string;
  prices?: {
    price?: string | null;
    regular_price?: string | null;
    sale_price?: string | null;
    currency_minor_unit?: number;
  };
  on_sale?: boolean;
  is_in_stock?: boolean;
  short_description?: string;
  description?: string;
  average_rating?: string;
  review_count?: number;
  categories?: { slug: string; name: string }[];
  images?: ({ src?: string } | string)[];
};

type RawCategory = {
  slug: string;
  name: string;
  parent: number;
  count: number;
  description?: string;
};

// Decode HTML entities (also used by the scraped data)
const HTML_ENTITY: Record<string, string> = {
  "&amp;": "&", "&#038;": "&", "&quot;": '"', "&#039;": "'", "&apos;": "'",
  "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&#8211;": "–", "&#8212;": "—",
  "&#8216;": "‘", "&#8217;": "’", "&#8220;": "“", "&#8221;": "”",
  "&pound;": "£", "&hellip;": "…", "&middot;": "·",
};
function decode(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITY[m] ?? m)
    .trim();
}
function stripHtml(s: string | undefined | null): string {
  return decode((s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

const BRAND_PATTERNS: { brand: string; keys: string[] }[] = [
  { brand: "Sika",      keys: ["sika", "sikaflex", "sikabond", "sikadur"] },
  { brand: "Fischer",   keys: ["fischer", "fis v", "ftk", "fnp", "fbn"] },
  { brand: "Soudal",    keys: ["soudal", "souadal", "soudafix", "soudaseal", "fix all"] },
  { brand: "Teroson",   keys: ["teroson"] },
  { brand: "Terraco",   keys: ["terraco","terol","terralite","renderlite","monocote","terranova","terratherm","terrablock","terrabond","terrastyle","texstone","terracryl","terraplaster","ecoroc","texlite","decorit","tyrolean","graffiato","pebbletex"] },
  { brand: "Everbuild", keys: ["everbuild"] },
  { brand: "S4ALL Pro", keys: ["s4all","s4 all","s4pro","s4proof"] },
];
function deriveBrand(name: string, catSlugs: string[]): string {
  const n = name.toLowerCase();
  for (const { brand, keys } of BRAND_PATTERNS) {
    for (const k of keys) if (n.includes(k)) return brand;
  }
  const terracoOnly = new Set(["decorative-renders", "stone-coatings", "textured-coatings"]);
  if (catSlugs.some((s) => terracoOnly.has(s))) return "Terraco";
  return "Unbranded";
}

function priceFromMinor(s: string | null | undefined, minor: number): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n / Math.pow(10, minor);
}

export default async function seedS4ACatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const storeModuleService = container.resolve(Modules.STORE);

  logger.info("📦  Sealants4All seed — reading data/products.json + categories.json");
  const DATA_DIR = resolve(__dirname, "..", "data");
  const rawProducts: RawProduct[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, "products.json"), "utf8"),
  );
  const rawCategories: RawCategory[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, "categories.json"), "utf8"),
  );
  logger.info(`   read ${rawProducts.length} products, ${rawCategories.length} categories`);

  // ── 1. Store: set GBP as default ──────────────────────────────────────
  const countries = ["gb"];
  const [store] = await storeModuleService.listStores();

  logger.info("⚙️   configuring store currencies + default sales channel");
  const defaultSalesChannel = await (async () => {
    const existing = (await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { name: "S4ALL Storefront" },
    })).data;
    if (existing.length) return existing;
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "S4ALL Storefront" }] },
    });
    return result;
  })();

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: "gbp", is_default: true },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  // ── 2. Region: re-use existing region that covers GB, else create UK ─
  logger.info("🌍  resolving region for GB");
  const allRegions = (await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })).data as { id: string; name: string; currency_code: string; countries: { iso_2: string }[] }[];
  const gbRegion = allRegions.find((r) => r.countries?.some((c) => c.iso_2 === "gb"));
  const regionId = gbRegion
    ? gbRegion.id
    : (await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "United Kingdom",
              currency_code: "gbp",
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })).result[0].id;
  logger.info(`   region: ${gbRegion ? gbRegion.name : "United Kingdom (new)"} (${regionId})`);

  // Tax region (UK 20%)
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  }).catch(() => { /* idempotent — ignore if already exists */ });

  // ── 3. Stock location: London Warehouse ──────────────────────────────
  logger.info("🏬  ensuring London Warehouse stock location");
  const slRes = (await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: "London Warehouse" },
  })).data;
  const stockLocationId = slRes.length
    ? slRes[0].id
    : (await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            {
              name: "London Warehouse",
              address: {
                city: "London",
                country_code: "GB",
                address_1: "SW18 4GQ",
              },
            },
          ],
        },
      })).result[0].id;

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  }).catch(() => { /* idempotent */ });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocationId,
      add: [defaultSalesChannel[0].id],
    },
  }).catch(() => { /* idempotent */ });

  // ── 4. Shipping profile + option ─────────────────────────────────────
  logger.info("🚚  ensuring default shipping profile");
  const profileRes = (await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    filters: { type: "default" },
  })).data;
  const shippingProfileId = profileRes.length
    ? profileRes[0].id
    : (await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: "Default", type: "default" }] },
      })).result[0].id;

  // ── 5. Categories ────────────────────────────────────────────────────
  logger.info("🗂   creating product categories");
  const existingCats = (await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })).data;
  const existingHandles = new Set(existingCats.map((c: { handle: string }) => c.handle));

  const categoriesToCreate = rawCategories
    .filter((c) => c.slug !== "uncategorized" && c.count > 0)
    .filter((c) => !existingHandles.has(c.slug))
    .map((c) => ({
      name: decode(c.name),
      handle: c.slug,
      description: decode(c.description || ""),
      is_active: true,
      is_internal: false,
    }));

  if (categoriesToCreate.length > 0) {
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: categoriesToCreate },
    });
    logger.info(`   created ${categoriesToCreate.length} categories`);
  } else {
    logger.info("   categories already present, skipping");
  }

  // Refresh category map (handle → id)
  const allCats = (await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  })).data as { id: string; handle: string; name: string }[];
  const catByHandle = new Map(allCats.map((c) => [c.handle, c.id]));

  // ── 6. Products ──────────────────────────────────────────────────────
  logger.info(`📦  creating products (this may take a minute for 207 SKUs)`);

  // Existing product handles (idempotency)
  const existingProds = (await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })).data as { id: string; handle: string }[];
  const existingProdHandles = new Set(existingProds.map((p) => p.handle));

  const productsInput = rawProducts
    .filter((p) => !existingProdHandles.has(p.slug))
    .map((p) => {
      const minor = p.prices?.currency_minor_unit ?? 2;
      const basePrice =
        priceFromMinor(p.prices?.price, minor) ??
        priceFromMinor(p.prices?.regular_price, minor) ??
        0;
      const catSlugs = (p.categories || []).map((c) => c.slug);
      const brand = deriveBrand(decode(p.name), catSlugs);
      const images = (p.images || [])
        .map((img) => (typeof img === "string" ? img : img?.src))
        .filter((v): v is string => !!v);
      const categoryIds = catSlugs
        .map((s) => catByHandle.get(s))
        .filter((v): v is string => !!v);

      return {
        title: decode(p.name),
        handle: p.slug,
        description: stripHtml(p.description) || stripHtml(p.short_description),
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfileId,
        thumbnail: images[0] || undefined,
        images: images.map((url) => ({ url })),
        weight: 500,
        sales_channels: [{ id: defaultSalesChannel[0].id }],
        category_ids: categoryIds,
        metadata: {
          brand,
          source_id: p.id,
          source_permalink: p.permalink,
          source_rating: parseFloat(p.average_rating || "0") || 0,
          source_reviews: p.review_count || 0,
        },
        options: [{ title: "Default", values: ["Standard"] }],
        variants: [
          {
            title: "Standard",
            sku: p.sku || p.slug,
            manage_inventory: false,
            options: { Default: "Standard" },
            prices:
              basePrice > 0
                ? [{ amount: basePrice, currency_code: "gbp" }]
                : [],
          },
        ],
      };
    });

  if (productsInput.length === 0) {
    logger.info("   all products already imported, skipping");
  } else {
    // Batch insert (Medusa workflow handles arrays well — but batch in groups of 25 to keep memory sane)
    const BATCH = 25;
    let inserted = 0;
    for (let i = 0; i < productsInput.length; i += BATCH) {
      const slice = productsInput.slice(i, i + BATCH);
      try {
        await createProductsWorkflow(container).run({ input: { products: slice } });
        inserted += slice.length;
        logger.info(`   inserted ${inserted}/${productsInput.length}`);
      } catch (e) {
        logger.error(`   batch ${i / BATCH} failed: ${(e as Error).message}`);
      }
    }
  }

  // ── 7. Publishable API key (for storefront) ──────────────────────────
  logger.info("🔑  ensuring publishable API key for the storefront");
  const existingKeys = (await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type", "token"],
    filters: { title: "S4ALL Storefront key", type: "publishable" },
  })).data as { id: string; token: string }[];
  let publishableKey = existingKeys[0];
  if (!publishableKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "S4ALL Storefront key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    publishableKey = result[0] as unknown as { id: string; token: string };
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  }

  logger.info("✅  Seed complete.");
  logger.info(`   Publishable API key: ${publishableKey.token}`);
  logger.info(`   Sales channel:       ${defaultSalesChannel[0].id}`);
  logger.info(`   Stock location:      ${stockLocationId}`);
  logger.info(`   UK region:           ${regionId}`);
}
