import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THE ADVENT SPLITS",
    short_name: "Advent Splits",
    description: "24 dni. 24 wyzwania. Sportowy kalendarz adwentowy.",
    start_url: "/kalendarz",
    display: "standalone",
    background_color: "#191919",
    theme_color: "#191919",
    lang: "pl",
    icons: [
      { src: "/api/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/api/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
