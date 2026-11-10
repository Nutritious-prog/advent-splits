import { fail, handle, json, readJson } from "@/lib/api";
import { getDemoParticipant, isAdmin, parseAt } from "@/lib/admin";
import { doorAction } from "@/lib/doors";
import { serverNow } from "@/lib/time";

// Same door logic as the public endpoint, but bound to the isolated demo
// participant and a simulated clock. Public participants are never affected.
export const POST = handle(async (req, ctx: { params: Promise<{ day: string; action: string }> }) => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const at = parseAt(new URL(req.url).searchParams.get("at")) ?? serverNow();
  const { day, action } = await ctx.params;
  return json(await doorAction(await getDemoParticipant(), day, action, await readJson(req), at));
});
