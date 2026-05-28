"use client";

import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { CATEGORIES } from "@/lib/data/categories";
import { APPLICATIONS } from "@/lib/data/applications";
import { BRANDS } from "@/lib/data/brands";

const TOP_LINKS = ["Sika", "Fischer", "Soudal", "Caravan", "EWI", "Fire", "Waterproofing"];

export function MegaNav() {
  const [open, setOpen] = useState<string | null>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (k: string) => {
    if (closeT.current) clearTimeout(closeT.current);
    setOpen(k);
  };
  const closeMenu = () => {
    closeT.current = setTimeout(() => setOpen(null), 120);
  };

  return (
    <nav className="mega-nav" onMouseLeave={closeMenu}>
      <div className="container relative">
        <div className="row">
          <a
            className={"mega-link primary " + (open === "all" ? "open" : "")}
            href="#catalogue"
            onMouseEnter={() => openMenu("all")}
            onFocus={() => openMenu("all")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(open === "all" ? null : "all");
              }
            }}
            aria-expanded={open === "all"}
          >
            <Menu size={16} strokeWidth={2} /> All products{" "}
            <span className="caret">▾</span>
          </a>
          {TOP_LINKS.map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="mega-link"
            >
              {label}
            </a>
          ))}
          <a href="#deals" className="mega-link deals">
            ★ Deals
          </a>
          <a
            href="/trade"
            className="mega-link"
            style={{ marginLeft: "auto" }}
          >
            Trade Hub →
          </a>
        </div>

        {open === "all" && (
          <div
            className="mega-panel"
            onMouseEnter={() => openMenu("all")}
            onMouseLeave={closeMenu}
          >
            <div className="container">
              <div className="mega-panel-inner">
                <div className="mega-col">
                  <h4>By Category</h4>
                  {CATEGORIES.slice(0, 4).map((c) => (
                    <a key={c.id} href={`/category/${c.id}`}>
                      {c.name}{" "}
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        ({c.count})
                      </span>
                    </a>
                  ))}
                </div>
                <div className="mega-col">
                  <h4>By Application</h4>
                  {APPLICATIONS.slice(0, 5).map((a) => (
                    <a key={a.id} href={`#${a.id}`}>
                      {a.name}
                    </a>
                  ))}
                </div>
                <div className="mega-col">
                  <h4>Top Brands</h4>
                  {BRANDS.slice(0, 6).map((b) => (
                    <a key={b.id} href={`#${b.id}`}>
                      {b.name}
                    </a>
                  ))}
                </div>
                <div className="mega-promo">
                  <div className="promo-img" />
                  <div
                    style={{ marginTop: 12, fontWeight: 700, fontSize: 14 }}
                  >
                    S4ALL Pro range — up to 38% under brand
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--body)",
                      marginTop: 4,
                    }}
                  >
                    Our own private label. UK-made.
                  </div>
                  <a
                    className="btn btn-brand btn-sm mt-4"
                    href="#s4all"
                  >
                    Shop now →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
