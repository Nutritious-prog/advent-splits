import { isAdmin } from "@/lib/admin";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { startAt, endAt, serverNow } from "@/lib/time";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — THE ADVENT SPLITS", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <AdminDashboard
      startAt={startAt().toISOString()}
      endAt={endAt().toISOString()}
      serverNow={serverNow().toISOString()}
      days={config.days}
      tz={config.tz}
    />
  );
}
