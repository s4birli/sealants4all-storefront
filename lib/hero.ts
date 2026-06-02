import "server-only";

/**
 * Server-side reader for the homepage hero slides. Medusa is the source of
 * truth: slides live in store.metadata.hero_slides and are served (enabled +
 * sorted) by the Store API at GET /store/hero-slides. Falls back to the
 * hardcoded HERO_SLIDES whenever the endpoint is empty or unreachable.
 */

import type { HeroSlide } from "@/lib/data/types";
import { HERO_SLIDES } from "@/lib/data/heroSlides";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

// Mirror the catalogue revalidation window so hero edits propagate alongside it.
const CATALOG_REVALIDATE = Number(process.env.NEXT_PUBLIC_CATALOG_REVALIDATE ?? 60);

/** Snake_case slide DTO as persisted in store.metadata.hero_slides. */
type HeroSlideDTO = {
  eyebrow?: string;
  title?: string;
  sub?: string;
  cta_primary_label?: string;
  cta_primary_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  bg?: string;
  accent?: string;
  product_cap?: string;
  tag?: string;
  rank?: number;
  enabled?: boolean;
};

/** Map a Store API slide DTO into the storefront's HeroSlide domain model. */
function toHeroSlide(dto: HeroSlideDTO): HeroSlide {
  return {
    eyebrow: dto.eyebrow ?? "",
    title: dto.title ?? "",
    sub: dto.sub ?? "",
    ctaPrimary: {
      label: dto.cta_primary_label ?? "",
      href: dto.cta_primary_href ?? "",
    },
    ctaSecondary: {
      label: dto.cta_secondary_label ?? "",
      href: dto.cta_secondary_href ?? "",
    },
    bg: dto.bg ?? "",
    accent: dto.accent ?? "",
    productCap: dto.product_cap ?? "",
    tag: dto.tag ?? "",
  };
}

/**
 * Fetch the enabled hero slides (rank-sorted by the backend). Returns the
 * hardcoded HERO_SLIDES on empty results or any failure so the homepage hero
 * always renders.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/hero-slides`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      // Cache in the Next Data Cache and revalidate periodically. Tagged so a
      // hero change can revalidate on demand (revalidateTag("hero-slides")).
      next: { revalidate: CATALOG_REVALIDATE, tags: ["hero-slides"] },
    });
    if (!res.ok) return HERO_SLIDES;
    const { hero_slides } = (await res.json()) as { hero_slides?: HeroSlideDTO[] };
    if (!Array.isArray(hero_slides) || hero_slides.length === 0) return HERO_SLIDES;
    return hero_slides.map(toHeroSlide);
  } catch {
    return HERO_SLIDES;
  }
}
