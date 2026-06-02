import Link from "next/link";
import { notFound } from "next/navigation";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORIES_FULL, CATEGORIES } from "@/lib/data/categories";
import { getProductsByCategory, getProductsByCuratedCategory } from "@/lib/catalog";

export const revalidate = 60;

// Page the grid so a large category renders ~24 cards, not all 55+ at once —
// smaller DOM + RSC payload + fewer images in flight. Mirrors the /search page
// (RESULTS_PER_PAGE = 24). Driven by the ?page= query param (server-side).
const PAGE_SIZE = 24;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  // Curated (editorial) buckets take precedence: a few curated ids collide with
  // real Medusa handles (e.g. "primers", "fixing") and nav links target the
  // broader curated bucket, not the narrow Medusa category.
  const curatedCat = CATEGORIES.find((c) => c.id === slug);
  const fullCat = CATEGORIES_FULL.find((c) => c.slug === slug);
  const category = curatedCat ?? fullCat;
  if (!category) notFound();

  const products = curatedCat
    ? await getProductsByCuratedCategory(slug)
    : await getProductsByCategory(slug);

  const total = products.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = products.slice(start, start + PAGE_SIZE);
  const pageHref = (n: number) =>
    n <= 1 ? `/category/${slug}` : `/category/${slug}?page=${n}`;
  const pagerLink: React.CSSProperties = {
    minWidth: 40,
    padding: "8px 14px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    fontSize: 14,
    fontWeight: 600,
    color: "inherit",
    textAlign: "center",
    background: "#fff",
  };

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cta-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Category
                </div>
                <h1 className="h-section">{category.name}</h1>
                <div className="h-section-sub">
                  {total === 0
                    ? "0 products"
                    : pageCount > 1
                      ? `Showing ${start + 1}–${start + visible.length} of ${total} products`
                      : `${total} ${total === 1 ? "product" : "products"}`}
                </div>
              </div>
            </div>
            {products.length === 0 ? (
              <p style={{ color: "var(--body)" }}>
                No products in this category yet.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 16,
                  }}
                >
                  {visible.map((p) => (
                    <ProductCard key={p.sku} product={p} />
                  ))}
                </div>
                {pageCount > 1 && (
                  <nav
                    aria-label="Category pages"
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "center",
                      marginTop: 32,
                    }}
                  >
                    {page > 1 && (
                      <Link href={pageHref(page - 1)} style={pagerLink} rel="prev">
                        ← Prev
                      </Link>
                    )}
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <Link
                        key={n}
                        href={pageHref(n)}
                        aria-current={n === page ? "page" : undefined}
                        style={
                          n === page
                            ? {
                                ...pagerLink,
                                background: "var(--cta-500)",
                                color: "#fff",
                                borderColor: "var(--cta-500)",
                              }
                            : pagerLink
                        }
                      >
                        {n}
                      </Link>
                    ))}
                    {page < pageCount && (
                      <Link href={pageHref(page + 1)} style={pagerLink} rel="next">
                        Next →
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
