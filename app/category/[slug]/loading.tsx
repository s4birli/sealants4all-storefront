import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton, ProductGridSkeleton } from "@/components/ui/Skeleton";

export default function CategoryLoading() {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <div style={{ marginBottom: 24 }}>
              <Skeleton width={80} height={12} />
              <div style={{ height: 8 }} />
              <Skeleton width={260} height={28} />
              <div style={{ height: 6 }} />
              <Skeleton width={110} height={14} />
            </div>
            <ProductGridSkeleton count={12} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
