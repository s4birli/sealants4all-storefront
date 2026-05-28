import { BEST_SKU } from "@/lib/data/products";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

export function BestSellers() {
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Most ordered"
          title="Best sellers"
          link={{ label: "See all best sellers", href: "#bestsellers" }}
        >
          {BEST_SKU.map((sku) => (
            <ProductCard key={sku} sku={sku} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
