import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BrandGrid } from "@/components/home/BrandGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { TradeBanner } from "@/components/home/TradeBanner";
import { DealsSection } from "@/components/home/DealsSection";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Applications } from "@/components/home/Applications";
import { Reviews } from "@/components/home/Reviews";
import { WhyUs } from "@/components/home/WhyUs";
import { Newsletter } from "@/components/home/Newsletter";
import {
  getCuratedCounts,
  getProductsByCollection,
  getProductsBySkus,
} from "@/lib/catalog";
import { getHeroSlides } from "@/lib/hero";
import { getHomepage, type SectionKey } from "@/lib/homepage";
import { CATEGORIES } from "@/lib/data/categories";
import { BEST_SKU, DEALS_SKU, NEW_SKU } from "@/lib/curation";
import { Fragment, type ReactNode } from "react";

export const revalidate = 60;

export default async function HomePage() {
  const [
    bestCollection,
    dealsCollection,
    newCollection,
    bestFallback,
    dealsFallback,
    newFallback,
    newArrivalsTail,
    categoryCounts,
    heroSlides,
    homepage,
  ] = await Promise.all([
    getProductsByCollection("best-sellers"),
    getProductsByCollection("deals"),
    getProductsByCollection("new-arrivals"),
    getProductsBySkus(BEST_SKU),
    getProductsBySkus(DEALS_SKU),
    getProductsBySkus(NEW_SKU),
    getProductsBySkus(BEST_SKU.slice(0, 4)),
    getCuratedCounts(CATEGORIES.map((c) => c.id)),
    getHeroSlides(),
    getHomepage(),
  ]);

  // Collection membership is the source of truth; fall back to the hardcoded
  // SKU lists whenever a collection resolves empty.
  const bestSellers = bestCollection.length ? bestCollection : bestFallback;
  const deals = dealsCollection.length ? dealsCollection : dealsFallback;
  const newArrivalsBase = newCollection.length ? newCollection : newFallback;
  const newArrivals = [...newArrivalsBase, ...newArrivalsTail];

  // Each homepage section, keyed so Medusa config can reorder / toggle them and
  // override their headings (see lib/homepage.ts). Product/category data still
  // comes from the catalogue; only order, visibility and copy are CMS-driven.
  const c = homepage.copy;
  const sectionMap: Record<SectionKey, ReactNode> = {
    hero: <HeroCarousel slides={heroSlides} />,
    trust: <TrustStrip />,
    categories: <CategoryGrid counts={categoryCounts} copy={c.categories} />,
    brands: <BrandGrid copy={c.brands} />,
    bestsellers: <BestSellers products={bestSellers} copy={c.bestsellers} />,
    trade: <TradeBanner copy={c.trade} />,
    deals: <DealsSection products={deals} copy={c.deals} />,
    newarrivals: <NewArrivals products={newArrivals} copy={c.newarrivals} />,
    applications: <Applications copy={c.applications} />,
    reviews: <Reviews copy={c.reviews} />,
    whyus: <WhyUs copy={c.whyus} />,
    newsletter: <Newsletter copy={c.newsletter} />,
  };

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        {homepage.sections
          .filter((s) => s.enabled)
          .map((s) => (
            <Fragment key={s.key}>{sectionMap[s.key]}</Fragment>
          ))}
      </main>
      <Footer />
    </>
  );
}
