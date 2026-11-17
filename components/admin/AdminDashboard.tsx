"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client";
import { CATEGORY_LABEL } from "@/lib/labels";
import { AdminChallenges } from "./AdminChallenges";
import { AdminDemo } from "./AdminDemo";
import type { Category } from "@/lib/types";

interface Stats {
  serverNow: string;
  unlocked: number;
  days: number;
  totals: { participants: number; revealed: number; completed: number; results: number };
  completionRate: number;
  daily: { date: string; active: number }[];
  signups: { date: string; n: number }[];
  perDay: { day: number; revealed: number; completed: number }[];
  top: { id: string; title: string; category: Category; assigned: number; completed: number }[];
  pool: { active: number; total: number };
}

const TABS = [
  ["stats", "Statystyki"],
  ["challenges", "Wyzwania"],
  ["demo", "Demo / podgląd"],
] as const;

export function AdminDashboard(props: { startAt: string; endAt: string; serverNow: string; days: number; tz: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("stats");

  async function logout() {
    await api("/api/admin/login", { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="bg-mustard px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.16em] text-ink">ADMIN</span>
          </div>
          <button onClick={logout} className="flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-cream/60 hover:text-cream">
            <LogOut size={14} /> Wyloguj
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-xs font-bold uppercase tracking-[0.12em] ${tab === k ? "border-mustard text-mustard" : "border-transparent text-cream/55"}`}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "stats" && <StatsTab />}
        {tab === "challenges" && <AdminChallenges />}
        {tab === "demo" && <AdminDemo {...props} />}
      </main>
    </div>
  );
}

function StatsTab() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    api<Stats>("/api/admin/stats")
      .then((x) => {
        setS(x);
        setErr(null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (err) return <p className="text-danger">{err}</p>;
  if (!s)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
    );

  const maxDaily = Math.max(1, ...s.daily.map((d) => d.active));
  const tiles = [
    ["Uczestnicy", s.totals.participants],
    ["Odkryte okienka", s.totals.revealed],
    ["Ukończone", s.totals.completed],
    ["Wskaźnik ukończeń", `${Math.round(s.completionRate * 100)}%`],
    ["Zapisane wyniki", s.totals.results],
    ["Dzień kalendarza", `${s.unlocked} / ${s.days}`],
    ["Pula wyzwań", `${s.pool.active} / ${s.pool.total}`],
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Statystyki</h1>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw size={14} /> Odśwież
        </Button>
      </div>
      <p className="-mt-6 text-sm text-cream/55">Wyłącznie zanonimizowane agregaty. Uczestnik demo jest wykluczony.</p>
      <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {tiles.map(([l, v]) => (
          <div key={l} className="bg-ink p-4">
            <p className="display text-4xl">{v}</p>
            <p className="eyebrow mt-1">{l}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="display text-2xl">Aktywni dziennie</h2>
        <p className="text-xs text-cream/55">Unikalni uczestnicy, którzy danego dnia otworzyli lub ukończyli wyzwanie (czas polski).</p>
        {s.daily.length === 0 ? (
          <p className="mt-4 text-sm text-cream/55">Brak aktywności. Cisza przed burzą.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-1.5">
            {s.daily.map((d) => (
              <li key={d.date} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="tabular text-cream/60">{d.date}</span>
                <span className="h-3 bg-cream/5">
                  <span className="block h-full bg-mustard" style={{ width: `${(d.active / maxDaily) * 100}%` }} />
                </span>
                <span className="tabular text-right">{d.active}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="display text-2xl">Ukończenia per okienko</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="eyebrow">
              <tr>
                <th className="py-2">Dzień</th>
                <th>Odkryte</th>
                <th>Ukończone</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.perDay.map((r) => (
                <tr key={r.day}>
                  <td className="py-2 font-semibold">{String(r.day).padStart(2, "0")}</td>
                  <td>{r.revealed}</td>
                  <td>{r.completed}</td>
                  <td>{r.revealed ? Math.round((r.completed / r.revealed) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {s.perDay.length === 0 && <p className="mt-2 text-sm text-cream/55">Brak danych.</p>}
        </div>
      </section>

      <section>
        <h2 className="display text-2xl">Najczęściej przydzielane</h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {s.top.map((t, i) => (
            <li key={t.id} className="flex items-center gap-4 py-2.5 text-sm">
              <span className="display w-6 text-mustard">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.title}</span>
                <span className="text-xs text-cream/55">{CATEGORY_LABEL[t.category]}</span>
              </span>
              <span className="tabular text-cream/70">{t.assigned}×</span>
              <span className="tabular w-12 text-right">{t.assigned ? Math.round((t.completed / t.assigned) * 100) : 0}%</span>
            </li>
          ))}
          {s.top.length === 0 && <li className="py-3 text-sm text-cream/55">Brak danych.</li>}
        </ol>
      </section>

      <section>
        <h2 className="display text-2xl">Nowi uczestnicy</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {s.signups.map((d) => (
            <li key={d.date} className="border border-line px-2.5 py-1">
              <span className="text-cream/55">{d.date}</span> <strong>{d.n}</strong>
            </li>
          ))}
          {s.signups.length === 0 && <li className="text-cream/55">Brak zapisów.</li>}
        </ul>
      </section>
    </div>
  );
}
