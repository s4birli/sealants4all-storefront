import type { HeroSlide } from "./types";

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: "Bulk Buy Savings",
    title: "Up to 30% off when you buy by the box.",
    sub: "Trade-grade sealants and adhesives, priced by volume. No phone calls. No haggling.",
    ctaPrimary: { label: "Shop bulk deals", href: "#deals" },
    ctaSecondary: { label: "Open trade account", href: "/trade" },
    bg: "#0B2954",
    accent: "#FF6B1A",
    productCap: "SIKAFLEX 522 / 12-PACK",
    tag: "OFFER",
  },
  {
    eyebrow: "Official Sika Distributor",
    title: "Swiss-engineered sealants, dispatched from London.",
    sub: "The full Sikaflex range in stock — caravan, marine, construction.",
    ctaPrimary: { label: "Browse Sika range", href: "#brands" },
    ctaSecondary: { label: "Technical datasheets", href: "#help" },
    bg: "#163F87",
    accent: "#FF6B1A",
    productCap: "SIKA · OFFICIAL UK DISTRIBUTOR",
    tag: "BRAND",
  },
  {
    eyebrow: "Free Next-Day Delivery",
    title: "Order before 3pm. On your van by 9am.",
    sub: "Free UK courier delivery on orders over £150. Dispatched from our London warehouse.",
    ctaPrimary: { label: "Start shopping", href: "#categories" },
    ctaSecondary: { label: "Delivery info", href: "#help" },
    bg: "#1E5BBE",
    accent: "#FFB800",
    productCap: "NEXT-DAY · UK COURIER",
    tag: "DELIVERY",
  },
];
