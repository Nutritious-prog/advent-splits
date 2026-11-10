import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config, sessionSecret } from "./config";
import { getDb } from "./db";
import type { ParticipantRow } from "./session";

export const ADMIN_COOKIE = "tua_admin";
const ADMIN_HOURS = 12;

function sign(payload: string) {
  return crypto.createHmac("sha256", sessionSecret() + ":admin").update(payload).digest("base64url");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || (config.isProd && expected.length < 10)) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function setAdminCookie() {
  const exp = Date.now() + ADMIN_HOURS * 3600_000;
  const value = `${exp}.${sign(String(exp))}`;
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "strict",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}

/** Isolated demo participant. It can never be reached through a public session. */
export async function getDemoParticipant(): Promise<ParticipantRow> {
  const db = await getDb();
  const cols = "id, nickname, difficulty_pref, exclude_equipment, gender, auth_user_id, is_demo";
  const found = await db.query<ParticipantRow>(`select ${cols} from participants where is_demo = true order by created_at limit 1`);
  if (found[0]) return found[0];
  const rows = await db.query<ParticipantRow>(
    `insert into participants (nickname, is_demo) values ('DEMO ADMIN', true) returning ${cols}`,
  );
  return rows[0];
}

export function parseAt(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
