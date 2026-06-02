export type ChannelId =
  | "own_store"
  | "amazon"
  | "ebay"
  | "tiktok_shop"
  | "etsy"
  | "vinted"
  | "b2b";

export type ChannelMode = "native" | "api_draft" | "manual_review";

export type SyncProduct = {
  source_id: number;
  sku: string;
  handle: string;
  title: string;
  description_html: string;
  description_text: string;
  brand: string;
  category_names: string[];
  tags: string[];
  source_url: string;
  image_urls: string[];
  price: number;
  compare_at_price: number | null;
  currency_code: "GBP";
  in_stock: boolean;
  inventory_quantity: number;
  weight_grams: number;
};

export type ChannelExportSummary = {
  generated_at: string;
  source: string;
  product_count: number;
  priced_product_count: number;
  channels: Record<ChannelId, ChannelMode>;
  files: Record<string, string>;
  warnings: string[];
};

export type ChannelListingTemplate = {
  sku: string;
  medusa_handle: string;
  title: string;
  sync_enabled: boolean;
  amazon_seller_sku: string | null;
  amazon_asin: string | null;
  ebay_inventory_item_sku: string | null;
  ebay_offer_id: string | null;
  tiktok_product_id: string | null;
  etsy_listing_id: string | null;
  vinted_item_id: string | null;
  b2b_enabled: boolean;
  last_synced_hash: string | null;
};

export type ChannelOutboxEvent = {
  id: string;
  event_name: string;
  product_id: string;
  status: "pending";
  channels: ChannelId[];
  created_at: string;
};
