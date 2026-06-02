import { SyncProduct } from "../types";

export function buildOwnStoreSnapshot(products: SyncProduct[]) {
  return {
    generated_at: new Date().toISOString(),
    role: "master_catalog_snapshot",
    notes: [
      "Own storefront sales stay native to Medusa.",
      "This file is a canonical snapshot for diffing and audits; it is not an external feed.",
    ],
    products: products.map((product) => ({
      sku: product.sku,
      handle: product.handle,
      title: product.title,
      brand: product.brand,
      price: product.price,
      inventory_quantity: product.inventory_quantity,
      source_url: product.source_url,
    })),
  };
}
