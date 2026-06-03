import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Switch,
  Label,
  Badge,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

type SitePage = {
  slug: string;
  title: string;
  description: string;
  body: string;
  updated: string;
  published: boolean;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_PAGE: SitePage = {
  slug: "",
  title: "",
  description: "",
  body: "",
  updated: "",
  published: true,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalise(raw: Partial<SitePage>): SitePage {
  return {
    ...EMPTY_PAGE,
    ...raw,
    published: raw.published !== false,
  };
}

const PagesPage = () => {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/site-pages", { credentials: "include" });
      const json = await res.json();
      const list: Partial<SitePage>[] = Array.isArray(json.site_pages)
        ? json.site_pages
        : [];
      setPages(list.map(normalise));
    } catch {
      toast.error("Could not load pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (index: number, patch: Partial<SitePage>) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const addPage = () => {
    setPages((prev) => [...prev, { ...EMPTY_PAGE }]);
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const cleaned = pages.map((p) => ({
      ...p,
      slug: p.slug.trim() || slugify(p.title),
      updated: today(),
    }));
    if (cleaned.some((p) => !p.slug)) {
      toast.error("Every page needs a title or slug.");
      return;
    }
    const slugs = cleaned.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length) {
      toast.error("Page slugs must be unique.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/admin/site-pages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_pages: cleaned }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Save failed");
      }
      const json = await res.json();
      const list: Partial<SitePage>[] = Array.isArray(json.site_pages)
        ? json.site_pages
        : [];
      setPages(list.map(normalise));
      toast.success("Pages saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Pages</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Legal &amp; info pages (Terms, Returns, Privacy, Delivery, About,
            Contact). The slug becomes the URL, e.g. slug “terms” →
            /terms. Bodies accept Markdown. Unpublished pages fall back to the
            built-in defaults.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addPage}>
            New page
          </Button>
          <Button variant="primary" onClick={save} isLoading={saving}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : pages.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No custom pages yet — the storefront is serving built-in defaults.
            Click “New page” to override one (use slug terms, returns, privacy,
            delivery, about or contact).
          </Text>
        ) : (
          <div className="flex flex-col gap-6">
            {pages.map((page, index) => (
              <PageEditor
                key={index}
                page={page}
                onChange={(patch) => update(index, patch)}
                onRemove={() => removePage(index)}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

function PageEditor({
  page,
  onChange,
  onRemove,
}: {
  page: SitePage;
  onChange: (patch: Partial<SitePage>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-ui-border-base rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge size="small" color={page.published ? "green" : "orange"}>
            {page.published ? "Published" : "Draft"}
          </Badge>
          <Text size="small" weight="plus">
            {page.title || "Untitled page"}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label size="xsmall" className="text-ui-fg-subtle">
              Published
            </Label>
            <Switch
              checked={page.published}
              onCheckedChange={(v) => onChange({ published: v })}
            />
          </div>
          <Button variant="danger" size="small" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input
            value={page.title}
            onChange={(e) => {
              const title = e.target.value;
              const patch: Partial<SitePage> = { title };
              if (!page.slug || page.slug === slugify(page.title)) {
                patch.slug = slugify(title);
              }
              onChange(patch);
            }}
            placeholder="Terms & Conditions"
          />
        </Field>
        <Field label="Slug (URL)">
          <Input
            value={page.slug}
            onChange={(e) => onChange({ slug: slugify(e.target.value) })}
            placeholder="terms"
          />
        </Field>

        <Field label="Meta description (SEO)" className="md:col-span-2">
          <Textarea
            value={page.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A short summary shown in Google results (max ~160 chars)."
            rows={2}
          />
        </Field>

        <Field label="Body (Markdown)" className="md:col-span-2">
          <Textarea
            value={page.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder={"## Heading\n\nWrite the page in Markdown."}
            rows={16}
            className="font-mono text-xs"
          />
        </Field>

        <div className="md:col-span-2">
          <Text size="xsmall" className="text-ui-fg-subtle">
            Storefront URL: /{page.slug || slugify(page.title)}
          </Text>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Label>
      {children}
    </div>
  );
}

export const config = defineRouteConfig({
  label: "Pages",
});

export default PagesPage;
