import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/homepage
 *
 * Returns { homepage } — the raw homepage config persisted at
 * store.metadata.homepage ({ sections, copy }). The storefront merges it over
 * its built-in defaults (see lib/homepage.ts), so an empty object is fine.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);
  const [store] = await storeModuleService.listStores();
  const homepage = (store?.metadata?.homepage as object | undefined) ?? {};
  res.json({ homepage });
}
