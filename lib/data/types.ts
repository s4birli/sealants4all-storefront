export type Tier = { min: number; price: number };

export type BrandName =
  | "SIKA"
  | "FISCHER"
  | "SOUDAL"
  | "TEROSON"
  | "TERRACO"
  | "EVERBUILD"
  | "S4ALL PRO"
  | "UNBRANDED";

export type StockState = "in" | "low" | "out";

export type ProductCategoryRef = { id: string; name: string };

export type Product = {
  id: number;
  sku: string;
  slug: string;
  num: string;
  name: string;
  brand: BrandName;
  use: string;
  permalink: string;
  image: string | null;
  images: string[];
  description: string;
  shortDescription: string;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  priceAvailable: boolean;
  stock: StockState;
  lowStockRemaining: number | null;
  rating: number;
  reviews: number;
  categories: ProductCategoryRef[];
  curatedCategory: string | null;
  tiers: Tier[];
  cap: string;
};

export type Brand = {
  id: string;
  name: BrandName;
  blurb: string;
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

export type CategoryFull = {
  id: string;
  name: string;
  slug: string;
  count: number;
  parent: number;
  image: string | null;
  permalink: string;
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
