import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <Skeleton width={280} height={13} style={{ marginBottom: 16 }} />
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}
              className="pdp-grid"
            >
              <Skeleton style={{ aspectRatio: "1 / 1", height: "auto" }} radius="var(--radius-lg)" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Skeleton width="30%" height={12} />
                <Skeleton width="80%" height={30} />
                <Skeleton width="50%" height={16} />
                <Skeleton width="40%" height={34} />
                <Skeleton height={120} radius="var(--radius)" />
                <Skeleton height={48} radius="var(--radius)" />
                <Skeleton width="90%" height={14} />
                <Skeleton width="70%" height={14} />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
