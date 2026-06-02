import { ExecArgs } from "@medusajs/framework/types";
import {
  createProductCategoriesWorkflow,
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  deleteRegionsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { readFileSync } from "fs";
import { resolve } from "path";

type RawProduct = {
  id: number;
  slug: string;
  name: string;
  metadata?: Record<string, unknown> | null;
  categories?: { slug: string; name: string }[];
};

const DEMO_CATEGORY_HANDLES = new Set(["shirts", "pants", "sweatshirts", "merch"]);

/**
 * Brings the local Medusa store to a clean, storefront-ready state:
 *   1. Removes Medusa starter demo products (no S4A source_id metadata).
 *   2. Ensures exactly one GBP region (the seed mistakenly reused the demo EUR
 *      region because it claimed the `gb` country, so GBP prices never resolved).
 *   3. Removes demo categories and guarantees every S4A category exists.
 *   4. Re-links all 207 products to their source categories (the original seed
 *      skipped already-imported products, so category links were never applied).
 *
 * Idempotent — safe to run repeatedly. Run with:
 *   pnpm --dir apps/medusa/apps/backend exec medusa exec ./src/scripts/rebuild-store.ts
 */
export default async function rebuildStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const DATA_DIR = resolve(process.cwd(), "src", "data");
  const rawProducts: RawProduct[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, "products.json"), "utf8"),
  );

  // ── 1. Delete demo products (Medusa starter: t-shirt, sweatshirt, …) ──
  logger.info("🧹  removing demo products");
  const allProducts = (
    await query.graph({ entity: "product", fields: ["id", "handle", "metadata"] })
  ).data as { id: string; handle: string; metadata: Record<string, unknown> | null }[];
  const demoProductIds = allProducts
    .filter((p) => !p.metadata || p.metadata.source_id == null)
    .map((p) => p.id);
  if (demoProductIds.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: demoProductIds } });
    logger.info(`   deleted ${demoProductIds.length} demo product(s)`);
  } else {
    logger.info("   no demo products present");
  }

  // ── 2. Region: ensure a single GBP region, drop any non-GBP region ────
  logger.info("🌍  ensuring a GBP region");
  const regions = (
    await query.graph({ entity: "region", fields: ["id", "name", "currency_code"] })
  ).data as { id: string; name: string; currency_code: string }[];
  const nonGbp = regions.filter((r) => r.currency_code !== "gbp");
  if (nonGbp.length) {
    // Free up the `gb` country claimed by the demo EUR region before recreating.
    await deleteRegionsWorkflow(container).run({ input: { ids: nonGbp.map((r) => r.id) } });
    logger.info(`   removed ${nonGbp.length} non-GBP region(s): ${nonGbp.map((r) => r.name).join(", ")}`);
  }
  let gbpRegion = regions.find((r) => r.currency_code === "gbp");
  if (!gbpRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "United Kingdom",
            currency_code: "gbp",
            countries: ["gb"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    gbpRegion = result[0] as { id: string; name: string; currency_code: string };
    logger.info(`   created GBP region (${gbpRegion.id})`);
  } else {
    logger.info(`   GBP region already present (${gbpRegion.id})`);
  }

  // UK tax region (20% VAT) — idempotent.
  await createTaxRegionsWorkflow(container)
    .run({ input: [{ country_code: "gb", provider_id: "tp_system" }] })
    .catch(() => {
      /* already exists */
    });

  // ── 3. Categories: drop demo categories, ensure all S4A categories ────
  logger.info("🗂   reconciling categories");
  const existingCats = (
    await query.graph({ entity: "product_category", fields: ["id", "handle", "name"] })
  ).data as { id: string; handle: string; name: string }[];

  const demoCatIds = existingCats.filter((c) => DEMO_CATEGORY_HANDLES.has(c.handle)).map((c) => c.id);
  if (demoCatIds.length) {
    await deleteProductCategoriesWorkflow(container).run({ input: demoCatIds });
    logger.info(`   deleted ${demoCatIds.length} demo categories`);
  }

  // Collect every category referenced by the source catalogue.
  const sourceCats = new Map<string, string>();
  for (const p of rawProducts) {
    for (const c of p.categories || []) {
      if (c.slug && c.slug !== "uncategorized") sourceCats.set(c.slug, c.name);
    }
  }
  const presentHandles = new Set(
    existingCats.filter((c) => !DEMO_CATEGORY_HANDLES.has(c.handle)).map((c) => c.handle),
  );
  const catsToCreate = [...sourceCats.entries()]
    .filter(([slug]) => !presentHandles.has(slug))
    .map(([slug, name]) => ({ name, handle: slug, is_active: true }));
  if (catsToCreate.length) {
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: catsToCreate },
    });
    logger.info(`   created ${catsToCreate.length} missing categories`);
  }

  // ── 4. Re-link every product to its source categories ─────────────────
  logger.info("🔗  re-linking products to categories");
  const catByHandle = new Map(
    (
      (await query.graph({ entity: "product_category", fields: ["id", "handle"] })).data as {
        id: string;
        handle: string;
      }[]
    ).map((c) => [c.handle, c.id]),
  );
  const prodByHandle = new Map(
    (
      (await query.graph({ entity: "product", fields: ["id", "handle"] })).data as {
        id: string;
        handle: string;
      }[]
    ).map((p) => [p.handle, p.id]),
  );

  const updates = rawProducts
    .map((p) => {
      const id = prodByHandle.get(p.slug);
      if (!id) return null;
      const category_ids = (p.categories || [])
        .map((c) => catByHandle.get(c.slug))
        .filter((v): v is string => !!v);
      return { id, category_ids };
    })
    .filter((v): v is { id: string; category_ids: string[] } => !!v);

  const BATCH = 50;
  let linked = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    await updateProductsWorkflow(container).run({ input: { products: slice } });
    linked += slice.length;
    logger.info(`   linked ${linked}/${updates.length}`);
  }

  logger.info("✅  store rebuild complete");
  logger.info(`   GBP region: ${gbpRegion.id}`);
  logger.info(`   products: ${updates.length} re-linked to categories`);
}
