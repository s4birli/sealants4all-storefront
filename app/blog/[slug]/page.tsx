import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPost, getPostSlugs, getAllPosts } from "@/lib/blog";
import { SITE, absoluteUrl, breadcrumbSchema } from "@/lib/seo";

export const revalidate = 3600;
// New posts authored in the Medusa admin appear on-demand (ISR) without a
// rebuild; known slugs are still prerendered at build time.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const url = absoluteUrl(`/blog/${slug}`);
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords.length ? post.keywords : post.tags,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

// Render internal links via Next <Link> for client-side nav; leave external
// and anchor links as plain <a>.
const mdxComponents = {
  a: ({ href = "", ...props }: React.ComponentProps<"a">) =>
    href.startsWith("/") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} {...props} />
    ),
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    options: {
      parseFrontmatter: false,
      // GFM enables tables, strikethrough and task lists in post bodies.
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
    components: mdxComponents,
  });

  // Up to 3 other posts as "related reading".
  const related = (await getAllPosts())
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE.url}/blog/${slug}#article`,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    image: post.cover ? [post.cover] : undefined,
    author: { "@type": "Organization", name: post.author, url: SITE.url },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${slug}`) },
    keywords: (post.keywords.length ? post.keywords : post.tags).join(", "),
  };
  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${slug}` },
  ]);

  return (
    <>
      <JsonLd schema={[articleSchema, crumbs]} />
      <UtilityBar />
      <Header />
      <main id="top">
        <article className="section">
          <div className="container">
            <nav
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 16,
              }}
            >
              <Link href="/" style={{ color: "inherit" }}>
                Home
              </Link>{" "}
              ›{" "}
              <Link href="/blog" style={{ color: "inherit" }}>
                Blog
              </Link>{" "}
              › <span style={{ color: "var(--ink)" }}>{post.title}</span>
            </nav>

            <header style={{ maxWidth: 760, margin: "0 auto 28px" }}>
              {post.tags[0] && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cta-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  {post.tags[0]}
                </div>
              )}
              <h1
                className="h-section"
                style={{ marginBottom: 12, fontSize: 34, lineHeight: 1.18 }}
              >
                {post.title}
              </h1>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                {post.author} · {formatDate(post.date)} ·{" "}
                {post.readingMinutes} min read
              </div>
            </header>

            {post.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover}
                alt={post.title}
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 920,
                  margin: "0 auto 32px",
                  borderRadius: "var(--radius)",
                  aspectRatio: "16 / 9",
                  objectFit: "cover",
                }}
              />
            )}

            <div className="prose">{content}</div>

            {related.length > 0 && (
              <section
                style={{
                  maxWidth: 760,
                  margin: "56px auto 0",
                  paddingTop: 32,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--ink)",
                    marginBottom: 16,
                  }}
                >
                  Related reading
                </h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      style={{
                        color: "var(--cta-500)",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      → {r.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
