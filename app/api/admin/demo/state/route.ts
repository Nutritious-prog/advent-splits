import { fail, handle, json } from "@/lib/api";
import { getDemoParticipant, isAdmin, parseAt } from "@/lib/admin";
import { buildState } from "@/lib/progress";
import { serverNow } from "@/lib/time";

export const GET = handle(async (req) => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const at = parseAt(new URL(req.url).searchParams.get("at")) ?? serverNow();
  return json(await buildState(await getDemoParticipant(), at));
});
