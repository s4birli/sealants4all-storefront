// Central SEO config + helpers. Single source of truth for the canonical site
// URL, brand identity, and the structured-data (JSON-LD) builders that feed
// Google rich results. Keep this dependency-free so it can be imported from
// both server pages and metadata functions.

export const SITE = {
  /** Canonical origin. Falls back to localhost in dev. No trailing slash. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  name: "Sealants4All",
  legalName: "All 4 Construction Limited",
  /** Companies House registration number. */
  companyNumber: "15321255",
  /** UK VAT registration. */
  vatId: "GB460779856",
  description:
    "Official UK distributor of Sika, Fischer, Soudal, Teroson, Terraco and Everbuild. Trade-grade sealants, adhesives, fixings, and EWI systems — dispatched in 24 hours.",
  twitter: "@sealants4all",
  phone: "+44 20 8050 3959",
  email: "sales@sealants4all.co.uk",
  logo: "/icons/icon-512.png",
} as const;

/** Strip any HTML, collapse whitespace, and truncate for meta descriptions. */
export function excerpt(text: string, max = 160): string {
  const clean = (text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Resolve a path or already-absolute URL to an absolute canonical URL. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Organization schema — emitted once, site-wide, from the root layout. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: `${SITE.legalName} T/A Sealants4All`,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "1 Filament Walk, The Light Bulb LU2.22",
      addressLocality: "London",
      postalCode: "SW18 4GQ",
      addressCountry: "GB",
    },
    vatID: SITE.vatId,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Companies House",
      value: SITE.companyNumber,
    },
  };
}

/** WebSite schema with a SearchAction so Google can offer a sitelinks search. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": `${SITE.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** BreadcrumbList schema from an ordered list of {name, path} crumbs. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
