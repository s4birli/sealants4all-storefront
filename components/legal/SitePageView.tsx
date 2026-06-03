import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPage } from "@/lib/pages";
import { absoluteUrl, breadcrumbSchema } from "@/lib/seo";

// Map internal markdown links to Next <Link> for client-side nav.
const mdxComponents = {
  a: ({ href = "", ...props }: React.ComponentProps<"a">) =>
    href.startsWith("/") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} {...props} />
    ),
};

/** Build per-route metadata for a CMS page. Use from a route's generateMetadata. */
export async function sitePageMetadata(slug: string): Promise<Metadata> {
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      type: "website",
      title: page.title,
      description: page.description,
      url: absoluteUrl(`/${slug}`),
    },
  };
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Renders a CMS-managed legal/info page by slug. */
export async function SitePageView({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();

  const { content } = await compileMDX({
    source: page.body,
    options: {
      parseFrontmatter: false,
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
    components: mdxComponents,
  });

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: page.title, path: `/${slug}` },
  ]);

  return (
    <>
      <JsonLd schema={crumbs} />
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <nav
              style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}
            >
              <Link href="/" style={{ color: "inherit" }}>
                Home
              </Link>{" "}
              › <span style={{ color: "var(--ink)" }}>{page.title}</span>
            </nav>

            <header style={{ maxWidth: 760, margin: "0 auto 28px" }}>
              <h1
                className="h-section"
                style={{ marginBottom: 8, fontSize: 34, lineHeight: 1.2 }}
              >
                {page.title}
              </h1>
              {page.updated && (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Last updated {formatDate(page.updated)}
                </div>
              )}
            </header>

            <div className="prose">{content}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
