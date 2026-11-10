import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, type Q } from "./db";
import { config, sessionSecret } from "./config";
import type { DifficultyPref } from "./types";
import type { Gender } from "./gender";

export const SESSION_COOKIE = "tua_sid";
const SESSION_DAYS = 400;

export interface ParticipantRow {
  id: string;
  nickname: string;
  difficulty_pref: DifficultyPref;
  exclude_equipment: boolean;
  gender: Gender;
  auth_user_id: string | null;
  is_demo: boolean;
}

function hashToken(token: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export async function createSession(q: Q, participantId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await q.query(
    "insert into sessions (token_hash, participant_id, expires_at) values ($1, $2, $3::timestamptz)",
    [hashToken(token), participantId, expires.toISOString()],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getParticipant(): Promise<ParticipantRow | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const rows = await db.query<ParticipantRow>(
    `select p.id, p.nickname, p.difficulty_pref, p.exclude_equipment, p.gender, p.auth_user_id, p.is_demo
       from sessions s join participants p on p.id = s.participant_id
      where s.token_hash = $1 and s.expires_at > now() and p.is_demo = false`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.query("delete from sessions where token_hash = $1", [hashToken(token)]);
  }
  jar.delete(SESSION_COOKIE);
}

