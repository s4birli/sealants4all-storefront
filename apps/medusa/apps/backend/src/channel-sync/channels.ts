import { ChannelId, ChannelMode } from "./types";

export const CHANNELS: Record<ChannelId, ChannelMode> = {
  own_store: "native",
  amazon: "api_draft",
  ebay: "api_draft",
  tiktok_shop: "api_draft",
  etsy: "api_draft",
  vinted: "manual_review",
  b2b: "native",
};

export const DEFAULT_OUTBOX_CHANNELS: ChannelId[] = [
  "own_store",
  "amazon",
  "ebay",
  "tiktok_shop",
  "etsy",
  "b2b",
];
