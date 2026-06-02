"use client";

import Link from "next/link";
import Image from "next/image";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Placeholder } from "@/components/ui/Placeholder";
import { useCart, useCartTotals } from "@/components/cart/useCart";
import { deriveTiers } from "@/lib/pricing";
import { plain2, tierForQty } from "@/lib/fmt";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const update = useCart((s) => s.update);
  const remove = useCart((s) => s.remove);
  const totals = useCartTotals();

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container" style={{ maxWidth: 980 }}>
            <h1 className="h-section" style={{ marginBottom: 24 }}>
              Your basket
            </h1>

            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ color: "var(--body)", marginBottom: 16 }}>
                  Your basket is empty.
                </p>
                <Link href="/" className="btn btn-brand">
                  Browse products
                </Link>
              </div>
            ) : (
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}
                className="pdp-grid"
              >
                <div>
                  {items.map((it) => {
                    const tiers = deriveTiers(it.basePrice);
                    const tier = tierForQty(tiers, it.qty);
                    const line = tier.price * it.qty;
                    return (
                      <div
                        key={it.sku}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "88px 1fr auto",
                          gap: 16,
                          alignItems: "center",
                          padding: "16px 0",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: 88,
                            height: 88,
                            background: "var(--surface)",
                            borderRadius: "var(--radius)",
                            overflow: "hidden",
                          }}
                        >
                          {it.image ? (
                            <Image
                              src={it.image}
                              alt={it.name}
                              fill
                              sizes="88px"
                              style={{ objectFit: "contain", padding: 6 }}
                              unoptimized={it.image.endsWith(".webp")}
                            />
                          ) : (
                            <Placeholder ratio="1 / 1" cap={it.brand.split(" ")[0]} style={{ position: "absolute", inset: 0 }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-500)", textTransform: "uppercase" }}>
                            {it.brand}
                          </div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>{it.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>SKU {it.sku}</div>
                          <div className="tabular" style={{ fontSize: 12, color: "var(--body)", marginTop: 4 }}>
                            £{plain2(tier.price)} each
                          </div>
                          <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
                            <div className="stepper">
                              <button onClick={() => update(it.sku, it.qty - 1)} aria-label="Decrease">−</button>
                              <input
                                value={it.qty}
                                onChange={(e) => update(it.sku, parseInt(e.target.value || "0", 10))}
                              />
                              <button onClick={() => update(it.sku, it.qty + 1)} aria-label="Increase">+</button>
                            </div>
                            <button
                              onClick={() => remove(it.sku)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--muted)" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="tabular fw-700" style={{ fontSize: 16 }}>
                          £{plain2(line)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <aside
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    height: "fit-content",
                  }}
                >
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Summary</h3>
                  <Row label={`Subtotal (${totals.units} units, ex VAT)`} value={`£${plain2(totals.sub)}`} />
                  <Row label="VAT (20%)" value={`£${plain2(totals.vat)}`} />
                  {totals.savings > 0 && (
                    <Row label="Bulk savings" value={<span style={{ color: "var(--success)" }}>−£{plain2(totals.savings)}</span>} />
                  )}
                  <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0" }} />
                  <Row label="Total (inc VAT)" value={`£${plain2(totals.total)}`} large />
                  <div style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 16px" }}>
                    Delivery calculated at checkout.
                  </div>
                  <Link href="/checkout" className="btn btn-primary btn-block btn-lg">
                    Proceed to checkout →
                  </Link>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, large = false }: { label: string; value: React.ReactNode; large?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "3px 0" }}>
      <span style={{ fontSize: 13, color: "var(--body)" }}>{label}</span>
      <span className="tabular" style={{ fontSize: large ? 18 : 14, fontWeight: large ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}
