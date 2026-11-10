import { describe, expect, it } from "vitest";
import { formatResult } from "@/lib/results";
import { gx, pick } from "@/lib/gender";

describe("result validation", () => {
  it("formats valid values", () => {
    expect(formatResult("TIME", "min:s", "8:12", false)).toEqual({ ok: true, value: "8:12" });
    expect(formatResult("TIME", "s", "58", false)).toEqual({ ok: true, value: "58 s" });
    expect(formatResult("DISTANCE", "km", "5.2", false)).toEqual({ ok: true, value: "5,2 km" });
    expect(formatResult("REPS", "powt.", "42", false)).toEqual({ ok: true, value: "42 powt." });
    expect(formatResult("NOTE", "", "  Było   ciężko ", false)).toEqual({ ok: true, value: "Było ciężko" });
    expect(formatResult("REPS", "", "", false)).toEqual({ ok: true, value: null });
  });

  it("rejects invalid values", () => {
    expect(formatResult("TIME", "min:s", "abc", false).ok).toBe(false);
    expect(formatResult("REPS", "", "4.5", false).ok).toBe(false);
    expect(formatResult("NOTE", "", "x".repeat(81), false).ok).toBe(false);
  });

  it("free text bypasses the typed format", () => {
    expect(formatResult("TIME", "min:s", "około 8 minut", true)).toEqual({ ok: true, value: "około 8 minut" });
  });
});

describe("form of address", () => {
  const t = "[Przebiegłem|Przebiegłam] 5 km i [wszedłem|weszłam] na górę.";

  it("renders masculine, feminine and neutral forms", () => {
    expect(gx(t, "M")).toBe("Przebiegłem 5 km i wszedłem na górę.");
    expect(gx(t, "F")).toBe("Przebiegłam 5 km i weszłam na górę.");
    expect(gx(t, "N")).toBe("Przebiegłem/am 5 km i wszedłem/weszłam na górę.");
  });

  it("leaves plain text untouched and picks UI strings", () => {
    expect(gx("Bez markupu.", "F")).toBe("Bez markupu.");
    expect(pick("F", "a", "b", "c")).toBe("b");
    expect(pick("N", "a", "b", "c")).toBe("c");
  });
});
