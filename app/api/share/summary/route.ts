import { getParticipant } from "@/lib/session";
import { fail } from "@/lib/api";
import { renderSummaryCard } from "@/lib/share-card";
import { loadSummaryData } from "@/lib/share-data";
import { requestNow } from "@/lib/test-clock";

export const runtime = "nodejs";

export async function GET() {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.");
  return renderSummaryCard(await loadSummaryData(p, await requestNow()));
}
