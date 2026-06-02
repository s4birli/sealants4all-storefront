import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { runChannelExport } from "../channel-sync/run-export";

/** CLI entry: generate marketplace draft feeds from the live Medusa catalogue.
 *  Run with: pnpm channel:export */
export default async function exportChannelFeeds({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const summary = await runChannelExport(container);
  logger.info(
    `Channel export complete: ${summary.priced_product_count}/${summary.product_count} products → ${summary.out_dir}`,
  );
  for (const [key, path] of Object.entries(summary.files)) {
    logger.info(`  ${key}: ${path}`);
  }
}
