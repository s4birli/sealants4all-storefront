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
import { CATEGORIES } from "@/lib/data/categories";
import { BEST_SKU, DEALS_SKU, NEW_SKU } from "@/lib/curation";

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
  ]);

  // Collection membership is the source of truth; fall back to the hardcoded
  // SKU lists whenever a collection resolves empty.
  const bestSellers = bestCollection.length ? bestCollection : bestFallback;
  const deals = dealsCollection.length ? dealsCollection : dealsFallback;
  const newArrivalsBase = newCollection.length ? newCollection : newFallback;
  const newArrivals = [...newArrivalsBase, ...newArrivalsTail];

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <HeroCarousel slides={heroSlides} />
        <TrustStrip />
        <CategoryGrid counts={categoryCounts} />
        <BrandGrid />
        <BestSellers products={bestSellers} />
        <TradeBanner />
        <DealsSection products={deals} />
        <NewArrivals products={newArrivals} />
        <Applications />
        <Reviews />
        <WhyUs />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
