import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfileClient } from "./ProfileClient";
import { getParticipant } from "@/lib/session";
import { buildState } from "@/lib/progress";
import { requestNow } from "@/lib/test-clock";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil — THE ADVENT SPLITS" };

export default async function ProfilePage() {
  const p = await getParticipant();
  if (!p) redirect("/?dolacz=1");
  const st = await buildState(p, await requestNow());
  return (
    <AppShell active="profile">
      <ProfileClient participant={st.participant} completed={st.stats.completed} />
    </AppShell>
  );
}
