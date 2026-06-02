import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Hero slide DTO persisted at store.metadata.hero_slides (snake_case shape).
 */
type HeroSlideDTO = {
  eyebrow?: string;
  title?: string;
  sub?: string;
  cta_primary_label?: string;
  cta_primary_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  bg?: string;
  accent?: string;
  product_cap?: string;
  tag?: string;
  rank?: number;
  enabled?: boolean;
};

/**
 * GET /admin/hero-slides
 *
 * Returns the FULL hero_slides array (incl. disabled) for editing. /admin routes
 * are auth-gated by Medusa already.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);
  const [store] = await storeModuleService.listStores();
  const hero_slides = (store?.metadata?.hero_slides as HeroSlideDTO[] | undefined) ?? [];
  res.json({ hero_slides });
}

/**
 * POST /admin/hero-slides
 *
 * Body: { hero_slides: [...] }. REPLACES store.metadata.hero_slides while
 * preserving every other existing metadata key (read-merge-write). Returns the
 * saved array.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const body = (req.body ?? {}) as { hero_slides?: unknown };
  if (!Array.isArray(body.hero_slides)) {
    res.status(400).json({ message: "Body must include a `hero_slides` array." });
    return;
  }
  const hero_slides = body.hero_slides as HeroSlideDTO[];

  const [store] = await storeModuleService.listStores();
  if (!store) {
    res.status(404).json({ message: "No store found." });
    return;
  }

  // Merge: preserve all other metadata keys, replace only hero_slides.
  const metadata = { ...(store.metadata ?? {}), hero_slides };

  await updateStoresWorkflow(req.scope).run({
    input: {
      selector: { id: store.id },
      update: { metadata },
    },
  });

  res.json({ hero_slides });
}
