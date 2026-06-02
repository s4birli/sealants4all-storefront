import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Seed store.metadata.hero_slides with the storefront's existing hero slides
 * (lib/data/heroSlides.ts), converted to the snake_case DTO shape, ranked 0/1/2
 * and enabled. Idempotent: re-running rewrites hero_slides while preserving every
 * other metadata key.
 *
 * The slide values mirror lib/data/heroSlides.ts (camelCase -> snake_case):
 *   ctaPrimary.{label,href}   -> cta_primary_{label,href}
 *   ctaSecondary.{label,href} -> cta_secondary_{label,href}
 *   productCap                -> product_cap
 */

type HeroSlideDTO = {
  eyebrow: string;
  title: string;
  sub: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
  bg: string;
  accent: string;
  product_cap: string;
  tag: string;
  rank: number;
  enabled: boolean;
};

const HERO_SLIDES: HeroSlideDTO[] = [
  {
    eyebrow: "Bulk Buy Savings",
    title: "Up to 30% off when you buy by the box.",
    sub: "Trade-grade sealants and adhesives, priced by volume. No phone calls. No haggling.",
    cta_primary_label: "Shop bulk deals",
    cta_primary_href: "#deals",
    cta_secondary_label: "Open trade account",
    cta_secondary_href: "/trade",
    bg: "#0B2954",
    accent: "#FF6B1A",
    product_cap: "SIKAFLEX 522 / 12-PACK",
    tag: "OFFER",
    rank: 0,
    enabled: true,
  },
  {
    eyebrow: "Official Sika Distributor",
    title: "Swiss-engineered sealants, dispatched from London.",
    sub: "The full Sikaflex range in stock — caravan, marine, construction.",
    cta_primary_label: "Browse Sika range",
    cta_primary_href: "#brands",
    cta_secondary_label: "Technical datasheets",
    cta_secondary_href: "#help",
    bg: "#163F87",
    accent: "#FF6B1A",
    product_cap: "SIKA · OFFICIAL UK DISTRIBUTOR",
    tag: "BRAND",
    rank: 1,
    enabled: true,
  },
  {
    eyebrow: "Free Next-Day Delivery",
    title: "Order before 3pm. On your van by 9am.",
    sub: "Free UK courier delivery on orders over £150. Dispatched from our London warehouse.",
    cta_primary_label: "Start shopping",
    cta_primary_href: "#categories",
    cta_secondary_label: "Delivery info",
    cta_secondary_href: "#help",
    bg: "#1E5BBE",
    accent: "#FFB800",
    product_cap: "NEXT-DAY · UK COURIER",
    tag: "DELIVERY",
    rank: 2,
    enabled: true,
  },
];

export default async function seedHero({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);

  logger.info("🖼   Seeding store.metadata.hero_slides");
  const [store] = await storeModuleService.listStores();
  if (!store) {
    logger.error("   no store found — run the main seed first");
    return;
  }

  // Merge: preserve any other metadata keys, replace only hero_slides.
  const metadata = { ...(store.metadata ?? {}), hero_slides: HERO_SLIDES };

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { metadata },
    },
  });

  logger.info(`✅  Wrote ${HERO_SLIDES.length} hero slides to store metadata.`);
}
