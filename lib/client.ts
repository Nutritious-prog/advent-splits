"use client";
import { useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiError(
      (e as Error).name === "AbortError" ? "Serwer nie odpowiada. Spróbuj ponownie za chwilę." : "Brak połączenia. Sprawdź internet i spróbuj ponownie.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Coś poszło nie tak. Spróbuj ponownie.", res.status, data.code);
  return data as T;
}

/**
 * Clock synced to the server. The initial offset comes from the server-rendered
 * timestamp, then it's refined with a round-trip to /api/time (latency-compensated).
 * `fixedNow` freezes/simulates time (admin demo).
 */
export function useServerClock(serverNowIso: string, opts?: { simulated?: boolean }) {
  const offset = useRef(Date.parse(serverNowIso) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset.current);

  useEffect(() => {
    offset.current = Date.parse(serverNowIso) - Date.now();
    setNow(Date.now() + offset.current);
  }, [serverNowIso]);

  useEffect(() => {
    if (opts?.simulated) return;
    let cancelled = false;
    const t0 = Date.now();
    fetch("/api/time", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { serverNow: string }) => {
        if (cancelled) return;
        const t1 = Date.now();
        offset.current = Date.parse(d.serverNow) + (t1 - t0) / 2 - t1;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [opts?.simulated]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now() + offset.current;
      setNow(n);
      timer = setTimeout(tick, 1000 - (n % 1000) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return now;
}

export function splitDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function formatCountdown(ms: number) {
  const { d, h, m, s } = splitDuration(ms);
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (d === 0) return hms;
  return `${d} ${d === 1 ? "DZIEŃ" : "DNI"} ${hms}`;
}

export function warsawDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", ...opts }).format(new Date(iso));
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}
