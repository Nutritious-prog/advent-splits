import { z } from "zod";
import { getDb } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api";
import { getDemoParticipant, isAdmin } from "@/lib/admin";
import { openDoor } from "@/lib/assign";
import { buildState } from "@/lib/progress";
import { unlockedCount } from "@/lib/time";

const body = z.object({ scenario: z.enum(["reset", "mixed", "all-done"]), at: z.string() });

export const POST = handle(async (req) => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const { scenario, at: atRaw } = body.parse(await readJson(req));
  const at = new Date(atRaw);
  if (Number.isNaN(at.getTime())) return fail(400, "Nieprawidłowa data.");
  const p = await getDemoParticipant();
  const db = await getDb();
  await db.query("delete from assignments where participant_id = $1", [p.id]);

  const unlocked = unlockedCount(at);
  if (scenario !== "reset") {
    // mixed: leave the newest door AVAILABLE, every 3rd past door OPENED, the rest COMPLETED.
    const last = scenario === "all-done" ? unlocked : unlocked - 1;
    for (let day = 1; day <= last; day++) {
      await openDoor(p, day, at);
      if (scenario === "all-done" || day % 3 !== 0) {
        await db.query(
          "update assignments set accepted_at = $3::timestamptz, completed_at = $3::timestamptz where participant_id = $1 and day = $2",
          [p.id, day, at.toISOString()],
        );
      }
    }
  }
  return json(await buildState(p, at));
});
