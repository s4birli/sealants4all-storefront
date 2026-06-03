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

type Field = { name: string; label: string; placeholder: string; multiline?: boolean };

// Section registry — keep keys in sync with the storefront's lib/homepage.ts.
const SECTION_DEFS: { key: string; label: string; note?: string; fields: Field[] }[] = [
  { key: "hero", label: "Hero carousel", note: "Slides are edited in Hero Slides.", fields: [] },
  { key: "trust", label: "Trust strip", fields: [] },
  {
    key: "categories",
    label: "Shop by category",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Shop by category" },
      { name: "sub", label: "Subheading", placeholder: "Trade sealants, adhesives…", multiline: true },
    ],
  },
  {
    key: "brands",
    label: "Shop by brand",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Shop by brand" },
      { name: "sub", label: "Subheading", placeholder: "Official UK distributor…", multiline: true },
    ],
  },
  {
    key: "bestsellers",
    label: "Best sellers",
    note: "Products come from the 'best-sellers' collection.",
    fields: [
      { name: "kicker", label: "Kicker", placeholder: "Most ordered" },
      { name: "title", label: "Title", placeholder: "Best sellers" },
    ],
  },
  {
    key: "trade",
    label: "Trade banner",
    fields: [
      { name: "eyebrow", label: "Eyebrow", placeholder: "For Trade Customers" },
      { name: "title", label: "Title", placeholder: "Open a trade account…", multiline: true },
      { name: "sub", label: "Body", placeholder: "Volume pricing, net-30 terms…", multiline: true },
      { name: "ctaLabel", label: "Button label", placeholder: "Apply now →" },
      { name: "ctaHref", label: "Button link", placeholder: "/trade" },
    ],
  },
  {
    key: "deals",
    label: "Deals of the week",
    note: "Products come from the 'deals' collection.",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Deals of the week" },
      { name: "sub", label: "Subheading", placeholder: "Six trade-favourite SKUs…", multiline: true },
    ],
  },
  {
    key: "newarrivals",
    label: "New arrivals",
    note: "Products come from the 'new-arrivals' collection.",
    fields: [
      { name: "kicker", label: "Kicker", placeholder: "Just landed" },
      { name: "title", label: "Title", placeholder: "New arrivals" },
    ],
  },
  {
    key: "applications",
    label: "Shop by application",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Shop by application" },
      { name: "sub", label: "Subheading", placeholder: "The right product for the job…", multiline: true },
    ],
  },
  {
    key: "reviews",
    label: "Customer reviews",
    fields: [
      { name: "heading", label: "Heading", placeholder: "What our customers say" },
      { name: "sub", label: "Rating line", placeholder: "2,314 reviews on Trustpilot" },
    ],
  },
  {
    key: "whyus",
    label: "Why choose us",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Why choose Sealants4All" },
      { name: "sub", label: "Subheading", placeholder: "Five years supplying UK trade…", multiline: true },
    ],
  },
  {
    key: "newsletter",
    label: "Newsletter",
    fields: [
      { name: "heading", label: "Heading", placeholder: "Trade tips, new products…" },
      { name: "sub", label: "Subheading", placeholder: "Monthly. We respect the inbox…", multiline: true },
    ],
  },
];

const ALL_KEYS = SECTION_DEFS.map((d) => d.key);

type SectionState = { key: string; enabled: boolean };
type CopyState = Record<string, Record<string, string>>;

const HomepagePage = () => {
  const [sections, setSections] = useState<SectionState[]>([]);
  const [copy, setCopy] = useState<CopyState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/homepage", { credentials: "include" });
      const json = await res.json();
      const hp = json.homepage ?? {};

      // Build ordered sections: stored order first (known keys), then append any
      // missing known section so new ones still surface.
      const stored: SectionState[] = Array.isArray(hp.sections)
        ? hp.sections
            .filter((s: SectionState) => ALL_KEYS.includes(s?.key))
            .map((s: SectionState) => ({ key: s.key, enabled: s.enabled !== false }))
        : [];
      const seen = new Set(stored.map((s) => s.key));
      for (const k of ALL_KEYS) if (!seen.has(k)) stored.push({ key: k, enabled: true });

      setSections(stored);
      setCopy(hp.copy ?? {});
    } catch {
      toast.error("Could not load homepage config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const move = (index: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const t = index + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
  };

  const toggle = (key: string, enabled: boolean) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)));
  };

  const setField = (key: string, field: string, value: string) => {
    setCopy((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/admin/homepage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepage: { sections, copy } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Save failed");
      }
      toast.success("Homepage saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const defFor = (key: string) => SECTION_DEFS.find((d) => d.key === key)!;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Homepage</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Reorder homepage sections, switch them on or off, and edit their
            headings. Blank fields fall back to the built-in defaults.
          </Text>
        </div>
        <Button variant="primary" onClick={save} isLoading={saving}>
          Save changes
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((s, index) => {
              const def = defFor(s.key);
              return (
                <div key={s.key} className="border-ui-border-base rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge size="small" color={s.enabled ? "green" : "grey"}>
                        #{index + 1}
                      </Badge>
                      <Text size="small" weight="plus">
                        {def.label}
                      </Text>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label size="xsmall" className="text-ui-fg-subtle">
                          Visible
                        </Label>
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) => toggle(s.key, v)}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        Up
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={index === sections.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        Down
                      </Button>
                    </div>
                  </div>

                  {def.note && (
                    <Text size="xsmall" className="text-ui-fg-subtle mb-2">
                      {def.note}
                    </Text>
                  )}

                  {def.fields.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {def.fields.map((f) => (
                        <div
                          key={f.name}
                          className={`flex flex-col gap-1 ${f.multiline ? "md:col-span-2" : ""}`}
                        >
                          <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">
                            {f.label}
                          </Label>
                          {f.multiline ? (
                            <Textarea
                              value={copy[s.key]?.[f.name] ?? ""}
                              placeholder={f.placeholder}
                              rows={2}
                              onChange={(e) => setField(s.key, f.name, e.target.value)}
                            />
                          ) : (
                            <Input
                              value={copy[s.key]?.[f.name] ?? ""}
                              placeholder={f.placeholder}
                              onChange={(e) => setField(s.key, f.name, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Homepage",
});

export default HomepagePage;
