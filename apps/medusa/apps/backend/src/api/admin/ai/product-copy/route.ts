import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type Body = {
  title?: string;
  brand?: string;
  category?: string;
  notes?: string;
};

type Generated = {
  description: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
};

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

/**
 * Admin-only: generate marketing copy for a product using Claude.
 * POST /admin/ai/product-copy  { title, brand?, category?, notes? }
 * Returns { description, seo_title, seo_description, tags }.
 * Gracefully returns 503 when ANTHROPIC_API_KEY is not configured.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "AI is not configured. Set ANTHROPIC_API_KEY in the Medusa backend environment, then restart.",
    });
    return;
  }

  const { title, brand, category, notes } = (req.body || {}) as Body;
  if (!title || !title.trim()) {
    res.status(400).json({ error: "A product title is required." });
    return;
  }

  const prompt = [
    "You are a copywriter for a UK trade supplier of sealants, adhesives, fixings and building chemicals (Sealants4All).",
    "Write accurate, professional product copy for a trade/DIY audience. UK English. No invented certifications or numeric specs you cannot infer from the name.",
    "",
    `Product title: ${title}`,
    brand ? `Brand: ${brand}` : "",
    category ? `Category: ${category}` : "",
    notes ? `Extra notes: ${notes}` : "",
    "",
    "Return ONLY a JSON object with this exact shape (no markdown, no prose):",
    `{"description": "<2-4 sentence product description>", "seo_title": "<<=60 chars>", "seo_description": "<<=155 chars>", "tags": ["<3-6 short tags>"]}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // Extract the JSON object defensively (model should return JSON only).
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("AI did not return JSON");
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as Generated;

    res.json({
      description: String(parsed.description || ""),
      seo_title: String(parsed.seo_title || ""),
      seo_description: String(parsed.seo_description || ""),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
      model: MODEL,
    });
  } catch (err) {
    res.status(502).json({ error: `AI request failed: ${(err as Error).message}` });
  }
}
