import { renderOgCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const alt = "THE ADVENT SPLITS: 24 dni, 24 wyzwania";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard();
}
