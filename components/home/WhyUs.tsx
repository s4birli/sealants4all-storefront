import { ShieldCheck, Tag, Headset, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: <ShieldCheck size={24} strokeWidth={1.8} />,
    t: "Official Distributor",
    d: "Six brands — Sika, Fischer, Soudal, Teroson, Terraco, Everbuild — sourced direct from the manufacturer.",
  },
  {
    icon: <Tag size={24} strokeWidth={1.8} />,
    t: "Bulk Trade Pricing",
    d: "Tier pricing visible on every product page. No phone-only quotes. No hidden discounts.",
  },
  {
    icon: <Headset size={24} strokeWidth={1.8} />,
    t: "Real Technical Support",
    d: "Phone, email, live chat — answered by people who've actually used the products on site.",
  },
  {
    icon: <Truck size={24} strokeWidth={1.8} />,
    t: "Fast UK Dispatch",
    d: "Orders before 3pm ship same day from our London warehouse. Next-day UK courier as standard.",
  },
];

export function WhyUs() {
  return (
    <section className="section" style={{ background: "var(--surface)" }}>
      <div className="container">
        <div
          className="section-head"
          style={{ justifyContent: "center", textAlign: "center" }}
        >
          <div>
            <h2 className="h-section">Why choose Sealants4All</h2>
            <div className="h-section-sub">
              Five years supplying UK trade. 50,000+ orders shipped. Zero
              phone-only pricing.
            </div>
          </div>
        </div>
        <div className="why-row">
          {ITEMS.map((it, i) => (
            <div key={i} className="why-item">
              <span className="icon">{it.icon}</span>
              <div className="t">{it.t}</div>
              <div className="d">{it.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
