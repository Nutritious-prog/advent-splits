import { Landing } from "@/components/landing/Landing";
import { getParticipant } from "@/lib/session";
import { startAt, endAt, unlockedCount } from "@/lib/time";
import { requestNow } from "@/lib/test-clock";
import { emailAuthEnabled } from "@/lib/supabase-auth";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [p, now] = [await getParticipant(), await requestNow()];
  return (
    <Landing
      serverNow={now.toISOString()}
      startAt={startAt().toISOString()}
      endAt={endAt().toISOString()}
      unlocked={unlockedCount(now)}
      days={config.days}
      nickname={p?.nickname ?? null}
      emailEnabled={emailAuthEnabled()}
      instagram={config.instagram}
    />
  );
}
