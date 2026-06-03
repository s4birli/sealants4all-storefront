import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Homepage config persisted at store.metadata.homepage:
 *   { sections: [{ key, enabled }], copy: { [sectionKey]: { field: value } } }
 * Controls homepage section order, visibility and editable headings/copy.
 */
type HomepageDTO = {
  sections?: { key?: string; enabled?: boolean }[];
  copy?: Record<string, Record<string, string>>;
};

/** GET /admin/homepage — the saved homepage config (or {} if unset). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);
  const [store] = await storeModuleService.listStores();
  const homepage =
    (store?.metadata?.homepage as HomepageDTO | undefined) ?? {};
  res.json({ homepage });
}

/**
 * POST /admin/homepage — body { homepage: { sections, copy } }. Replaces
 * store.metadata.homepage (preserving other metadata) and pings the storefront
 * to revalidate the "homepage" cache tag.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const body = (req.body ?? {}) as { homepage?: unknown };
  const homepage = body.homepage as HomepageDTO | undefined;
  if (!homepage || typeof homepage !== "object" || Array.isArray(homepage)) {
    res.status(400).json({ message: "Body must include a `homepage` object." });
    return;
  }

  const [store] = await storeModuleService.listStores();
  if (!store) {
    res.status(404).json({ message: "No store found." });
    return;
  }

  const metadata = { ...(store.metadata ?? {}), homepage };

  await updateStoresWorkflow(req.scope).run({
    input: {
      selector: { id: store.id },
      update: { metadata },
    },
  });

  await pingStorefront();

  res.json({ homepage });
}

async function pingStorefront(): Promise<void> {
  const base = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}tag=homepage`;
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ event: "homepage.updated" }),
    });
  } catch {
    // Storefront unreachable — ignore so the save still succeeds.
  }
}
