import { renderInviteCard } from "@/lib/share-card";

export const runtime = "nodejs";

export async function GET() {
  return renderInviteCard();
}
