import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { buildAmazonDraftExport } from "./adapters/amazon";
import { buildB2BCsv } from "./adapters/b2b";
import { buildEbayInventoryExport } from "./adapters/ebay";
import { buildEtsyDraftExport } from "./adapters/etsy";
import { buildOwnStoreSnapshot } from "./adapters/own-store";
import { buildTikTokDraftExport } from "./adapters/tiktok";
import { buildVintedReviewCsv } from "./adapters/vinted";
import { CHANNELS } from "./channels";
import { ChannelExportSummary, ChannelListingTemplate, SyncProduct } from "./types";

type RawMedusaProduct = {
  title: string;
  handle: string;
  description: string | null;
  weight: number | null;
  metadata: Record<string, unknown> | null;
  tags?: { value: string }[];
  categories?: { name: string }[];
  images?: { url: string }[];
  variants?: {
    sku: string | null;
    calculated_price?: { calculated_amount?: number | null; original_amount?: number | null } | null;
  }[];
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Pull the live catalogue from Medusa and shape it for channel adapters. */
async function loadLiveSyncProducts(container: MedusaContainer): Promise<SyncProduct[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
  });
  const region = (regions as { id: string; currency_code: string }[]).find(
    (r) => r.currency_code === "gbp",
  );
  if (!region) throw new Error("No GBP region configured");

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "title",
      "handle",
      "description",
      "weight",
      "metadata",
      "tags.value",
      "categories.name",
      "images.url",
      "variants.sku",
      "variants.calculated_price.*",
    ],
    filters: { status: "published" },
    context: {
      variants: { calculated_price: QueryContext({ region_id: region.id, currency_code: "gbp" }) },
    },
  });

  return (data as RawMedusaProduct[]).map((p) => {
    const variant = p.variants?.[0];
    const price = num(variant?.calculated_price?.calculated_amount);
    const original = num(variant?.calculated_price?.original_amount);
    const text = (p.description || "").replace(/\s+/g, " ").trim();
    return {
      source_id: num(p.metadata?.source_id),
      sku: variant?.sku || p.handle,
      handle: p.handle,
      title: p.title,
      description_html: p.description || "",
      description_text: text,
      brand: (p.metadata?.brand as string) || "Unbranded",
      category_names: (p.categories || []).map((c) => c.name),
      tags: (p.tags || []).map((t) => t.value),
      source_url: (p.metadata?.source_permalink as string) || "",
      image_urls: (p.images || []).map((i) => i.url).filter(Boolean),
      price,
      compare_at_price: original > price ? original : null,
      currency_code: "GBP",
      in_stock: true,
      inventory_quantity: 100,
      weight_grams: num(p.weight) || 500,
    } satisfies SyncProduct;
  });
}

export type ChannelExportResult = ChannelExportSummary & { out_dir: string };

/** Generate all channel feeds from the live Medusa catalogue. Dry-run: writes
 *  draft payloads/snapshots, never publishes to any external platform. */
export async function runChannelExport(
  container: MedusaContainer,
): Promise<ChannelExportResult> {
  const products = await loadLiveSyncProducts(container);
  const exportable = products.filter((p) => p.sku && p.price > 0);

  const outDir = resolve(process.cwd(), "exports", "channel-sync");
  mkdirSync(outDir, { recursive: true });

  const files = {
    own_store_snapshot: resolve(outDir, "own-store-master-snapshot.json"),
    amazon_draft_json: resolve(outDir, "amazon-listings-draft.json"),
    ebay_draft_json: resolve(outDir, "ebay-inventory-draft.json"),
    tiktok_draft_json: resolve(outDir, "tiktok-products-draft.json"),
    etsy_draft_json: resolve(outDir, "etsy-listings-draft.json"),
    vinted_manual_review_csv: resolve(outDir, "vinted-manual-review.csv"),
    b2b_price_list_csv: resolve(outDir, "b2b-price-list.csv"),
    mapping_template_jsonl: resolve(outDir, "channel-listings-template.jsonl"),
  };

  writeFileSync(files.own_store_snapshot, JSON.stringify(buildOwnStoreSnapshot(exportable), null, 2));
  writeFileSync(files.amazon_draft_json, JSON.stringify(buildAmazonDraftExport(exportable), null, 2));
  writeFileSync(files.ebay_draft_json, JSON.stringify(buildEbayInventoryExport(exportable), null, 2));
  writeFileSync(files.tiktok_draft_json, JSON.stringify(buildTikTokDraftExport(exportable), null, 2));
  writeFileSync(files.etsy_draft_json, JSON.stringify(buildEtsyDraftExport(exportable), null, 2));
  writeFileSync(files.vinted_manual_review_csv, buildVintedReviewCsv(exportable));
  writeFileSync(files.b2b_price_list_csv, buildB2BCsv(exportable));

  const mapping: ChannelListingTemplate[] = exportable.map((p) => ({
    sku: p.sku,
    medusa_handle: p.handle,
    title: p.title,
    sync_enabled: false,
    amazon_seller_sku: p.sku,
    amazon_asin: null,
    ebay_inventory_item_sku: p.sku,
    ebay_offer_id: null,
    tiktok_product_id: null,
    etsy_listing_id: null,
    vinted_item_id: null,
    b2b_enabled: true,
    last_synced_hash: null,
  }));
  writeFileSync(files.mapping_template_jsonl, mapping.map((m) => JSON.stringify(m)).join("\n") + "\n");

  const summary: ChannelExportResult = {
    generated_at: new Date().toISOString(),
    source: "medusa-live",
    product_count: products.length,
    priced_product_count: exportable.length,
    channels: CHANNELS,
    files,
    warnings:
      products.length === 0
        ? ["No published products found in Medusa."]
        : [`${products.length - exportable.length} products excluded (no price / POA).`],
    out_dir: outDir,
  };
  writeFileSync(resolve(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}
