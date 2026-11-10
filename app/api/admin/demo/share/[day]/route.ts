import { fail } from "@/lib/api";
import { getDemoParticipant, isAdmin, parseAt } from "@/lib/admin";
import { renderChallengeCard, renderSummaryCard } from "@/lib/share-card";
import { loadShareData, loadSummaryData } from "@/lib/share-data";
import { serverNow } from "@/lib/time";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ day: string }> }) {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const p = await getDemoParticipant();
  const { day } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  if (day === "summary") return renderSummaryCard(await loadSummaryData(p, parseAt(sp.get("at")) ?? serverNow()));
  const data = await loadShareData(p.id, p.nickname, Number.parseInt(day, 10), sp.get("result") !== "0");
  if (!data) return fail(404, "Najpierw otwórz to okienko.");
  return renderChallengeCard(data);
}
