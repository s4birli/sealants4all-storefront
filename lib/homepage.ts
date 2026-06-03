import "server-only";

// Homepage section config. Medusa is the source of truth: the section order,
// each section's on/off state, and the editable headings/copy live at
// store.metadata.homepage, served by GET /store/homepage. Falls back to the
// built-in defaults below whenever that is empty or unreachable. Mirrors
// lib/hero.ts / lib/blog.ts.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const HOMEPAGE_REVALIDATE = Number(
  process.env.NEXT_PUBLIC_HOMEPAGE_REVALIDATE ?? 60,
);

export type SectionKey =
  | "hero"
  | "trust"
  | "categories"
  | "brands"
  | "bestsellers"
  | "trade"
  | "deals"
  | "newarrivals"
  | "applications"
  | "reviews"
  | "whyus"
  | "newsletter";

export type SectionCopy = Record<string, string>;

export type HomepageConfig = {
  /** Sections in render order with their on/off state. */
  sections: { key: SectionKey; enabled: boolean }[];
  /** Per-section editable copy (field → value), already merged over defaults. */
  copy: Record<string, SectionCopy>;
};

/** Canonical section order + default on/off. Hero & product sections included. */
export const DEFAULT_ORDER: { key: SectionKey; enabled: boolean }[] = [
  { key: "hero", enabled: true },
  { key: "trust", enabled: true },
  { key: "categories", enabled: true },
  { key: "brands", enabled: true },
  { key: "bestsellers", enabled: true },
  { key: "trade", enabled: true },
  { key: "deals", enabled: true },
  { key: "newarrivals", enabled: true },
  { key: "applications", enabled: true },
  { key: "reviews", enabled: true },
  { key: "whyus", enabled: true },
  { key: "newsletter", enabled: true },
];

/** Default editable copy per section. Blank admin fields fall back to these. */
export const DEFAULT_COPY: Record<string, SectionCopy> = {
  categories: {
    heading: "Shop by category",
    sub: "Trade sealants, adhesives, fixings and EWI systems — all in stock, dispatched from London.",
  },
  brands: {
    heading: "Shop by brand",
    sub: "Official UK distributor of six leading brands — and our own private-label S4ALL Pro range.",
  },
  bestsellers: { kicker: "Most ordered", title: "Best sellers" },
  trade: {
    eyebrow: "For Trade Customers",
    title: "Open a trade account — save up to 30% on bulk orders.",
    sub: "Volume pricing, net-30 terms, a named account manager, and priority dispatch. Application takes 3 minutes. Decision within 1 business day.",
    ctaLabel: "Apply now →",
    ctaHref: "/trade",
  },
  deals: {
    heading: "Deals of the week",
    sub: "Six trade-favourite SKUs at clearance pricing. Offer ends in:",
  },
  newarrivals: { kicker: "Just landed", title: "New arrivals" },
  applications: {
    heading: "Shop by application",
    sub: "The right product for the job. Filtered by the work you're actually doing.",
  },
  reviews: {
    heading: "What our customers say",
    sub: "2,314 reviews on Trustpilot",
  },
  whyus: {
    heading: "Why choose Sealants4All",
    sub: "Five years supplying UK trade. 50,000+ orders shipped. Zero phone-only pricing.",
  },
  newsletter: {
    heading: "Trade tips, new products, exclusive deals.",
    sub: "Monthly. We respect the inbox. Unsubscribe in one click.",
  },
};

const KNOWN = new Set<SectionKey>(DEFAULT_ORDER.map((s) => s.key));

type HomepageDTO = {
  sections?: { key?: string; enabled?: boolean }[];
  copy?: Record<string, Record<string, unknown>>;
};

/** Merge a stored DTO over the defaults so the homepage always renders fully. */
function mergeConfig(dto: HomepageDTO | null): HomepageConfig {
  // Sections: start from the stored order (valid keys only), then append any
  // known section the admin hasn't placed yet so new sections still appear.
  let sections: { key: SectionKey; enabled: boolean }[] = [];
  if (dto && Array.isArray(dto.sections)) {
    const seen = new Set<string>();
    for (const s of dto.sections) {
      const key = s?.key as SectionKey;
      if (KNOWN.has(key) && !seen.has(key)) {
        seen.add(key);
        sections.push({ key, enabled: s?.enabled !== false });
      }
    }
    for (const def of DEFAULT_ORDER) {
      if (!seen.has(def.key)) sections.push(def);
    }
  } else {
    sections = [...DEFAULT_ORDER];
  }

  // Copy: defaults overlaid with non-empty stored values.
  const copy: Record<string, SectionCopy> = {};
  for (const [key, defFields] of Object.entries(DEFAULT_COPY)) {
    const stored = dto?.copy?.[key] ?? {};
    const merged: SectionCopy = { ...defFields };
    for (const [field, val] of Object.entries(stored)) {
      const str = typeof val === "string" ? val.trim() : "";
      if (str) merged[field] = str;
    }
    copy[key] = merged;
  }

  return { sections, copy };
}

export async function getHomepage(): Promise<HomepageConfig> {
  if (!PUBLISHABLE_KEY) return mergeConfig(null);
  try {
    const res = await fetch(`${BACKEND_URL}/store/homepage`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      next: { revalidate: HOMEPAGE_REVALIDATE, tags: ["homepage"] },
    });
    if (!res.ok) return mergeConfig(null);
    const { homepage } = (await res.json()) as { homepage?: HomepageDTO };
    return mergeConfig(homepage ?? null);
  } catch {
    return mergeConfig(null);
  }
}
