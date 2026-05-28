import { Suspense } from "react";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchResults } from "@/components/search/SearchResults";

export const dynamic = "force-static";

export default function SearchPage() {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <Suspense fallback={<SearchSkeleton />}>
              <SearchResults />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SearchSkeleton() {
  return (
    <div style={{ minHeight: 400, color: "var(--muted)" }}>Loading results…</div>
  );
}
