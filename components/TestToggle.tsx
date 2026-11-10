"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, FlaskConical, Loader2, Shuffle, X } from "lucide-react";

interface Status {
  allowed: boolean;
  active: boolean;
  now: string;
  unlocked: number;
  phase: "pre" | "live" | "post";
  days: number;
}

type Body = { mode: "day"; day: number } | { mode: "midnight"; day: number } | { mode: "pre" } | { mode: "post" } | { mode: "off" } | { mode: "wipe" };

export function TestToggle({ status }: { status: Status }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const current = status.active && status.phase === "live" ? status.unlocked : null;

  async function send(body: Body, key: string) {
    if (body.mode === "wipe" && !confirm("Usunąć wszystkie Twoje odkryte okienka i wyniki? Możesz wtedy przejść kalendarz od nowa.")) return;
    setBusy(key);
    setErr(null);
    try {
      const r = await fetch("/api/test-clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Błąd");
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  const label = !status.active
    ? "Tryb testowy"
    : status.phase === "pre"
      ? "Test: przed startem"
      : status.phase === "post"
        ? "Test: po 24.12"
        : `Test: dzień ${String(status.unlocked).padStart(2, "0")}`;

  return (
    <div className="fixed bottom-20 left-3 z-40 sm:bottom-4 sm:left-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            role="dialog"
            aria-label="Tryb testowy"
            className="mb-2 w-[min(22rem,calc(100vw-1.5rem))] border-2 border-mustard bg-ink p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="display text-2xl text-mustard">Tryb testowy</p>
                <p className="mt-1 text-xs leading-snug text-cream/55">
                  Udajemy, że jest wybrany dzień adwentu (godz. 12:00). Działa tylko w tej przeglądarce i nigdy na produkcji.
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Zamknij" className="flex h-9 w-9 shrink-0 items-center justify-center text-cream/60 hover:text-cream">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                disabled={!!busy || current === null || current <= 1}
                onClick={() => current && send({ mode: "day", day: current - 1 }, "prev")}
                className="flex h-11 flex-1 items-center justify-center gap-1 border border-cream/20 text-xs font-bold uppercase tracking-wider disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Wczoraj
              </button>
              <button
                disabled={!!busy || (current !== null && current >= status.days)}
                onClick={() => send({ mode: "day", day: current === null ? 1 : current + 1 }, "next")}
                className="flex h-11 flex-1 items-center justify-center gap-1 bg-mustard text-xs font-bold uppercase tracking-wider text-ink disabled:opacity-30"
              >
                {current === null ? "Start: dzień 1" : "Jutro"} <ChevronRight size={16} />
              </button>
            </div>

            {(current === null ? status.phase !== "post" : current < status.days) && (
              <button
                disabled={!!busy}
                onClick={() => send({ mode: "midnight", day: current === null ? 1 : current + 1 }, "midnight")}
                className="mt-2 flex h-10 w-full items-center justify-center border border-mustard/50 text-xs font-bold uppercase tracking-wider text-mustard disabled:opacity-30"
              >
                Północ za 10 s (zobacz odblokowanie na żywo)
              </button>
            )}

            <p className="eyebrow mt-4">Skocz do dnia</p>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {Array.from({ length: status.days }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  disabled={!!busy}
                  onClick={() => send({ mode: "day", day: d }, `d${d}`)}
                  aria-pressed={current === d}
                  className={`display flex h-10 items-center justify-center text-lg ${
                    current === d ? "bg-mustard text-ink" : current !== null && d < current ? "border border-mustard/40 text-cream" : "border border-line text-cream/60 hover:border-cream/40"
                  }`}
                >
                  {busy === `d${d}` ? <Loader2 size={14} className="animate-spin" /> : String(d).padStart(2, "0")}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                disabled={!!busy}
                onClick={() => send({ mode: "pre" }, "pre")}
                className={`h-10 text-xs font-bold uppercase tracking-wider ${status.active && status.phase === "pre" ? "bg-mustard text-ink" : "border border-line text-cream/70"}`}
              >
                Przed startem
              </button>
              <button
                disabled={!!busy}
                onClick={() => send({ mode: "post" }, "post")}
                className={`h-10 text-xs font-bold uppercase tracking-wider ${status.active && status.phase === "post" ? "bg-mustard text-ink" : "border border-line text-cream/70"}`}
              >
                Po 24 grudnia
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3">
              <button
                disabled={!!busy}
                onClick={() => send({ mode: "wipe" }, "wipe")}
                className="flex h-10 items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cream/70 hover:text-cream"
              >
                <Shuffle size={14} /> Wyczyść moje okienka (od nowa)
              </button>
              {status.active && (
                <button
                  disabled={!!busy}
                  onClick={() => send({ mode: "off" }, "off")}
                  className="flex h-10 items-center justify-center text-xs font-bold uppercase tracking-wider text-danger"
                >
                  Wyłącz tryb testowy (prawdziwy czas)
                </button>
              )}
            </div>
            {err && <p className="mt-2 text-xs text-danger">{err}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-11 items-center gap-2 px-4 text-xs font-bold uppercase tracking-[0.12em] shadow-xl ${
          status.active ? "bg-mustard text-ink" : "border border-mustard/60 bg-ink text-mustard"
        }`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
        {label}
      </motion.button>
    </div>
  );
}
