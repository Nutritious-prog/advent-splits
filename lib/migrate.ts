import fs from "node:fs";
import path from "node:path";
import type { Q } from "./db";

/** Applies supabase/migrations/*.sql in order, once each. */
export async function runMigrations(db: Q, log: (m: string) => void = () => {}) {
  await db.exec(
    `create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now());
     alter table schema_migrations enable row level security;`,
  );
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name),
  );
  for (const f of files) {
    if (done.has(f)) continue;
    log(`applying ${f}`);
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [f]);
  }
}
