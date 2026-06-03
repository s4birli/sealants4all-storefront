import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { NavProgressBar } from "@/components/layout/NavProgressBar";
import { CatalogSearchProvider } from "@/components/catalog/CatalogSearchProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE, organizationSchema, websiteSchema } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes every relative OG/canonical URL resolve to the live
  // origin — without it Next emits localhost links in production.
  metadataBase: new URL(SITE.url),
  title: {
    default: "Sealants4All — Trade sealants, adhesives & fixings",
    template: "%s | Sealants4All",
  },
  description:
    "Official UK distributor of Sika, Fischer, Soudal, Teroson, Terraco and Everbuild. Trade-grade sealants, adhesives, fixings, and EWI systems — dispatched in 24 hours.",
  applicationName: "Sealants4All",
  openGraph: {
    type: "website",
    siteName: "Sealants4All",
    locale: "en_GB",
    url: SITE.url,
    images: [{ url: "/home/hero-sika.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    images: ["/home/hero-sika.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "S4ALL",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: true },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B2954",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <JsonLd schema={[organizationSchema(), websiteSchema()]} />
        <Suspense fallback={null}>
          <NavProgressBar />
        </Suspense>
        <CatalogSearchProvider>
          {children}
          <CartDrawer />
          <Toaster position="bottom-center" duration={2400} />
          <InstallPrompt />
          <ChatWidget />
          <CookieConsent />
        </CatalogSearchProvider>
      </body>
    </html>
  );
}
