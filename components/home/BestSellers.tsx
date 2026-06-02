import type { Product } from "@/lib/data/types";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

export function BestSellers({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Most ordered"
          title="Best sellers"
          link={{ label: "See all best sellers", href: "#bestsellers" }}
        >
          {products.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
