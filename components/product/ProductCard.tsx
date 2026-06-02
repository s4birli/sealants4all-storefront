"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/data/types";
import { plain2 } from "@/lib/fmt";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stars } from "@/components/product/Stars";
import { useCart } from "@/components/cart/useCart";

type ProductCardProps = {
  product: Product;
  showBadges?: boolean;
  isNew?: boolean;
  showBulkHint?: boolean;
};

export function ProductCard({
  product,
  showBadges = true,
  isNew = false,
  showBulkHint = true,
}: ProductCardProps) {
  const add = useCart((s) => s.add);

  const list = product.regularPrice || product.price;
  const display = product.price;
  const dealPct =
    product.onSale && list > display
      ? Math.round(((list - display) / list) * 100)
      : 0;
  const incVat = display * 1.2;
  const stockLabel =
    product.stock === "out"
      ? "Out of stock"
      : product.stock === "low"
        ? "Low stock"
        : "In stock";
  const rating = product.rating;
  const reviews = product.reviews;
  // Only surface a number when genuinely low (from real Medusa inventory).
  const lowCount = product.stock === "low" ? product.lowStockRemaining : null;
  const bulkTier = product.tiers[1]; // 12+ tier

  return (
    <article className="card product-card" id={product.sku}>
      <Link href={`/product/${product.slug}`} className="thumb" aria-label={product.name}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 600px) 45vw, (max-width: 900px) 30vw, 240px"
            style={{ objectFit: "contain", padding: 8 }}
          />
        ) : (
          <Placeholder
            ratio="1 / 1"
            cap={product.cap}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
        {showBadges && (
          <div className="thumb-badges">
            {dealPct > 0 && (
              <span className="badge badge-deal">SAVE {dealPct}%</span>
            )}
            {isNew && <span className="badge badge-new">NEW</span>}
            {product.brand === "S4ALL PRO" && !isNew && (
              <span className="badge badge-trade">OWN LABEL</span>
            )}
          </div>
        )}
      </Link>
      <button
        className="wishlist"
        aria-label="Add to wishlist"
        style={{ position: "absolute", right: 22, top: 22 }}
      >
        <Heart size={16} strokeWidth={2} />
      </button>

      <div className="brand-row">{product.brand}</div>
      <Link
        href={`/product/${product.slug}`}
        className="name"
        style={{ color: "inherit" }}
      >
        {product.name}
      </Link>
      <div className="use">{product.use}</div>

      <div className="meta-row">
        <Stars value={rating} />
        <span style={{ color: "var(--body)", fontWeight: 600 }}>
          {rating.toFixed(1)}
        </span>
        <span>({reviews})</span>
        <span>·</span>
        <span>SKU {product.sku}</span>
      </div>

      {product.priceAvailable ? (
        <>
          <div className="price-row">
            <span className="price tabular">£{plain2(display)}</span>
            {dealPct > 0 && (
              <span className="price-strike tabular">£{plain2(list)}</span>
            )}
            <span className="price-vat tabular">ex VAT</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--body)" }} className="tabular">
            £{plain2(incVat)} inc VAT
          </div>
        </>
      ) : (
        <div className="price-row">
          <span className="price" style={{ color: "var(--brand-500)" }}>
            Price on application
          </span>
        </div>
      )}

      <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
        <span
          className="stock"
          style={{
            color:
              product.stock === "out"
                ? "var(--danger)"
                : product.stock === "low"
                  ? "var(--warning)"
                  : "var(--success)",
          }}
        >
          <span
            className="dot-status"
            style={{
              background:
                product.stock === "out"
                  ? "var(--danger)"
                  : product.stock === "low"
                    ? "var(--warning)"
                    : "var(--success)",
            }}
          />{" "}
          {stockLabel}
          {lowCount != null ? ` — only ${lowCount} left` : ""}
        </span>
      </div>

      {showBulkHint && bulkTier && (
        <div className="bulk-hint">
          Buy {bulkTier.min}+ for £{plain2(bulkTier.price)} each
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        disabled={product.stock === "out" || !product.priceAvailable}
        onClick={() => {
          add(
            {
              sku: product.sku,
              variantId: product.variantId,
              name: product.name,
              brand: product.brand,
              image: product.image,
              basePrice: product.tiers[0].price,
            },
            1,
          );
          toast.success(`Added to basket — ${product.name}`);
        }}
      >
        <ShoppingCart size={16} strokeWidth={2} /> Add to basket
      </button>
    </article>
  );
}
