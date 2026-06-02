import { ExecArgs } from "@medusajs/framework/types";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";

const HANDLE = "live-test-widget";

/** Creates a single published product, exactly as the admin "add product" flow
 *  would — used to prove the storefront reflects new Medusa products live. */
export default async function addTestProduct({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const channels = (
    await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  ).data as { id: string; name: string }[];
  const channel =
    channels.find((c) => c.name === "S4ALL Storefront") || channels[0];

  const profiles = (
    await query.graph({ entity: "shipping_profile", fields: ["id"] })
  ).data as { id: string }[];

  const cleaning = (
    await query.graph({
      entity: "product_category",
      fields: ["id", "handle"],
      filters: { handle: "cleaning" },
    })
  ).data as { id: string }[];

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Live Test Widget",
          handle: HANDLE,
          description: "Temporary product created to verify live storefront sync.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: profiles[0]?.id,
          sales_channels: [{ id: channel.id }],
          category_ids: cleaning[0] ? [cleaning[0].id] : [],
          metadata: { brand: "S4ALL Pro", source_id: 999999 },
          options: [{ title: "Default", values: ["Standard"] }],
          variants: [
            {
              title: "Standard",
              sku: "LIVE-TEST-SKU",
              manage_inventory: false,
              options: { Default: "Standard" },
              prices: [{ amount: 12.34, currency_code: "gbp" }],
            },
          ],
        },
      ],
    },
  });

  logger.info(`✅  created test product: handle=${result[0].handle} id=${result[0].id}`);
}
