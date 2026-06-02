import { ExecArgs } from "@medusajs/framework/types";
import {
  createCollectionsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Seed the three homepage merchandising collections from the storefront's
 * editorial SKU lists (lib/curation.ts).
 *
 * Contract (must match the storefront):
 *   - handles: best-sellers / deals / new-arrivals
 *   - a product belongs to AT MOST ONE collection (collection_id is single)
 *   - de-duplicated by priority best-sellers > new-arrivals > deals
 *
 * Idempotent: collections are created only if missing, and product membership is
 * set every run (so re-running re-applies the curation lists).
 */

type Curation = {
  BEST_SKU: string[];
  NEW_SKU: string[];
  DEALS_SKU: string[];
};

const COLLECTIONS: { handle: string; title: string }[] = [
  { handle: "best-sellers", title: "Best Sellers" },
  { handle: "new-arrivals", title: "New Arrivals" },
  { handle: "deals", title: "Deals" },
];

/**
 * Read the SKU arrays out of the storefront's lib/curation.ts. The file is plain
 * TS with `export const NAME: string[] = [ ... ]` literals — we parse those out
 * directly so this backend script doesn't need to import across the workspace
 * boundary / transpile the storefront module.
 */
function readCuration(): Curation {
  // backend cwd is apps/medusa/apps/backend; the storefront repo root is 3 up.
  // Try a few candidates so the script works whether run from source or build.
  const candidates = [
    resolve(__dirname, "..", "..", "..", "..", "..", "..", "lib", "curation.ts"),
    resolve(process.cwd(), "..", "..", "..", "lib", "curation.ts"),
    resolve(process.cwd(), "lib", "curation.ts"),
  ];
  const file = candidates.find((p) => {
    try {
      readFileSync(p, "utf8");
      return true;
    } catch {
      return false;
    }
  });
  if (!file) {
    throw new Error(
      `Could not locate lib/curation.ts. Tried:\n  ${candidates.join("\n  ")}`,
    );
  }
  const src = readFileSync(file, "utf8");

  const extract = (name: string): string[] => {
    const re = new RegExp(`export\\s+const\\s+${name}\\s*:[^=]*=\\s*\\[([\\s\\S]*?)\\]`);
    const m = src.match(re);
    if (!m) return [];
    return m[1]
      .split(",")
      .map((s) => s.trim())
      .map((s) => s.replace(/^["'`]|["'`]$/g, "").trim())
      .filter(Boolean);
  };

  return {
    BEST_SKU: extract("BEST_SKU"),
    NEW_SKU: extract("NEW_SKU"),
    DEALS_SKU: extract("DEALS_SKU"),
  };
}

export default async function seedCollections({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("🏷   Seeding homepage collections from lib/curation.ts");
  const { BEST_SKU, NEW_SKU, DEALS_SKU } = readCuration();
  logger.info(
    `   read curation: ${BEST_SKU.length} best, ${NEW_SKU.length} new, ${DEALS_SKU.length} deals`,
  );

  // ── 1. Ensure the three collections exist (idempotent) ────────────────
  const existing = (await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })).data as { id: string; handle: string }[];
  const collByHandle = new Map(existing.map((c) => [c.handle, c.id]));

  const toCreate = COLLECTIONS.filter((c) => !collByHandle.has(c.handle)).map(
    (c) => ({ title: c.title, handle: c.handle }),
  );

  if (toCreate.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: toCreate },
    });
    for (const c of result as { id: string; handle: string }[]) {
      collByHandle.set(c.handle, c.id);
    }
    logger.info(`   created ${toCreate.length} collections: ${toCreate.map((c) => c.handle).join(", ")}`);
  } else {
    logger.info("   collections already present");
  }

  // ── 2. De-dup SKU → collection handle by priority best > new > deals ──
  const skuToHandle = new Map<string, string>();
  const assign = (skus: string[], handle: string) => {
    for (const raw of skus) {
      const sku = raw.trim();
      if (!sku) continue;
      if (!skuToHandle.has(sku)) skuToHandle.set(sku, handle);
    }
  };
  assign(BEST_SKU, "best-sellers");
  assign(NEW_SKU, "new-arrivals");
  assign(DEALS_SKU, "deals");

  // ── 3. Resolve each SKU to a product id (via its variant) ─────────────
  const allSkus = [...skuToHandle.keys()];
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "variants.sku"],
    filters: { variants: { sku: allSkus } },
  });

  // Group target product ids per collection handle.
  const idsByHandle = new Map<string, string[]>();
  const resolvedSkus = new Set<string>();
  for (const p of products as { id: string; variants: { sku: string | null }[] }[]) {
    const matchSku = (p.variants || [])
      .map((v) => v.sku)
      .find((s): s is string => !!s && skuToHandle.has(s));
    if (!matchSku) continue;
    resolvedSkus.add(matchSku);
    const handle = skuToHandle.get(matchSku)!;
    const list = idsByHandle.get(handle) ?? [];
    list.push(p.id);
    idsByHandle.set(handle, list);
  }

  const missing = allSkus.filter((s) => !resolvedSkus.has(s));
  if (missing.length) {
    logger.warn(`   ${missing.length} curated SKU(s) not found in catalogue: ${missing.join(", ")}`);
  }

  // ── 4. Set each product's collection_id (single membership) ───────────
  let assigned = 0;
  for (const { handle } of COLLECTIONS) {
    const collectionId = collByHandle.get(handle);
    const ids = idsByHandle.get(handle) ?? [];
    if (!collectionId || ids.length === 0) continue;

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: ids },
        update: { collection_id: collectionId },
      },
    });
    assigned += ids.length;
    logger.info(`   ${handle}: assigned ${ids.length} product(s)`);
  }

  logger.info(`✅  Collections seed complete — ${assigned} product(s) assigned.`);
}
