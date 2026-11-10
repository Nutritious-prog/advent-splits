import { getParticipant } from "@/lib/session";
import { fail, handle, json, readJson } from "@/lib/api";
import { doorAction } from "@/lib/doors";
import { requestNow } from "@/lib/test-clock";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const POST = handle(async (req, ctx: { params: Promise<{ day: string; action: string }> }) => {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.", "NO_PROFILE");
  if (!rateLimit(`door:${p.id}:${clientIp(req)}`, 120, 60_000)) return fail(429, "Wolniej! Za dużo kliknięć naraz.");
  const { day, action } = await ctx.params;
  return json(await doorAction(p, day, action, await readJson(req), await requestNow()));
});
