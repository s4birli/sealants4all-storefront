"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, User, ShieldCheck } from "lucide-react";
import { searchProducts, totalProductCount } from "@/lib/search";
import { useCart, useCartCount, useCartTotals } from "@/components/cart/useCart";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { gbp } from "@/lib/fmt";
import { Placeholder } from "@/components/ui/Placeholder";
import { MegaNav } from "@/components/layout/MegaNav";

const PLACEHOLDERS = [
  "Sikaflex 522 caravan sealant",
  "Fire-rated intumescent mastic",
  "Fischer chemical anchor 360ml",
  "S4ALL Pro hybrid sealant",
  "Soudal Fix All high tack",
];

export function Header() {
  const router = useRouter();
  const setOpen = useCart((s) => s.setOpen);
  const count = useCartCount();
  const totals = useCartTotals();
  const hydrated = useHydrated();

  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setPhIdx((p) => (p + 1) % PLACEHOLDERS.length),
      3500,
    );
    return () => clearInterval(id);
  }, []);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const hits = useMemo(() => searchProducts(query, 6), [query]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setFocused(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="row">
          <Link href="/" className="brand-logo" aria-label="Sealants4All home">
            <span>
              Sealants<span className="four">4</span>All
            </span>
          </Link>

          <form className="search-wrap" onSubmit={submit} role="search">
            <span className="search-icon">
              <Search size={18} strokeWidth={2} />
            </span>
            <input
              className="search-input"
              placeholder={`Search "${PLACEHOLDERS[phIdx]}"...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              aria-label={`Search ${totalProductCount()} products, brands, SKUs`}
              autoComplete="off"
            />
            <button className="search-go" aria-label="Search" type="submit">
              Search
            </button>

            {focused && hits.length > 0 && (
              <div role="listbox" className="search-suggest">
                {hits.map(({ product: p }) => (
                  <Link
                    key={p.sku}
                    href={`/product/${p.slug}`}
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => {
                      setQuery(p.name);
                      setFocused(false);
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--surface-2)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 48,
                        height: 48,
                        background: "var(--surface)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          sizes="48px"
                          style={{ objectFit: "contain", padding: 2 }}
                          unoptimized={p.image.endsWith(".webp")}
                        />
                      ) : (
                        <Placeholder
                          ratio="1 / 1"
                          cap={p.brand.split(" ")[0]}
                        />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {p.brand} · {p.use}
                      </div>
                    </div>
                    <div
                      className="tabular"
                      style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {p.priceAvailable ? gbp(p.price) : "POA"}
                    </div>
                  </Link>
                ))}
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--brand-500)",
                    fontWeight: 600,
                    background: "var(--surface)",
                  }}
                >
                  Press{" "}
                  <kbd
                    style={{
                      background: "var(--surface-2)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    ↵
                  </kbd>{" "}
                  to see all results for &ldquo;{query}&rdquo;
                </button>
              </div>
            )}
          </form>

          <div className="header-actions">
            <a className="icon-btn" href="#account" aria-label="Account">
              <User size={20} strokeWidth={1.8} />
              <span className="label">
                Account
                <span className="sub">Sign in</span>
              </span>
            </a>
            <Link
              className="icon-btn"
              href="/trade"
              style={{ color: "var(--brand-500)" }}
            >
              <ShieldCheck size={20} strokeWidth={1.8} />
              <span className="label">
                Trade
                <span className="sub">Bulk pricing</span>
              </span>
            </Link>
            <button
              className="cart-pill"
              onClick={() => setOpen(true)}
              aria-label={`Basket. ${hydrated ? count : 0} items.`}
            >
              <ShoppingCart size={18} strokeWidth={2} />
              <span
                style={{
                  display: "inline-grid",
                  textAlign: "left",
                  lineHeight: 1.1,
                }}
              >
                Basket
                <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 500 }}>
                  {gbp(hydrated ? totals.sub : 0)}
                </span>
              </span>
              <span className="count">{hydrated ? count : 0}</span>
            </button>
          </div>
        </div>
      </div>
      <MegaNav />
    </header>
  );
}
