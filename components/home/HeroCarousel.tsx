"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/data/heroSlides";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stars } from "@/components/product/Stars";

const AUTOPLAY_MS = 6000;

export function HeroCarousel() {
  const slides = HERO_SLIDES;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  const slide = slides[i];

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: slide.bg, transition: "background 600ms ease" }}
    >
      <div
        className="slide-track"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {slides.map((s, idx) => (
          <div className="slide" key={idx}>
            <div className="container">
              <div>
                <div className="eyebrow" style={{ color: s.accent }}>
                  <span
                    style={{ width: 24, height: 1, background: s.accent }}
                  />{" "}
                  {s.eyebrow}
                </div>
                <h1>{s.title}</h1>
                <p>{s.sub}</p>
                <div className="ctas">
                  <a
                    href={s.ctaPrimary.href}
                    className="btn btn-primary btn-lg"
                    style={{
                      background: s.accent === "#FFB800" ? "#FF6B1A" : s.accent,
                    }}
                  >
                    {s.ctaPrimary.label} <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href={s.ctaSecondary.href}
                    className="btn btn-outline-white btn-lg"
                  >
                    {s.ctaSecondary.label}
                  </a>
                </div>
                <div
                  className="flex items-center gap-3 mt-6"
                  style={{ flexWrap: "wrap" }}
                >
                  <span
                    className="flex items-center gap-2"
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}
                  >
                    <Stars value={4.8} size={14} /> 4.8/5 on Trustpilot
                  </span>
                  <span
                    style={{
                      width: 1,
                      height: 14,
                      background: "rgba(255,255,255,0.3)",
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}
                  >
                    2,314 verified reviews
                  </span>
                </div>
              </div>
              <div className="visual">
                <Placeholder
                  ratio="auto"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, transparent 8px 16px), rgba(255,255,255,0.02)",
                  }}
                  tag={s.tag}
                  cap={s.productCap}
                />
                <span
                  className="badge"
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: s.accent,
                    color: "#1F1300",
                    fontSize: 12,
                    padding: "6px 12px",
                  }}
                >
                  ★ FEATURED
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="arrow prev"
        aria-label="Previous slide"
        onClick={() => setI((v) => (v - 1 + slides.length) % slides.length)}
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <button
        className="arrow next"
        aria-label="Next slide"
        onClick={() => setI((v) => (v + 1) % slides.length)}
      >
        <ChevronRight size={20} strokeWidth={2} />
      </button>
      <div className="dots">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={"dot " + (idx === i ? "active" : "")}
            aria-label={`Slide ${idx + 1}`}
            onClick={() => setI(idx)}
          />
        ))}
      </div>
    </section>
  );
}
