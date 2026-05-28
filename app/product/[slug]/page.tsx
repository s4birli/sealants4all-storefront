import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Stars } from "@/components/product/Stars";
import { Placeholder } from "@/components/ui/Placeholder";
import { AddToBasketButton } from "@/components/product/AddToBasketButton";
import { PRODUCT_BY_SLUG, PRODUCTS } from "@/lib/data/products";
import { plain2 } from "@/lib/fmt";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = PRODUCT_BY_SLUG.get(slug);
  if (!product) notFound();

  const incVat = product.priceAvailable ? product.price * 1.2 : 0;
  const listPrice = product.regularPrice || product.price;
  const dealPct =
    product.onSale && listPrice > product.price
      ? Math.round(((listPrice - product.price) / listPrice) * 100)
      : 0;

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <nav
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 16,
              }}
            >
              <Link href="/" style={{ color: "inherit" }}>
                Home
              </Link>{" "}
              ›{" "}
              {product.categories[0] && (
                <>
                  <Link
                    href={`/category/${product.categories[0].id}`}
                    style={{ color: "inherit" }}
                  >
                    {product.categories[0].name}
                  </Link>{" "}
                  ›{" "}
                </>
              )}
              <span style={{ color: "var(--ink)" }}>{product.name}</span>
            </nav>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 48,
                alignItems: "start",
              }}
              className="pdp-grid"
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    style={{ objectFit: "contain", padding: 24 }}
                    priority
                    unoptimized={product.image.endsWith(".webp")}
                  />
                ) : (
                  <Placeholder
                    ratio="1 / 1"
                    cap={product.cap}
                    style={{ position: "absolute", inset: 0 }}
                  />
                )}
                {dealPct > 0 && (
                  <span
                    className="badge badge-deal"
                    style={{ position: "absolute", top: 16, left: 16 }}
                  >
                    SAVE {dealPct}%
                  </span>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--brand-500)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {product.brand}
                </div>
                <h1
                  style={{
                    fontFamily:
                      "var(--font-manrope), Manrope, system-ui, sans-serif",
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    marginBottom: 12,
                  }}
                >
                  {product.name}
                </h1>

                <div
                  className="meta-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 20,
                  }}
                >
                  <Stars value={product.rating || 4.7} />
                  <span
                    style={{ color: "var(--body)", fontWeight: 600 }}
                  >
                    {(product.rating || 4.7).toFixed(1)}
                  </span>
                  <span>({product.reviews})</span>
                  <span>·</span>
                  <span>SKU {product.sku}</span>
                </div>

                {product.priceAvailable ? (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                      }}
                    >
                      <span
                        className="tabular"
                        style={{ fontSize: 32, fontWeight: 800 }}
                      >
                        £{plain2(product.price)}
                      </span>
                      {dealPct > 0 && (
                        <span
                          className="tabular"
                          style={{
                            fontSize: 16,
                            color: "var(--muted)",
                            textDecoration: "line-through",
                          }}
                        >
                          £{plain2(listPrice)}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: "var(--body)" }}>
                        ex VAT
                      </span>
                    </div>
                    <div
                      className="tabular"
                      style={{
                        fontSize: 14,
                        color: "var(--body)",
                        marginTop: 4,
                      }}
                    >
                      £{plain2(incVat)} inc VAT
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginBottom: 20,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--brand-500)",
                    }}
                  >
                    Price on application
                  </div>
                )}

                {/* Bulk tier table */}
                {product.tiers.length > 1 && (
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      marginBottom: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--brand-50)",
                        padding: "10px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--brand-700)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Bulk tier pricing
                    </div>
                    {product.tiers.map((t, i) => (
                      <div
                        key={t.min}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          fontSize: 14,
                          borderTop: i === 0 ? "0" : "1px solid var(--line)",
                        }}
                      >
                        <span>
                          <b>{t.min}+</b> units
                        </span>
                        <span className="tabular fw-700">
                          £{plain2(t.price)} each
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <AddToBasketButton sku={product.sku} disabled={!product.priceAvailable || product.stock === "out"} />

                {/* Description */}
                {product.shortDescription && (
                  <div
                    style={{
                      marginTop: 24,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--body)",
                    }}
                  >
                    {product.shortDescription}
                  </div>
                )}

                {/* Categories */}
                {product.categories.length > 0 && (
                  <div
                    style={{
                      marginTop: 20,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {product.categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/category/${c.id}`}
                        className="badge badge-official"
                        style={{ fontSize: 11 }}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {product.description && (
              <div
                style={{
                  marginTop: 48,
                  maxWidth: 720,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "var(--ink)",
                }}
              >
                <h2 className="h-section" style={{ marginBottom: 12 }}>
                  Description
                </h2>
                <p style={{ color: "var(--body)" }}>{product.description}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
