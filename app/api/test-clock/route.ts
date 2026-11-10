import { z } from "zod";
import { fail, handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getParticipant } from "@/lib/session";
import { config } from "@/lib/config";
import { setTestTarget, testModeAllowed, testStatus } from "@/lib/test-clock";

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("day"), day: z.number().int().min(1).max(config.days) }),
  z.object({ mode: z.literal("midnight"), day: z.number().int().min(1).max(config.days) }),
  z.object({ mode: z.literal("pre") }),
  z.object({ mode: z.literal("post") }),
  z.object({ mode: z.literal("off") }),
  z.object({ mode: z.literal("wipe") }),
]);

export const GET = handle(async () => json(await testStatus()));

export const POST = handle(async (req) => {
  if (!(await testModeAllowed())) return fail(403, "Tryb testowy jest niedostępny.");
  const b = body.parse(await readJson(req));
  if (b.mode === "wipe") {
    // Test-only: start your own calendar from scratch (new random challenges).
    const p = await getParticipant();
    if (!p) return fail(401, "Nie masz jeszcze profilu.");
    const db = await getDb();
    await db.query("delete from assignments where participant_id = $1", [p.id]);
  } else {
    await setTestTarget(b.mode === "off" ? null : b);
  }
  return json(await testStatus());
});
