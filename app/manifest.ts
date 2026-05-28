import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sealants4All",
    short_name: "S4ALL",
    description:
      "Professional sealants, adhesives & fixings — UK trade supplier",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B2954",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
