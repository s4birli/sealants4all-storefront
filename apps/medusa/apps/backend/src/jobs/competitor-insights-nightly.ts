import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { competitorKeys } from "../competitor-insights/config";
import { runCompetitorAnalysis } from "../competitor-insights/run-analysis";

/** Nightly competitor-insights refresh (advisory only). Skips quietly until the
 *  SERPER_API_KEY / ANTHROPIC_API_KEY are configured. */
export default async function competitorInsightsNightly(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const keys = competitorKeys();
  if (!keys.serper || !keys.anthropic) {
    logger.info("competitor-insights nightly job skipped — API keys not configured");
    return;
  }
  await runCompetitorAnalysis(container);
}

export const config = {
  name: "competitor-insights-nightly",
  schedule: "0 3 * * *", // 03:00 every day
};
