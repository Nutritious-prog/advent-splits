"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Flame, Timer } from "lucide-react";
import { Door } from "./Door";
import { ChallengeCard } from "./ChallengeCard";
import { Confetti } from "./Confetti";
import { ShareSheet } from "./ShareSheet";
import { FinaleSheet } from "./FinaleSheet";
import { Medal } from "@/components/Medal";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, formatCountdown, splitDuration, pad, useServerClock, usePrefersReducedMotion, warsawDate } from "@/lib/client";
import { urls, type CalendarMode } from "./mode";
import type { CalendarState, DoorState } from "@/lib/types";
import { pick } from "@/lib/gender";

const DONE_LINES = [
  "ZALICZONE. GOGGINS MOŻE BYĆ DUMNY.",
  "ZALICZONE. GODNOŚĆ: NIEKONIECZNIE.",
  "ZALICZONE. KANAPA W SZOKU.",
  "ZALICZONE. JUTRO TEŻ TAK MOŻESZ.",
  "ZALICZONE. TO BYŁA DOBRA, ZŁA DECYZJA.",
];

export function CalendarApp({
  initial,
  mode,
}: {
  initial: CalendarState;
  mode: CalendarMode;
}) {
  const [state, setState] = useState(initial);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [withResult, setWithResult] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const u = useMemo(() => urls(mode), [mode]);
  const now = useServerClock(state.serverNow, { simulated: mode.kind === "demo" });
  const simulatedNow = mode.kind === "demo" ? Date.parse(mode.at) : now;

  useEffect(() => setState(initial), [initial]);

  // Deep link: /kalendarz?dzien=5 opens that door's card if it's revealed.
  useEffect(() => {
    const d = Number(new URLSearchParams(window.location.search).get("dzien"));
    if (d && initial.doors[d - 1]?.challenge) setActiveDay(d);
  }, [initial.doors]);

  // When the next door unlocks, refresh state from the server (never trust the client clock alone).
  const refreshing = useRef(false);
  useEffect(() => {
    if (mode.kind === "demo" || !state.nextUnlockAt || refreshing.current) return;
    if (now >= Date.parse(state.nextUnlockAt) + 500) {
      refreshing.current = true;
      api<CalendarState>(u.state)
        .then((s) => {
          setState(s);
          if (s.unlocked > state.unlocked) toast("info", "Nowe okienko!", `Dzień ${s.unlocked} czeka na otwarcie.`);
        })
        .catch(() => {})
        .finally(() => (refreshing.current = false));
    }
  }, [now, state.nextUnlockAt, state.unlocked, u.state, mode.kind, toast]);

  const activeDoor = activeDay ? state.doors[activeDay - 1] : null;

  const handleError = useCallback(
    (e: unknown) => {
      const err = e as ApiError;
      if (err.code === "NO_PROFILE") {
        toast("error", "Sesja wygasła", "Dołącz ponownie, żeby kontynuować.");
        window.location.assign("/?dolacz=1");
        return;
      }
      toast(err.code === "LOCKED" ? "lock" : "error", err.code === "LOCKED" ? "Jeszcze nie teraz" : "Ups", err.message);
    },
    [toast, router],
  );

  async function activate(door: DoorState) {
    if (opening) return;
    if (door.status === "LOCKED") {
      const isTomorrow = door.day === state.unlocked + 1 && state.unlocked > 0;
      toast(
        "lock",
        pick(state.participant.gender, "Cierpliwości, sportowcu.", "Cierpliwości, sportsmenko.", "Cierpliwości!"),
        state.unlocked === 0 && door.day === 1
          ? "Start 1 grudnia o północy. Rozgrzewaj się."
          : isTomorrow
            ? "To okienko otworzy się jutro."
            : `To okienko otworzy się ${warsawDate(door.unlockAt)}.`,
      );
      return;
    }
    if (door.status !== "AVAILABLE") {
      setActiveDay(door.day);
      return;
    }
    await openDoorNow(door);
  }

  function closeChallenge() {
    setActiveDay(null);
  }

  async function openDoorNow(door: DoorState) {
    setOpening(door.day);
    const minAnim = new Promise((r) => setTimeout(r, reduced ? 0 : 1050));
    try {
      const [res] = await Promise.all([api<{ state: CalendarState }>(u.door(door.day, "open"), { body: {} }), minAnim]);
      setState(res.state);
      setActiveDay(door.day);
    } catch (e) {
      handleError(e);
    } finally {
      setOpening(null);
    }
  }

  async function act(action: "accept" | "complete" | "result", body: unknown) {
    if (!activeDay) return;
    const before = state;
    const res = await api<{ state: CalendarState }>(u.door(activeDay, action), { body });
    setState(res.state);
    const newly = res.state.achievements.filter((a) => a.unlocked && !before.achievements.find((b) => b.id === a.id)?.unlocked);
    for (const a of newly) setTimeout(() => toast("success", `Odznaka: ${a.title}`, a.description), 900);
    return res.state;
  }

  async function accept() {
    setBusy("accept");
    try {
      await act("accept", {});
      toast("info", "Wyzwanie podjęte", "Nie ma odwrotu. No, jest, ale udawajmy, że nie.");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function complete(done: boolean) {
    setBusy("complete");
    try {
      const next = await act("complete", { done });
      if (done) {
        if (!reduced) setConfetti(Date.now());
        setTimeout(() => setConfetti(null), 1800);
        toast("success", DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)], "Dodaj wynik i pochwal się w relacji.");
        // Finale: the last door, or the very last missing one.
        const finale = !!next && (activeDay === next.days || next.stats.completed >= next.days);
        if (finale) {
          setTimeout(() => {
            setActiveDay(null);
            setFinaleOpen(true);
          }, 1600);
        }
      } else {
        toast("info", "Cofnięto", "Wyzwanie wraca do listy do zrobienia.");
      }
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function saveResult(value: string, free: boolean) {
    try {
      await act("result", { value, free });
      toast("success", "Wynik zapisany", "Pojawi się na Twojej grafice.");
    } catch (e) {
      throw new Error((e as ApiError).message);
    }
  }

  const s = state.stats;
  const pct = Math.round((s.completed / state.days) * 100);
  const preLaunch = state.unlocked === 0;
  // The event ends at the end of the last day (25 Dec 00:00 Warsaw), not when the last door unlocks.
  const ended = simulatedNow >= Date.parse(state.endAt);
  const nextIn = state.nextUnlockAt ? Date.parse(state.nextUnlockAt) - simulatedNow : 0;

  return (
    <div>
      {/* Progress header */}
      <section className="border-b border-line pb-6 [container-type:inline-size]">
        <p className="eyebrow">Kalendarz uczestnika</p>
        {/* Long nicknames shrink to one line instead of breaking mid-word. */}
        <h1
          className="display mt-2 text-[length:min(3rem,var(--fit))] [overflow-wrap:anywhere] sm:text-[length:min(3.75rem,var(--fit))]"
          style={
            {
              "--fit": `calc(100cqw / ${(Math.max(6, ...state.participant.nickname.split(/\s+/).map((w) => w.length)) * 0.55).toFixed(2)})`,
            } as React.CSSProperties
          }
        >
          {state.participant.nickname}
        </h1>

        {preLaunch ? (
          <div className="mt-6 border border-mustard/50 bg-mustard/5 p-4">
            <p className="eyebrow text-mustard">Start za</p>
            <Countdown ms={nextIn} big />
            <p className="mt-2 text-sm text-cream/60">Pierwsze okienko otworzy się 1 grudnia o 00:00 (czas polski). Do tego czasu: rozciąganie i wyrzuty sumienia.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-end justify-between gap-4">
              <p className="display text-3xl tabular sm:text-4xl">
                {s.completed} <span className="text-cream/55">/ {state.days}</span>
                <span className="ml-2 align-middle font-sans text-xs font-bold tracking-[0.18em] text-muted">WYZWANIA UKOŃCZONE</span>
              </p>
              <Medal
                completedDays={state.doors.filter((d) => d.status === "COMPLETED").map((d) => d.day)}
                days={state.days}
                size={64}
                className="-mb-1 shrink-0"
              />
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden bg-cream/10" role="progressbar" aria-valuemin={0} aria-valuemax={state.days} aria-valuenow={s.completed} aria-label="Postęp">
              <motion.div className="h-full bg-mustard" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              <div className="flex items-center gap-3 bg-ink py-3 pr-3">
                <Flame size={20} className={s.currentStreak > 0 ? "text-mustard" : "text-cream/30"} aria-hidden />
                <div>
                  <p className="display text-2xl tabular">{s.currentStreak}</p>
                  <p className="eyebrow">Seria do dziś</p>
                </div>
              </div>
              <div className="col-span-1 flex items-center gap-3 bg-ink py-3 pl-3 sm:col-span-2">
                <Timer size={20} className="text-mustard" aria-hidden />
                <div>
                  {ended ? (
                    <>
                      <p className="display text-2xl">KONIEC KALENDARZA</p>
                      <p className="eyebrow">Możesz nadrabiać do woli</p>
                    </>
                  ) : !state.nextUnlockAt ? (
                    <>
                      <p className="display text-2xl">DZIŚ FINAŁ</p>
                      <p className="eyebrow">Ostatnie okienko jest otwarte</p>
                    </>
                  ) : (
                    <>
                      <p className="display text-2xl tabular" aria-live="off">{formatCountdown(nextIn)}</p>
                      <p className="eyebrow">Kolejne wyzwanie za</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Grid */}
      {state.unlocked >= state.days && (
        <section className="mt-6 flex flex-col gap-3 border-2 border-mustard bg-mustard/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-mustard">Finał</p>
            <p className="display mt-1 text-3xl">
              {s.completed >= state.days ? "Full distance" : "Twoje podsumowanie grudnia"}
            </p>
            <p className="mt-1 text-sm text-cream/60">
              {s.completed}/{state.days} splitów · seria {s.longestStreak} · gotowa grafika do relacji
            </p>
          </div>
          <Button onClick={() => setSummaryOpen(true)} className="shrink-0">
            Moje podsumowanie
          </Button>
        </section>
      )}

      <section aria-label="Okienka kalendarza" className="mt-6">
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
          {state.doors.map((d, i) => (
            <li key={d.day}>
              <Door door={d} index={i} opening={opening === d.day} isToday={d.day === state.unlocked && !ended} isFinal={d.day === state.days} onActivate={activate} />
            </li>
          ))}
        </ul>
        <Legend />
        {!preLaunch && s.revealed === 0 && (
          <p className="mt-6 border border-dashed border-line p-4 text-sm text-cream/60">
            {pick(state.participant.gender, "Jeszcze nic nie zrobiłeś.", "Jeszcze nic nie zrobiłaś.", "Jeszcze nic tu nie ma.")} Spokojnie, grudzień dopiero się rozkręca. Otwórz okienko z pulsującą ramką.
          </p>
        )}
      </section>

      <Sheet open={!!activeDoor?.challenge} onClose={closeChallenge} label={activeDoor?.challenge?.title ?? "Wyzwanie"}>
        {activeDoor?.challenge && (
          <ChallengeCard
            key={activeDoor.day}
            door={activeDoor}
            busy={busy}
            onAccept={accept}
            onComplete={() => complete(true)}
            onUndo={() => complete(false)}
            onShare={() => setShareOpen(true)}
            onSaveResult={saveResult}
          />
        )}
      </Sheet>

      {activeDoor?.challenge && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          imageUrl={u.share(activeDoor.day, withResult)}
          fileName={`advent-splits-dzien-${pad(activeDoor.day)}.png`}
          shareText={
            activeDoor.status === "COMPLETED"
              ? `DZIEŃ ${pad(activeDoor.day)} ZALICZONY. GODNOŚĆ: NIEKONIECZNIE. #theadventsplits`
              : `DZIEŃ ${pad(activeDoor.day)}: ${activeDoor.challenge.title}. Zobaczymy, czy przeżyję. #theadventsplits`
          }
          caption={activeDoor.challenge.caption || undefined}
          hasResult={!!activeDoor.result}
          withResult={withResult}
          setWithResult={setWithResult}
          title={activeDoor.status === "COMPLETED" ? "Pochwal się" : "Pokaż, co Cię czeka"}
        />
      )}

      <FinaleSheet
        open={finaleOpen}
        onClose={() => setFinaleOpen(false)}
        state={state}
        onShowSummary={() => {
          setFinaleOpen(false);
          setTimeout(() => setSummaryOpen(true), 250);
        }}
      />

      <ShareSheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        imageUrl={u.summary}
        fileName="advent-splits-moj-grudzien.png"
        shareText={`Mój grudzień: ${s.completed}/${state.days} splitów. #theadventsplits`}
        caption={
          s.completed >= state.days
            ? `24 dni. 24 wyzwania. Zero wymówek. ${pick(state.participant.gender, "Zrobiłem to.", "Zrobiłam to.", "Zrobione.")} FULL DISTANCE.`
            : `Mój grudzień: ${s.completed}/${state.days} splitów zaliczonych, najdłuższa seria ${s.longestStreak}. Godność: niekoniecznie.`
        }
        title="Mój grudzień"
      />

      {confetti && <Confetti seed={confetti} />}
    </div>
  );
}

function Countdown({ ms, big }: { ms: number; big?: boolean }) {
  const { d, h, m, s } = splitDuration(ms);
  const cells = [
    [d, "DNI"],
    [h, "GODZ"],
    [m, "MIN"],
    [s, "SEK"],
  ] as const;
  return (
    <div className={`mt-2 grid grid-cols-4 gap-2 ${big ? "" : "max-w-xs"}`} aria-label={`${d} dni ${h} godzin ${m} minut`}>
      {cells.map(([v, l]) => (
        <div key={l} className="border border-line bg-ink/60 px-2 py-2 text-center">
          <p className="display text-4xl tabular sm:text-5xl">{pad(v)}</p>
          <p className="eyebrow mt-1">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    ["border border-line hatch bg-[#1d1d1c]", "Zamknięte"],
    ["bg-charcoal shadow-[inset_0_0_0_2px_#D6A441]", "Do otwarcia"],
    ["bg-charcoal border border-cream/25", "Odkryte"],
    ["bg-mustard", "Ukończone"],
  ];
  return (
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legenda">
      {items.map(([cls, label]) => (
        <li key={label} className="flex items-center gap-2 text-xs text-cream/60">
          <span className={`h-3.5 w-3.5 ${cls}`} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}
