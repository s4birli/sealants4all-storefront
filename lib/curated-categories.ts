/**
 * Editorial "curated" category buckets shown on the homepage and in nav.
 * A product can belong to several buckets (membership is rule-based, not a
 * single assignment), so category pages compute membership with `matchesCurated`
 * rather than an exact-equality check — this keeps buckets like "tools" and
 * "primers" from losing products to an earlier-matching bucket.
 *
 * Mirrors scripts/transform-catalogue.mjs.
 */
export type CuratedRule = {
  id: string;
  match: (slugs: string[], nameLower: string) => boolean;
};

export const CURATED_RULES: CuratedRule[] = [
  {
    id: "caravan",
    match: (slugs, name) =>
      /caravan|marine|motorhome/.test(name) || slugs.includes("caravan-sealants"),
  },
  {
    id: "joint",
    match: (slugs) =>
      slugs.includes("joint-sealing") || slugs.includes("adhesives-sealants"),
  },
  {
    id: "fire",
    match: (slugs, name) =>
      /fire|intumescent|firecryl/.test(name) || slugs.some((s) => s.includes("fire")),
  },
  {
    id: "ewi",
    match: (slugs) =>
      slugs.includes("ewi-systems") || slugs.includes("decorative-renders"),
  },
  {
    id: "fixing",
    match: (slugs) =>
      slugs.includes("fixing") || slugs.includes("accessories-for-direct-fastening"),
  },
  {
    id: "water",
    match: (slugs) =>
      slugs.includes("waterproofing-materials") || slugs.includes("floor-systems"),
  },
  {
    id: "primers",
    match: (slugs) =>
      slugs.includes("pre-treatments-and-primers") ||
      slugs.includes("primers") ||
      slugs.includes("cleaning"),
  },
  {
    id: "tools",
    match: (slugs) =>
      /tools|gun|applicator|bit-set/.test(slugs.join(" ")) ||
      slugs.includes("power-tools-accessories") ||
      slugs.includes("sealant-application-gun"),
  },
];

/** First curated bucket a product falls into (used as its primary tag). */
export function curatedCategoryFor(slugs: string[], name: string): string | null {
  return CURATED_RULES.find((r) => r.match(slugs, name.toLowerCase()))?.id ?? null;
}

/** Whether a product belongs to a specific curated bucket (multi-membership). */
export function matchesCurated(id: string, slugs: string[], name: string): boolean {
  const rule = CURATED_RULES.find((r) => r.id === id);
  return rule ? rule.match(slugs, name.toLowerCase()) : false;
}
