import fs from "node:fs";
import postgres from "postgres";
import type { Q } from "../lib/db";

/**
 * Env loading for scripts. `--env <file>` loads a specific file first, e.g.
 *   npm run db:migrate -- --env .env.staging.local
 * Values already set in the shell always win (process.loadEnvFile never overrides).
 */
export function loadEnv(): string[] {
  const i = process.argv.indexOf("--env");
  const files = i > -1 && process.argv[i + 1] ? [process.argv[i + 1]] : [];
  files.push(".env.local", ".env");
  const loaded: string[] = [];
  for (const f of files) {
    if (fs.existsSync(f)) {
      process.loadEnvFile(f);
      loaded.push(f);
    } else if (f === files[0] && i > -1) {
      console.error(`env file not found: ${f}`);
      process.exit(1);
    }
  }
  return loaded;
}

loadEnv();

export function connect(): { q: Q; end: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. (Locally the app migrates its embedded PGlite DB automatically.)");
    process.exit(1);
  }
  const sql = postgres(url, { prepare: false, max: 1, ssl: url.includes("localhost") ? false : "require", onnotice: () => {} });
  return {
    q: {
      query: async (text, params = []) => (await sql.unsafe(text, params as never[])) as never,
      exec: async (text) => {
        await sql.unsafe(text);
      },
    },
    end: () => sql.end(),
  };
}
