import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { runCompetitorAnalysis, readInsights } from "../../../competitor-insights/run-analysis";

/** GET /admin/competitor-insights → latest stored insights. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json(readInsights() || { configured: false, products_analysed: 0, insights: [], notes: ["Not run yet."] });
}

/** POST /admin/competitor-insights → run the analysis now (advisory only). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const summary = await runCompetitorAnalysis(req.scope);
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}
