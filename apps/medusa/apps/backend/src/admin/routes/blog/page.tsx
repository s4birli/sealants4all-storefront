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

type BlogPost = {
  slug: string;
  title: string;
  description: string;
  body: string;
  cover: string;
  author: string;
  tags: string[];
  keywords: string[];
  date: string;
  updated: string;
  published: boolean;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_POST: BlogPost = {
  slug: "",
  title: "",
  description: "",
  body: "",
  cover: "",
  author: "Sealants4All Technical Team",
  tags: [],
  keywords: [],
  date: "",
  updated: "",
  published: false,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalise(raw: Partial<BlogPost>): BlogPost {
  return {
    ...EMPTY_POST,
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    published: raw.published === true,
    date: raw.date || today(),
  };
}

const BlogPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/blog-posts", { credentials: "include" });
      const json = await res.json();
      const list: Partial<BlogPost>[] = Array.isArray(json.blog_posts)
        ? json.blog_posts
        : [];
      setPosts(list.map(normalise));
    } catch {
      toast.error("Could not load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (index: number, patch: Partial<BlogPost>) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const addPost = () => {
    setPosts((prev) => [{ ...EMPTY_POST, date: today() }, ...prev]);
  };

  const removePost = (index: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    // Client-side validation mirrors the API: slug required + unique.
    const cleaned = posts.map((p) => ({
      ...p,
      slug: p.slug.trim() || slugify(p.title),
      updated: today(),
    }));
    const missing = cleaned.find((p) => !p.slug);
    if (missing) {
      toast.error("Every post needs a title or slug.");
      return;
    }
    const slugs = cleaned.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length) {
      toast.error("Post slugs must be unique.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/admin/blog-posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blog_posts: cleaned }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Save failed");
      }
      const json = await res.json();
      const list: Partial<BlogPost>[] = Array.isArray(json.blog_posts)
        ? json.blog_posts
        : [];
      setPosts(list.map(normalise));
      toast.success("Blog posts saved");
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
          <Heading level="h1">Blog</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Write SEO articles for the storefront. Drafts (unpublished) are hidden
            from visitors. The body accepts Markdown — headings, lists, tables,
            links and images.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addPost}>
            New post
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
        ) : posts.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No posts yet. Click “New post” to write your first article.
          </Text>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post, index) => (
              <PostEditor
                key={index}
                index={index}
                post={post}
                onChange={(patch) => update(index, patch)}
                onRemove={() => removePost(index)}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

function PostEditor({
  index,
  post,
  onChange,
  onRemove,
}: {
  index: number;
  post: BlogPost;
  onChange: (patch: Partial<BlogPost>) => void;
  onRemove: () => void;
}) {
  const previewHref = `/blog/${post.slug || slugify(post.title)}`;
  return (
    <div className="border-ui-border-base rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge size="small" color={post.published ? "green" : "orange"}>
            {post.published ? "Published" : "Draft"}
          </Badge>
          <Text size="small" weight="plus">
            {post.title || "Untitled post"}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label size="xsmall" className="text-ui-fg-subtle">
              Published
            </Label>
            <Switch
              checked={post.published}
              onCheckedChange={(v) => onChange({ published: v })}
            />
          </div>
          <Button variant="danger" size="small" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title" className="md:col-span-2">
          <Input
            value={post.title}
            onChange={(e) => {
              const title = e.target.value;
              // Auto-fill slug from the title until it's been edited by hand.
              const patch: Partial<BlogPost> = { title };
              if (!post.slug || post.slug === slugify(post.title)) {
                patch.slug = slugify(title);
              }
              onChange(patch);
            }}
            placeholder="How to choose the right sealant"
          />
        </Field>

        <Field label="Slug (URL)">
          <Input
            value={post.slug}
            onChange={(e) => onChange({ slug: slugify(e.target.value) })}
            placeholder="how-to-choose-the-right-sealant"
          />
        </Field>
        <Field label="Publish date">
          <Input
            type="date"
            value={post.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </Field>

        <Field label="Meta description (SEO)" className="md:col-span-2">
          <Textarea
            value={post.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A short, keyword-rich summary shown in Google results (max ~160 chars)."
            rows={2}
          />
        </Field>

        <Field label="Cover image URL">
          <Input
            value={post.cover}
            onChange={(e) => onChange({ cover: e.target.value })}
            placeholder="https://sealants4all.co.uk/wp-content/uploads/…"
          />
        </Field>
        <Field label="Author">
          <Input
            value={post.author}
            onChange={(e) => onChange({ author: e.target.value })}
            placeholder="Sealants4All Technical Team"
          />
        </Field>

        <Field label="Tags (comma separated)">
          <Input
            value={post.tags.join(", ")}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Sealants, Buying Guide"
          />
        </Field>
        <Field label="SEO keywords (comma separated)">
          <Input
            value={post.keywords.join(", ")}
            onChange={(e) =>
              onChange({
                keywords: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="best sealant, silicone vs polyurethane"
          />
        </Field>

        <Field label="Body (Markdown)" className="md:col-span-2">
          <Textarea
            value={post.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder={"## Heading\n\nWrite your article in Markdown. Use **bold**, lists, [links](/category/joint) and tables."}
            rows={14}
            className="font-mono text-xs"
          />
        </Field>

        <div className="md:col-span-2">
          <Text size="xsmall" className="text-ui-fg-subtle">
            Storefront URL: {previewHref}
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
  label: "Blog",
});

export default BlogPage;
