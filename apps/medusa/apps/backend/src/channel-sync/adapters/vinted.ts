import { SyncProduct } from "../types";
import { toCsv } from "../csv";

export const VINTED_REVIEW_HEADERS = [
  "sku",
  "title",
  "brand",
  "price_gbp",
  "quantity",
  "source_url",
  "reason",
];

export function buildVintedReviewCsv(products: SyncProduct[]): string {
  return toCsv(
    VINTED_REVIEW_HEADERS,
    products.map((product) => ({
      sku: product.sku,
      title: product.title,
      brand: product.brand,
      price_gbp: product.price.toFixed(2),
      quantity: product.inventory_quantity,
      source_url: product.source_url,
      reason:
        "Manual review only: Vinted is not a fit for most construction-material SKUs and does not have a stable public seller listing API for this use case.",
    })),
  );
}
