"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, User, ShieldCheck } from "lucide-react";
import { PRODUCTS } from "@/lib/data/products";
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

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.use.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  return (
    <header className="header">
      <div className="container">
        <div className="row">
          <Link href="/" className="brand-logo" aria-label="Sealants4All home">
            <span>
              Sealants<span className="four">4</span>All
            </span>
          </Link>

          <div className="search-wrap">
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
              aria-label="Search products, brands, SKUs"
            />
            <button className="search-go" aria-label="Search">
              Search
            </button>

            {focused && suggestions.length > 0 && (
              <div role="listbox" className="search-suggest">
                {suggestions.map((p) => (
                  <a
                    key={p.sku}
                    href={`/product/${p.sku.toLowerCase()}`}
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
                    <Placeholder
                      ratio="1 / 1"
                      cap={p.brand.split(" ")[0]}
                      style={{ width: 48 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {p.brand} · {p.use}
                      </div>
                    </div>
                    <div
                      className="tabular"
                      style={{ fontSize: 14, fontWeight: 700 }}
                    >
                      {gbp(p.from)}
                    </div>
                  </a>
                ))}
                <div
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--muted)",
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
                  to search the full catalogue
                </div>
              </div>
            )}
          </div>

          <div className="header-actions">
            <a className="icon-btn" href="#account" aria-label="Account">
              <User size={20} strokeWidth={1.8} />
              <span className="label">
                Account
                <span className="sub">Sign in</span>
              </span>
            </a>
            <a
              className="icon-btn"
              href="/trade"
              style={{ color: "var(--brand-500)" }}
            >
              <ShieldCheck size={20} strokeWidth={1.8} />
              <span className="label">
                Trade
                <span className="sub">Bulk pricing</span>
              </span>
            </a>
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
