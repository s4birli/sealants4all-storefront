import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Pushes a cache-invalidation ping to the storefront whenever the catalogue
 * changes, so Next.js can revalidate its product/category pages.
 *
 * Fire-and-forget by design: a down or slow storefront must NEVER throw inside
 * the subscriber (that would break the product write that triggered it). If the
 * env vars are unset we no-op quietly.
 */
export default async function revalidateStorefrontHandler({
  event,
  container,
}: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const url = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  // No storefront configured — nothing to do.
  if (!url || !secret) {
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ event: event.name }),
    });

    if (!res.ok) {
      logger.warn(
        `revalidate-storefront: ${event.name} returned HTTP ${res.status}`,
      );
      return;
    }

    logger.info(`revalidate-storefront: pinged storefront for ${event.name}`);
  } catch (err) {
    // Storefront unreachable — swallow so the catalogue write still succeeds.
    logger.warn(
      `revalidate-storefront: failed to ping storefront for ${event.name}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.updated",
    "price.created",
    "price.updated",
  ],
};
