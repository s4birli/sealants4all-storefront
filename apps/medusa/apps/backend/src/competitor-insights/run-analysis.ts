import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { COMPETITOR_CONFIG, competitorKeys, missingKeyNote } from "./config";
import { searchGoogleShopping } from "./sources";
import { extractWithAi, toMatches } from "./ai";
import { CompetitorRunSummary, ProductInsight } from "./types";

const OUT_DIR = resolve(process.cwd(), "exports", "competitor-insights");

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function position(ourIncVat: number, prices: number[]): ProductInsight["price_position"] {
  if (prices.length === 0) return "unknown";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const med = median(prices)!;
  if (ourIncVat <= min) return "cheapest";
  if (ourIncVat >= max) return "dearest";
  return ourIncVat <= med ? "below_median" : "above_median";
}

type LiveProduct = {
  title: string;
  handle: string;
  metadata: Record<string, unknown> | null;
  variants?: { sku: string | null; calculated_price?: { calculated_amount?: number | null } | null }[];
};

async function topProducts(container: MedusaContainer): Promise<LiveProduct[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "currency_code"] });
  const region = (regions as { id: string; currency_code: string }[]).find((r) => r.currency_code === "gbp");
  if (!region) throw new Error("No GBP region configured");

  const { data } = await query.graph({
    entity: "product",
    fields: ["title", "handle", "metadata", "variants.sku", "variants.calculated_price.*"],
    filters: { status: "published" },
    context: {
      variants: { calculated_price: QueryContext({ region_id: region.id, currency_code: "gbp" }) },
    },
  });

  return (data as LiveProduct[])
    .filter((p) => num(p.variants?.[0]?.calculated_price?.calculated_amount) > 0)
    .slice(0, COMPETITOR_CONFIG.maxSkus);
}

/** Build competitor insights for the top-N priced SKUs. Advisory only. */
export async function runCompetitorAnalysis(
  container: MedusaContainer,
): Promise<CompetitorRunSummary> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const keys = competitorKeys();
  const note = missingKeyNote();
  const products = await topProducts(container);

  const insights: ProductInsight[] = [];
  for (const p of products) {
    const sku = p.variants?.[0]?.sku || p.handle;
    const brand = (p.metadata?.brand as string) || "Unbranded";
    const ourEx = num(p.variants?.[0]?.calculated_price?.calculated_amount);
    const ourInc = Math.round(ourEx * (1 + COMPETITOR_CONFIG.vatRate) * 100) / 100;

    let matches: ProductInsight["matches"] = [];
    let keywordGaps: string[] = [];
    let positioning = "";

    if (keys.serper) {
      try {
        const query = `${brand !== "Unbranded" ? brand + " " : ""}${p.title}`.trim();
        const results = await searchGoogleShopping(query);
        const ai = await extractWithAi({ title: p.title, brand }, results);
        matches = toMatches(results, ai);
        keywordGaps = ai.keyword_gaps;
        positioning = ai.positioning_note;
      } catch (err) {
        logger.warn(`competitor analysis failed for ${sku}: ${(err as Error).message}`);
      }
    }

    const prices = matches.map((m) => m.price_inc_vat).filter((v): v is number => v != null);
    insights.push({
      sku,
      handle: p.handle,
      title: p.title,
      brand,
      our_price_ex_vat: ourEx,
      our_price_inc_vat: ourInc,
      market_min: prices.length ? Math.min(...prices) : null,
      market_median: median(prices),
      market_max: prices.length ? Math.max(...prices) : null,
      price_position: position(ourInc, prices),
      matches,
      keyword_gaps: keywordGaps,
      positioning_note: positioning,
      captured_at: new Date().toISOString(),
    });
  }

  const summary: CompetitorRunSummary = {
    generated_at: new Date().toISOString(),
    configured: keys.serper && keys.anthropic,
    products_analysed: insights.length,
    notes: note ? [note, "Advisory only — do not auto-reprice (UK competition law)."] : [
      "Advisory only — do not auto-reprice (UK competition law).",
    ],
    insights,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "insights.json"), JSON.stringify(summary, null, 2));
  logger.info(
    `Competitor analysis: ${insights.length} SKUs${summary.configured ? "" : " (keys missing — prices only)"}`,
  );
  return summary;
}

export function readInsights(): CompetitorRunSummary | null {
  try {
    const raw = readFileSync(resolve(OUT_DIR, "insights.json"), "utf8");
    return JSON.parse(raw) as CompetitorRunSummary;
  } catch {
    return null;
  }
}
