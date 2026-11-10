import { z } from "zod";
import { fail, handle, json, readJson } from "@/lib/api";
import { checkPassword, clearAdminCookie, setAdminCookie } from "@/lib/admin";
import { clientIp, rateLimit, sharedLimit } from "@/lib/ratelimit";

export const POST = handle(async (req) => {
  if (!rateLimit(`admin:${clientIp(req)}`, 8, 15 * 60_000) || !(await sharedLimit(`admin:ip:${clientIp(req)}`, 8, 15 * 60)))
    return fail(429, "Za dużo prób logowania. Odczekaj 15 minut.");
  const { password } = z.object({ password: z.string().max(200) }).parse(await readJson(req));
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600));
    return fail(401, "Nieprawidłowe hasło.");
  }
  await setAdminCookie();
  return json({ ok: true });
});

export const DELETE = handle(async () => {
  await clearAdminCookie();
  return json({ ok: true });
});
