import { SyncProduct } from "../types";

export type EbayInventoryExport = {
  generated_at: string;
  marketplace_id: "EBAY_GB";
  publish_mode: "draft_payload_only";
  notes: string[];
  inventory_items: unknown[];
  offers: unknown[];
};

export function buildEbayInventoryExport(products: SyncProduct[]): EbayInventoryExport {
  return {
    generated_at: new Date().toISOString(),
    marketplace_id: "EBAY_GB",
    publish_mode: "draft_payload_only",
    notes: [
      "These payloads are intentionally not published.",
      "Before live eBay sync, add categoryId, merchantLocationKey, fulfillmentPolicyId, paymentPolicyId, and returnPolicyId per seller account.",
    ],
    inventory_items: products.map((product) => ({
      sku: product.sku,
      locale: "en_GB",
      condition: "NEW",
      availability: {
        shipToLocationAvailability: {
          quantity: product.inventory_quantity,
        },
      },
      product: {
        title: product.title.slice(0, 80),
        description: product.description_text,
        imageUrls: product.image_urls.slice(0, 12),
        aspects: {
          Brand: [product.brand],
          MPN: [product.sku],
          Type: [product.category_names[0] || "Building Materials"],
        },
      },
    })),
    offers: products.map((product) => ({
      sku: product.sku,
      marketplaceId: "EBAY_GB",
      format: "FIXED_PRICE",
      availableQuantity: product.inventory_quantity,
      categoryId: null,
      merchantLocationKey: null,
      listingPolicies: {
        fulfillmentPolicyId: null,
        paymentPolicyId: null,
        returnPolicyId: null,
      },
      pricingSummary: {
        price: {
          currency: product.currency_code,
          value: product.price.toFixed(2),
        },
      },
    })),
  };
}
