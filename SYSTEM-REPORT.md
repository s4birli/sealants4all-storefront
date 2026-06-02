# Sealants4All — System Overview & How It Works
*Technical skeleton report for presentation · generated 2026-06-02*

## Executive summary

**Sealants4All** is a UK trade e-commerce platform for sealants, adhesives and building chemicals — official distributor of six leading brands (Sika, Fischer, Soudal, Teroson, Terraco, Everbuild) plus an own-label **S4ALL Pro** range, with **207 live SKUs** priced in GBP at 20% UK VAT.

It is built as **two cooperating applications** around a single brain:

- **A customer storefront** — a fast, installable Next.js web shop where trade buyers browse, search and order.
- **A management dashboard** — the Medusa v2 backend, which is *both* the commerce engine and the admin console the business runs the shop from.

The guiding principle is **"one source of truth"**: Medusa owns every piece of catalogue data (products, prices, stock, media, orders); the storefront is a fast, cached **live projection** of it. The business runs the entire shop — catalogue, pricing, real stock, orders, homepage merchandising, invoicing, accounting export and marketplace feeds — **from one dashboard, with no code changes needed day-to-day**. Dashboard edits reach the shop in seconds.

## Architecture at a glance

```
Admin edits product
         │
         ▼
┌──────────────────────┐   Postgres (data)
│   MEDUSA v2 BACKEND   │◄──┐
│  Store API + Admin    │   Redis (event bus / cache / workflows)
└──────────┬───────────┘──┘
           │                         ▲
   (1) GET /store/products           │ (3) POST /api/revalidate
       /store/hero-slides            │     x-revalidate-secret
   x-publishable-api-key             │  (subscriber: product.* / price.*)
           │                         │
           ▼                         │
┌──────────────────────────────────────────────┐
│            NEXT.JS 15 STOREFRONT              │
│ lib/medusa.ts storeFetch                      │
│   next:{ revalidate:60, tags:["catalog"] }    │
│ (2) ISR Data Cache ──► pages (live projection)│
│ app/api/revalidate ──► revalidateTag("catalog")│
└──────────────────────────────────────────────┘
```

## Contents

1. System architecture & how data flows
2. The customer storefront (shop)
3. Catalogue, search & merchandising
4. Cart, checkout & VAT
5. UK postcode → address lookup
6. Inventory, fulfilment & tax
7. Finance & operations
8. AI & in-app assistance
9. The dashboard: managing the shop from Medusa
10. Performance, security & reliability

---

## System architecture & how data flows

**What it is.** Sealants4All is two cooperating applications: a **Next.js 15** customer storefront and a **Medusa v2** commerce backend (Store API + Admin dashboard) backed by **Postgres** and **Redis**. Medusa owns all catalogue data; the storefront is a fast, cached *projection* of it that reads everything live through Medusa's Store API.

### How it works

1. **Medusa is the source of truth.** Products, variants, prices, stock, categories, and media live in Postgres and are managed from the Medusa Admin dashboard. Redis backs Medusa's event bus, cache, and workflow engine (`medusa-config.ts`), so subscribers and background jobs run reliably rather than on the in-memory dev defaults.
2. **The storefront reads via the Store API.** A thin, server-only client (`lib/medusa.ts` → `storeFetch`) calls `GET /store/...` with the publishable API key. `fetchAllMedusaProducts` paginates the catalogue with `PRODUCT_FIELDS` (including `*variants.calculated_price`, inventory, categories, collection) priced in the GBP **region** resolved by `getRegionId()`. `lib/catalog.ts` maps the raw Medusa DTOs into the storefront's domain model.
3. **Responses are ISR-cached + tagged.** Every catalogue fetch sets `next: { revalidate: 60, tags: ["catalog"] }` (window configurable via `NEXT_PUBLIC_CATALOG_REVALIDATE`). Pages serve instantly from Next's Data Cache and refresh on the timer — so the catalogue is never more than ~60s stale even with no other signal.
4. **Edits bust the cache on demand.** When a product changes, a Medusa subscriber (`revalidate-storefront.ts`, listening to `product.created/updated/deleted`, `product-variant.updated`, `price.created/updated`) does a fire-and-forget `POST` to the storefront's `STOREFRONT_REVALIDATE_URL` with a shared `x-revalidate-secret`. The storefront route `app/api/revalidate/route.ts` verifies the secret and calls `revalidateTag("catalog")`, so the change appears in seconds instead of waiting out the 60s window. The subscriber swallows failures so a slow/down storefront never breaks the catalogue write.
5. **Hero content follows the same pattern.** `lib/hero.ts` reads `GET /store/hero-slides` (tagged `hero-slides`) with a hardcoded `HERO_SLIDES` fallback; an admin edit can be flushed via `POST /api/revalidate?tag=hero-slides`.

### Key components

- **Backend config** — `apps/medusa/apps/backend/medusa-config.ts` (Postgres `databaseUrl`, Redis-backed `EVENT_BUS` / `CACHE` / `WORKFLOW_ENGINE`, Store/Admin/Auth CORS).
- **Store API client** — `lib/medusa.ts` (`storeFetch`, `PRODUCT_FIELDS`, `getRegionId`, `revalidate: 60`, `tags: ["catalog"]`) and `lib/catalog.ts` (mapping to the domain model).
- **On-demand revalidation** — Medusa subscriber `apps/medusa/apps/backend/src/subscribers/revalidate-storefront.ts` → storefront route `app/api/revalidate/route.ts` (secret-gated `revalidateTag`).
- **Hero feed** — backend `src/api/store/hero-slides` + storefront `lib/hero.ts`.
- **Stack** — Next.js 15 / React 19 (storefront), Medusa `2.15.3` (backend), pnpm monorepo.

> Note: the revalidate path is **secret-gated** — it no-ops unless both `STOREFRONT_REVALIDATE_URL` and `REVALIDATE_SECRET` are set on the backend and `REVALIDATE_SECRET` matches on the storefront. Until then, the storefront still self-heals on the 60s ISR timer.

---

## The customer storefront (shop)

**What it is.** The customer-facing shop is a Next.js 15 (App Router) web app and installable PWA where UK trade buyers browse the catalogue, search, and place orders. It reads everything live from the Medusa v2 backend and is built for speed (server rendering + caching) and resilience (offline support, graceful fallbacks).

### How it works

