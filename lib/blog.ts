import "server-only";

// Blog source. Medusa is the source of truth: posts are authored in the admin
// (Marketing → Blog) and persisted at store.metadata.blog_posts, served by the
// Store API at GET /store/blog-posts. Whenever that endpoint is empty or
// unreachable we fall back to the seed .mdx files in /content/blog — so the
// blog always renders, even before the backend is wired up. Mirrors lib/hero.ts.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const BLOG_REVALIDATE = Number(process.env.NEXT_PUBLIC_BLOG_REVALIDATE ?? 3600);

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO date string, e.g. "2026-05-20". */
  date: string;
  /** ISO date of last edit; defaults to `date`. */
  updated: string;
  author: string;
  /** Cover image URL (absolute or /public path). Optional. */
  cover?: string;
  tags: string[];
  /** Extra SEO keywords merged into metadata.keywords. */
  keywords: string[];
  /** Estimated reading time in minutes, derived from body word count. */
  readingMinutes: number;
};

export type Post = PostMeta & { content: string };

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Medusa-backed posts (source of truth) ──────────────────────────────────

/** Snake_case post DTO as persisted in store.metadata.blog_posts. */
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

function fromDTO(dto: BlogPostDTO): Post {
  const date = String(dto.date ?? "");
  const body = String(dto.body ?? "");
  return {
    slug: String(dto.slug ?? ""),
    title: String(dto.title ?? ""),
    description: String(dto.description ?? ""),
    date,
    updated: String(dto.updated || date),
    author: String(dto.author || "Sealants4All Team"),
    cover: dto.cover ? String(dto.cover) : undefined,
    tags: Array.isArray(dto.tags) ? dto.tags.map(String) : [],
    keywords: Array.isArray(dto.keywords) ? dto.keywords.map(String) : [],
    readingMinutes: readingMinutes(body),
    content: body,
  };
}

/**
 * Fetch published posts from Medusa. Returns null on empty/unreachable so the
 * caller can fall back to the seed files.
 */
async function fetchMedusaPosts(): Promise<Post[] | null> {
  if (!PUBLISHABLE_KEY) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/store/blog-posts`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      next: { revalidate: BLOG_REVALIDATE, tags: ["blog-posts"] },
    });
    if (!res.ok) return null;
    const { blog_posts } = (await res.json()) as { blog_posts?: BlogPostDTO[] };
    if (!Array.isArray(blog_posts) || blog_posts.length === 0) return null;
    return blog_posts.map(fromDTO).filter((p) => p.slug);
  } catch {
    return null;
  }
}

// ── File-backed posts (seed / fallback) ────────────────────────────────────

function fileReadPost(slug: string): Post | null {
  const file = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const date = String(data.date ?? "");
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date,
    updated: String(data.updated ?? date),
    author: String(data.author ?? "Sealants4All Team"),
    cover: data.cover ? String(data.cover) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    readingMinutes: readingMinutes(content),
    content,
  };
}

function fileReadAll(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => fileReadPost(f.replace(/\.mdx$/, "")))
    .filter((p): p is Post => p !== null);
}

// ── Public API (Medusa-first, file fallback) ───────────────────────────────

const byDateDesc = (a: Post, b: Post) => (a.date < b.date ? 1 : -1);

/** All published posts (metadata only), newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  const posts = (await fetchMedusaPosts()) ?? fileReadAll();
  return [...posts]
    .sort(byDateDesc)
    .map(({ content, ...meta }) => meta);
}

/** A single post with its body, or null. */
export async function getPost(slug: string): Promise<Post | null> {
  const medusa = await fetchMedusaPosts();
  if (medusa) return medusa.find((p) => p.slug === slug) ?? null;
  return fileReadPost(slug);
}

/** All published post slugs. */
export async function getPostSlugs(): Promise<string[]> {
  return (await getAllPosts()).map((p) => p.slug);
}
