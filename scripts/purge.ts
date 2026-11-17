// End-of-retention data deletion (audit LEG-02).
//   npm run db:purge                → dry run: shows what would be deleted
//   npm run db:purge -- --confirm   → deletes all participant data
// Make a backup first (see README → Backups). This cannot be undone.
import fs from "node:fs";
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
    const { participants } = await purgeParticipantData(q);
    console.log(`deleted ${participants} participants (assignments and sessions cascaded).`);

  } finally {
    await end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
