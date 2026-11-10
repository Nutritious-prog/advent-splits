import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import { getParticipant } from "@/lib/session";
import { buildState } from "@/lib/progress";
import { requestNow } from "@/lib/test-clock";
import { config } from "@/lib/config";
import { emailAuthEnabled } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kalendarz — THE ADVENT SPLITS" };

export default async function CalendarPage() {
  const p = await getParticipant();
  if (!p) redirect("/?dolacz=1");
  const state = await buildState(p, await requestNow());
  return (
    <AppShell active="calendar">
      <CalendarApp
        initial={state}
        mode={{ kind: "public" }}
        savePrompt={emailAuthEnabled() ? "on" : !config.isProd ? "preview" : "off"}
      />
    </AppShell>
  );
}
