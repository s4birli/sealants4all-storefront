import { StubPage } from "@/components/layout/StubPage";
import { CATEGORIES } from "@/lib/data/categories";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.id === slug);
  return (
    <StubPage
      title={cat ? cat.name : `Category: ${slug}`}
      description="Filtered catalogue with brand, application, and tier-aware sidebar filters lands in Phase 1.5."
    />
  );
}
