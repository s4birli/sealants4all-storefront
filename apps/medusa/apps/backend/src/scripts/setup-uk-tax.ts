import { ExecArgs } from "@medusajs/framework/types";
import { createTaxRatesWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/** Adds a 20% default UK VAT rate to the GB tax region so orders/invoices
 *  compute VAT correctly. Idempotent. */
export default async function setupUkTax({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: regions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code", "tax_rates.id", "tax_rates.is_default"],
  });
  const gb = (regions as { id: string; country_code: string; tax_rates?: { is_default: boolean }[] }[]).find(
    (r) => r.country_code === "gb",
  );
  if (!gb) {
    logger.warn("No GB tax region — run setup-uk-fulfillment / seed first");
    return;
  }
  if ((gb.tax_rates || []).some((r) => r.is_default)) {
    logger.info("UK default VAT rate already present");
    return;
  }

  await createTaxRatesWorkflow(container).run({
    input: [
      {
        tax_region_id: gb.id,
        name: "UK VAT",
        code: "VAT",
        rate: 20,
        is_default: true,
      },
    ],
  });
  logger.info("✅  Added 20% UK VAT default rate to the GB tax region");
}
