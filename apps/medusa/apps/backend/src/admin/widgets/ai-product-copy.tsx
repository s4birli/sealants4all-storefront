import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Textarea, Text, Badge, toast } from "@medusajs/ui";
import { useState } from "react";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

type ProductData = {
  title?: string;
  categories?: { name: string }[];
  metadata?: Record<string, unknown> | null;
};

type Generated = {
  description: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
};

const AiProductCopyWidget = ({ data }: { data: ProductData }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Generated | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/ai/product-copy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data?.title,
          brand: (data?.metadata?.brand as string) || undefined,
          category: data?.categories?.[0]?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult(json as Generated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <Container className="divide-y p-0">
      <DashboardTour pageId="ai-product-copy" steps={TOURS["ai-product-copy"]} />
      <div className="flex items-center justify-between px-6 py-4">
        <div data-tour="ai:intro">
          <Heading level="h2">AI product copy</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Draft a description, SEO meta and tags with Claude — then copy into the fields.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={generate} isLoading={loading} data-tour="ai:generate">
          Generate with AI
        </Button>
      </div>

      {error && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 px-6 py-4" data-tour="ai:results">
          <Field label="Description" value={result.description} onCopy={copy} rows={4} />
          <Field label="SEO title" value={result.seo_title} onCopy={copy} rows={1} />
          <Field label="SEO description" value={result.seo_description} onCopy={copy} rows={2} />
          <div>
            <Text size="small" weight="plus" className="mb-1">
              Tags
            </Text>
            <div className="flex flex-wrap gap-2">
              {result.tags.map((t) => (
                <Badge key={t} size="small">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

function Field({
  label,
  value,
  rows,
  onCopy,
}: {
  label: string;
  value: string;
  rows: number;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Text size="small" weight="plus">
          {label}
        </Text>
        <Button size="small" variant="transparent" onClick={() => onCopy(label, value)}>
          Copy
        </Button>
      </div>
      <Textarea value={value} rows={rows} readOnly />
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default AiProductCopyWidget;
