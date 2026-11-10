"use client";
import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { api } from "@/lib/client";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, GEAR_LABEL } from "@/lib/labels";
import { CATEGORIES, DIFFICULTIES, GEAR_LEVELS, RESULT_TYPES, type Challenge } from "@/lib/types";
import { ICON_NAMES } from "@/lib/icon-names";

type Row = Challenge & { assigned: number; completed: number };

const EMPTY: Challenge = {
  id: "",
  category: "RUNNING",
  title: "",
  teaser: "",
  description: "",
  steps: [""],
  tips: "",
  difficulty: "EASY",
  minutes: 30,
  equipment: [],
  gear: "NONE",
  icon: "activity",
  easier: "",
  harder: "",
  safety: "",
  caption: "",
  resultType: "NOTE",
  resultUnit: "",
  day: null,
  swap: "",
  active: true,
};

export function AdminChallenges() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [diff, setDiff] = useState("");
  const [act, setAct] = useState("");
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = () => api<Row[]>("/api/admin/challenges").then(setRows).catch((e) => toast("error", "Błąd", e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return [...rows].sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || Number(b.active) - Number(a.active)).filter(
      (r) =>
        (!s || r.title.toLowerCase().includes(s) || r.id.includes(s) || r.teaser.toLowerCase().includes(s)) &&
        (!cat || r.category === cat) &&
        (!diff || r.difficulty === diff) &&
        (!act || (act === "on" ? r.active : !r.active)),
    );
  }, [rows, q, cat, diff, act]);

  async function toggle(r: Row) {
    setRows((xs) => xs!.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    try {
      await api(`/api/admin/challenges/${r.id}`, { method: "PATCH", body: { active: !r.active } });
    } catch (e) {
      toast("error", "Nie zapisano", (e as Error).message);
      load();
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const r = await api<{ inserted: number }>("/api/admin/challenges", { body: { action: "seed" } });
      toast("success", "Seed wykonany", `Dodano ${r.inserted} brakujących wyzwań. Istniejące bez zmian.`);
      load();
    } catch (e) {
      toast("error", "Błąd", (e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  const sel = "h-11 border border-cream/20 bg-ink px-2 text-sm focus:border-mustard focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-4xl">Pula wyzwań</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={seed} loading={seeding}>
            <DatabaseZap size={14} /> Uzupełnij z seedu
          </Button>
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={14} /> Dodaj
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Szukaj</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/55" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po tytule lub ID" className={`${sel} w-full pl-9`} />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={sel} aria-label="Kategoria">
          <option value="">Wszystkie kategorie</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select value={diff} onChange={(e) => setDiff(e.target.value)} className={sel} aria-label="Trudność">
          <option value="">Każda trudność</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
        <select value={act} onChange={(e) => setAct(e.target.value)} className={sel} aria-label="Status">
          <option value="">Aktywne i wyłączone</option>
          <option value="on">Tylko aktywne</option>
          <option value="off">Tylko wyłączone</option>
        </select>
      </div>

      {!rows ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-cream/55">
            {filtered.length} z {rows.length} · każdy dzień kalendarza dostaje swoje aktywne wyzwanie (numer dnia przed tytułem). Wyłączone nie są przydzielane, ale już odkryte zostają u uczestników.
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {filtered.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 py-2.5 ${r.active ? "" : "opacity-45"}`}>
                <ChallengeIcon name={r.icon} className="h-5 w-5 shrink-0 text-mustard" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {r.day ? <span className="mr-2 text-mustard">{String(r.day).padStart(2, "0")}</span> : null}
                    {r.title}
                  </p>
                  <p className="truncate text-xs text-cream/55">
                    {CATEGORY_LABEL[r.category]} · {DIFFICULTY_LABEL[r.difficulty]} · {r.minutes} min · {GEAR_LABEL[r.gear]} · przydzielone {r.assigned}× · ukończone {r.completed}×
                  </p>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={r.active} onChange={() => toggle(r)} className="h-4 w-4 accent-[#D6A441]" />
                  <span className="hidden sm:inline">Aktywne</span>
                </label>
                <button onClick={() => setEditing(r)} aria-label={`Edytuj ${r.title}`} className="flex h-11 w-11 items-center justify-center text-cream/60 hover:text-cream">
                  <Pencil size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} label="Edycja wyzwania" wide>
        {editing && (
          <ChallengeForm
            key={editing.id || "new"}
            initial={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function ChallengeForm({ initial, onSaved }: { initial: Challenge; onSaved: () => void }) {
  const toast = useToast();
  const [c, setC] = useState<Challenge>(initial);
  const [steps, setSteps] = useState(initial.steps.join("\n"));
  const [equipment, setEquipment] = useState(initial.equipment.join("\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Challenge>(k: K, v: Challenge[K]) => setC((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = {
      ...c,
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
      equipment: equipment.split("\n").map((s) => s.trim()).filter(Boolean),
      minutes: Number(c.minutes),
      day: c.day ? Number(c.day) : null,
    };
    try {
      if (initial.id) await api(`/api/admin/challenges/${initial.id}`, { method: "PATCH", body });
      else await api("/api/admin/challenges", { body });
      toast("success", "Zapisano", c.title);
      onSaved();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inp = "w-full border border-cream/20 bg-ink px-3 py-2.5 text-sm focus:border-mustard focus:outline-none";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-4 p-5 pt-7 sm:p-8">
      <p className="eyebrow">{initial.id || "Nowe wyzwanie"}</p>
      <h2 className="display text-3xl">{initial.id ? "Edytuj wyzwanie" : "Dodaj wyzwanie"}</h2>
      {F({ label: "Tytuł", children: <input className={inp} value={c.title} onChange={(e) => set("title", e.target.value)} maxLength={80} required /> })}
      {F({ label: "Teaser", children: <input className={inp} value={c.teaser} onChange={(e) => set("teaser", e.target.value)} maxLength={200} /> })}
      {F({ label: "Opis", children: <textarea className={inp} rows={3} value={c.description} onChange={(e) => set("description", e.target.value)} /> })}
      {F({ label: "Kroki (jeden na linię)", children: <textarea className={inp} rows={5} value={steps} onChange={(e) => setSteps(e.target.value)} /> })}
      <div className="grid gap-4 sm:grid-cols-3">
        {F({
          label: "Kategoria",
          children: (
            <select className={inp} value={c.category} onChange={(e) => set("category", e.target.value as Challenge["category"])}>
              {CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {CATEGORY_LABEL[x]}
                </option>
              ))}
            </select>
          ),
        })}
        {F({
          label: "Trudność",
          children: (
            <select className={inp} value={c.difficulty} onChange={(e) => set("difficulty", e.target.value as Challenge["difficulty"])}>
              {DIFFICULTIES.map((x) => (
                <option key={x} value={x}>
                  {DIFFICULTY_LABEL[x]}
                </option>
              ))}
            </select>
          ),
        })}
        {F({ label: "Czas (min)", children: <input type="number" min={1} max={600} className={inp} value={c.minutes} onChange={(e) => set("minutes", Number(e.target.value))} /> })}
        {F({
          label: "Sprzęt (poziom)",
          children: (
            <select className={inp} value={c.gear} onChange={(e) => set("gear", e.target.value as Challenge["gear"])}>
              {GEAR_LEVELS.map((x) => (
                <option key={x} value={x}>
                  {GEAR_LABEL[x]}
                </option>
              ))}
            </select>
          ),
        })}
        {F({
          label: "Ikona",
          children: (
            <select className={inp} value={c.icon} onChange={(e) => set("icon", e.target.value)}>
              {ICON_NAMES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          ),
        })}
        {F({
          label: "Typ wyniku",
          children: (
            <select className={inp} value={c.resultType} onChange={(e) => set("resultType", e.target.value as Challenge["resultType"])}>
              {RESULT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          ),
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        {F({
          label: "Dzień w kalendarzu",
          children: (
            <input
              type="number"
              min={1}
              max={31}
              className={inp}
              value={c.day ?? ""}
              placeholder="brak"
              onChange={(e) => set("day", e.target.value ? Number(e.target.value) : null)}
            />
          ),
        })}
        {F({ label: "Zamiennik dla innej dyscypliny", children: <textarea className={inp} rows={2} value={c.swap} onChange={(e) => set("swap", e.target.value)} /> })}
      </div>
      <p className="-mt-2 text-xs text-cream/55">Jedno aktywne wyzwanie na dzień. Teksty mogą zawierać formy [męska|żeńska], np. [Przebiegłem|Przebiegłam].</p>
      {F({ label: "Jednostka wyniku (np. km, s, powt., min:s)", children: <input className={inp} value={c.resultUnit} onChange={(e) => set("resultUnit", e.target.value)} maxLength={40} /> })}
      {F({ label: "Potrzebny sprzęt (jeden na linię)", children: <textarea className={inp} rows={2} value={equipment} onChange={(e) => setEquipment(e.target.value)} /> })}
      {F({ label: "Protip", children: <textarea className={inp} rows={2} value={c.tips} onChange={(e) => set("tips", e.target.value)} /> })}
      <div className="grid gap-4 sm:grid-cols-2">
        {F({ label: "Wersja łatwiejsza", children: <textarea className={inp} rows={3} value={c.easier} onChange={(e) => set("easier", e.target.value)} /> })}
        {F({ label: "Wersja trudniejsza", children: <textarea className={inp} rows={3} value={c.harder} onChange={(e) => set("harder", e.target.value)} /> })}
      </div>
      {F({ label: "Bezpieczeństwo", children: <textarea className={inp} rows={2} value={c.safety} onChange={(e) => set("safety", e.target.value)} /> })}
      {F({ label: "Podpis do social media", children: <input className={inp} value={c.caption} onChange={(e) => set("caption", e.target.value)} maxLength={300} /> })}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={c.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#D6A441]" /> Aktywne (przydzielane w swoim dniu)
      </label>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" size="lg" loading={busy}>
        Zapisz
      </Button>
    </form>
  );
}
