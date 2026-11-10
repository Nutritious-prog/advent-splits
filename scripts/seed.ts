// npm run db:seed                 → insert missing challenges (safe, never overwrites)
// npm run db:seed -- --overwrite  → also replace texts of existing challenges with the seed files
import fs from "node:fs";
import path from "node:path";
import { connect } from "./_db";
import { seedChallenges } from "../lib/seed";
import { runMigrations } from "../lib/migrate";

const overwrite = process.argv.includes("--overwrite");
for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);

async function main() {
  if (process.env.DATABASE_URL) {
    const { q, end } = connect();
    try {
      console.log(`seed: ${await seedChallenges(q, { overwrite })} rows ${overwrite ? "inserted/updated" : "inserted"}`);
    } finally {
      await end();
    }
    return;
  }
  // Local embedded DB (stop `npm run dev` first: PGlite allows one process at a time).
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  const q = {
    query: async (t: string, p: unknown[] = []) => (await pg.query(t, p)).rows as never,
    exec: async (t: string) => void (await pg.exec(t)),
  };
  await runMigrations(q);
  console.log(`seed (local PGlite): ${await seedChallenges(q, { overwrite })} rows ${overwrite ? "inserted/updated" : "inserted"}`);
  await pg.close();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
