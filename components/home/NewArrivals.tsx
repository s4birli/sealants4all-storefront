import type { Product } from "@/lib/data/types";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

export function NewArrivals({
  products,
  copy,
}: {
  products: Product[];
  copy?: Record<string, string>;
}) {
  if (products.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker={copy?.kicker ?? "Just landed"}
          title={copy?.title ?? "New arrivals"}
          link={{ label: "See all new products", href: "#new" }}
        >
          {products.map((p, i) => (
            <ProductCard key={`${p.sku}-${i}`} product={p} isNew={i < 4} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
