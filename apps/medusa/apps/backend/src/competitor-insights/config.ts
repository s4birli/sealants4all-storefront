/**
 * Competitor-insights module configuration & guardrails.
 *
 * IMPORTANT — legal posture: this module is ADVISORY ONLY. It surfaces
 * competitor prices/keywords for a human to review. It must never drive
 * automatic repricing to match or avoid undercutting competitors (that is a
 * UK competition-law breach). We store facts (prices, keywords) and a
 * Claude-paraphrased note — never verbatim competitor descriptions/images.
 */
export const COMPETITOR_CONFIG = {
  // Keep v1 cheap: only analyse the top N priced SKUs.
  maxSkus: Number(process.env.COMPETITOR_MAX_SKUS ?? 15),
  // Routine nightly pass — Haiku is plenty; override with COMPETITOR_MODEL.
  model: process.env.COMPETITOR_MODEL || "claude-haiku-4-5",
  geo: "uk",
  vatRate: 0.2,
  maxResultsPerSku: 8,
};

export function competitorKeys() {
  return {
    serper: !!process.env.SERPER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
}

export function missingKeyNote(): string | null {
  const k = competitorKeys();
  if (k.serper && k.anthropic) return null;
  const missing = [!k.serper && "SERPER_API_KEY", !k.anthropic && "ANTHROPIC_API_KEY"]
    .filter(Boolean)
    .join(" and ");
  return `Competitor analysis is not configured. Set ${missing} in the backend environment, then run again.`;
}
