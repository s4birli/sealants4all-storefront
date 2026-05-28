"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, Clock } from "lucide-react";
import { DEALS_SKU } from "@/lib/data/products";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

const HOURS_AHEAD = 62;

export function DealsSection() {
  const target = useMemo(() => {
    return Date.now() + HOURS_AHEAD * 3600 * 1000;
  }, []);
  const [now, setNow] = useState(target); // SSR-safe: matches no-countdown initial render
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  let left = Math.max(0, target - now);
  const days = Math.floor(left / 86_400_000);
  left -= days * 86_400_000;
  const hrs = Math.floor(left / 3_600_000);
  left -= hrs * 3_600_000;
  const min = Math.floor(left / 60_000);
  left -= min * 60_000;
  const sec = Math.floor(left / 1_000);

  return (
    <section className="section" id="deals" style={{ background: "#FFF7E6" }}>
      <div className="container">
        <div className="section-head">
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--cta-500)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Tag size={14} strokeWidth={2} /> Limited time
            </div>
            <h2 className="h-section">Deals of the week</h2>
            <div className="h-section-sub">
              Six trade-favourite SKUs at clearance pricing. Offer ends in:
            </div>
          </div>
          <div
            className="flex items-center gap-3"
            style={{ alignSelf: "end" }}
          >
            <Clock size={20} strokeWidth={1.8} />
            <div className="countdown" aria-label="Time left" suppressHydrationWarning>
              <Unit v={mounted ? days : 0} l="Days" />
              <Unit v={mounted ? hrs : 0} l="Hrs" />
              <Unit v={mounted ? min : 0} l="Min" />
              <Unit v={mounted ? sec : 0} l="Sec" />
            </div>
          </div>
        </div>
        <Carousel>
          {DEALS_SKU.map((sku) => (
            <ProductCard key={sku} sku={sku} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}

function Unit({ v, l }: { v: number; l: string }) {
  return (
    <div className="unit">
      <div className="v tabular">{String(v).padStart(2, "0")}</div>
      <div className="l">{l}</div>
    </div>
  );
}
