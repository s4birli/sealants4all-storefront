import Link from "next/link";
import { Phone } from "lucide-react";
import { CATEGORIES } from "@/lib/data/categories";
import { BRANDS } from "@/lib/data/brands";
import { ConsentPreferencesButton } from "@/components/layout/ConsentPreferencesButton";

const HELP_LINKS: { label: string; href: string }[] = [
  { label: "About Us", href: "/about" },
  { label: "Trade Account", href: "/trade" },
  { label: "Knowledge Base & Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
  { label: "Track Order", href: "#" },
];

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund & Returns Policy", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Delivery Information", href: "/delivery" },
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
              <a
                href="mailto:sales@sealants4all.co.uk"
                style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}
              >
                sales@sealants4all.co.uk
              </a>
              <address
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  marginTop: 8,
                  fontStyle: "normal",
                  lineHeight: 1.5,
                }}
              >
                1 Filament Walk, The Light Bulb LU2.22,
                <br />
                London SW18 4GQ
              </address>
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
            <Link href="/blog">Blog &amp; Guides</Link>
          </div>
          <div>
            <h4>Brands</h4>
            {BRANDS.map((b) => (
              <a key={b.id} href={`/search?q=${encodeURIComponent(b.name)}`}>
                {b.name}
              </a>
            ))}
          </div>
          <div>
            <h4>Help & Account</h4>
            {HELP_LINKS.map((l) =>
              l.href.startsWith("/") ? (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href}>
                  {l.label}
                </a>
              ),
            )}
            <h4 style={{ marginTop: 18 }}>Legals</h4>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
            <ConsentPreferencesButton />
          </div>
        </div>
      </div>
      <div className="container bottom">
        <div className="row">
          <div>
            © 2026 All 4 Construction Limited T/A Sealants4All · Co. No.
            15321255 · VAT GB460779856 · 1 Filament Walk, The Light Bulb LU2.22,
            London SW18 4GQ
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
