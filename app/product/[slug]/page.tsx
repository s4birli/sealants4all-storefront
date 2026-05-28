import { StubPage } from "@/components/layout/StubPage";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <StubPage
      title={`Product: ${slug}`}
      description="Product detail page is shipping in Phase 1.5 — full PDP with bulk tier table, technical datasheet, and stock-by-warehouse view."
    />
  );
}
