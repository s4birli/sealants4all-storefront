import { REVIEWS } from "@/lib/data/reviews";
import { Carousel } from "@/components/home/Carousel";
import { Stars } from "@/components/product/Stars";

export function Reviews() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <div
              className="flex items-center gap-3"
              style={{ marginBottom: 6 }}
            >
              <Stars value={5} size={20} />
              <span className="fw-700">4.8 / 5</span>
              <span style={{ color: "var(--body)" }}>
                · 2,314 reviews on Trustpilot
              </span>
            </div>
            <h2 className="h-section">What our customers say</h2>
          </div>
          <a className="link" href="#trustpilot">
            Read all reviews →
          </a>
        </div>
        <Carousel>
          {REVIEWS.map((r, i) => (
            <div key={i} className="card review-card">
              <Stars value={r.stars} />
              <div className="text">&ldquo;{r.text}&rdquo;</div>
              <div className="who">{r.name}</div>
              <div className="date">Verified order · {r.date}</div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
