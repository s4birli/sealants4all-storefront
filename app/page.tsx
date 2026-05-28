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

export default function HomePage() {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <HeroCarousel />
        <TrustStrip />
        <CategoryGrid />
        <BrandGrid />
        <BestSellers />
        <TradeBanner />
        <DealsSection />
        <NewArrivals />
        <Applications />
        <Reviews />
        <WhyUs />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
