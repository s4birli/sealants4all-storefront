import { SyncProduct } from "../types";

export type AmazonDraftExport = {
  generated_at: string;
  marketplace_id: "A1F83G8C2ARO7P";
  publish_mode: "draft_payload_only";
  notes: string[];
  listings: unknown[];
};

export function buildAmazonDraftExport(products: SyncProduct[]): AmazonDraftExport {
  return {
    generated_at: new Date().toISOString(),
    marketplace_id: "A1F83G8C2ARO7P",
    publish_mode: "draft_payload_only",
    notes: [
      "UK marketplace draft for Amazon SP-API Listings Items / feeds.",
      "Before live sync, map each SKU to productType, browse node, condition, compliance/safety attributes, and seller account policies.",
    ],
    listings: products.map((product) => ({
      seller_sku: product.sku,
      marketplace_ids: ["A1F83G8C2ARO7P"],
      operation_type: "PATCH_OR_CREATE_DRAFT",
      product_type: null,
      attributes: {
        item_name: [{ value: product.title, marketplace_id: "A1F83G8C2ARO7P" }],
        brand: [{ value: product.brand, marketplace_id: "A1F83G8C2ARO7P" }],
        manufacturer: [{ value: product.brand, marketplace_id: "A1F83G8C2ARO7P" }],
        merchant_suggested_asin: [],
        external_product_id: [],
        list_price: [
          {
            value: product.price,
            currency: product.currency_code,
            marketplace_id: "A1F83G8C2ARO7P",
          },
        ],
        fulfillment_availability: [
          {
            fulfillment_channel_code: "DEFAULT",
            quantity: product.inventory_quantity,
          },
        ],
        bullet_point: product.description_text
          .split(/(?<=[.!?])\s+/)
          .filter(Boolean)
          .slice(0, 5)
          .map((value) => ({ value: value.slice(0, 500), marketplace_id: "A1F83G8C2ARO7P" })),
        product_description: [
          {
            value: product.description_text.slice(0, 2000),
            marketplace_id: "A1F83G8C2ARO7P",
          },
        ],
        main_product_image_locator: product.image_urls[0]
          ? [{ media_location: product.image_urls[0], marketplace_id: "A1F83G8C2ARO7P" }]
          : [],
      },
    })),
  };
}
