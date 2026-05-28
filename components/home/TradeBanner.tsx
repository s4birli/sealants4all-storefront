import { Check } from "lucide-react";

const PERKS = [
  "Bulk tier pricing",
  "Net-30 terms",
  "Named account rep",
  "Priority dispatch",
  "Saved order lists",
  "Multi-user team accounts",
];

const STATS = [
  { v: "£487", l: "AVG ORDER" },
  { v: "24h", l: "DISPATCH" },
  { v: "4.9", l: "TRADE NPS" },
];

export function TradeBanner() {
  return (
    <section className="section" id="trade">
      <div className="container">
        <div className="trade-banner">
          <div className="tb-grid">
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  background: "rgba(255,107,26,0.18)",
                  color: "var(--cta-400)",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                ★ For Trade Customers
              </div>
              <h2>
                Open a trade account — save up to 30% on bulk orders.
              </h2>
              <p>
                Volume pricing, net-30 terms, a named account manager, and
                priority dispatch. Application takes 3 minutes. Decision within
                1 business day.
              </p>
              <div className="perks">
                {PERKS.map((p) => (
                  <span key={p} className="perk">
                    <span className="tick">
                      <Check size={16} strokeWidth={3} />
                    </span>{" "}
                    {p}
                  </span>
                ))}
              </div>
              <div
                className="flex gap-3"
                style={{ flexWrap: "wrap" }}
              >
                <a href="/trade" className="btn btn-primary btn-lg">
                  Apply now →
                </a>
                <a href="/trade" className="btn btn-outline-white btn-lg">
                  Learn more
                </a>
              </div>
            </div>
            <div className="stat-block">
              <div style={{ textAlign: "center", padding: 24 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Last 30 days
                </div>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: "var(--white)",
                    letterSpacing: "-0.02em",
                    margin: "8px 0",
                  }}
                  className="tabular"
                >
                  2,847
                </div>
                <div
                  style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}
                >
                  orders dispatched to trade accounts
                </div>
                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    justifyContent: "center",
                    gap: 24,
                  }}
                >
                  {STATS.map((s) => (
                    <div key={s.l}>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--white)",
                        }}
                        className="tabular"
                      >
                        {s.v}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.55)",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                        }}
                      >
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
