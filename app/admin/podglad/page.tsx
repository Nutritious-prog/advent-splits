import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { isAdmin, parseAt } from "@/lib/admin";
import { endAt, serverNow, startAt, unlockedCount } from "@/lib/time";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Admin-only preview of the landing page at a simulated moment. Read-only: no data changes.
export default async function LandingPreview({ searchParams }: { searchParams: Promise<{ at?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const at = parseAt((await searchParams).at ?? null) ?? serverNow();
  return (
    <div>
      <div className="sticky top-0 z-40 bg-mustard px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-ink">
        Podgląd admina · symulowany czas: {at.toLocaleString("pl-PL", { timeZone: config.tz })}
      </div>
      <Landing
        serverNow={at.toISOString()}
        startAt={startAt().toISOString()}
        endAt={endAt().toISOString()}
        unlocked={unlockedCount(at)}
        days={config.days}
        nickname={null}
        emailEnabled={false}
        instagram={config.instagram}
        simulated
      />
    </div>
  );
}
