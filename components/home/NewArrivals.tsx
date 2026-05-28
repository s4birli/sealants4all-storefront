import { BEST_SKU, NEW_SKU } from "@/lib/data/products";
import { Carousel } from "@/components/home/Carousel";
import { ProductCard } from "@/components/product/ProductCard";

export function NewArrivals() {
  const skus = NEW_SKU.concat(BEST_SKU.slice(0, 4));
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Just landed"
          title="New arrivals"
          link={{ label: "See all new products", href: "#new" }}
        >
          {skus.map((sku, i) => (
            <ProductCard key={`${sku}-${i}`} sku={sku} isNew={i < 4} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
