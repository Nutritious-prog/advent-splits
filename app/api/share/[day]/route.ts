import { getParticipant } from "@/lib/session";
import { fail } from "@/lib/api";
import { renderChallengeCard } from "@/lib/share-card";
import { loadShareData } from "@/lib/share-data";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ day: string }> }) {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.");
  const { day } = await ctx.params;
  const withResult = new URL(req.url).searchParams.get("result") !== "0";
  const data = await loadShareData(p.id, p.nickname, Number.parseInt(day, 10), withResult);
  if (!data) return fail(404, "Najpierw otwórz to okienko.");
  return renderChallengeCard(data);
}
