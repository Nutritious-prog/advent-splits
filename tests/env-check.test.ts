import { describe, expect, it } from "vitest";
import { assertProductionConfig, productionConfigProblems } from "@/lib/env-check";

const good = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://adventsplits.pl",
  NEXT_PUBLIC_OPERATOR_NAME: "Jan Kowalski, ul. Przykładowa 1, 00-001 Warszawa",
  NEXT_PUBLIC_CONTACT_EMAIL: "kontakt@adventsplits.pl",
};

describe("production config guard", () => {
  it("is not strict outside real production (local builds, previews)", () => {
    expect(productionConfigProblems({})).toEqual([]);
    expect(productionConfigProblems({ VERCEL_ENV: "preview" })).toEqual([]);
    expect(productionConfigProblems({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toEqual([]);
  });

  it("accepts a complete production config", () => {
    expect(productionConfigProblems(good)).toEqual([]);
    expect(() => assertProductionConfig(good)).not.toThrow();
  });

  it("rejects missing or localhost site URL (CFG-01)", () => {
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_SITE_URL: "" }).join()).toMatch(/NEXT_PUBLIC_SITE_URL is not set/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).join()).toMatch(/localhost/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_SITE_URL: "http://adventsplits.pl" }).join()).toMatch(/https/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_SITE_URL: "not a url" }).join()).toMatch(/not a valid URL/);
  });

  it("rejects missing privacy policy data (LEG-01)", () => {
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_OPERATOR_NAME: "" }).join()).toMatch(/OPERATOR_NAME/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_OPERATOR_NAME: "[UZUPEŁNIJ: imię]" }).join()).toMatch(/OPERATOR_NAME/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_CONTACT_EMAIL: "" }).join()).toMatch(/CONTACT_EMAIL is missing/);
    expect(productionConfigProblems({ ...good, NEXT_PUBLIC_CONTACT_EMAIL: "nie-mail" }).join()).toMatch(/not a valid e-mail/);
  });

  it("also enforces on non-Vercel hosts with REQUIRE_PROD_CONFIG", () => {
    const { VERCEL_ENV, ...rest } = good;
    void VERCEL_ENV;
    expect(productionConfigProblems({ ...rest, REQUIRE_PROD_CONFIG: "true", NEXT_PUBLIC_SITE_URL: "" }).length).toBe(1);
  });

  it("throws with a readable message listing every problem", () => {
    expect(() => assertProductionConfig({ VERCEL_ENV: "production" })).toThrow(/SITE_URL[\s\S]*OPERATOR_NAME[\s\S]*CONTACT_EMAIL/);
  });
});
