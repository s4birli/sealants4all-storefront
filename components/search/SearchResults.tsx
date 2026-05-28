"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { searchProducts, totalProductCount } from "@/lib/search";
import { ProductCard } from "@/components/product/ProductCard";
import { BRANDS } from "@/lib/data/brands";
import type { BrandName } from "@/lib/data/types";

const RESULTS_PER_PAGE = 24;

export function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  const [brandFilter, setBrandFilter] = useState<BrandName | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const allHits = useMemo(() => searchProducts(q, 200), [q]);

  const filtered = useMemo(() => {
    if (brandFilter === "ALL") return allHits;
    return allHits.filter((h) => h.product.brand === brandFilter);
  }, [allHits, brandFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / RESULTS_PER_PAGE));
  const visible = filtered.slice(
    (page - 1) * RESULTS_PER_PAGE,
    page * RESULTS_PER_PAGE,
  );

  if (!q) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <h1 className="h-section" style={{ marginBottom: 8 }}>
          Search the catalogue
        </h1>
        <p style={{ color: "var(--body)" }}>
          Type in the search bar above. {totalProductCount()} products
          available.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="section-head" style={{ marginBottom: 16 }}>
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
            Search results
          </div>
          <h1 className="h-section">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}{" "}
            for &ldquo;{q}&rdquo;
          </h1>
        </div>
      </div>

      {/* Brand filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <FilterChip
          active={brandFilter === "ALL"}
          onClick={() => {
            setBrandFilter("ALL");
            setPage(1);
          }}
        >
          All ({allHits.length})
        </FilterChip>
        {BRANDS.map((b) => {
          const count = allHits.filter((h) => h.product.brand === b.name).length;
          if (count === 0) return null;
          return (
            <FilterChip
              key={b.id}
              active={brandFilter === b.name}
              onClick={() => {
                setBrandFilter(b.name);
                setPage(1);
              }}
            >
              {b.name} ({count})
            </FilterChip>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>No matches</h2>
          <p style={{ color: "var(--body)" }}>
            Try a different query — search across product name, brand, SKU, and
            category.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {visible.map(({ product }) => (
              <ProductCard key={product.sku} sku={product.sku} />
            ))}
          </div>

          {pageCount > 1 && (
            <div
              style={{
                marginTop: 32,
                display: "flex",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-outline btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--body)",
                  margin: "0 12px",
                }}
              >
                Page {page} of {pageCount}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--brand-500)" : "var(--line)"}`,
        background: active ? "var(--brand-500)" : "var(--white)",
        color: active ? "var(--white)" : "var(--ink)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 140ms ease",
      }}
    >
      {children}
    </button>
  );
}
