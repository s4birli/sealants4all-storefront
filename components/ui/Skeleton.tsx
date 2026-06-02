import type { CSSProperties } from "react";

/** A single shimmering placeholder block. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/** Placeholder matching the product card layout. */
export function ProductCardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton height={0} style={{ aspectRatio: "1 / 1", height: "auto" }} radius="var(--radius)" />
      <Skeleton width="40%" height={10} />
      <Skeleton width="85%" height={14} />
      <Skeleton width="60%" height={14} />
      <Skeleton width="50%" height={12} />
      <Skeleton width="35%" height={20} />
      <Skeleton height={38} radius="var(--radius)" style={{ marginTop: "auto" }} />
    </div>
  );
}

/** A responsive grid of product-card skeletons. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
