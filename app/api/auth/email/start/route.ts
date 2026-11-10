import { z } from "zod";
import { fail, handle, json, readJson } from "@/lib/api";
import { authClient, emailAuthEnabled } from "@/lib/supabase-auth";
import { clientIp, rateLimit, sharedLimit } from "@/lib/ratelimit";

export const POST = handle(async (req) => {
  if (!emailAuthEnabled()) return fail(503, "Logowanie e-mailem nie jest jeszcze skonfigurowane.", "DISABLED");
  const { email } = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(await readJson(req));
  if (
    !rateLimit(`otp:${clientIp(req)}`, 5, 15 * 60_000) ||
    !(await sharedLimit(`otp:ip:${clientIp(req)}`, 10, 15 * 60)) ||
    !(await sharedLimit(`otp:email:${email}`, 3, 15 * 60))
  )
    return fail(429, "Za dużo prób. Spróbuj ponownie za kilkanaście minut.");
  const { error } = await authClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    console.error("otp start", error.message);
    return fail(400, "Nie udało się wysłać kodu. Sprawdź adres i spróbuj ponownie.");
  }
  return json({ ok: true });
});
