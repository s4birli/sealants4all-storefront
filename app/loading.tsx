import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton, ProductGridSkeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <Skeleton height={320} radius="var(--radius-lg)" style={{ marginBottom: 32 }} />
            <Skeleton width={220} height={26} style={{ marginBottom: 16 }} />
            <ProductGridSkeleton count={8} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
