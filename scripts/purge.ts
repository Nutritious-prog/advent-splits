// End-of-retention data deletion (audit LEG-02).
//   npm run db:purge                → dry run: shows what would be deleted
//   npm run db:purge -- --confirm   → deletes all participant data (+ Supabase Auth users)
// Make a backup first (see README → Backups). This cannot be undone.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { connect } from "./_db";
import { countParticipantData, purgeParticipantData } from "../lib/purge";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
const confirm = process.argv.includes("--confirm");

async function main() {
  const { q, end } = connect();
  try {
    const before = await countParticipantData(q);
    console.log("current data:", before);
    if (!confirm) {
      console.log("dry run. Re-run with --confirm to delete everything above.");
      return;
    }
    const { participants, authUserIds } = await purgeParticipantData(q);
    console.log(`deleted ${participants} participants (assignments and sessions cascaded).`);

    if (authUserIds.length) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        console.warn(`${authUserIds.length} Supabase Auth users NOT deleted: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and delete them in the dashboard.`);
      } else {
        const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        let ok = 0;
        for (const id of authUserIds) {
          const { error } = await admin.auth.admin.deleteUser(id);
          if (error && !/not.?found/i.test(error.message)) console.warn("auth user", id, error.message);
          else ok++;
        }
        console.log(`deleted ${ok}/${authUserIds.length} Supabase Auth users.`);
      }
    }
  } finally {
    await end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
