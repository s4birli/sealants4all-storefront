import { notFound } from "next/navigation";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORIES_FULL, CATEGORIES } from "@/lib/data/categories";
import { PRODUCTS } from "@/lib/data/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...CATEGORIES_FULL.map((c) => ({ slug: c.slug })),
    ...CATEGORIES.map((c) => ({ slug: c.id })),
  ];
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const fullCat = CATEGORIES_FULL.find((c) => c.slug === slug);
  const curatedCat = CATEGORIES.find((c) => c.id === slug);
  const category = fullCat ?? curatedCat;
  if (!category) notFound();

  const products = fullCat
    ? PRODUCTS.filter((p) => p.categories.some((c) => c.id === slug))
    : PRODUCTS.filter((p) => p.curatedCategory === slug);

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
                  {products.length}{" "}
                  {products.length === 1 ? "product" : "products"}
                </div>
              </div>
            </div>
            {products.length === 0 ? (
              <p style={{ color: "var(--body)" }}>
                No products in this category yet.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {products.map((p) => (
                  <ProductCard key={p.sku} sku={p.sku} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
