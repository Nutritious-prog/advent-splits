"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, AtSign, Lock, Share2, Download, Check, Flag, Sparkles, DoorOpen } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/Button";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { JoinSheet } from "./JoinSheet";
import { ShareSheet } from "@/components/calendar/ShareSheet";
import { useToast } from "@/components/ui/Toast";
import { pad, splitDuration, useServerClock } from "@/lib/client";
import { CATEGORY_LABEL } from "@/lib/labels";
import { CATEGORIES } from "@/lib/types";

const CAT_ICON: Record<string, string> = {
  RUNNING: "footprints", CYCLING: "bike", SWIMMING: "waves", HIKING: "mountain", STRENGTH: "dumbbell", MOBILITY: "feather", MULTISPORT: "repeat",
};

const STEPS = [
  { icon: DoorOpen, t: "Otwórz okienko", d: "Codziennie o północy (czasu polskiego) odblokowuje się nowe. Przegapione możesz nadrobić." },
  { icon: Sparkles, t: "Ten sam split dla wszystkich", d: "Każdego dnia cała ekipa dostaje to samo wyzwanie. Porównujcie wyniki i screeny ze Stravy." },
  { icon: Flag, t: "Zrób to po swojemu", d: "Bieg, rower, pływanie, wzniesienia, siła, mobility. Każdy dzień ma wersję łatwiejszą, trudniejszą i zamiennik dla innej dyscypliny." },
  { icon: Check, t: "Zapal segment medalu", d: "Odhacz dzień, dodaj wynik i wrzuć grafikę do relacji. 24 segmenty dają medal FINISHER." },
];

const FAQ = [
  ["Czy muszę zakładać konto?", "Nie. Wystarczy nick. Bez hasła i bez maila."],
  ["Co jeśli wyczyszczę dane przeglądarki?", "Postęp jest w naszej bazie, ale klucz do niego trzyma tylko ta przeglądarka. Wracaj więc zawsze na tym samym telefonie i w tej samej aplikacji: jeśli dołączysz z Instagrama, wracaj przez Instagram. Wyczyszczenie danych przeglądarki albo tryb prywatny odetnie dostęp."],
  ["Mogę nadrabiać zaległe dni?", "Tak. Każde odblokowane okienko zostaje otwarte do końca, także po 24 grudnia. Przyszłych nie da się otworzyć wcześniej (serwer pilnuje, nie Twój zegarek)."],
  ["Nie biegam, jeżdżę na rowerze albo pływam. To dla mnie?", "Tak. Kalendarz jest dla ludzi od sportów wytrzymałościowych, a każdy dzień ma zamiennik dla innej dyscypliny: dzień biegowy zrobisz na rowerze lub w basenie, dzień basenowy na rowerze lub biegiem."],
  ["Czy wszyscy mają te same wyzwania?", "Tak. Dzień 8 to ten sam split dla każdego uczestnika, więc możecie się porównywać, ścigać i wymieniać wynikami."],
  ["Jak ciężko będzie?", "W większości spokojnie lub umiarkowanie, z mocniejszymi akcentami w weekendy i dniami regeneracji pomiędzy. To nie jest plan treningowy: jeśli masz swój plan, wybierz wersję łatwiejszą lub zamiennik, który do niego pasuje."],
];

