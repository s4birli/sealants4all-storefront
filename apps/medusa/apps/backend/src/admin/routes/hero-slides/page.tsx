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

type HeroSlide = {
  eyebrow: string;
  title: string;
  sub: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
  bg: string;
  accent: string;
  product_cap: string;
  tag: string;
  rank: number;
  enabled: boolean;
};

const EMPTY_SLIDE: HeroSlide = {
  eyebrow: "",
  title: "",
  sub: "",
  cta_primary_label: "",
  cta_primary_href: "",
  cta_secondary_label: "",
  cta_secondary_href: "",
  bg: "#0B2954",
  accent: "#FF6B1A",
  product_cap: "",
  tag: "",
  rank: 0,
  enabled: true,
};

function normalise(raw: Partial<HeroSlide>, index: number): HeroSlide {
  return {
    ...EMPTY_SLIDE,
    ...raw,
    rank: typeof raw.rank === "number" ? raw.rank : index,
    enabled: raw.enabled !== false,
  };
}

const HeroSlidesPage = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/hero-slides", { credentials: "include" });
      const json = await res.json();
      const list: Partial<HeroSlide>[] = Array.isArray(json.hero_slides)
        ? json.hero_slides
        : [];
      setSlides(list.map(normalise));
    } catch {
      toast.error("Could not load hero slides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (index: number, patch: Partial<HeroSlide>) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  const addSlide = () => {
    setSlides((prev) => [...prev, { ...EMPTY_SLIDE, rank: prev.length }]);
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    setSlides((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Re-rank by current display order before saving.
      const payload = slides.map((s, i) => ({ ...s, rank: i }));
      const res = await fetch("/admin/hero-slides", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_slides: payload }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Save failed");
      }
      const json = await res.json();
      const list: Partial<HeroSlide>[] = Array.isArray(json.hero_slides)
        ? json.hero_slides
        : [];
      setSlides(list.map(normalise));
      toast.success("Hero slides saved");
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
          <Heading level="h1">Hero Slides</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage the homepage hero carousel. Disabled slides are hidden from the
            storefront. Order here sets the carousel order.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addSlide}>
            Add slide
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
        ) : slides.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No hero slides yet. Click “Add slide” to create one.
          </Text>
        ) : (
          <div className="flex flex-col gap-6">
            {slides.map((slide, index) => (
              <SlideEditor
                key={index}
                index={index}
                total={slides.length}
                slide={slide}
                onChange={(patch) => update(index, patch)}
                onRemove={() => removeSlide(index)}
                onMove={(dir) => move(index, dir)}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

function SlideEditor({
  index,
  total,
  slide,
  onChange,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  slide: HeroSlide;
  onChange: (patch: Partial<HeroSlide>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="border-ui-border-base rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge size="small" color={slide.enabled ? "green" : "grey"}>
            #{index + 1}
          </Badge>
          <Text size="small" weight="plus">
            {slide.title || "Untitled slide"}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label size="xsmall" className="text-ui-fg-subtle">
              Enabled
            </Label>
            <Switch
              checked={slide.enabled}
              onCheckedChange={(v) => onChange({ enabled: v })}
            />
          </div>
          <Button
            variant="secondary"
            size="small"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            Up
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            Down
          </Button>
          <Button variant="danger" size="small" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Eyebrow">
          <Input
            value={slide.eyebrow}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Bulk Buy Savings"
          />
        </Field>
        <Field label="Tag">
          <Input
            value={slide.tag}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="OFFER"
          />
        </Field>

        <Field label="Title" className="md:col-span-2">
          <Input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Up to 30% off when you buy by the box."
          />
        </Field>

        <Field label="Subtitle" className="md:col-span-2">
          <Textarea
            value={slide.sub}
            onChange={(e) => onChange({ sub: e.target.value })}
            placeholder="Trade-grade sealants and adhesives, priced by volume."
            rows={2}
          />
        </Field>

        <Field label="Primary CTA label">
          <Input
            value={slide.cta_primary_label}
            onChange={(e) => onChange({ cta_primary_label: e.target.value })}
            placeholder="Shop bulk deals"
          />
        </Field>
        <Field label="Primary CTA href">
          <Input
            value={slide.cta_primary_href}
            onChange={(e) => onChange({ cta_primary_href: e.target.value })}
            placeholder="#deals"
          />
        </Field>

        <Field label="Secondary CTA label">
          <Input
            value={slide.cta_secondary_label}
            onChange={(e) => onChange({ cta_secondary_label: e.target.value })}
            placeholder="Open trade account"
          />
        </Field>
        <Field label="Secondary CTA href">
          <Input
            value={slide.cta_secondary_href}
            onChange={(e) => onChange({ cta_secondary_href: e.target.value })}
            placeholder="/trade"
          />
        </Field>

        <Field label="Background colour">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isHex(slide.bg) ? slide.bg : "#0B2954"}
              onChange={(e) => onChange({ bg: e.target.value })}
              className="border-ui-border-base h-8 w-10 cursor-pointer rounded border"
              aria-label="Background colour picker"
            />
            <Input
              value={slide.bg}
              onChange={(e) => onChange({ bg: e.target.value })}
              placeholder="#0B2954"
            />
          </div>
        </Field>
        <Field label="Accent colour">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isHex(slide.accent) ? slide.accent : "#FF6B1A"}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="border-ui-border-base h-8 w-10 cursor-pointer rounded border"
              aria-label="Accent colour picker"
            />
            <Input
              value={slide.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              placeholder="#FF6B1A"
            />
          </div>
        </Field>

        <Field label="Product cap">
          <Input
            value={slide.product_cap}
            onChange={(e) => onChange({ product_cap: e.target.value })}
            placeholder="SIKAFLEX 522 / 12-PACK"
          />
        </Field>
        <Field label="Rank">
          <Input
            type="number"
            value={String(slide.rank)}
            onChange={(e) => onChange({ rank: Number(e.target.value) || 0 })}
          />
        </Field>
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

function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

export const config = defineRouteConfig({
  label: "Hero Slides",
});

export default HeroSlidesPage;
