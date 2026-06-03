import "server-only";

// Generic CMS pages (legal + informational: terms, returns, privacy, delivery,
// about, contact). Medusa is the source of truth: pages are authored in the
// admin (Settings → Pages) and persisted at store.metadata.site_pages, served
// by the Store API at GET /store/site-pages. Whenever that endpoint is empty or
// unreachable we fall back to the seed Markdown files in /content/pages — so the
// legal pages always render. Mirrors lib/blog.ts.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PAGES_DIR = path.join(process.cwd(), "content", "pages");
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const PAGE_REVALIDATE = Number(process.env.NEXT_PUBLIC_PAGE_REVALIDATE ?? 3600);

export type SitePage = {
  slug: string;
  title: string;
  description: string;
  /** ISO date of last edit. */
  updated: string;
  /** Markdown body. */
  body: string;
};

/** Snake_case page DTO as persisted in store.metadata.site_pages. */
type SitePageDTO = {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  updated?: string;
  published?: boolean;
};

function fromDTO(dto: SitePageDTO): SitePage {
  return {
    slug: String(dto.slug ?? ""),
    title: String(dto.title ?? ""),
    description: String(dto.description ?? ""),
    updated: String(dto.updated ?? ""),
    body: String(dto.body ?? ""),
  };
}

async function fetchMedusaPages(): Promise<SitePage[] | null> {
  if (!PUBLISHABLE_KEY) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/store/site-pages`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      next: { revalidate: PAGE_REVALIDATE, tags: ["site-pages"] },
    });
    if (!res.ok) return null;
    const { site_pages } = (await res.json()) as { site_pages?: SitePageDTO[] };
    if (!Array.isArray(site_pages) || site_pages.length === 0) return null;
    return site_pages.map(fromDTO).filter((p) => p.slug);
  } catch {
    return null;
  }
}

function fileReadPage(slug: string): SitePage | null {
  const file = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    updated: String(data.updated ?? ""),
    body: content,
  };
}

/** A single page, Medusa-first with file fallback. Null if not found. */
export async function getPage(slug: string): Promise<SitePage | null> {
  const medusa = await fetchMedusaPages();
  if (medusa) {
    const hit = medusa.find((p) => p.slug === slug);
    if (hit) return hit;
    // Page exists in Medusa-managed set but not this slug → fall through to file
    // so a not-yet-authored legal page still renders from seed.
  }
  return fileReadPage(slug);
}