export function Landing(props: {
  serverNow: string;
  startAt: string;
  endAt: string;
  unlocked: number;
  days: number;
  nickname: string | null;
  instagram: string;
  simulated?: boolean;
}) {
  const now = useServerClock(props.serverNow, { simulated: props.simulated });
  const effectiveNow = props.simulated ? Date.parse(props.serverNow) : now;
  const [join, setJoin] = useState(false);
  const [invite, setInvite] = useState(false);
  const toast = useToast();
  const startMs = Date.parse(props.startAt);
  const pre = effectiveNow < startMs;
  const ended = effectiveNow >= Date.parse(props.endAt);
  const { d, h, m, s } = splitDuration(startMs - effectiveNow);
  const joined = !!props.nickname;

  useEffect(() => {
    if (!joined && new URLSearchParams(window.location.search).get("dolacz")) setJoin(true);
  }, [joined]);

  async function shareLink() {
    const url = window.location.origin;
    const text = "THE ADVENT SPLITS: 24 dni, 24 wyzwania, zero gwarancji godności. Wchodzisz?";
    try {
      if (navigator.share) await navigator.share({ title: "THE ADVENT SPLITS", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("success", "Link skopiowany", "Wyślij go komuś, kto „zacznie od poniedziałku”.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("info", "Skopiuj link ręcznie", url);
    }
  }

  const cta = joined ? (
    <Link
      href="/kalendarz"
      className="inline-flex min-h-14 items-center justify-center gap-2 bg-mustard px-7 text-base font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-[#e2b24f]"
    >
      Przejdź do kalendarza <ArrowRight size={18} />
    </Link>
  ) : (
    <Button size="lg" onClick={() => setJoin(true)}>
      Dołącz do wyzwania <ArrowRight size={18} />
    </Button>
  );

  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Wordmark />
        {joined ? (
          <Link href="/kalendarz" className="text-xs font-bold uppercase tracking-[0.14em] text-cream/70 hover:text-cream">
            {props.nickname} →
          </Link>
        ) : (
          <a href={`https://instagram.com/${props.instagram}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-cream/60 hover:text-cream">
            <AtSign size={14} /> {props.instagram}
          </a>
        )}
      </header>

      <main>
      {/* HERO: painted on first render (LCP), entrance is a CSS transform only */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-16">
        <p className="eyebrow">
          @{props.instagram} przedstawia · Grudzień {props.startAt.slice(0, 4)}
        </p>
        <h1 className="hero-rise display mt-5 text-[19vw] leading-[0.86] sm:text-[9.5rem]">
          The
          <br />
          Advent
          <br />
          <span className="text-mustard">Splits</span>
        </h1>
        <div className="hero-rise hero-rise-delay mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="display text-3xl leading-[1.05] sm:text-5xl">
              24 days.
              <br />
              24 challenges.
              <br />
              <span className="text-mustard">Questionable decisions.</span>
            </p>
            <p className="mt-5 max-w-md text-lg text-cream/70">24 dni. 24 wyzwania. Zero gwarancji godności. Adwent dla biegaczy, kolarzy i pływaków: codziennie jeden split, ten sam dla wszystkich, zamiast czekolady.</p>
          </div>

          <div className="w-full border border-line bg-charcoal/60 p-5 lg:w-[26rem]">
            {pre ? (
              <>
                <p className="eyebrow text-mustard">Start za</p>
                <div className="mt-3 grid grid-cols-4 gap-2" aria-live="off" aria-label={`Start za ${d} dni, ${h} godzin, ${m} minut`}>
                  {(
                    [
                      [d, "dni"],
                      [h, "godz"],
                      [m, "min"],
                      [s, "sek"],
                    ] as const
                  ).map(([v, l]) => (
                    <div key={l} className="border border-line bg-ink px-1 py-3 text-center">
                      <p className="display text-4xl tabular sm:text-5xl">{pad(v)}</p>
                      <p className="eyebrow mt-1">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-cream/55">1 grudnia, 00:00 czasu polskiego. Zapisy już trwają.</p>
              </>
            ) : ended ? (
              <>
                <p className="eyebrow text-mustard">Kalendarz zakończony</p>
                <p className="display mt-2 text-4xl">Wszystkie 24 okienka otwarte</p>
                <p className="mt-2 text-sm text-cream/60">Nadal możesz dołączyć i nadrabiać. Bez oceniania.</p>
              </>
            ) : (
              <>
                <p className="eyebrow text-mustard">Trwa</p>
                <p className="display mt-2 text-5xl">
                  Dzień {pad(props.unlocked)} <span className="text-cream/55">/ {props.days}</span>
                </p>
                <p className="mt-2 text-sm text-cream/60">Dołączasz później? Nic straconego, przeszłe okienka czekają.</p>
              </>
            )}
            <div className="mt-5 flex flex-col gap-2">{cta}</div>
          </div>
        </div>
      </section>

      {/* DOOR PREVIEW */}
      <section className="border-y border-line bg-[#161616] py-16" aria-labelledby="doors-h">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="doors-h" className="display text-5xl sm:text-6xl">
              24 okienka.
              <br />
              <span className="text-cream/55">Zero czekolady.</span>
            </h2>
            <p className="max-w-sm text-cream/60">Co jest za okienkiem? Dowiesz się o północy. My wiemy i trochę się uśmiechamy.</p>
          </div>
          <ul className="mt-10 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-8" aria-label="Podgląd okienek">
            {Array.from({ length: props.days }, (_, i) => {
              const open = !pre && i < props.unlocked;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: (i % 8) * 0.04 }}
                  whileHover={{ rotate: i % 2 ? 1.5 : -1.5, y: -3 }}
                  className={`flex aspect-[4/5] flex-col justify-between p-2.5 ${open ? "bg-charcoal shadow-[inset_0_0_0_2px_#D6A441]" : "hatch border border-line bg-ink"}`}
                >
                  <span className={`display text-3xl sm:text-4xl ${open ? "text-cream" : "text-cream/25"}`}>{pad(i + 1)}</span>
                  <span className="flex justify-end">
                    {open ? <Sparkles size={14} className="text-mustard" aria-hidden /> : <Lock size={14} className="text-cream/25" aria-hidden />}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="how-h">
        <p className="eyebrow">Zasady</p>
        <h2 id="how-h" className="display mt-3 text-5xl sm:text-6xl">
          Jak to działa
        </h2>
        <ol className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((st, i) => (
            <li key={st.t} className="bg-ink p-6">
              <div className="flex items-center justify-between">
                <span className="display text-5xl text-mustard">{pad(i + 1)}</span>
                <st.icon size={22} className="text-cream/55" aria-hidden />
              </div>
              <h3 className="display mt-6 text-2xl">{st.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/60">{st.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-line py-20" aria-labelledby="cat-h">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow">24 wyzwania · 7 dyscyplin</p>
              <h2 id="cat-h" className="display mt-3 text-5xl sm:text-6xl">
                Co Cię
                <br />
                czeka
              </h2>
              <p className="mt-5 max-w-sm text-cream/60">
                Progresje, podbiegi, sweet spot na trenażerze, piramida w basenie, 300 metrów w górę, test 5 km na półmetku i wigilijny rozruch na mecie. Konkretnie, ale bez zajeżdżania się.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <li key={c} className="flex flex-col items-start gap-6 bg-ink p-4">
                  <ChallengeIcon name={CAT_ICON[c]} className="h-7 w-7 text-mustard" />
                  <span className="text-xs font-bold uppercase tracking-[0.12em]">{CATEGORY_LABEL[c]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              ["Dla wytrzymałościowców", "Biegasz, jeździsz, pływasz albo chodzisz po górach? Każdy dzień ma zamiennik dla Twojej dyscypliny i dwie wersje trudności."],
              ["Jeden kalendarz", "Wszyscy robią to samo tego samego dnia. Porównujecie wyniki, wrzucacie screeny i nikt nie mówi, że miał łatwiej."],
              ["Z głową", "Mocne akcenty w weekendy, regeneracja w tygodniu. Nie ćwicz przez ból i dopasuj dzień do swojego planu treningowego."],
            ].map(([t, x]) => (
              <div key={t} className="border-l-2 border-mustard pl-4">
                <h3 className="display text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/60">{x}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="border-t border-line bg-mustard py-20 text-ink" aria-labelledby="ig-h">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-ink/80">#theadventsplits</p>
            <h2 id="ig-h" className="display mt-3 text-5xl sm:text-7xl">
              Zrób z tego
              <br />
              wydarzenie
            </h2>
            <p className="mt-5 max-w-md text-lg text-ink/75">
              Codziennie gotowa grafika do relacji z Twoim wyzwaniem, wynikiem i nickiem. Oznacz <strong>@{props.instagram}</strong>, zaproś ekipę i patrz, jak wszyscy razem podejmują wątpliwe decyzje.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={shareLink}
                className="inline-flex min-h-14 items-center gap-2 bg-ink px-6 text-sm font-bold uppercase tracking-[0.12em] text-cream transition-transform active:scale-[0.97]"
              >
                <Share2 size={18} /> Wyślij zaproszenie
              </button>
              <button
                onClick={() => setInvite(true)}
                className="inline-flex min-h-14 items-center gap-2 border-2 border-ink px-6 text-sm font-bold uppercase tracking-[0.12em] transition-transform active:scale-[0.97]"
              >
                <Download size={18} /> Grafika do relacji
              </button>
            </div>
          </div>
          <div className="mx-auto w-56 rotate-2 border-4 border-ink shadow-[12px_12px_0_#191919] sm:w-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/share/invite" alt="Grafika zaproszenia do relacji" width={1080} height={1920} className="block h-auto w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20" aria-labelledby="faq-h">
        <h2 id="faq-h" className="display text-5xl">
          Pytania
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="display text-2xl text-mustard transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="pb-5 leading-relaxed text-cream/65">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start gap-3">{cta}</div>
      </section>

      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className="text-xs text-cream/55">
            Zrobione z przymrużeniem oka. Ćwiczysz na własną odpowiedzialność i w swoim tempie.{" "}
            <Link href="/prywatnosc" className="underline underline-offset-2 hover:text-cream">
              Prywatność
            </Link>
          </p>
          <a href={`https://instagram.com/${props.instagram}`} target="_blank" rel="noopener" className="text-xs font-bold uppercase tracking-[0.14em] text-mustard">
            @{props.instagram}
          </a>
        </div>
      </footer>

      <JoinSheet key={join ? "open" : "closed"} open={join} onClose={() => setJoin(false)} />
      <ShareSheet
        open={invite}
        onClose={() => setInvite(false)}
        imageUrl="/api/share/invite"
        fileName="advent-splits-zaproszenie.png"
        shareText="Dołączam do THE ADVENT SPLITS. 24 dni, 24 wyzwania, zero gwarancji godności. Wchodzisz?"
        title="Zaproś znajomych"
      />
    </div>
  );
}
