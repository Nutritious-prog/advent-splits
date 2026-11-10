"use client";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import { api } from "@/lib/client";
import type { CalendarState } from "@/lib/types";

const H = 3600_000;

export function AdminDemo(props: { startAt: string; endAt: string; serverNow: string; days: number; tz: string }) {
  const toast = useToast();
  const start = Date.parse(props.startAt);
  const presets: [string, number][] = [
    ["Przed startem", start - 3 * 24 * H],
    ["1 grudnia", start + 10 * H],
    ["Środek (dzień 12)", start + 11 * 24 * H + 10 * H],
    ["24 grudnia", start + (props.days - 1) * 24 * H + 10 * H],
    ["Po zakończeniu", Date.parse(props.endAt) + 2 * 24 * H],
    ["Teraz (realnie)", Date.parse(props.serverNow)],
  ];
  const [at, setAt] = useState(new Date(presets[2][1]).toISOString());
  const [state, setState] = useState<CalendarState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    (iso: string) =>
      api<CalendarState>(`/api/admin/demo/state?at=${encodeURIComponent(iso)}`)
        .then(setState)
        .catch((e) => toast("error", "Błąd", e.message)),
    [toast],
  );
  useEffect(() => void load(at), [at, load]);

  async function scenario(s: "reset" | "mixed" | "all-done") {
    setBusy(s);
    try {
      setState(await api<CalendarState>("/api/admin/demo/scenario", { body: { scenario: s, at } }));
      toast("success", "Scenariusz gotowy", s === "mixed" ? "Zamknięte, dostępne, odkryte i ukończone okienka." : s === "reset" ? "Czysty kalendarz demo." : "Wszystkie odblokowane ukończone.");
    } catch (e) {
      toast("error", "Błąd", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // datetime-local in Warsaw time
  const local = new Intl.DateTimeFormat("sv-SE", { timeZone: props.tz, dateStyle: "short", timeStyle: "short" }).format(new Date(at)).replace(" ", "T");

  return (
    <div>
      <div className="flex items-start gap-3 border border-mustard/40 bg-mustard/5 p-4">
        <FlaskConical size={20} className="mt-0.5 shrink-0 text-mustard" aria-hidden />
        <p className="text-sm leading-relaxed">
          Tryb demo działa na <strong>odizolowanym uczestniku testowym</strong> i symulowanym zegarze przekazywanym tylko do endpointów administratora. Publiczne API zawsze używa
          prawdziwego czasu serwera, więc podgląd nigdy nie odblokuje okienek prawdziwym uczestnikom.
        </p>
      </div>

      <section className="mt-6">
        <p className="eyebrow">Symulowana chwila</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map(([l, t]) => (
            <Button key={l} size="sm" variant={Math.abs(Date.parse(at) - t) < 60_000 ? "primary" : "outline"} onClick={() => setAt(new Date(t).toISOString())}>
              {l}
            </Button>
          ))}
          <label className="flex items-center gap-2">
            <span className="sr-only">Własna data</span>
            <input
              type="datetime-local"
              value={local}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                // interpret as Warsaw local time (CET in December)
                const guess = new Date(`${v}:00Z`);
                const offset = new Date(guess.toLocaleString("en-US", { timeZone: props.tz })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
                setAt(new Date(guess.getTime() - offset).toISOString());
              }}
              className="h-10 border border-cream/20 bg-ink px-2 text-sm [color-scheme:dark]"
            />
          </label>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => scenario("mixed")} loading={busy === "mixed"}>
          Scenariusz: wszystkie stany
        </Button>
        <Button size="sm" variant="outline" onClick={() => scenario("all-done")} loading={busy === "all-done"}>
          Wszystko ukończone
        </Button>
        <Button size="sm" variant="ghost" onClick={() => scenario("reset")} loading={busy === "reset"}>
          Wyczyść demo
        </Button>
        <a
          href={`/admin/podglad?at=${encodeURIComponent(at)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold uppercase tracking-[0.12em] text-mustard"
        >
          <ExternalLink size={14} /> Podgląd strony startowej
        </a>
      </section>

      <div className="mx-auto mt-8 max-w-3xl border border-dashed border-mustard/40 p-4 sm:p-6">
        {state ? <CalendarApp initial={state} mode={{ kind: "demo", at }} /> : <div className="skeleton h-96" />}
      </div>
    </div>
  );
}
