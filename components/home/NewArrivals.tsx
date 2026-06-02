import type { Product } from "@/lib/data/types";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

export function NewArrivals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Just landed"
          title="New arrivals"
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
