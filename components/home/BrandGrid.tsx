import { ShieldCheck, Star } from "lucide-react";
import { BRANDS } from "@/lib/data/brands";

// Signature accent per brand — drives the top bar, hover border, wordmark and
// badge tint. Approximations of each maker's brand colour (we're their official
// distributor); S4ALL Pro reuses our own brand colour.
const ACCENT: Record<string, string> = {
  sika: "#D52B1E",
  fischer: "#C8102E",
  soudal: "#0067B1",
  teroson: "#0098DB",
  terraco: "#2E8B57",
  everbuild: "#0B4DA2",
  s4all: "var(--brand-500)",
};

export function BrandGrid() {
  return (
    <section className="section" style={{ background: "var(--surface)" }} id="brands">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by brand</h2>
            <div className="h-section-sub">
              Official UK distributor of six leading brands — and our own
              private-label S4ALL Pro range.
            </div>
          </div>
          <a className="link" href="/search">
            All brands →
          </a>
        </div>
        <div className="brand-grid">
          {BRANDS.map((b) => {
            const own = b.id === "s4all";
            return (
              <a
                key={b.id}
                href={`/search?q=${encodeURIComponent(b.name)}`}
                className="brand-card"
                style={{ "--accent": ACCENT[b.id] } as React.CSSProperties}
                aria-label={`Shop ${b.name} products`}
              >
                <span className="brand-mark">{b.name}</span>
                <span className="brand-blurb">{b.blurb}</span>
                <span className={own ? "brand-badge own" : "brand-badge"}>
                  {own ? (
                    <Star size={11} strokeWidth={2.5} />
                  ) : (
                    <ShieldCheck size={12} strokeWidth={2.5} />
                  )}
                  {own ? "Our own label" : "Official distributor"}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
