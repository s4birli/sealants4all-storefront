export type Tier = { min: number; price: number };

export type Product = {
  sku: string;
  num: string;
  name: string;
  brand: BrandName;
  use: string;
  from: number;
  tiers: Tier[];
  cap: string;
};

export type BrandName =
  | "SIKA"
  | "FISCHER"
  | "SOUDAL"
  | "TEROSON"
  | "TERRACO"
  | "EVERBUILD"
  | "S4ALL PRO";

export type Brand = {
  id: string;
  name: BrandName;
  blurb: string;
};

export type ProductMeta = {
  rating: number;
  reviews: number;
  stock: number;
  saving: number;
};

export type CategoryIconKey =
  | "caravan"
  | "joint"
  | "flame"
  | "wall"
  | "anchor"
  | "drop"
  | "beaker"
  | "tool";

export type Category = {
  id: string;
  name: string;
  count: number;
  icon: CategoryIconKey;
};

export type Application = {
  id: string;
  name: string;
  cap: string;
};

export type HeroSlide = {
  eyebrow: string;
  title: string;
  sub: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  bg: string;
  accent: string;
  productCap: string;
  tag: string;
};

export type Review = {
  name: string;
  stars: number;
  date: string;
  text: string;
};