1. **Browse pages render on the server with ISR.** The home page (`app/page.tsx`), category page (`app/category/[slug]/page.tsx`), and product page (`app/product/[slug]/page.tsx`) are async React Server Components that each export `revalidate = 60` — Next.js renders them on the server, caches the HTML/RSC payload, and re-fetches at most once a minute.
2. **Medusa is the source of truth.** Server pages call `lib/catalog.ts`, which fetches products via the Store API client in `lib/medusa.ts` (publishable-key + GBP region, paginated). `getAllProducts()` is wrapped in React `cache()`, so the homepage's many lookups (curated lists, category counts, hero) share **one** catalogue fetch per render. Fetches are tagged (`catalog`, `hero-slides`) for on-demand revalidation.
3. **The homepage is composed of section components.** `app/page.tsx` fetches best-sellers, deals, new-arrivals (collection membership first, hardcoded SKU lists as fallback), category counts, and hero slides in parallel, then renders the section stack below.
4. **Category page** resolves the slug to either a curated/editorial bucket or a real Medusa category, paginates results 24-per-page server-side via `?page=`, and renders `ProductCard`s.
5. **Product page** loads one product by handle, shows brand, ex/inc-VAT pricing, bulk tier table, description, breadcrumb, and the client `AddToBasketButton`; missing products 404 via `notFound()`.
6. **Search is client-side.** `/search` (`force-static`) mounts `SearchResults` inside `<Suspense>`. The root-layout `CatalogSearchProvider` fetches a slimmed catalogue feed once from `/api/catalog` (description/images blanked to cut payload ~620KB→200KB), builds a Fuse.js index, and serves instant fuzzy search with brand-filter chips and pagination.
7. **Cart & checkout are client components.** `/cart` and `/checkout` read a browser-persisted cart (`useCart`). Checkout is a 3-step flow (details → shipping → done): UK postcode/address lookup (Ideal Postcodes PAF if keyed, else OpenStreetMap/postcodes.io free fallback), then `createCart` → `setCartCustomer` → `listShippingOptions` → `setShippingMethod` → `initPaymentSession` → `completeCart` against Medusa.
8. **PWA / offline.** `app/manifest.ts` makes it installable (`InstallPrompt`); the Serwist service worker (`app/sw.ts`, wired via `next.config.ts`) precaches the build and runtime-caches images (CacheFirst), `/api/*` (StaleWhileRevalidate), and navigations (NetworkFirst, 3s timeout), falling back to the branded `app/offline/page.tsx` when the network is down.

### Honest status
- **`/trade`** is a "coming soon" scaffold (`StubPage`) — the real trade portal is Phase 2.
- Several homepage "see all" links (deals, new-arrivals, category "view all") are `#` anchors, not yet wired to real listing routes.
- Checkout uses Medusa's default/manual payment session — no third-party card gateway is integrated in this build.

### Key components
- **Pages:** `app/page.tsx`, `app/category/[slug]/page.tsx`, `app/product/[slug]/page.tsx`, `app/search/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/trade/page.tsx`, `app/offline/page.tsx`, plus `app/loading.tsx` skeleton and `app/layout.tsx` (fonts, providers, CartDrawer, ChatWidget, InstallPrompt).
- **Homepage sections (`components/home/`):** `HeroCarousel`, `TrustStrip`, `CategoryGrid`, `BrandGrid`, `BestSellers`, `TradeBanner`, `DealsSection`, `NewArrivals`, `Applications`, `Reviews`, `WhyUs`, `Newsletter` (shared `Carousel`).
- **Data layer:** `lib/catalog.ts`, `lib/medusa.ts`, `lib/hero.ts`, `lib/medusa-store.ts` (checkout), `app/api/catalog/route.ts` (search feed).
- **Client infra:** `components/catalog/CatalogSearchProvider.tsx`, `components/search/SearchResults.tsx`, `components/cart/useCart`.
- **PWA:** `app/manifest.ts`, `app/sw.ts`, `components/layout/InstallPrompt.tsx`, `next.config.ts` (Serwist).

---

## Catalogue, search & merchandising

**What it is.** The catalogue layer fetches the full product list live from Medusa, maps it into one storefront domain model, and serves three things from it: server-rendered browse pages, a slim client-side fuzzy search feed, and the homepage merchandising carousels. Medusa is the single source of truth; the storefront holds no product database of its own.

### How it works

1. **Fetch + map (server).** `fetchAllMedusaProducts()` (`lib/medusa.ts`) pages through Medusa's Store API (100 at a time, GBP region resolved once for pricing) requesting a fixed `PRODUCT_FIELDS` set — pricing, media, categories, variants and the seeded `collection`. `getAllProducts()` (`lib/catalog.ts`) maps each result through `toProduct()` and is wrapped in React `cache()`, so the many callers in a single homepage render share ONE catalogue fetch. Fetches use the Next Data Cache (`revalidate` ~60s, tagged `"catalog"`).
2. **toProduct mapping.** `toProduct()` (`lib/medusa-map.ts`) flattens the first variant's `calculated_price` into `price`/`onSale`, derives stock with `deriveStock()` (managed inventory → in/low/out, but unmanaged or unknown-quantity variants default to **"in"** so the store never shows a false "out"), reads brand/rating/reviews from `metadata` (with deterministic fallbacks so the UI never shows 0), and carries `collectionHandle` for merchandising.
3. **Slim search feed.** `GET /api/catalog` (`app/api/catalog/route.ts`) calls `getAllProducts()` then blanks `description` and `images` on every product (`{ ...p, description: "", images: [] }`). The search index, product cards, and getBySku lookups never read those fields, so the payload the browser downloads on every page drops from ~620KB to ~190KB.
4. **Client-side fuzzy search.** `CatalogSearchProvider` (`components/catalog/CatalogSearchProvider.tsx`) sits in the root layout, fetches `/api/catalog` once, and builds a Fuse.js index via `buildSearchIndex()` (`lib/search.ts`). Search is weighted (name 0.45 > brand 0.18 > sku 0.15 > use/shortDescription/categories.name), `threshold: 0.4`, `ignoreLocation`. It exposes `search()` (header box + /search page) and `getBySku()` (checkout/chat lookups) — all in-browser, zero server round-trips per keystroke.
5. **Merchandising carousels.** `app/page.tsx` resolves each section from a real Medusa collection (`getProductsByCollection("best-sellers" | "deals" | "new-arrivals")`) and, in parallel, from a hardcoded editorial SKU list (`getProductsBySkus(BEST_SKU | DEALS_SKU | NEW_SKU)`). **Collection membership is the source of truth; each carousel falls back to its SKU list only when the collection resolves empty** — so the homepage is never blank.
6. **Keeping both sides in sync.** The backend `seed-collections.ts` script (`apps/medusa/.../scripts`) parses the SAME `lib/curation.ts` SKU arrays, ensures the three collections exist, de-dups SKUs by priority (best > new > deals, single collection per product), resolves SKUs to product ids, and sets `collection_id`. It is idempotent and re-applies the curation lists on every run.

### Key components

- **`lib/medusa.ts`** — thin Store API client; `PRODUCT_FIELDS` (incl. `collection.handle`), `fetchAllMedusaProducts` (paginated), `getRegionId` (GBP, memoised).
- **`lib/catalog.ts`** — `getAllProducts` (React-cached), `getProductsByCollection`, `getProductsBySkus`, category/curated helpers.
- **`lib/medusa-map.ts`** — `toProduct`, `deriveStock`, `collectionHandle` mapping.
- **`lib/search.ts`** — Fuse.js options + `buildSearchIndex` / `searchWithIndex`.
- **`components/catalog/CatalogSearchProvider.tsx`** — fetches the feed once, exposes `search()` / `getBySku()`.
- **`app/api/catalog/route.ts`** — slim search feed (blanks description/images, ~620KB → ~190KB).
- **`lib/curation.ts`** — editorial `BEST_SKU` / `NEW_SKU` / `DEALS_SKU` fallback lists.
- **`apps/medusa/apps/backend/src/scripts/seed-collections.ts`** — seeds Medusa collections from those same lists (idempotent).
- **`app/page.tsx`** — collection-first, SKU-fallback carousel wiring.

