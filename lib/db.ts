import "server-only";
import { runMigrations } from "./migrate";

/**
 * Minimal SQL adapter. Production: Supabase Postgres via `postgres` (porsager).
 * Local development without DATABASE_URL: embedded PGlite (real Postgres in WASM),
 * so the exact same SQL, constraints and transactions are exercised.
 */
export interface Q {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}
export interface DB extends Q {
  tx<T>(fn: (q: Q) => Promise<T>): Promise<T>;
}

type G = typeof globalThis & { __tuaDb?: Promise<DB> };
const g = globalThis as G;

async function createPostgres(url: string): Promise<DB> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    prepare: false, // required for Supabase transaction pooler (pgBouncer)
    max: Math.max(1, Number(process.env.DB_POOL_MAX) || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  });
  const wrap = (s: typeof sql): Q => ({
    async query(text, params = []) {
      return (await s.unsafe(text, params as never[])) as never;
    },
    async exec(text) {
      await s.unsafe(text);
    },
  });
  return {
    ...wrap(sql),
    async tx(fn) {
      return (await sql.begin((t) => fn(wrap(t as unknown as typeof sql)))) as never;
    },
  };
}

async function createPglite(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  const wrap = (s: { query: typeof pg.query; exec: typeof pg.exec }): Q => ({
    async query(text, params = []) {
      return (await s.query(text, params as unknown[])).rows as never;
    },
    async exec(text) {
      await s.exec(text);
    },
  });
  let chain: Promise<unknown> = Promise.resolve();
  return {
    ...wrap(pg),
    tx(fn) {
      // PGlite is a single connection: serialize transactions explicitly.
      const run = chain.then(() => pg.transaction((t) => fn(wrap(t as never))));
      chain = run.catch(() => undefined);
      return run as never;
    },
  };
}

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
    throw new Error("DATABASE_URL is not set");
  }
  const db = url ? await createPostgres(url) : await createPglite();
  if (!url) {
    // Local convenience: auto-migrate and seed the embedded database.
    await runMigrations(db);
    const { seedChallenges } = await import("./seed");
    await seedChallenges(db);
  }
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__tuaDb) {
    g.__tuaDb = init().catch((e) => {
      g.__tuaDb = undefined;
      throw e;
    });
  }
  return g.__tuaDb;
}

export function iso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}
