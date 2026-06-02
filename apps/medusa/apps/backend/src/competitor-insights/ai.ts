import { COMPETITOR_CONFIG } from "./config";
import type { ShoppingResult } from "./sources";
import type { CompetitorMatch } from "./types";

export type AiExtraction = {
  matches: { index: number; confidence: "high" | "medium" | "low" }[];
  keyword_gaps: string[];
  positioning_note: string;
};

type ProductLite = { title: string; brand: string };

/**
 * Claude matches which shopping results are genuine equivalents of our product,
 * extracts competitor keyword gaps, and writes a short paraphrased positioning
 * note. Prices are NEVER taken from the model — they come from the source.
 * Returns empty extraction when ANTHROPIC_API_KEY is absent.
 */
export async function extractWithAi(
  product: ProductLite,
  results: ShoppingResult[],
): Promise<AiExtraction> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || results.length === 0) {
    return { matches: [], keyword_gaps: [], positioning_note: "" };
  }

  const resultLines = results
    .map((r, i) => `${i}. ${r.title} — ${r.competitor}${r.price_inc_vat ? ` (£${r.price_inc_vat})` : ""}`)
    .join("\n");

  const prompt = [
    "You compare a UK trade product against competitor shopping results.",
    "Decide which results are GENUINE EQUIVALENTS (same brand, product line and pack/size).",
    "Do NOT copy competitor description text. Paraphrase only.",
    "",
    `Our product: ${product.brand} ${product.title}`,
    "Competitor results (index. title — retailer (price)):",
    resultLines,
    "",
    "Return ONLY JSON with this shape (no markdown):",
    `{"matches":[{"index":<number>,"confidence":"high|medium|low"}],"keyword_gaps":["<keywords competitors use that we likely lack>"],"positioning_note":"<one short paraphrased sentence on how we compare>"}`,
  ].join("\n");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key });
  const message = await client.messages.create({
    model: COMPETITOR_CONFIG.model,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return { matches: [], keyword_gaps: [], positioning_note: "" };
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as AiExtraction;
    return {
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      keyword_gaps: Array.isArray(parsed.keyword_gaps) ? parsed.keyword_gaps.map(String).slice(0, 8) : [],
      positioning_note: String(parsed.positioning_note || ""),
    };
  } catch {
    return { matches: [], keyword_gaps: [], positioning_note: "" };
  }
}

/** Combine source results + AI matches into validated CompetitorMatch[]. */
export function toMatches(results: ShoppingResult[], ai: AiExtraction): CompetitorMatch[] {
  return ai.matches
    .filter((m) => results[m.index])
    .map((m) => {
      const r = results[m.index];
      return {
        source: "google_shopping",
        competitor: r.competitor,
        title: r.title,
        url: r.url,
        price_inc_vat: r.price_inc_vat,
        confidence: m.confidence,
      };
    });
}
