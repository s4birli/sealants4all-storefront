import type { CSSProperties, ReactNode } from "react";

type PlaceholderProps = {
  cap?: string;
  tag?: string;
  ratio?: string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
};

export function Placeholder({
  cap,
  tag,
  ratio = "1 / 1",
  style,
  className,
  children,
}: PlaceholderProps) {
  return (
    <div
      className={"ph-grid " + (className || "")}
      style={{
        aspectRatio: ratio,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        ...style,
      }}
    >
      {tag && <div className="ph-tag">{tag}</div>}
      {cap && <div className="ph-cap">{cap}</div>}
      {children}
    </div>
  );
}
