import Link from "next/link";
import { Phone } from "lucide-react";
import { CATEGORIES } from "@/lib/data/categories";
import { BRANDS } from "@/lib/data/brands";

const HELP_LINKS = [
  "Shipping",
  "Returns",
  "Datasheets",
  "FAQ",
  "Contact Us",
  "Trade Account",
  "My Account",
  "Track Order",
  "Modern Slavery",
];

const PAYMENT_METHODS = ["VISA", "MASTERCARD", "AMEX", "PAYPAL", "APPLE PAY", "KLARNA"];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container top">
        <div className="cols">
          <div>
            <Link href="/" className="brand-logo">
              Sealants<span className="four">4</span>All
            </Link>
            <div className="blurb">
              Official UK distributor of Sika, Fischer, Soudal, Teroson, Terraco
              and Everbuild. Trade-grade sealants, adhesives, fixings, and EWI
              systems — dispatched in 24 hours.
            </div>
            <div className="contact">
              <div className="ph">
                <Phone size={16} strokeWidth={2} /> 020 8050 3959
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                9:00 – 18:00, Monday to Friday
              </div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                sales@sealants4all.co.uk
              </div>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            {CATEGORIES.map((c) => (
              <a key={c.id} href={`/category/${c.id}`}>
                {c.name}
              </a>
            ))}
            <a href="#deals">Deals & Clearance</a>
          </div>
          <div>
            <h4>Brands</h4>
            {BRANDS.map((b) => (
              <a key={b.id} href={`#${b.id}`}>
                {b.name}
              </a>
            ))}
          </div>
          <div>
            <h4>Help & Account</h4>
            {HELP_LINKS.map((l) => (
              <a key={l} href="#">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="container bottom">
        <div className="row">
          <div>
            © 2026 All 4 Construction Limited · Co. No. 12 487 553 · VAT GB
            348 9921 04 · London SW18 4GQ
          </div>
          <div className="payments">
            {PAYMENT_METHODS.map((p) => (
              <span key={p} className="chip">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
