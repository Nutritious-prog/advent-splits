/**
 * Production configuration guard (audit findings CFG-01 and LEG-01).
 *
 * Strict mode runs on real production deploys (Vercel sets VERCEL_ENV=production)
 * or when REQUIRE_PROD_CONFIG=true (other hosts). Local `next build` / `next start`
 * and Vercel previews are not strict, so development keeps working without real data.
 *
 * Kept dependency-free so next.config.ts can import it and fail the build early.
 */
type Env = Record<string, string | undefined>;

export function isStrictProduction(env: Env): boolean {
  return env.VERCEL_ENV === "production" || env.REQUIRE_PROD_CONFIG === "true";
}

export function productionConfigProblems(env: Env): string[] {
  if (!isStrictProduction(env)) return [];
  const problems: string[] = [];

  const site = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!site) {
    problems.push("NEXT_PUBLIC_SITE_URL is not set (it is printed on every share card).");
  } else {
    let url: URL | null = null;
    try {
      url = new URL(site);
    } catch {
      problems.push(`NEXT_PUBLIC_SITE_URL is not a valid URL: "${site}".`);
    }
    if (url) {
      if (url.protocol !== "https:") problems.push("NEXT_PUBLIC_SITE_URL must use https://.");
      if (/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(url.hostname) || url.hostname.endsWith(".localhost"))
        problems.push("NEXT_PUBLIC_SITE_URL points to localhost.");
    }
  }

  const operator = (env.NEXT_PUBLIC_OPERATOR_NAME ?? "").trim();
  if (!operator || /UZUPE[ŁL]NIJ/i.test(operator))
    problems.push("NEXT_PUBLIC_OPERATOR_NAME is missing (privacy policy: data controller name and address).");

  const contact = (env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
  if (!contact || /UZUPE[ŁL]NIJ/i.test(contact)) problems.push("NEXT_PUBLIC_CONTACT_EMAIL is missing (privacy policy contact).");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) problems.push(`NEXT_PUBLIC_CONTACT_EMAIL is not a valid e-mail: "${contact}".`);

  return problems;
}

export function assertProductionConfig(env: Env = process.env): void {
  const problems = productionConfigProblems(env);
  if (problems.length) {
    throw new Error(`Invalid production configuration:\n - ${problems.join("\n - ")}\nSee .env.example and README (Deploy).`);
  }
}
