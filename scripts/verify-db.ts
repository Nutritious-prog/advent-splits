// Verifies a database environment before you point the app at it. Read-only, prints no secrets.
//   npm run verify:db -- --env .env.production.local --production
import fs from "node:fs";
import path from "node:path";
import { connect, loadEnv } from "./_db";
import { productionConfigProblems } from "../lib/env-check";

type Result = { ok: boolean | null; name: string; detail?: string };
const results: Result[] = [];
const pass = (name: string, detail?: string) => results.push({ ok: true, name, detail });
const fail = (name: string, detail?: string) => results.push({ ok: false, name, detail });
const skip = (name: string, detail?: string) => results.push({ ok: null, name, detail });

const APP_TABLES = ["challenges", "participants", "sessions", "assignments", "admin_events", "rate_limits", "schema_migrations"];

async function main() {
  const loaded = loadEnv();
  console.log(`env files: ${loaded.join(", ") || "(none)"}\n`);
  const env = process.env;

  // 1. Configuration
  const has = (k: string) => (env[k] ? "set" : "MISSING");
  console.log(
    ["DATABASE_URL", "SESSION_SECRET", "ADMIN_PASSWORD", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_OPERATOR_NAME", "NEXT_PUBLIC_CONTACT_EMAIL"]
      .map((k) => `  ${k.padEnd(28)} ${has(k)}`)
      .join("\n"),
  );
  console.log();
  if ((env.SESSION_SECRET ?? "").length >= 32) pass("SESSION_SECRET length ≥ 32");
  else fail("SESSION_SECRET length ≥ 32", "generate: openssl rand -base64 48");
  if ((env.ADMIN_PASSWORD ?? "").length >= 12) pass("ADMIN_PASSWORD length ≥ 12");
  else fail("ADMIN_PASSWORD length ≥ 12");
  if (process.argv.includes("--production")) {
    const probs = productionConfigProblems({ ...env, VERCEL_ENV: "production" });
    if (probs.length) fail("production config guard", probs.join(" | "));
    else pass("production config guard");
    if (env.ENABLE_TEST_MODE === "true") fail("ENABLE_TEST_MODE off in production");
    else pass("ENABLE_TEST_MODE off in production");
  }

  // 2. Database
  if (!env.DATABASE_URL) {
    fail("database connection", "DATABASE_URL missing");
  } else {
    const host = (() => {
      try {
        return new URL(env.DATABASE_URL!).host;
      } catch {
        return "?";
      }
    })();
    const { q, end } = connect();
    try {
      const [{ v }] = await q.query<{ v: string }>("select current_setting('server_version') as v");
      pass("database connection", `${host}, Postgres ${v}`);

      const files = fs.readdirSync(path.join(process.cwd(), "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
      const applied = new Set(
        (await q.query<{ name: string }>("select name from schema_migrations").catch(() => [] as { name: string }[])).map((r) => r.name),
      );
      const missing = files.filter((f) => !applied.has(f));
      if (missing.length) fail("migrations applied", `missing: ${missing.join(", ")} → npm run db:migrate -- --env <file>`);
      else pass("migrations applied", `${files.length}/${files.length}`);

      const tables = await q.query<{ tablename: string; rowsecurity: boolean }>(
        "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
      );
      for (const t of APP_TABLES) {
        const row = tables.find((x) => x.tablename === t);
        if (!row) fail(`table ${t} exists`);
        else if (!row.rowsecurity) fail(`RLS enabled on ${t}`, "run migrations again or: alter table … enable row level security");
      }
      if (APP_TABLES.every((t) => tables.find((x) => x.tablename === t)?.rowsecurity)) pass("RLS enabled on all app tables");

      const extra = tables.filter((t) => !APP_TABLES.includes(t.tablename) && !t.rowsecurity).map((t) => t.tablename);
      if (extra.length) fail("no other public tables without RLS", extra.join(", "));

      const roles = await q.query<{ rolname: string }>("select rolname from pg_roles where rolname in ('anon','authenticated')");
      if (!roles.length) skip("API roles have no table privileges", "not a Supabase database (no anon role)");
      else {
        const grants = await q.query<{ grantee: string; table_name: string; privilege_type: string }>(
          `select grantee, table_name, privilege_type from information_schema.role_table_grants
            where table_schema = 'public' and grantee in ('anon','authenticated') and table_name = any($1)`,
          [APP_TABLES],
        );
        if (grants.length) fail("API roles have no table privileges", grants.map((g) => `${g.grantee}:${g.table_name}:${g.privilege_type}`).slice(0, 6).join(", "));
        else pass("API roles have no table privileges");
      }

      const ch = await q.query<{ day: number }>("select day::int as day from challenges where active and day is not null order by day");
      const days = ch.map((r) => r.day);
      if (days.length === 24 && days.every((d, i) => d === i + 1)) pass("calendar seeded", "24 active challenges, days 1–24");
      else fail("calendar seeded", `found ${days.length} scheduled → npm run db:seed -- --env <file>`);
    } catch (e) {
      fail("database checks", (e as Error).message);
    } finally {
      await end();
    }
  }

  // Report
  console.log();
  for (const r of results) console.log(`${r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "SKIP"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  const failed = results.filter((r) => r.ok === false).length;
  console.log(`\n${failed ? `${failed} check(s) failed` : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
