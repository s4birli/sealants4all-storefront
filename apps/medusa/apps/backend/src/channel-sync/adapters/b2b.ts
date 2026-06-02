import { SyncProduct } from "../types";
import { toCsv } from "../csv";

export const B2B_CSV_HEADERS = [
  "sku",
  "title",
  "brand",
  "base_price_gbp",
  "price_12_gbp",
  "price_24_gbp",
  "price_100_gbp",
  "price_500_gbp",
  "stock_quantity",
  "category",
  "source_url",
];

function round2(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function buildB2BCsv(products: SyncProduct[]): string {
  return toCsv(
    B2B_CSV_HEADERS,
    products.map((product) => ({
      sku: product.sku,
      title: product.title,
      brand: product.brand,
      base_price_gbp: round2(product.price),
      price_12_gbp: round2(product.price * 0.95),
      price_24_gbp: round2(product.price * 0.88),
      price_100_gbp: round2(product.price * 0.82),
      price_500_gbp: round2(product.price * 0.75),
      stock_quantity: product.inventory_quantity,
      category: product.category_names[0] || "",
      source_url: product.source_url,
    })),
  );
}
