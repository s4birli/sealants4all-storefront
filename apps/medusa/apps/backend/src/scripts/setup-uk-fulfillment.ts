import { ExecArgs } from "@medusajs/framework/types";
import {
  createShippingOptionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const FS_NAME = "UK Delivery";
const OPTIONS = [
  { name: "Standard UK Delivery", label: "Standard", description: "2–3 working days", code: "standard", price: 4.99 },
  { name: "Express UK Delivery", label: "Express", description: "Next working day", code: "express", price: 9.99 },
];

/**
 * Makes local checkout work: the S4A seed created the London Warehouse but no
 * shipping coverage, so a GB/GBP cart returned zero shipping options. This wires
 * a UK fulfillment set + GB service zone + flat-rate GBP shipping options on the
 * Default Shipping Profile, linked to the S4ALL Storefront sales channel.
 *
 * Idempotent. Run with:
 *   ./node_modules/.bin/medusa exec ./src/scripts/setup-uk-fulfillment.ts
 */
export default async function setupUkFulfillment({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillment = container.resolve(Modules.FULFILLMENT);

  const findOne = async (entity: string, name: string) => {
    const { data } = await query.graph({ entity, fields: ["id", "name"], filters: { name } });
    return (data as { id: string; name: string }[])[0];
  };

  const location = await findOne("stock_location", "London Warehouse");
  const salesChannel = await findOne("sales_channel", "S4ALL Storefront");
  const profile = await findOne("shipping_profile", "Default Shipping Profile");
  if (!location || !salesChannel || !profile) {
    throw new Error(
      `Missing prerequisite: location=${!!location} salesChannel=${!!salesChannel} profile=${!!profile}`,
    );
  }

  // 1. Stock location must serve the storefront sales channel.
  await linkSalesChannelsToStockLocationWorkflow(container)
    .run({ input: { id: location.id, add: [salesChannel.id] } })
    .catch(() => {
      /* already linked */
    });

  // 2. Ensure the manual fulfillment provider is linked to the location.
  await link
    .create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    .catch(() => {
      /* already linked */
    });

  // 3. Fulfillment set with a GB service zone (create once).
  const existingSets = await fulfillment.listFulfillmentSets(
    { name: FS_NAME },
    { relations: ["service_zones"] },
  );
  let set = existingSets[0];
  if (!set) {
    set = await fulfillment.createFulfillmentSets({
      name: FS_NAME,
      type: "shipping",
      service_zones: [
        { name: "United Kingdom", geo_zones: [{ country_code: "gb", type: "country" }] },
      ],
    });
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
    });
    logger.info(`   created fulfillment set ${set.id}`);
  } else {
    logger.info(`   fulfillment set already present (${set.id})`);
  }
  const serviceZoneId = set.service_zones[0].id;

  // 4. Flat-rate GBP shipping options (store-enabled), created once each.
  const existing = await fulfillment.listShippingOptions({
    name: OPTIONS.map((o) => o.name),
  });
  const existingNames = new Set(existing.map((o: { name: string }) => o.name));
  const toCreate = OPTIONS.filter((o) => !existingNames.has(o.name)).map((o) => ({
    name: o.name,
    price_type: "flat" as const,
    provider_id: "manual_manual",
    service_zone_id: serviceZoneId,
    shipping_profile_id: profile.id,
    type: { label: o.label, description: o.description, code: o.code },
    prices: [{ currency_code: "gbp", amount: o.price }],
    rules: [
      { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
      { attribute: "is_return", value: "false", operator: "eq" as const },
    ],
  }));
  if (toCreate.length) {
    await createShippingOptionsWorkflow(container).run({ input: toCreate });
    logger.info(`   created ${toCreate.length} shipping option(s)`);
  } else {
    logger.info("   shipping options already present");
  }

  logger.info("✅  UK fulfillment ready — checkout can resolve shipping for GB/GBP carts");
}
