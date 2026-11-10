import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DoorError } from "./assign";
import { ValidationError } from "./doors";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(status: number, error: string, code?: string) {
  return json({ error, code }, status);
}

/** Basic CSRF defence on top of SameSite=Lax cookies: reject cross-origin writes. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    if (text.length > 20_000) return {};
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export function handle<A extends unknown[]>(fn: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A): Promise<Response> => {
    if (req.method !== "GET" && !sameOrigin(req)) return fail(403, "Niedozwolone źródło żądania.");
    try {
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof DoorError) {
        const status = e.code === "LOCKED" ? 403 : e.code === "INVALID_DAY" ? 404 : 409;
        return fail(status, e.message, e.code);
      }
      if (e instanceof ValidationError) return fail(400, e.message, "VALIDATION");
      if (e instanceof ZodError) return fail(400, "Nieprawidłowe dane. Sprawdź formularz.", "VALIDATION");
      // One JSON line per server error (audit OPS-01): easy to filter and alert on in
      // Vercel logs ("level":"error"). No request bodies or cookies are logged.
      const err = e as Error & { code?: string };
      console.error(
        JSON.stringify({
          level: "error",
          at: new Date().toISOString(),
          method: req.method,
          path: new URL(req.url).pathname,
          name: err?.name,
          code: err?.code,
          message: err?.message,
          stack: err?.stack?.split("\n").slice(0, 6).join(" | "),
        }),
      );
      return fail(500, "Coś poszło nie tak po naszej stronie. Spróbuj za chwilę.");
    }
  };
}
