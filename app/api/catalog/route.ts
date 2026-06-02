import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";

// Catalogue feed consumed by the client-side search provider. Cached/revalidated.
export const revalidate = 60;

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  try {
    const products = await getAllProducts();
    // Search-feed only: the client search index, the product cards it renders,
    // and the checkout/chat getBySku() lookups never read the full `description`
    // (386KB ≈ 62% of the payload) or the `images` gallery array. Blank them so
    // the catalogue the browser downloads on EVERY page (root layout provider)
    // drops from ~620KB to ~200KB — same shape, all fields any consumer uses kept.
    const searchFeed = products.map((p) => ({ ...p, description: "", images: [] }));
    return NextResponse.json({ products: searchFeed }, { headers: securityHeaders });
  } catch (err) {
    return NextResponse.json(
      { products: [], error: (err as Error).message },
      { status: 502, headers: securityHeaders },
    );
  }
}
