import { CATEGORIES } from "@/lib/data/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export function CategoryGrid() {
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by category</h2>
            <div className="h-section-sub">
              158 SKUs across 8 product categories — all in stock, dispatched
              from London.
            </div>
          </div>
          <a className="link" href="#catalogue">
            View all categories →
          </a>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`/category/${c.id}`}
              className="card cat-card"
            >
              <div className="thumb">
                <CategoryIcon name={c.icon} />
              </div>
              <div className="name">{c.name}</div>
              <div className="count">{c.count} products</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
