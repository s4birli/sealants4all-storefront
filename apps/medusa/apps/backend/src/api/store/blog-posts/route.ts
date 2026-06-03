import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * Public-facing blog post DTO. Persisted at store.metadata.blog_posts as an
 * array of these (snake_case) objects.
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
 * GET /store/blog-posts
 *
 * Returns { blog_posts } containing only published posts, newest first. Auth is
 * provided by the /store publishable-key middleware. Empty array when none are
 * configured.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService = req.scope.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  const all =
    (store?.metadata?.blog_posts as BlogPostDTO[] | undefined) ?? [];

  const blog_posts = all
    .filter((p) => p?.published === true && p?.slug)
    .sort((a, b) => ((a?.date ?? "") < (b?.date ?? "") ? 1 : -1));

  res.json({ blog_posts });
}