---

## Cart, checkout & VAT

**What it is.** A two-stage trade checkout: a lightweight client-side basket, then a real Medusa v2 Store-API checkout that turns the basket into a confirmed order with UK VAT correctly applied to both goods and delivery.

**How it works**

1. **Basket (client only).** `useCart` is a Zustand store persisted to `localStorage` under `s4a-v2:cart`. Each line is a `CartSnapshot` (sku, `variantId`, name, brand, image, basePrice) plus `qty`. `computeTotals` derives bulk-tier pricing via `deriveTiers`/`tierForQty`, then sets `vat = sub * 0.2` and `total = sub + vat`. No server call happens until checkout.
2. **Details step.** The shopper enters email + a UK address. `findAddress()` resolves the postcode via the server-proxied `/api/address-lookup` (paid Ideal Postcodes PAF when keyed, else free OpenStreetMap), falling back to the keyless `postcodes.io` city lookup (`lookupPostcode`). `resolveVariant` back-fills a Medusa `variant_id` by SKU for legacy basket items.
3. **Create cart → set customer.** `goToShipping()` calls `createCart(lineItems)` (POST `/store/carts`, into the GBP region from `getGbpRegionId`), then `setCartCustomer()` (POST `/store/carts/:id`) writing `email`, `shipping_address` and `billing_address` (both the same `gb` address).
4. **Shipping step.** `listShippingOptions()` (GET `/store/shipping-options?cart_id=`) lists delivery options; the user picks one. `placeOrder()` calls `setShippingMethod()` (POST `/store/carts/:id/shipping-methods`).
5. **Payment + complete.** `initPaymentSession()` creates a payment collection (POST `/store/payment-collections`) and a session on the **system/manual** provider `pp_system_default` (POST `.../payment-sessions`). `completeCart()` (POST `/store/carts/:id/complete`) returns `{ type: "order", order }` — or throws on a non-order result. The confirmation shows the server's `order.total`.

**VAT — quote equals charge.** The summary aside adds VAT to delivery as well as goods: VAT shows `totals.vat + shipping * 0.2` and the total shows `totals.total + shipping * 1.2`. Because the final confirmation prints the server-returned `order.total` (Medusa also taxes shipping at 20%), the quoted figure matches the amount Medusa actually charges — by design, the on-screen quote can't under-bill.

**Status / honesty note.** This is the *real* Store-API flow, not a mock — but it runs on Medusa's built-in **system/manual** payment provider (`pp_system_default`), which records the order without capturing a real card. It is gated by `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. Swapping in a live provider (e.g. Stripe) is the remaining step before taking actual payments.

**Key components**

- `components/cart/useCart.ts` — Zustand basket store (`add`/`update`/`remove`/`clear`), `computeTotals` (20% VAT on goods), `useCartTotals`.
- `lib/medusa-store.ts` — Store-API client: `createCart`, `setCartCustomer`, `listShippingOptions`, `setShippingMethod`, `initPaymentSession`, `completeCart`, plus `getGbpRegionId`, `lookupPostcode`, `findAddresses`.
- `app/checkout/page.tsx` — multi-step UI (`details → shipping → done`), the order-summary VAT math (goods + shipping), and the place-order orchestration.
- `lib/pricing.ts` / `lib/fmt.ts` — bulk-tier multipliers (`deriveTiers`) and money formatting (`plain2`).
- Medusa endpoints: `/store/carts`, `/store/carts/:id`, `/store/shipping-options`, `/store/carts/:id/shipping-methods`, `/store/payment-collections`, `/store/payment-collections/:id/payment-sessions`, `/store/carts/:id/complete`.

---

## UK postcode → address lookup

**What it is.** At checkout the shopper types a UK postcode and picks their full delivery address from a dropdown, instead of hand-typing street and house number. A single server-side route (`/api/address-lookup`) brokers this against two tiers — a **paid, PAF-complete** provider and a **free OpenStreetMap** fallback — while keeping any API key off the browser.

### How it works

