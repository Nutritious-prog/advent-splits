import { z } from "zod";
import { getDb } from "@/lib/db";
import { getParticipant } from "@/lib/session";
import { fail, handle, json, readJson } from "@/lib/api";
import { buildState } from "@/lib/progress";
import { requestNow } from "@/lib/test-clock";

// Resets completions and results. Assignments are intentionally kept:
// otherwise "reset" would be a way to re-roll challenges.
export const POST = handle(async (req) => {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.", "NO_PROFILE");
  z.object({ confirm: z.literal("RESET") }).parse(await readJson(req));
  const db = await getDb();
  await db.query(
    "update assignments set completed_at = null, accepted_at = null, result = null, result_updated_at = null where participant_id = $1",
    [p.id],
  );
  return json(await buildState(p, await requestNow()));
});
