"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselProps = {
  children: ReactNode;
  title?: string;
  link?: { label: string; href: string };
  kicker?: string;
};

export function Carousel({ children, title, link, kicker }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div>
      {(title || kicker || link) && (
        <div className="section-head">
          <div>
            {kicker && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--cta-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                {kicker}
              </div>
            )}
            {title && <h2 className="h-section">{title}</h2>}
          </div>
          {link && (
            <a href={link.href} className="link">
              {link.label} →
            </a>
          )}
        </div>
      )}
      <div className="carousel-wrap">
        <button
          className="carousel-btn prev"
          disabled={!canPrev}
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <button
          className="carousel-btn next"
          disabled={!canNext}
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
        <div className="carousel-scroll" ref={ref}>
          {children}
        </div>
      </div>
    </div>
  );
}
