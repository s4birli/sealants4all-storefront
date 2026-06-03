import type { Metadata } from "next";
import Link from "next/link";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllPosts } from "@/lib/blog";
import { SITE, absoluteUrl, breadcrumbSchema } from "@/lib/seo";

export const revalidate = 3600;

const TITLE = "Blog — Trade guides, how-tos & product advice";
const DESCRIPTION =
  "Practical guides on sealants, adhesives, fixings and EWI systems from the Sealants4All technical team. Choose the right product, avoid callbacks, get the job done.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/blog"),
  },
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  // Blog (CollectionPage) + Breadcrumb structured data so Google can surface
  // the article list and the breadcrumb trail.
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE.url}/blog#blog`,
    name: "Sealants4All Blog",
    description: DESCRIPTION,
    url: absoluteUrl("/blog"),
    publisher: { "@id": `${SITE.url}/#organization` },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated,
      url: absoluteUrl(`/blog/${p.slug}`),
      author: { "@type": "Organization", name: p.author },
    })),
  };
  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
  ]);

  return (
    <>
      <JsonLd schema={[blogSchema, crumbs]} />
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cta-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Blog
                </div>
                <h1 className="h-section">Trade guides &amp; product advice</h1>
                <div className="h-section-sub">
                  Choose the right sealant, fixing or render system — and avoid
                  the callback.
                </div>
              </div>
            </div>

            {posts.length === 0 ? (
              <p style={{ color: "var(--body)" }}>No articles yet.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 20,
                }}
              >
                {posts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="blog-card"
                  >
                    {p.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover}
                        alt=""
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: 168,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}
                    <div className="body">
                      {p.tags[0] && <div className="cat">{p.tags[0]}</div>}
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                      <div className="meta">
                        {formatDate(p.date)} · {p.readingMinutes} min read
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
