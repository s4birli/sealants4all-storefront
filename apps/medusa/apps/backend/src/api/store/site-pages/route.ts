import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/** Public site page DTO. Persisted at store.metadata.site_pages. */
type SitePageDTO = {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  updated?: string;
  published?: boolean;
};

/**
 * GET /store/site-pages
 *
 * Returns { site_pages } containing only published pages. Auth is provided by
 * the /store publishable-key middleware. Empty array when none are configured.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  const all =
    (store?.metadata?.site_pages as SitePageDTO[] | undefined) ?? [];

  const site_pages = all.filter((p) => p?.published === true && p?.slug);

  res.json({ site_pages });
}
