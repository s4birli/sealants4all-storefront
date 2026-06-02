import Image from "next/image";
import { APPLICATIONS } from "@/lib/data/applications";

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
              <Image
                src={`/home/${a.id}.jpg`}
                alt={a.name}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                className="app-img"
                style={{ objectFit: "cover" }}
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
