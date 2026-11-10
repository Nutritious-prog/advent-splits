import { describe, expect, it } from "vitest";
import { testModeDecision } from "@/lib/test-clock";

describe("test mode gate (SEC-04)", () => {
  it("is always on in development", () => {
    expect(testModeDecision({ isProd: false, flag: undefined, admin: false })).toBe(true);
  });
  it("is off in production without the flag, even for admins", () => {
    expect(testModeDecision({ isProd: true, flag: undefined, admin: true })).toBe(false);
  });
  it("is off in production with the flag for anonymous visitors", () => {
    expect(testModeDecision({ isProd: true, flag: "true", admin: false })).toBe(false);
  });
  it("is on in production only with the flag AND an admin session", () => {
    expect(testModeDecision({ isProd: true, flag: "true", admin: true })).toBe(true);
  });
});
