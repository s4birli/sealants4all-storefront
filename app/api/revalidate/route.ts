import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// On-demand cache-revalidation hook. Medusa fires a POST here after a dashboard
// edit so the storefront catalogue cache is busted INSTANTLY instead of waiting
// up to NEXT_PUBLIC_CATALOG_REVALIDATE seconds (default 60) for the timed
// revalidate in lib/medusa.ts. The Medusa subscriber and this route share a
// secret (REVALIDATE_SECRET) and the cache tag below — they MUST stay in lockstep.
//
// Contract with the Medusa subscriber:
//   - auth: secret via the `x-revalidate-secret` header OR the `?secret=` query
//     param, compared to process.env.REVALIDATE_SECRET (server-only env var).
//   - on success: revalidates the "catalog" tag — the only tag attached to the
//     catalogue fetches in lib/medusa.ts (storeFetch -> next.tags: ["catalog"]).
//
// Node runtime + force-dynamic so the handler runs on every request (never
// statically optimised or response-cached) and revalidateTag is available.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The cache tags the storefront attaches to its Medusa fetches:
//   - "catalog"     → every catalogue fetch in lib/medusa.ts (storeFetch).
//   - "hero-slides" → the hero-slides fetch in lib/hero.ts.
// A POST with no ?tag= busts "catalog" (the default the Medusa product subscriber
// relies on); ?tag=hero-slides (or a comma list) busts those instead, so a hero
// edit in the admin can be reflected on-demand too.
const CATALOG_TAG = "catalog";
const ALLOWED_TAGS = new Set([CATALOG_TAG, "hero-slides"]);

export async function POST(req: Request): Promise<Response> {
  // Accept the secret from a header (preferred for server-to-server calls) or a
  // query param (handy for a manual curl). Header wins when both are present.
  const headerSecret = req.headers.get("x-revalidate-secret");
  const querySecret = new URL(req.url).searchParams.get("secret");
  const provided = headerSecret ?? querySecret;

  const expected = process.env.REVALIDATE_SECRET;

  // Reject when no secret is configured, none was sent, or it doesn't match.
  // Never echo the expected value — just a flat unauthorized.
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json(
      { revalidated: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Default to the catalogue tag (what the Medusa product subscriber posts with);
  // an explicit ?tag= (comma-separated) busts those allowed tags instead.
  const tagParam = new URL(req.url).searchParams.get("tag");
  const tags = (tagParam ? tagParam.split(",") : [CATALOG_TAG])
    .map((t) => t.trim())
    .filter((t) => ALLOWED_TAGS.has(t));
  if (tags.length === 0) tags.push(CATALOG_TAG);
  for (const t of tags) revalidateTag(t);

  return NextResponse.json({
    revalidated: true,
    tags,
    now: Date.now(),
  });
}

// Accidental browser hits (which arrive as GET) get a clear 405 instead of a
// confusing 404 or a silent no-op — revalidation only ever happens via POST.
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { revalidated: false, error: "method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
