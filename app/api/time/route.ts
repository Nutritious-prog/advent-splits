import { json } from "@/lib/api";
import { nextUnlock, unlockedCount } from "@/lib/time";
import { requestNow } from "@/lib/test-clock";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = await requestNow();
  return json({ serverNow: now.toISOString(), unlocked: unlockedCount(now), nextUnlockAt: nextUnlock(now)?.toISOString() ?? null });
}
