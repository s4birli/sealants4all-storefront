import { Check } from "lucide-react";
import { BRANDS } from "@/lib/data/brands";

export function BrandGrid() {
  return (
    <section
      className="section"
      style={{ background: "var(--surface)" }}
      id="brands"
    >
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by brand</h2>
            <div className="h-section-sub">
              Official UK distributor of six leading brands — and our own
              private-label S4ALL Pro range.
            </div>
          </div>
          <a className="link" href="#brands">
            All brands →
          </a>
        </div>
        <div className="brand-grid">
          {BRANDS.map((b) => (
            <a key={b.id} href={`#${b.id}`} className="card brand-card">
              <div className="logo">{b.name}</div>
              <div className="official">
                <Check size={12} strokeWidth={3} />
                {b.id === "s4all" ? "OUR OWN LABEL" : "OFFICIAL DISTRIBUTOR"}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
