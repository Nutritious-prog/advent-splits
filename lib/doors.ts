import "server-only";
import { z } from "zod";
import { getDb } from "./db";
import { DoorError, openDoor } from "./assign";
import { buildState } from "./progress";
import { formatResult } from "./results";
import { config } from "./config";
import type { ParticipantRow } from "./session";
import type { ResultType } from "./types";

const completeBody = z.object({ done: z.boolean() });
const resultBody = z.object({ value: z.string().max(200), free: z.boolean().optional() });

export async function doorAction(p: ParticipantRow, dayRaw: string, action: string, body: unknown, now: Date) {
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isInteger(day) || day < 1 || day > config.days) throw new DoorError("INVALID_DAY", "Nie ma takiego okienka.");
  const db = await getDb();

  if (action === "open") {
    const r = await openDoor(p, day, now);
    const state = await buildState(p, now);
    return { created: r.created, state };
  }

  const rows = await db.query<{ result_type: ResultType; result_unit: string }>(
    `select c.result_type, c.result_unit from assignments a join challenges c on c.id = a.challenge_id
      where a.participant_id = $1 and a.day = $2`,
    [p.id, day],
  );
  const row = rows[0];
  if (!row) throw new DoorError("NOT_OPENED", "Najpierw otwórz to okienko.");

  if (action === "accept") {
    await db.query(
      "update assignments set accepted_at = coalesce(accepted_at, $3::timestamptz) where participant_id = $1 and day = $2",
      [p.id, day, now.toISOString()],
    );
  } else if (action === "complete") {
    const { done } = completeBody.parse(body);
    await db.query(
      `update assignments set completed_at = case when $3 then coalesce(completed_at, $4::timestamptz) else null end,
              accepted_at = case when $3 then coalesce(accepted_at, $4::timestamptz) else accepted_at end
        where participant_id = $1 and day = $2`,
      [p.id, day, done, now.toISOString()],
    );
  } else if (action === "result") {
    const { value, free } = resultBody.parse(body);
    const f = formatResult(row.result_type, row.result_unit, value, !!free);
    if (!f.ok) throw new ValidationError(f.error);
    await db.query(
      "update assignments set result = $3, result_updated_at = $4::timestamptz where participant_id = $1 and day = $2",
      [p.id, day, f.value, now.toISOString()],
    );
  } else {
    throw new ValidationError("Nieznana akcja.");
  }
  return { state: await buildState(p, now) };
}

export class ValidationError extends Error {}
