import { ExecArgs } from "@medusajs/framework/types";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/** Removes the temporary "Live Test Widget" product created for verification. */
export default async function deleteTestProduct({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const products = (
    await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle: "live-test-widget" },
    })
  ).data as { id: string }[];

  if (!products.length) {
    logger.info("no test product found");
    return;
  }
  await deleteProductsWorkflow(container).run({ input: { ids: products.map((p) => p.id) } });
  logger.info(`🗑  deleted ${products.length} test product(s)`);
}
