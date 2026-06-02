import { SyncProduct } from "../types";

export type TikTokDraftExport = {
  generated_at: string;
  region: "GB";
  publish_mode: "draft_payload_only";
  notes: string[];
  products: unknown[];
};

export function buildTikTokDraftExport(products: SyncProduct[]): TikTokDraftExport {
  return {
    generated_at: new Date().toISOString(),
    region: "GB",
    publish_mode: "draft_payload_only",
    notes: [
      "TikTok Shop Product API draft payloads.",
      "Before live sync, configure category_id, package dimensions, warehouse_id, shipping template, brand authorization, and restricted-product checks.",
    ],
    products: products.map((product) => ({
      external_product_id: product.sku,
      title: product.title.slice(0, 255),
      description: product.description_text,
      category_id: null,
      brand: product.brand,
      package_weight: {
        value: Math.max(0.1, product.weight_grams / 1000),
        unit: "KILOGRAM",
      },
      skus: [
        {
          seller_sku: product.sku,
          price: {
            amount: product.price.toFixed(2),
            currency: product.currency_code,
          },
          inventory: [
            {
              warehouse_id: null,
              quantity: product.inventory_quantity,
            },
          ],
        },
      ],
      images: product.image_urls.map((url) => ({ uri: null, source_url: url })).slice(0, 9),
    })),
  };
}
