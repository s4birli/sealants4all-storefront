import { APPLICATIONS } from "@/lib/data/applications";
import { Placeholder } from "@/components/ui/Placeholder";

export function Applications() {
  return (
    <section className="section" style={{ background: "var(--surface)" }}>
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by application</h2>
            <div className="h-section-sub">
              The right product for the job. Filtered by the work you&apos;re
              actually doing.
            </div>
          </div>
        </div>
        <div className="app-grid">
          {APPLICATIONS.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="app-card">
              <Placeholder
                ratio="auto"
                cap={a.cap}
                className="app-img"
                style={{ position: "absolute", inset: 0 }}
              />
              <div className="app-grad" />
              <div className="app-meta">
                <div className="l">APPLICATION</div>
                <div className="t">{a.name}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
