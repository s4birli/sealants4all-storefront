import { CATEGORIES } from "@/lib/data/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export function CategoryGrid({ counts }: { counts?: Record<string, number> }) {
  const visible = CATEGORIES.filter((c) => (counts ? (counts[c.id] ?? 0) > 0 : true));
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by category</h2>
            <div className="h-section-sub">
              Trade sealants, adhesives, fixings and EWI systems — all in stock,
              dispatched from London.
            </div>
          </div>
          <a className="link" href="#categories">
            View all categories →
          </a>
        </div>
        <div className="cat-grid">
          {visible.map((c) => {
            const count = counts?.[c.id] ?? c.count;
            return (
              <a
                key={c.id}
                href={`/category/${c.id}`}
                className="card cat-card"
              >
                <div className="thumb">
                  <CategoryIcon name={c.icon} />
                </div>
                <div className="name">{c.name}</div>
                <div className="count">{count} products</div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
