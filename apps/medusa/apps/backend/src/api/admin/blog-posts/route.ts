import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Blog post DTO persisted at store.metadata.blog_posts (snake_case shape).
 * `body` holds the Markdown/MDX article source rendered by the storefront.
 */
type BlogPostDTO = {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  cover?: string;
  author?: string;
  tags?: string[];
  keywords?: string[];
  date?: string;
  updated?: string;
  published?: boolean;
};

/**
 * GET /admin/blog-posts
 *
 * Returns the FULL blog_posts array (incl. drafts) for editing. /admin routes
 * are auth-gated by Medusa already.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);
  const [store] = await storeModuleService.listStores();
  const blog_posts =
    (store?.metadata?.blog_posts as BlogPostDTO[] | undefined) ?? [];
  res.json({ blog_posts });
}

/**
 * POST /admin/blog-posts
 *
 * Body: { blog_posts: [...] }. REPLACES store.metadata.blog_posts while
 * preserving every other existing metadata key (read-merge-write). Returns the
 * saved array.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const body = (req.body ?? {}) as { blog_posts?: unknown };
  if (!Array.isArray(body.blog_posts)) {
    res.status(400).json({ message: "Body must include a `blog_posts` array." });
    return;
  }
  const blog_posts = body.blog_posts as BlogPostDTO[];

  // Reject posts without a slug — the storefront routes on it.
  const missingSlug = blog_posts.some((p) => !p.slug || !p.slug.trim());
  if (missingSlug) {
    res.status(400).json({ message: "Every post needs a non-empty slug." });
    return;
  }
  // Reject duplicate slugs — they'd collide on /blog/[slug].
  const slugs = blog_posts.map((p) => p.slug!.trim());
  if (new Set(slugs).size !== slugs.length) {
    res.status(400).json({ message: "Post slugs must be unique." });
    return;
  }

  const [store] = await storeModuleService.listStores();
  if (!store) {
    res.status(404).json({ message: "No store found." });
    return;
  }

  // Merge: preserve all other metadata keys, replace only blog_posts.
  const metadata = { ...(store.metadata ?? {}), blog_posts };

  await updateStoresWorkflow(req.scope).run({
    input: {
      selector: { id: store.id },
      update: { metadata },
    },
  });

  // Fire-and-forget: bust the storefront's "blog-posts" cache tag so edits go
  // live immediately instead of waiting for the timed revalidate. Never throw —
  // a down storefront must not fail the save. Same secret/contract as the
  // catalogue subscriber (see src/subscribers/revalidate-storefront.ts).
  await pingStorefront();

  res.json({ blog_posts });
}

async function pingStorefront(): Promise<void> {
  const base = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}tag=blog-posts`;
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ event: "blog-posts.updated" }),
    });
  } catch {
    // Storefront unreachable — ignore so the save still succeeds.
  }
}
