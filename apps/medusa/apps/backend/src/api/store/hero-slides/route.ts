import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * Public-facing hero slide DTO. Persisted at store.metadata.hero_slides as an
 * array of these (snake_case) objects.
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
 * GET /store/hero-slides
 *
 * Returns { hero_slides } containing only enabled slides, sorted by rank asc.
 * Auth is provided by the /store publishable-key middleware. Empty array when
 * no slides are configured.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  const all = (store?.metadata?.hero_slides as HeroSlideDTO[] | undefined) ?? [];

  const hero_slides = all
    .filter((s) => s?.enabled === true)
    .sort((a, b) => (a?.rank ?? 0) - (b?.rank ?? 0));

  res.json({ hero_slides });
}
