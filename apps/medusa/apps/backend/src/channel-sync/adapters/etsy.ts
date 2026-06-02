import { SyncProduct } from "../types";

export type EtsyDraftExport = {
  generated_at: string;
  publish_mode: "draft_payload_only";
  notes: string[];
  listings: unknown[];
};

function etsyTags(product: SyncProduct): string[] {
  return product.tags
    .map((tag) => tag.replace(/[^a-z0-9 ]/gi, "").trim())
    .filter(Boolean)
    .slice(0, 13);
}

export function buildEtsyDraftExport(products: SyncProduct[]): EtsyDraftExport {
  return {
    generated_at: new Date().toISOString(),
    publish_mode: "draft_payload_only",
    notes: [
      "Etsy only fits handmade, vintage, or craft-supply style items. Most construction sealants may need manual eligibility review.",
      "Before live sync, map taxonomy_id, shipping_profile_id, who_made, when_made, is_supply, and listing image upload flow.",
    ],
    listings: products.map((product) => ({
      sku: product.sku,
      title: product.title.slice(0, 140),
      description: product.description_text,
      price: product.price.toFixed(2),
      quantity: product.inventory_quantity,
      taxonomy_id: null,
      shipping_profile_id: null,
      who_made: "i_did",
      when_made: "made_to_order",
      is_supply: true,
      tags: etsyTags(product),
      materials: product.category_names.slice(0, 13),
      image_urls: product.image_urls.slice(0, 10),
    })),
  };
}
