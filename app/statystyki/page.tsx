import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Check, ChevronRight, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { getParticipant } from "@/lib/session";
import { buildState } from "@/lib/progress";
import { requestNow } from "@/lib/test-clock";
import { CATEGORY_LABEL, formatMinutes } from "@/lib/labels";
import { pick } from "@/lib/gender";
import { Medal } from "@/components/Medal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statystyki — THE ADVENT SPLITS" };

export default async function StatsPage() {
  const p = await getParticipant();
  if (!p) redirect("/?dolacz=1");
  const st = await buildState(p, await requestNow());
  const s = st.stats;
  const done = st.doors.filter((d) => d.status === "COMPLETED");
  const pending = st.doors.filter((d) => d.status === "OPENED");
  const unlockedCount = st.achievements.filter((a) => a.unlocked).length;

  // Streak hint: which past doors would rebuild the streak up to today (catching up counts).
  const isDone = (day: number) => st.doors[day - 1]?.status === "COMPLETED";
  let lastDoneBeforeToday = 0;
  for (let d = st.unlocked - 1; d >= 1; d--) if (isDone(d)) { lastDoneBeforeToday = d; break; }
  const gapFrom = lastDoneBeforeToday + 1;
  const gapTo = st.unlocked - 1;
  const gap = gapTo >= gapFrom ? (gapFrom === gapTo ? `okienko ${gapFrom}` : `okienka ${gapFrom}–${gapTo}`) : null;
  const todayDone = st.unlocked >= 1 && isDone(st.unlocked);

  const tiles = [
    { v: `${s.completed}`, l: "Ukończone", d: `z ${st.days} wyzwań` },
    {
      v: `${s.currentStreak}`,
      l: "Seria do dziś",
      d: "kolejne okienka zaliczone bez przerwy aż do dziś (dzisiejsze masz czas zrobić do północy)",
    },
    { v: `${s.longestStreak}`, l: "Najdłuższa seria", d: "rekord kolejnych ukończonych dni" },
    { v: `${s.revealed}`, l: "Odkryte okienka", d: "otwarte, niekoniecznie zrobione" },
    { v: s.minutes ? formatMinutes(s.minutes) : "0 min", l: "Szacowany czas ruchu", d: "suma szacowanych czasów ukończonych wyzwań" },
    { v: s.favoriteCategory ? CATEGORY_LABEL[s.favoriteCategory] : "—", l: "Ulubiona kategoria", d: "najwięcej ukończonych wyzwań" },
  ];

  return (
    <AppShell active="stats">
      <p className="eyebrow">Twoje liczby</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">Statystyki</h1>

      <section aria-label="Medal" className="mt-6 flex flex-col items-center gap-5 border border-line p-5 sm:flex-row sm:items-center sm:gap-8">
        <Medal completedDays={done.map((d) => d.day)} days={st.days} size={170} />
        <div className="text-center sm:text-left">
          <p className="eyebrow">Medal ADVENT SPLITS</p>
          <p className="display mt-2 text-4xl">
            {s.completed >= st.days ? "Finisher" : `${s.completed} / ${st.days} segmentów`}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream/60">
            Każde zaliczone okienko zapala swój segment medalu. Komplet 24 segmentów daje medal FINISHER na grafice podsumowania.
          </p>
        </div>
      </section>

      <section aria-label="Statystyki" className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.l} className="bg-ink p-4">
            <p className="display break-words text-3xl text-cream sm:text-4xl">{t.v}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-mustard">{t.l}</p>
            <p className="mt-1 text-xs leading-snug text-cream/55">{t.d}</p>
          </div>
        ))}
      </section>
      {gap && s.completed > 0 && (
        <div className="mt-3 border-l-2 border-mustard bg-mustard/5 p-3 text-sm leading-relaxed text-cream/80">
          <strong className="text-cream">Seria przerwana na: {gap}.</strong>{" "}
          {todayDone ? "Dzisiejsze masz zaliczone, więc seria liczy się od dziś. " : "Zrób dzisiejsze okienko, żeby zacząć nową serię. "}
          Nadrobienie {gap.startsWith("okienka") ? "zaległych okienek" : "zaległego okienka"} skleja serię z powrotem. Nadrabianie jest w pełni legalne.
        </div>
      )}
      <p className="mt-3 text-xs text-cream/55">Czas ruchu liczymy tylko z ukończonych wyzwań, na podstawie ich szacowanej długości. Samo otwarcie okienka się nie liczy.</p>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="display text-3xl">Odznaki</h2>
          <p className="eyebrow">
            {unlockedCount} / {st.achievements.length}
          </p>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {st.achievements.map((a) => (
            <li key={a.id} className={`flex items-center gap-4 border p-4 ${a.unlocked ? "border-mustard/50 bg-mustard/5" : "border-line"}`}>
              <span
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center ${a.unlocked ? "bg-mustard text-ink" : "border border-line text-cream/30 grayscale"}`}
                aria-hidden
              >
                {a.unlocked ? <Award size={24} /> : a.progress > 0 ? <Award size={22} className="opacity-40" /> : <Lock size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`display min-w-0 text-xl [overflow-wrap:anywhere] ${a.unlocked ? "" : "text-cream/55"}`}>{a.title}</p>
                  <span className={`shrink-0 text-xs font-bold tabular ${a.unlocked ? "text-mustard" : "text-cream/55"}`}>
                    {a.unlocked ? "ZDOBYTA" : `${a.progress}/${a.target}`}
                  </span>
                </div>
                <p className="text-sm text-cream/55">{a.description}</p>
                {!a.unlocked && (
                  <div className="mt-2 h-1.5 w-full bg-cream/10" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.progress} aria-label={`Postęp odznaki ${a.title}`}>
                    <div className="h-full bg-mustard/70" style={{ width: `${Math.round((a.progress / a.target) * 100)}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">Zaliczone</h2>
        {done.length === 0 ? (
          <div className="mt-4 border border-dashed border-line p-6 text-center">
            <p className="display text-2xl">Pusto. Na razie.</p>
            <p className="mt-2 text-sm text-cream/60">{pick(st.participant.gender, "Jeszcze nic nie zrobiłeś.", "Jeszcze nic nie zrobiłaś.", "Jeszcze nic tu nie ma.")} Spokojnie, grudzień dopiero się rozkręca.</p>
            <Link href="/kalendarz" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold uppercase tracking-[0.12em] text-mustard">
              Do kalendarza <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {done.map((d) => (
              <li key={d.day}>
                <Link href={`/kalendarz?dzien=${d.day}`} className="flex min-h-16 items-center gap-4 py-3 hover:bg-cream/[0.03]">
                  <span className="display w-10 text-2xl text-mustard">{String(d.day).padStart(2, "0")}</span>
                  <ChallengeIcon name={d.challenge!.icon} className="h-5 w-5 shrink-0 text-cream/60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold uppercase">{d.challenge!.title}</span>
                    {d.result && <span className="block text-sm text-mustard">{d.result}</span>}
                  </span>
                  <Check size={18} className="text-mustard" aria-label="ukończone" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && (
          <p className="mt-4 text-sm text-cream/60">
            Masz {pending.length} {pending.length === 1 ? "odkryte wyzwanie" : "odkryte wyzwania"} czekające na wykonanie. Nadrabianie jest w pełni legalne.
          </p>
        )}
      </section>
    </AppShell>
  );
}
