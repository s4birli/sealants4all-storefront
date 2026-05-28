import { Truck, ShieldCheck, CreditCard } from "lucide-react";
import { Stars } from "@/components/product/Stars";

const ITEMS = [
  {
    icon: <Truck size={20} strokeWidth={1.8} />,
    t: "Free UK delivery",
    s: "On orders over £150",
  },
  {
    icon: <Stars value={5} size={14} />,
    t: "4.8 / 5 on Trustpilot",
    s: "2,314 verified reviews",
  },
  {
    icon: <ShieldCheck size={20} strokeWidth={1.8} />,
    t: "Official distributor",
    s: "6 brands · Direct sourcing",
  },
  {
    icon: <CreditCard size={20} strokeWidth={1.8} />,
    t: "Net-30 trade terms",
    s: "On approved accounts",
  },
];

export function TrustStrip() {
  return (
    <section className="trust-strip">
      <div className="container">
        <div className="row">
          {ITEMS.map((it, i) => (
            <div key={i} className="trust-item">
              <span className="icon">{it.icon}</span>
              <span>
                {it.t}
                <span className="sub">{it.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
