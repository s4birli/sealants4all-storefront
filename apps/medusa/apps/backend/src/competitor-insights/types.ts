export type CompetitorMatch = {
  source: string; // e.g. "google_shopping"
  competitor: string; // retailer name, e.g. "Screwfix"
  title: string;
  url: string;
  price_inc_vat: number | null; // as advertised (UK retail prices include VAT)
  confidence: "high" | "medium" | "low";
};

export type ProductInsight = {
  sku: string;
  handle: string;
  title: string;
  brand: string;
  our_price_ex_vat: number;
  our_price_inc_vat: number;
  market_min: number | null;
  market_median: number | null;
  market_max: number | null;
  // Our position vs the competitor market (inc VAT comparison).
  price_position: "cheapest" | "below_median" | "above_median" | "dearest" | "unknown";
  matches: CompetitorMatch[];
  keyword_gaps: string[]; // keywords competitors use that we don't
  positioning_note: string; // Claude paraphrase — never verbatim competitor copy
  captured_at: string;
};

export type CompetitorRunSummary = {
  generated_at: string;
  configured: boolean; // are the required API keys present?
  products_analysed: number;
  notes: string[];
  insights: ProductInsight[];
};
