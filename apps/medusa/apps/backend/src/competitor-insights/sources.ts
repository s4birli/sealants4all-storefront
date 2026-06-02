import { COMPETITOR_CONFIG } from "./config";

export type ShoppingResult = {
  title: string;
  price_inc_vat: number | null;
  competitor: string;
  url: string;
};

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  const m = String(raw ?? "").match(/[\d,]+\.?\d*/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Discovery via Google Shopping (through Serper.dev). We query Google's index,
 * not competitor sites directly — keeps us clear of competitor ToS at the
 * discovery step. Returns [] when SERPER_API_KEY is absent.
 */
export async function searchGoogleShopping(query: string): Promise<ShoppingResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  const res = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: COMPETITOR_CONFIG.geo }),
  });
  if (!res.ok) {
    throw new Error(`Serper shopping ${res.status}`);
  }
  const data = (await res.json()) as { shopping?: Record<string, unknown>[] };
  return (data.shopping || []).slice(0, COMPETITOR_CONFIG.maxResultsPerSku).map((r) => ({
    title: String(r.title ?? ""),
    price_inc_vat: parsePrice(r.price),
    competitor: String(r.source ?? "unknown"),
    url: String(r.link ?? ""),
  }));
}
