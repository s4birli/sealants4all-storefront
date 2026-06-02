import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { appendFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { DEFAULT_OUTBOX_CHANNELS } from "../channel-sync/channels";
import { ChannelOutboxEvent } from "../channel-sync/types";

type ProductEventPayload = { id?: string } | { id: string }[];

function productIds(data: ProductEventPayload): string[] {
  if (Array.isArray(data)) return data.map((item) => item.id).filter(Boolean);
  return data.id ? [data.id] : [];
}

export default async function channelSyncProductHandler({
  event,
  container,
}: SubscriberArgs<ProductEventPayload>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const outDir = resolve(process.cwd(), "exports", "channel-sync");
  mkdirSync(outDir, { recursive: true });

  const rows = productIds(event.data).map((productId) => {
    const row: ChannelOutboxEvent = {
      id: `${Date.now()}-${productId}`,
      event_name: event.name,
      product_id: productId,
      status: "pending",
      channels: DEFAULT_OUTBOX_CHANNELS,
      created_at: new Date().toISOString(),
    };
    return JSON.stringify(row);
  });

  if (rows.length === 0) {
    logger.warn(`channel-sync ignored ${event.name}: no product id in payload`);
    return;
  }

  appendFileSync(resolve(outDir, "outbox.jsonl"), `${rows.join("\n")}\n`);
  logger.info(`channel-sync queued ${rows.length} product event(s) from ${event.name}`);
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
