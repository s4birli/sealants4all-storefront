import { CATEGORIES } from "@/lib/data/categories";
import { CATEGORY_IMAGES } from "@/lib/data/categoryImages";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export function CategoryGrid({
  counts,
  copy,
}: {
  counts?: Record<string, number>;
  copy?: Record<string, string>;
}) {
  const visible = CATEGORIES.filter((c) => (counts ? (counts[c.id] ?? 0) > 0 : true));
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">{copy?.heading ?? "Shop by category"}</h2>
            <div className="h-section-sub">
              {copy?.sub ??
                "Trade sealants, adhesives, fixings and EWI systems — all in stock, dispatched from London."}
            </div>
          </div>
          <a className="link" href="#categories">
            View all categories →
          </a>
        </div>
        <div className="cat-grid">
          {visible.map((c) => {
            const count = counts?.[c.id] ?? c.count;
            const image = CATEGORY_IMAGES[c.id];
            return (
              <a
                key={c.id}
                href={`/category/${c.id}`}
                className="card cat-card"
              >
                <div className={image ? "thumb has-img" : "thumb"}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={c.name} loading="lazy" />
                  ) : (
                    <CategoryIcon name={c.icon} />
                  )}
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
