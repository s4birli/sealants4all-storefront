import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Site page DTO persisted at store.metadata.site_pages (snake_case shape).
 * Generic CMS pages: legal (terms, returns, privacy, delivery) + info (about,
 * contact). `body` holds the Markdown rendered by the storefront.
 */
type SitePageDTO = {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  updated?: string;
  published?: boolean;
};

/**
 * GET /admin/site-pages
 *
 * Returns the FULL site_pages array (incl. unpublished) for editing.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);
  const [store] = await storeModuleService.listStores();
  const site_pages =
    (store?.metadata?.site_pages as SitePageDTO[] | undefined) ?? [];
  res.json({ site_pages });
}

/**
 * POST /admin/site-pages
 *
 * Body: { site_pages: [...] }. REPLACES store.metadata.site_pages while
 * preserving every other metadata key (read-merge-write). Returns the saved
 * array and pings the storefront to revalidate the "site-pages" cache.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const body = (req.body ?? {}) as { site_pages?: unknown };
  if (!Array.isArray(body.site_pages)) {
    res.status(400).json({ message: "Body must include a `site_pages` array." });
    return;
  }
  const site_pages = body.site_pages as SitePageDTO[];

  if (site_pages.some((p) => !p.slug || !p.slug.trim())) {
    res.status(400).json({ message: "Every page needs a non-empty slug." });
    return;
  }
  const slugs = site_pages.map((p) => p.slug!.trim());
  if (new Set(slugs).size !== slugs.length) {
    res.status(400).json({ message: "Page slugs must be unique." });
    return;
  }

  const [store] = await storeModuleService.listStores();
  if (!store) {
    res.status(404).json({ message: "No store found." });
    return;
  }

  const metadata = { ...(store.metadata ?? {}), site_pages };

  await updateStoresWorkflow(req.scope).run({
    input: {
      selector: { id: store.id },
      update: { metadata },
    },
  });

  await pingStorefront();

  res.json({ site_pages });
}

async function pingStorefront(): Promise<void> {
  const base = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}tag=site-pages`;
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ event: "site-pages.updated" }),
    });
  } catch {
    // Storefront unreachable — ignore so the save still succeeds.
  }
}
