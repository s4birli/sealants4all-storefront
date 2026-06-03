import { SitePageView, sitePageMetadata } from "@/components/legal/SitePageView";

export const revalidate = 3600;

export function generateMetadata() {
  return sitePageMetadata("returns");
}

export default function Page() {
  return <SitePageView slug="returns" />;
}
