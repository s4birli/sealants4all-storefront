"use client";

import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_BY_SKU, PRODUCT_META } from "@/lib/data/products";
import { plain2 } from "@/lib/fmt";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stars } from "@/components/product/Stars";
import { useCart } from "@/components/cart/useCart";

type ProductCardProps = {
  sku: string;
  showBadges?: boolean;
  isNew?: boolean;
  showBulkHint?: boolean;
};

export function ProductCard({
  sku,
  showBadges = true,
  isNew = false,
  showBulkHint = true,
}: ProductCardProps) {
  const product = PRODUCT_BY_SKU.get(sku);
  const meta = PRODUCT_META[sku];
  const add = useCart((s) => s.add);

  if (!product || !meta) return null;

  const dealPct = meta.saving;
  const list = product.tiers[0].price;
  const display = dealPct > 0 ? list * (1 - dealPct / 100) : list;
  const incVat = display * 1.2;
  const stockLabel =
    meta.stock > 200
      ? "In stock"
      : meta.stock > 30
        ? "Low stock"
        : "Out of stock";

  return (
    <article className="card product-card" id={sku}>
      <div className="thumb">
        <Placeholder
          ratio="1 / 1"
          cap={product.cap}
          style={{ position: "absolute", inset: 0 }}
        />
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
        <button className="wishlist" aria-label="Add to wishlist">
          <Heart size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="brand-row">{product.brand}</div>
      <div className="name">{product.name}</div>
      <div className="use">{product.use}</div>

      <div className="meta-row">
        <Stars value={meta.rating} />
        <span style={{ color: "var(--body)", fontWeight: 600 }}>
          {meta.rating.toFixed(1)}
        </span>
        <span>({meta.reviews})</span>
        <span>·</span>
        <span>SKU {product.sku}</span>
      </div>

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

      <div
        className="flex items-center gap-3"
        style={{ marginTop: 4 }}
      >
        <span className="stock">
          <span className="dot-status" /> {stockLabel} ({meta.stock})
        </span>
      </div>

      {showBulkHint && (
        <div className="bulk-hint">
          Buy {product.tiers[1].min}+ for £{plain2(product.tiers[1].price)}{" "}
          each
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          add(sku, 1);
          toast.success(`Added to basket — ${product.name}`);
        }}
      >
        <ShoppingCart size={16} strokeWidth={2} /> Add to basket
      </button>
    </article>
  );
}