1. **Browser** — the checkout (`app/checkout/page.tsx`) calls `findAddresses(postcode)` in `lib/medusa-store.ts`, which fetches our own `/api/address-lookup?postcode=…`. The paid key never reaches the client.
2. **Rate limit + local validation** — the route applies a per-IP limiter (shared with `/api/chat`), then validates the postcode against a strict UK-format regex (`POSTCODE_RE`, including the `GIR 0AA` special case). Malformed input returns an empty list immediately — so scrapers can't burn paid credits or hammer the free upstreams.
3. **Cache check** — an in-memory per-postcode cache (keyed `paf:` or `osm:` so tiers never collide) serves repeats instantly: 24h for results, 1h for empties.
4. **Tier A — PAID (when `IDEAL_POSTCODES_API_KEY` is set):** calls Ideal Postcodes (Royal Mail PAF), the only source with genuinely complete UK delivery-point coverage. Verifies `code === 2000`; a `404`/`4040` is a clean "no addresses", other errors return `502`. Maps PAF `line_1/2/3` + `post_town` into the form shape (merging line_3 so sub-premise thoroughfares aren't lost).
5. **Tier B — FREE (default, no key):** `postcodes.io` gives the postcode **centroid** (lat/lon, ~300ms, no key) → **Photon `/reverse`** enumerates house-level addresses around it (~0.4–1.0s). Results are filtered to the exact spaced postcode (the radius leaks neighbouring postcodes), then deduped and numeric-sorted into a clean dropdown.
6. **Response** — always `{ configured, addresses[] }` (plus `source` and, for OSM, `attribution`). When OSM is the source the checkout renders the required **ODbL "© OpenStreetMap contributors"** credit by the dropdown. Any free-path failure degrades to an empty list at HTTP 200 → checkout falls back to the `postcodes.io` city-only fill + manual entry, never blocking the order.

### Honest status & licensing rationale

- The free OSM path is **not a PAF replacement** — coverage is partial and uneven (OSM has `addr:housenumber` on ~5M GB objects vs PAF's ~31M delivery points). Photon improves speed/reliability (~25× faster than the old Overpass path) and recovers interpolated houses, but many postcodes still return few or zero rows.
- `photon.komoot.io` is a no-SLA demo endpoint; the per-postcode cache + per-IP limiter keep us within fair use. For production, **self-host Photon** (Apache-2.0, prebuilt GB index) and point `PHOTON_BASE` at it — identical `/reverse` contract.
- **No permanent address DB is built by design.** PAF data is Royal Mail-licensed and can't be retained/redistributed, so we proxy live and cache only short-term (24h). This keeps us compliant and keeps per-lookup cost down rather than warehousing addresses.

### Key components

- **`app/api/address-lookup/route.ts`** — the two-tier server proxy: local validation, per-IP rate limit, per-postcode cache, paid `idealPostcodesLookup()` and free `queryFreeOsm()`/`queryPhoton()`. Exports `OSM_ATTRIBUTION`.
- **`lib/medusa-store.ts`** — `findAddresses()` (calls our route; returns `{ configured, addresses, source, attribution }`) and `lookupPostcode()` (free key-less `postcodes.io` city/region fallback).
- **`app/checkout/page.tsx`** — consumer: shows the dropdown, autofills the form, renders the ODbL attribution, and falls back to `lookupPostcode()` + manual entry.
- **`lib/chat/rate-limit.ts`** — `rateLimit()` / `clientKeyFromRequest()`, the shared per-IP limiter.
- **External:** Ideal Postcodes (PAF, paid, key-gated) · `postcodes.io` (centroid + city, free) · Photon `/reverse` over OpenStreetMap (free, ODbL).

---

## Inventory, fulfilment & tax setup

**What it is.** The operational backbone that makes orders genuinely shippable and correctly taxed: real per-SKU stock tracking at a London warehouse, UK shipping options for GB/GBP carts, and a 20% UK VAT rate. It also feeds the in/low/out stock badges shoppers see on the storefront.

**How it works**

1. **Real inventory (`setup-inventory.ts`).** For all ~207 product variants it ensures three things exist *in the right order*: an inventory item, a stock **level at the London Warehouse** (starting quantity **1000**), and the product↔inventory link. Only *after* items and levels are guaranteed does it flip `manage_inventory=true` (with `allow_backorder=false`). This ordering is intentional — flipping the flag first would leave a window where a managed variant has no stock item, which breaks add-to-cart and checkout. It also reconciles older variants that had an item but no London level. The whole script is idempotent (only acts on variants that `needsFlag`/`needsItem`).

2. **Stock badges (`lib/medusa-map.ts` → `deriveStock`).** The Store API returns `manage_inventory` and `inventory_quantity` per variant (selected in `lib/medusa.ts`). `deriveStock` turns the real number into a `StockState`: `qty <= 0` → **out**, `qty <= 10` (`LOW_STOCK_THRESHOLD`) → **low** (with a live `lowStockRemaining` count), otherwise **in**. Safety-first defaults: any *unmanaged* variant, or a momentarily-null quantity, defaults to **in** so the UI never shows a false "out". `ProductCard` renders "In stock / Low stock / Out of stock" and disables add-to-cart when out.

3. **UK fulfilment (`setup-uk-fulfillment.ts`).** Links the London Warehouse to the *S4ALL Storefront* sales channel and the `manual_manual` provider, creates a **"UK Delivery"** fulfilment set with a **"United Kingdom" GB service zone**, then adds two flat-rate **GBP** shipping options on the Default Shipping Profile — **Standard** (£4.99, 2–3 working days) and **Express** (£9.99, next working day) — gated by `enabled_in_store=true`. Without this, a GB/GBP cart returns zero shipping options at checkout.

4. **UK VAT (`setup-uk-tax.ts`).** Finds the GB tax region and attaches a **20%** default rate named "UK VAT" (code `VAT`, `is_default=true`) so orders and invoices compute VAT correctly. Idempotent — skips if a default rate already exists.

**Honest status.** These are runnable Medusa seed/setup scripts (`./node_modules/.bin/medusa exec ./src/scripts/...`), not a live admin workflow. Each guards its prerequisites (e.g. inventory setup throws if the London Warehouse is missing, prompting you to run fulfilment first). Fulfilment uses the **manual** provider — there is no live carrier-rate integration yet.

**Key components**
- `apps/medusa/apps/backend/src/scripts/setup-inventory.ts` — per-SKU items + London levels, ordered flip to `manage_inventory`.
- `apps/medusa/apps/backend/src/scripts/setup-uk-fulfillment.ts` — London Warehouse, GB service zone, Standard/Express GBP options.
- `apps/medusa/apps/backend/src/scripts/setup-uk-tax.ts` — 20% UK VAT default on the GB tax region.
- `lib/medusa-map.ts` (`deriveStock`) + `lib/medusa.ts` (field selection) — real `inventory_quantity` → in/low/out.
- `components/product/ProductCard.tsx` — renders the stock badge and gates add-to-cart.

---

## Finance & operations (invoicing, accounting, channel sync, competitors)

**What it is.** The back-office toolkit operators run from the Medusa admin dashboard: print a correct UK VAT invoice for any order, export an accountant-ready CSV for Xero/QuickBooks, generate draft marketplace feeds, and review competitor pricing - all driven off the same live catalogue and order data.

### How it works

1. **Printable VAT invoice** - `GET /admin/orders/:id/invoice` renders a self-contained, branded HTML invoice (with a "Print / Save as PDF" button) reachable from each order page and the Finance table. Crucially, Medusa's `retrieveOrder()` returns the money totals as 0/undefined, which would print a £0.00 VAT, understated-total invoice; the route instead pulls the *real* computed totals (`item_subtotal`, `shipping_subtotal`, `tax_total`, `total`) via a separate graph query - the same source the accounting CSV uses - so the document is a correct UK VAT invoice (ex-VAT line items, one 20% VAT line, accurate grand total). All output is HTML-escaped.
2. **Accounting export CSV** - `GET /admin/finance/accounting-export?from=&to=` produces a per-order summary (invoice no., date, customer, email, country, net ex-VAT, shipping, VAT, gross, currency) for import into Xero or QuickBooks - the project's free **A2X alternative**. Customer-supplied fields run through `csvCell()`, which neutralises spreadsheet **formula injection** (prefixes cells starting with `= + - @` etc. with a quote) and quotes/escapes correctly.
3. **Channel sync (dry-run, live but non-publishing)** - `POST /admin/channel-sync` calls `runChannelExport()`, which reads the published GBP-priced catalogue and writes **draft** feeds per marketplace; `GET` returns the latest `summary.json` plus a pending-outbox count. Every adapter is explicitly `publish_mode: "draft_payload_only"` - **nothing is pushed to any external platform yet**. A subscriber (`channel-sync-products.ts`) listens to `product.created`/`product.updated` and queues events into `outbox.jsonl` so changes are tracked for a future live sync. The same export also runs from the CLI via `pnpm channel:export`.
4. **Competitor insights (built, key-gated, advisory-only)** - `POST /admin/competitor-insights` runs `runCompetitorAnalysis()` over the top-N priced SKUs: discovery via **Google Shopping through Serper**, then **Claude (Haiku)** decides genuine equivalents and writes a paraphrased positioning note; results are saved to `insights.json` and returned by `GET`. It requires `SERPER_API_KEY` and `ANTHROPIC_API_KEY` - without them it reports `configured: false` and falls back to our-price-only output. By design it is **advisory only and never auto-reprices** (a deliberate UK competition-law guardrail), and prices always come from the source, never the model.

### Current state

| Capability | State |
|---|---|
| VAT invoice | **Live** |
| Accounting CSV export | **Live** |
| Channel sync | **Live as dry-run** - generates draft feeds + outbox queue; no marketplace publishing yet (scaffold) |
| Competitor insights | **Built but key-gated** - inert until Serper + Anthropic keys are set; advisory only |

### Key components

- `api/admin/orders/[id]/invoice/route.ts` - printable HTML VAT invoice (real totals via graph query)
- `api/admin/finance/accounting-export/route.ts` - Xero/QuickBooks CSV with formula-injection neutralisation
- `api/admin/channel-sync/route.ts` + `channel-sync/run-export.ts`, `adapters/*` (amazon, ebay, tiktok, etsy, vinted, b2b, own-store), `channels.ts` - draft feed generation
- `subscribers/channel-sync-products.ts` - product-change outbox queue (`outbox.jsonl`)
- `scripts/export-channel-feeds.ts` - CLI entry (`pnpm channel:export`)
- `api/admin/competitor-insights/route.ts` + `competitor-insights/run-analysis.ts`, `sources.ts` (Serper), `ai.ts` (Claude), `config.ts` (legal guardrails)
- Admin UI: `admin/routes/finance/page.tsx`, `admin/widgets/order-invoice.tsx`, `admin/routes/channel-sync/page.tsx`, `admin/routes/competitor-insights/page.tsx`

---

## AI & in-app assistance

**What it is.** A set of AI-powered helpers across the platform — a customer-facing **chatbot** that recommends and prices products from our real catalogue, an admin **product-copy generator**, and **guided dashboard tours** that onboard staff to every admin page. Every AI feature is *key-gated and fails closed*: with no `ANTHROPIC_API_KEY` configured, AI endpoints return a clean `503` and the UI degrades gracefully instead of erroring.

### 1. Customer chatbot (retrieval-grounded, streaming)

A floating "Ask an expert" widget mounted site-wide (`app/layout.tsx`). It is deliberately *cheap and safe by design*:

1. **Gate & throttle** — `POST /api/chat` first checks `ANTHROPIC_API_KEY` (else `503`), then applies a per-IP fixed-window rate limit (20 req/min). Input is capped: ≤20 messages, ≤4,000 chars/message, ≤24,000 total.
2. **Retrieve** — for the latest user message only, a Fuse.js index is built over the full catalogue and the top **12** products are pulled (`lib/chat/retrieve.ts`). These compact lines (`SKU | name | brand | £price | stock | use`) are injected as a "RETRIEVED PRODUCTS" block — *the only products the model may name*.
3. **Reason with guardrails** — a static guardrail system prompt (`lib/chat/system-prompt.ts`, sent with Anthropic `cache_control: ephemeral` prompt caching) forbids inventing specs/prices and restricts recommendations to the retrieved set. Default model **`claude-haiku-4-5`** (overridable via `AI_MODEL`).
4. **Price via tool, never by hand** — the model is barred from doing arithmetic; it must call the server-side **`get_quote`** tool (`lib/chat/get-quote.ts`), which computes ex/inc-VAT unit prices, bulk-tier and line totals using the same pricing primitives as the cart. Tool errors are flagged `is_error` so the model recovers rather than hallucinates. A `MAX_TOOL_ROUNDS = 5` cap prevents infinite loops.
5. **Stream & render** — replies stream back as SSE (`text`, then a final `products` event listing cited SKUs intersected with the retrieved set). `ChatWidget.tsx` renders the prose plus inline product cards (resolved from the already-warmed catalogue, with add-to-basket). Client disconnects abort the upstream Anthropic request to stop token spend.

Fallbacks are everywhere: a `503`/`429`/empty stream shows a "talk to a human / email us" message; a mid-stream error appends an apology and suppresses product cards.

### 2. Admin AI product copy (on-demand)

On every product detail page, the `ai-product-copy.tsx` widget offers a **"Generate with AI"** button. It `POST`s to **`/admin/ai/product-copy`** (Medusa backend) with the product's title/brand/category. The route is key-gated (`503` without a key), validates a title is present, and asks Claude (default **`claude-sonnet-4-6`**) for strict-JSON copy: `description`, `seo_title` (≤60 chars), `seo_description` (≤155 chars), and `tags`. The prompt explicitly forbids invented certifications or specs. **Nothing is auto-saved** — results show with per-field Copy buttons for the admin to review and paste.

### 3. Dashboard tours (first-run onboarding)

A self-contained, dependency-free guided-tour engine (`admin/components/dashboard-tour/`) explains *every* admin page — built-in Medusa pages (Orders, Products, Inventory…) and our custom S4ALL pages (Hub, Channel Sync, Finance, Competitor Insights, AI product copy). Steps live in a per-page registry (`tours.ts`); each page mounts a `<DashboardTour pageId=… steps=… />` (via small tour widgets or directly in custom routes). A tour **auto-opens once** on first visit (deferred to next frame), spotlights a target element via a 4-panel dimmed backdrop, and is fully accessible (role=dialog, focus trap, Esc to skip, honors reduced-motion). If a target selector is missing (e.g. an empty-state table), the card simply centers — tours never break. State persists in `localStorage` (`storage.ts`): a per-page "seen" set, a global "Don't show again" kill switch, and a `TOURS_VERSION` guard to re-show everyone after content changes.

### Key components

- **Chatbot API:** `app/api/chat/route.ts` (key-gated `503`, streaming, tool loop)
- **Chat library:** `lib/chat/system-prompt.ts` (guardrails + cached block), `lib/chat/retrieve.ts` (Fuse retrieval, 12 hits), `lib/chat/get-quote.ts` (server-side pricing tool), `lib/chat/rate-limit.ts` (per-IP limiter)
- **Chat UI:** `components/chat/ChatWidget.tsx` (SSE parsing, inline product cards, fallbacks)
- **Admin AI copy:** `apps/medusa/.../api/admin/ai/product-copy/route.ts` (endpoint) + `apps/medusa/.../admin/widgets/ai-product-copy.tsx` (UI)
- **Tours:** `apps/medusa/.../admin/components/dashboard-tour/` — `DashboardTour.tsx` (renderer), `use-tour.ts` (state), `storage.ts` (persistence/version), `tours.ts` (per-page steps), plus `widgets/tour-*.tsx` mounts

> **Honesty note:** All three AI features are live in code but **inert without an API key** (deliberate cost-safety + fail-closed design). The chat rate limiter is in-memory/per-instance — fine for single-region deployment, swap for Redis/Upstash for hard global limits.

---

## The dashboard: managing the shop from Medusa

**What it is.** The business runs the entire shop from the Medusa v2 admin — no code edits for day-to-day operations. On top of Medusa's native product / order / inventory / pricing / collection management, we add five custom admin pages that wire our own workflows directly into the dashboard, and the homepage banner is edited there too.

### How it works

1. **Native management.** Staff add products, fulfil orders, adjust stock and prices, and curate **collections** using stock Medusa screens. Collection membership (`best-sellers`, `deals`, `new-arrivals`) is the source of truth for the homepage carousels (`app/page.tsx` → `getProductsByCollection`), with hardcoded SKU lists only as a fallback when a collection is empty.
2. **Custom admin pages** (each a `defineRouteConfig` route under `src/admin/routes/`): **S4ALL Hub** (quick actions + live counts), **Hero Slides** (homepage banner editor), **Channel Sync**, **Finance**, and **Competitor Insights**.
3. **Hero edit → store.metadata.** The Hero Slides editor saves via `POST /admin/hero-slides`, which read-merge-writes `store.metadata.hero_slides` (preserving all other metadata keys) through `updateStoresWorkflow`. The public `GET /store/hero-slides` returns only `enabled` slides, sorted by `rank`.
4. **Reflects on the shop.** The storefront reads slides server-side in `lib/hero.ts` (tagged `hero-slides`) and the catalogue in `lib/medusa.ts` (tagged `catalog`), both with a ~60s timed revalidate. A hardcoded `HERO_SLIDES` fallback guarantees the hero always renders.
5. **On-demand revalidation.** After a catalogue write (`product.created/updated/deleted`, price/variant changes), the Medusa subscriber `revalidate-storefront.ts` POSTs to the storefront's `/api/revalidate` with a shared `REVALIDATE_SECRET`, busting the `catalog` tag instantly. `POST /api/revalidate?tag=hero-slides` busts the hero tag the same way — so edits appear in seconds rather than waiting out the cache.

### Key components

- **Admin UI pages:** `src/admin/routes/s4all-hub/page.tsx`, `hero-slides/page.tsx`, `channel-sync/page.tsx`, `finance/page.tsx`, `competitor-insights/page.tsx`.
- **Hero APIs:** `src/api/admin/hero-slides/route.ts` (GET full list / POST save to `store.metadata`), `src/api/store/hero-slides/route.ts` (public, enabled + rank-sorted).
- **Storefront consumers:** `lib/hero.ts` (`getHeroSlides`), `components/home/HeroCarousel.tsx`, `app/page.tsx`.
- **Revalidation loop:** `subscribers/revalidate-storefront.ts` (Medusa) → `app/api/revalidate/route.ts` (Next, tags `catalog` / `hero-slides`).
- **Channel Sync:** `src/api/admin/channel-sync/route.ts` + `src/channel-sync/` — generates marketplace draft feeds (own_store/b2b = native, Amazon/eBay/TikTok/Etsy = api_draft, Vinted = manual_review). **It does not publish live** — that needs each platform's API credentials.
- **Finance:** `src/api/admin/finance/accounting-export/route.ts` (per-order CSV for Xero/QuickBooks, with CSV-injection hardening) + `src/api/admin/orders/[id]/invoice/route.ts` (invoice PDFs). Positioned as our A2X alternative.
- **Competitor Insights:** `src/api/admin/competitor-insights/route.ts` — advisory price/keyword intelligence, **key-gated** on `SERPER_API_KEY` + `ANTHROPIC_API_KEY` (degrades to prices-only when unset). Deliberately never auto-reprices.

> Scope note for the room: **Hero Slides and Finance are live and fully usable today.** **Channel Sync and Competitor Insights are operational but draft/advisory-only and key-gated** — they prepare and inform, they don't take live action on third-party platforms.

---

## Performance, security & reliability

**What it is.** The cross-cutting layer that makes the storefront fast (pre-rendered pages, slim payloads, optimised images), keeps it safe (key-gated APIs, no browser secrets, hardened inputs and headers), and keeps it standing when an upstream wobbles (graceful fallbacks instead of error pages). These guards were validated by an automated test-and-fix pass.

### How it works

**Performance**
1. **ISR + on-demand cache tags.** Pages and feeds export `revalidate = 60`, and every Medusa fetch in `lib/medusa.ts` is tagged `["catalog"]` (hero fetches `["hero-slides"]`). A dashboard edit POSTs to `app/api/revalidate/route.ts`, which calls `revalidateTag(...)` to bust the cache *instantly* rather than waiting out the 60s window.
2. **Redis cache.** `medusa-config.ts` wires Redis as the backend cache, event bus, and workflow engine, so the API layer is not recomputing on every hit.
3. **Slim search feed.** `app/api/catalog/route.ts` returns the full catalogue shape but blanks `description` and `images`, cutting the payload the browser downloads on every page from ~620KB to ~200KB.
4. **Bounded grids.** `app/category/[slug]/page.tsx` paginates at `PAGE_SIZE = 24` (server-side, via `?page=`), mirroring the search page — smaller DOM, smaller RSC payload, fewer images in flight.
5. **Image optimisation.** `components/product/ProductCard.tsx` renders via `next/image` with responsive `sizes`; `next.config.ts` restricts remote images to one allowlisted host/path and serves WebP.
6. **Production build.** The optimised build ships roughly **167KB First-Load JS** versus the unbundled ~10MB dev experience.

**Security**
1. **Fails closed on every surface.** The revalidate hook 401s when the `REVALIDATE_SECRET` is missing or mismatched; the AI chat route returns 503 (not 500) when no `ANTHROPIC_API_KEY` is set; Medusa's `/admin` routes are natively authenticated.
2. **Store-API key gating + no browser secrets.** Both the server reader (`lib/medusa.ts`) and the client checkout helper (`lib/medusa-store.ts`) send `x-publishable-api-key` on every Store-API call. Privileged secrets live in `server-only` modules and are never shipped to the client.
3. **Security headers.** `next.config.ts` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, and `Permissions-Policy` storefront-wide; `apps/medusa/.../api/middlewares.ts` sets the same trio on every Medusa response and strips `X-Powered-By`.
4. **Input hardening (400, not 500).** `middlewares.ts` runs Zod inspector guards on `/store/products` and `/store/product-categories`: non-negative integer `limit`/`offset`, an allowlisted `order` column set, and rejection of a bare top-level `*` in `fields` — converting adversarial input into a clean 400 before the query layer can throw a 500.
5. **CSV formula-injection neutralisation.** `accounting-export/route.ts`'s `csvCell()` prefixes a single quote to any value starting with `= + - @ \t \r`, so customer-controlled text can't execute as a formula when the export is opened in Excel/Sheets.

**Reliability**
1. **Hero/collection fallbacks.** `lib/hero.ts` returns hardcoded `HERO_SLIDES` whenever the endpoint is empty or unreachable; `app/page.tsx` falls back to curated SKU lists when a Medusa collection resolves empty — the homepage always renders.
2. **Address lookup degrades, never blocks.** `app/api/address-lookup/route.ts` rejects malformed postcodes locally, rate-limits per IP, and on any upstream miss/failure returns an empty list at HTTP 200 so checkout cleanly drops to manual entry instead of 5xx-ing.

### Key components
- `next.config.ts` — storefront security headers, image allowlist + WebP, powered-by off
- `app/api/catalog/route.ts` — slim search feed (description/images blanked)
- `app/category/[slug]/page.tsx` — server-side pagination at 24/page
- `components/product/ProductCard.tsx` — `next/image` with responsive `sizes`
- `lib/medusa.ts` — tagged ISR fetches + publishable-key gating
- `app/api/revalidate/route.ts` — secret-gated, allowlisted on-demand tag busting
- `apps/medusa/apps/backend/src/api/middlewares.ts` — Store-API Zod guards + headers
- `apps/medusa/apps/backend/medusa-config.ts` — Redis cache/event-bus/workflow
- `apps/medusa/apps/backend/src/api/admin/finance/accounting-export/route.ts` — `csvCell()` formula neutralisation
- `lib/hero.ts` / `app/page.tsx` — hero & collection hardcoded fallbacks
- `app/api/chat/route.ts` / `app/api/address-lookup/route.ts` — fail-closed + graceful degradation

---

## Technology stack

| Layer | Technology |
|---|---|
| **Storefront** | Next.js 15 (App Router, React Server Components, ISR), React 19, TypeScript, Tailwind CSS v4, `next/image`, Fuse.js (client search), Serwist (PWA / offline) |
| **Backend & dashboard** | Medusa v2.15.3 (Node / Express), Medusa Admin (React + `@medusajs/ui`) with custom extension routes/widgets |
| **Data & infra** | PostgreSQL (source of truth), Redis (event bus / cache / workflow engine), pnpm monorepo, production build via `next build` / `next start` |
| **AI** | Anthropic Claude (Haiku) — customer chatbot + admin product-copy, **key-gated / fail-closed** |
| **External services** | Ideal Postcodes (Royal Mail PAF) & OpenStreetMap/Photon (address lookup); Serper (competitor insights, key-gated) |

## Status & roadmap

**Live today:** full catalogue browse/search, real Medusa cart→checkout with correct UK VAT, real inventory + UK fulfilment + 20% VAT, postcode→address lookup, printable VAT invoices + accounting CSV export, collection-driven homepage carousels, dashboard-editable hero banner, guided admin tours, on-demand cache revalidation, security-hardened + performance-tuned production build.

**Scaffold / key-gated (foundation ready, switch-on pending):**
- **Payments** — checkout uses Medusa's system/manual provider; **Stripe** is the next step for live card payments.
- **Marketplace sync** — channel-sync + product feeds are scaffolded; inventory is already real, so **live stock→marketplace sync** is the next build.
- **AI** — chatbot & product-copy are wired but **fail closed until an `ANTHROPIC_API_KEY` is set**; competitor insights needs a `SERPER_API_KEY`.
- **/trade portal** — Phase-2 "coming soon" scaffold.
- **Instant hero updates** — hero edits propagate on the 60s timer today; a `store.updated → /api/revalidate?tag=hero-slides` subscriber would make them instant (like products).
- **Public hosting** — currently a local production build on `localhost:3000`; public launch = deploy storefront (e.g. Vercel) + hosted Medusa/Postgres/Redis.

---

## Appendix A — Presentation slide outline

*One slide per subsystem — title + talking points, ready to drop into deck software.*

### Slide 1. One Source of Truth: Medusa Powers a Live Storefront
- Two apps, one brain: a Next.js 15 customer storefront reads everything live from a Medusa v2 backend (Store API + Admin dashboard) over HTTP — Medusa is the single source of truth, the storefront is just a fast projection of it.
- Postgres holds the data; Redis powers Medusa's event bus, cache, and workflow engine so background jobs and subscribers run reliably (configured in medusa-config.ts).
- The storefront never hits the database directly — it calls the Store API via a thin server-only client (lib/medusa.ts storeFetch) using a publishable key, pulling products, prices (GBP region), stock, and media.
- Speed without staleness: catalogue responses are ISR-cached in Next's Data Cache with a 60s revalidate window and tagged 'catalog', so pages serve instantly from cache and refresh on a timer.
- Edit a product in the Medusa admin and it shows up in seconds — a Medusa subscriber fires on product/price/variant changes and POSTs /api/revalidate, which busts the 'catalog' cache tag on demand instead of waiting out the 60s timer.
- Resilient by design: the revalidate ping is fire-and-forget (a down storefront never breaks a catalogue write), the call is secret-protected, and hero content follows the same cache-tag pattern with a hardcoded fallback.

### Slide 2. The Storefront: A Server-Rendered, Offline-Ready Trade Shop
- The customer-facing shop is a Next.js 15 App Router site. Browse pages (home, category, product) are React Server Components with ISR — they render on the server, cache the result, and revalidate every 60 seconds, so pages are fast yet stay in sync with the Medusa backend.
- Medusa is the single source of truth: server pages read the live catalogue through a thin Store API client (lib/medusa.ts + lib/catalog.ts), with one cached fetch shared across the whole homepage render. Hero slides and curated lists fall back to hardcoded data if the backend is unreachable, so the page never breaks.
- The homepage is a composition of 12 section components — HeroCarousel, TrustStrip, CategoryGrid, BrandGrid, BestSellers, TradeBanner, DealsSection, NewArrivals, Applications, Reviews, WhyUs, Newsletter — each fed real product data or static marketing content.
- Search and cart/checkout run client-side. A global provider loads a slimmed catalogue feed (~200KB) once and powers instant Fuse.js fuzzy search; the cart lives in browser state and checkout drives the real Medusa order flow (cart, UK postcode address lookup, shipping, payment, completion).
- It is a full Progressive Web App: installable, with a Serwist service worker that caches images, API responses and pages, and serves a branded /offline page (with the cart preserved) when the network drops.
- Honest status: /trade is a 'coming soon' scaffold (StubPage) for Phase 2; the checkout payment session is wired to Medusa but uses its manual/default flow, and several homepage links (deals/new-arrivals 'see all') are anchor placeholders.

### Slide 3. One Catalogue, Three Jobs: Browse, Search & Merchandise
- Medusa is the single source of truth — the storefront reads the full catalogue live over the Store API and maps each Medusa product into one storefront `Product` shape via `toProduct`, with React `cache()` so a whole render shares ONE fetch.
- The `/api/catalog` feed is a deliberately slimmed copy: it blanks `description` and `images` (description alone is ~62% of the bytes), cutting the payload the browser downloads on every page from ~620KB to ~190KB while keeping every field search and product cards actually use.
- Search is 100% client-side: `CatalogSearchProvider` fetches that slim feed once into the root layout, builds a weighted Fuse.js fuzzy index (name 0.45, brand 0.18, SKU 0.15…), and powers both the header search box and the /search page — no per-keystroke server calls.
- Homepage carousels (Best Sellers / Deals / New Arrivals) are driven by real Medusa COLLECTIONS — collection membership is the source of truth.
- Each carousel independently falls back to a hardcoded editorial SKU list in `lib/curation.ts` whenever its collection resolves empty, so the homepage is never blank even before merchandising is seeded.
- A backend `seed-collections` script reads those same SKU lists out of `lib/curation.ts` and assigns products to collections — idempotent, single-collection-per-product, de-duped by priority best > new > deals — keeping storefront and backend in lockstep.

### Slide 4. Basket to Order: A Real Medusa Checkout with Honest UK VAT
- The basket is a client-side Zustand store (persisted to localStorage) that snapshots SKU, variant, price and quantity — no server round-trip until checkout.
- Checkout drives the genuine Medusa Store API end-to-end: create cart, set UK customer + shipping/billing address, list shipping options, set method, open a payment session, complete to an order.
- VAT is 20% applied to goods AND delivery — the order summary explicitly adds shipping * 0.2 to VAT and shipping * 1.2 to the total, so the quote never under-bills.
- The displayed confirmation total comes straight from the server (order.total returned by complete), so the amount shown is the amount Medusa charged — quote equals charge by construction.
- Payment runs on Medusa's built-in system/manual provider (pp_system_default) — a working order-capture scaffold; a real card provider (e.g. Stripe) is the next step, no live card capture yet.
- Hardening helpers: UK postcode/address lookup (free postcodes.io + server-proxied PAF/OSM) and SKU-to-variant back-fill for legacy basket items.

### Slide 5. Type a Postcode, Pick Your Address — Two-Tier UK Lookup
- At checkout a shopper types a UK postcode and picks their full address from a dropdown — no manual street/house-number typing.
- Two tiers behind one server route: PAID Ideal Postcodes (complete Royal Mail PAF coverage) when IDEAL_POSTCODES_API_KEY is set, otherwise a FREE OpenStreetMap path (postcodes.io centroid → Photon /reverse).
- We never call the paid provider on junk: a strict UK-format regex validates the postcode locally first, protecting paid credits and upstream fair-use.
- Per-postcode in-memory caching serves both tiers — 24h for hits, 1h for empties — so repeats are instant and a re-typed postcode never re-spends a credit.
- The free path is honestly partial vs PAF (OSM has ~5M GB housenumbers vs PAF's ~31M delivery points); we show the required ODbL '© OpenStreetMap contributors' attribution and degrade cleanly to manual entry.
- We deliberately do NOT build a permanent address database — PAF licensing forbids retaining/redistributing Royal Mail data, so we proxy live and cache only short-term.

### Slide 6. Real Stock In, VAT'd Orders Out: The UK Operational Backbone
- Every one of the 207 SKUs is tracked for real at a single London Warehouse stock location, starting at 1000 units each so nothing falsely reads 'out' the moment tracking is switched on.
- The setup is deliberately order-critical and idempotent: we create the inventory item + London level FIRST, then flip manage_inventory=true, so there is never a window where a managed variant has no stock item to break add-to-cart or checkout.
- The storefront's in / low / out badges are derived from real Medusa inventory_quantity, not guesses: out at <=0, 'low stock' with a live remaining count at <=10, in stock above that.
- UK fulfilment is wired end-to-end: London Warehouse + a 'United Kingdom' GB service zone + two flat-rate GBP options, Standard (4.99, 2-3 days) and Express (9.99, next day), so GB/GBP carts actually return shipping at checkout.
- A 20% UK VAT default rate is attached to the GB tax region so every order and invoice computes VAT correctly.
- All three are safe re-runnable seed scripts (medusa exec), with built-in prerequisite checks rather than a live admin UI flow.

### Slide 7. Back-Office Engine: Invoices, Accounting & Marketplace Reach
- One-click VAT invoices: any order opens a printable, brand-correct UK VAT invoice (ex-VAT line items + single 20% VAT line + true total) that staff save as PDF straight from the dashboard.
- We pull the REAL calculated order totals via the graph query, not the zeroed values Medusa returns by default - so the invoice and the accounting CSV never disagree.
- Accountant-ready export: a per-order summary CSV (net / shipping / VAT / gross) for Xero or QuickBooks - our own free A2X alternative - with spreadsheet formula-injection neutralised on user-entered fields.
- Channel sync is live as a safe dry-run: it reads the live catalogue and writes draft feeds for Own Store, Amazon, eBay, TikTok Shop, Etsy, Vinted and B2B. It NEVER publishes to any marketplace yet - that's the next phase.
- A product-change subscriber already queues every create/update into an outbox, so when we flip the switch we know exactly what needs re-syncing.
- Competitor insights is built but key-gated: advisory-only price positioning via Google Shopping (Serper) + Claude. Deliberately never auto-reprices - that would breach UK competition law.

### Slide 8. AI That Fails Closed: Grounded Chat, On-Demand Copy, Guided Tours
- Three assistance features, one safety rule: every AI call is key-gated and fails closed — no ANTHROPIC_API_KEY means a clean 503 and a graceful fallback, never a crash or a fake answer.
- The storefront chatbot is retrieval-grounded: it can only recommend the ~12 catalogue products we inject per question (Fuse search), and it is forbidden from doing price maths itself — a server-side get_quote tool computes every price, so it can't hallucinate or misquote.
- Cost-safety is built in: per-IP rate limiting (20/min), strict input caps, a 5-round tool loop cap, Anthropic prompt caching on the static guardrail, and client-disconnect aborts that stop spending tokens mid-answer.
- Admin AI product-copy is on-demand only — one click on a product page drafts a description, SEO meta and tags with Claude; nothing is auto-saved, the admin reviews and pastes via Copy buttons.
- Dashboard Tours explain every admin page to first-time users with a spotlight overlay; they auto-show once, persist 'seen'/'don't show again' in localStorage, and never break on missing elements (they just center the card).
- Models are env-configurable: chat defaults to Claude Haiku 4.5 (cheap, high-volume), product copy to Claude Sonnet 4.6 (higher quality) — tuned per use case.

### Slide 9. Run the Whole Shop from One Dashboard — No Code Required
- The Medusa admin is mission control: native product, order, inventory, pricing and collection management — the same tools that power day-to-day trading, no developer needed.
- On top of native Medusa we ship five custom admin pages — S4All Hub, Hero Slides, Channel Sync, Finance and Competitor Insights — that surface our own workflows inside the dashboard.
- Hero Slides is fully live: the homepage banner is edited in the dashboard (enable/disable, reorder, colours, CTAs) and stored in store.metadata.hero_slides — no redeploy to change the headline.
- The 'edit here, see it on the shop' loop: collections drive the homepage carousels, store.metadata drives the hero, and a Medusa subscriber pings /api/revalidate so changes appear in seconds instead of waiting for the 60s timed cache.
- Honest scope: Channel Sync generates marketplace DRAFT feeds (doesn't auto-publish — needs each platform's API keys); Competitor Insights is advisory and key-gated (SERPER + Anthropic); both never auto-act.
- Finance is our own A2X alternative: per-order accounting CSV for Xero/QuickBooks plus per-order invoice PDFs, straight from the orders table.

### Slide 10. Fast by Design, Safe by Default
- Speed: pages are pre-rendered with 60-second ISR and tagged caches (catalog, hero-slides), so a dashboard edit busts the cache instantly instead of waiting; Redis backs Medusa's cache, event bus and workflow engine.
- Lean payloads: the browser search feed strips description + image galleries (620KB to ~200KB), category and search grids page at 24 products, and next/image serves contained, sized WebP from an allowlisted host only.
- Security fails closed everywhere: every Store-API call is gated by the publishable key, all secrets (Anthropic, Ideal Postcodes, revalidate, Stripe) live in server-only code and never reach the browser, and the revalidate hook 401s without the shared secret.
- Hardened surfaces: security headers (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) on both apps, the Store API validates pagination/order/fields up front to return clean 400s (not 500s), and accounting-export CSV neutralises spreadsheet formula injection.
- Reliable under failure: the hero and homepage collections fall back to hardcoded data when Medusa is empty or unreachable, and the postcode lookup degrades to manual entry rather than ever 5xx-ing the checkout.
- Verified, not assumed: these guards were proven by an automated test-and-fix pass with live upstream verification (timeouts, 400/404 vs 500 handling, IPv4-first DNS), and the production build ships ~167KB First-Load JS versus the ~10MB dev bundle.
