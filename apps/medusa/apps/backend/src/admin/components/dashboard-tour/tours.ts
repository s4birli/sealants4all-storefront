import type { TourStep } from "./types";

/**
 * Per-page step registry. Each key is a `pageId` passed to <DashboardTour />.
 *
 * Targets use `data-tour="<page>:<id>"` attributes added to the existing
 * @medusajs/ui markup on each page (see mountInstructions). Values are
 * namespaced per page so a bare id can never match the wrong element.
 *
 * Steps whose target is conditionally rendered (tables/results that only
 * appear after data loads) are allowed — the engine skips/centers gracefully
 * when the element is absent, so tours never break on empty states.
 */
export const TOURS: Record<string, TourStep[]> = {
  // ── Built-in Medusa pages ───────────────────────────────────────────────
  // These have no elements we own, so steps are centered explanation cards
  // (the engine centers automatically when the target selector is absent).
  orders: [
    {
      target: "[data-tour='dash:welcome']",
      title: "Welcome to your dashboard",
      body: "This is the Medusa admin — the control center that manages your Sealants4All storefront. Your custom tools (S4ALL Hub, Channel Sync, Finance, Competitor Insights) are in the left sidebar.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Orders",
      body: "Every customer order lands here. Click a row to open it — from there you can take payment, create an invoice (Finance), and fulfil the order.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Find & filter",
      body: "Use search and the filters to find orders by status, date, or customer. New orders from the storefront appear here automatically.",
    },
  ],

  products: [
    {
      target: "[data-tour='no-such']",
      title: "Products",
      body: "Your catalogue. The storefront shows these live — add or edit a product here and it appears on the shop within ~60 seconds.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Edit a product",
      body: "Open any product to manage price, images, categories and inventory — and use the AI product-copy helper to draft descriptions & SEO.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Add new",
      body: "Create a product with the button at the top-right; set a GBP price and it appears on your storefront automatically (within a few seconds).",
    },
  ],

  inventory: [
    {
      target: "[data-tour='no-such']",
      title: "Inventory",
      body: "Real stock levels per SKU at the London Warehouse. The storefront shows In / Low / Out stock based on these numbers.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Receiving & reservations",
      body: "Edit a level to receive stock. Placing an order reserves stock; the physical quantity drops when you create a fulfilment.",
    },
  ],

  customers: [
    {
      target: "[data-tour='no-such']",
      title: "Customers",
      body: "Everyone who has ordered or registered. Open a customer to see their orders and contact details.",
    },
    {
      target: "[data-tour='no-such']",
      title: "Trade & B2B",
      body: "Use Customer Groups + Price Lists to offer trade/bulk pricing to specific customers.",
    },
  ],

  promotions: [
    {
      target: "[data-tour='no-such']",
      title: "Promotions",
      body: "Create discount codes or automatic promotions (e.g. % off, free shipping) that apply on the storefront at checkout.",
    },
  ],

  "price-lists": [
    {
      target: "[data-tour='no-such']",
      title: "Price lists",
      body: "Override prices for sales or for trade/B2B customer groups — the natural home for bulk and trade pricing.",
    },
  ],

  categories: [
    {
      target: "[data-tour='no-such']",
      title: "Categories",
      body: "Organise products into categories. These power the storefront's category pages and navigation menus.",
    },
  ],

  collections: [
    {
      target: "[data-tour='no-such']",
      title: "Collections",
      body: "Curated groups of products (e.g. New, Clearance) for merchandising sections on the storefront.",
    },
  ],

  "order-detail": [
    {
      target: "[data-tour='no-such']",
      title: "Order detail",
      body: "Items, customer, payment and fulfilment for this order. Use the Invoice panel to print/save a PDF, and create a fulfilment to decrement stock.",
    },
  ],

  "product-detail": [
    {
      target: "[data-tour='no-such']",
      title: "Product detail",
      body: "Edit everything about this product. Scroll to the AI product-copy panel to draft a description, SEO meta and tags with Claude.",
    },
  ],

  // ── Our custom S4ALL pages ──────────────────────────────────────────────
  "s4all-hub": [
    {
      target: '[data-tour="hub:welcome"]',
      title: "Welcome to the Hub",
      body: "Your home base — everyday tasks live here; the full Medusa admin is always in the left sidebar.",
      placement: "bottom",
    },
    {
      target: '[data-tour="hub:stats"]',
      title: "At-a-glance health",
      body: "Products in the catalogue, channel events still pending, and when feeds were last exported.",
      placement: "bottom",
    },
    {
      target: '[data-tour="hub:quick-actions"]',
      title: "Quick actions",
      body: "One-click jumps to add a product, browse the catalogue, view orders, or open Channel Sync.",
      placement: "top",
    },
    {
      target: '[data-tour="hub:tips"]',
      title: "Workflow tips",
      body: "Reminders — e.g. open any product to use the AI product-copy helper for descriptions & SEO.",
      placement: "top",
    },
  ],

  "channel-sync": [
    {
      target: '[data-tour="cs:intro"]',
      title: "Channel Sync",
      body: "Medusa is the source of truth; this page builds marketplace-ready DRAFT feeds — it never publishes live.",
      placement: "bottom",
    },
    {
      target: '[data-tour="cs:generate"]',
      title: "Generate feeds",
      body: "Click to (re)build Amazon/eBay/TikTok/Etsy/B2B feeds from your current priced catalogue.",
      placement: "bottom",
    },
    {
      target: '[data-tour="cs:stats"]',
      title: "Run summary",
      body: "After a run: total products, how many are exportable (priced), pending events, and the last-generated time.",
      placement: "bottom",
    },
    {
      target: '[data-tour="cs:table"]',
      title: "Export modes",
      body: "Each channel's export mode — Native, API draft, or Manual review — tells you how that feed reaches the marketplace.",
      placement: "top",
    },
  ],

  finance: [
    {
      target: '[data-tour="fin:intro"]',
      title: "Finance",
      body: "Invoices + accounting export — our in-house alternative to A2X for Xero/QuickBooks.",
      placement: "bottom",
    },
    {
      target: '[data-tour="fin:range"]',
      title: "Date range",
      body: "Pick a date range to scope the export; leave blank to export everything.",
      placement: "bottom",
    },
    {
      target: '[data-tour="fin:csv"]',
      title: "Accounting CSV",
      body: "Downloads the selected orders as a CSV ready to import into your accounting software.",
      placement: "bottom",
    },
    {
      target: '[data-tour="fin:invoice"]',
      title: "Printable invoices",
      body: "Open any order's printable invoice (save as PDF) straight from the Recent orders table.",
      placement: "top",
    },
  ],

  "competitor-insights": [
    {
      target: '[data-tour="ci:intro"]',
      title: "Competitor Insights",
      body: "Advisory price & keyword intelligence — for review only.",
      placement: "bottom",
    },
    {
      target: '[data-tour="ci:run"]',
      title: "Run analysis",
      body: "Scrapes the market and analyses your priced products; results populate the table below.",
      placement: "bottom",
    },
    {
      target: '[data-tour="ci:position"]',
      title: "Price position",
      body: "Colour-coded price position vs the market (cheapest → dearest) so you can spot outliers fast.",
      placement: "top",
    },
    {
      target: '[data-tour="ci:gaps"]',
      title: "Keyword gaps",
      body: "Keywords competitors rank for that your listings miss — opportunities for titles/descriptions.",
      placement: "top",
    },
    {
      target: '[data-tour="ci:warning"]',
      title: "Advisory only",
      body: "Guidance only — never auto-reprice to match competitors; that risks breaching UK competition law.",
      placement: "bottom",
    },
  ],

  "ai-product-copy": [
    {
      target: '[data-tour="ai:intro"]',
      title: "AI product copy",
      body: "Draft a product description, SEO meta, and tags with Claude.",
      placement: "bottom",
    },
    {
      target: '[data-tour="ai:generate"]',
      title: "Generate with AI",
      body: "Generates copy from this product's title, brand, and category — review before using.",
      placement: "bottom",
    },
    {
      target: '[data-tour="ai:results"]',
      title: "Use the copy",
      body: "Use the Copy buttons to paste each field into the product form above; nothing is saved automatically.",
      placement: "top",
    },
  ],
};
