"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatResult, resultLabel, resultPlaceholder, RESULT_MAX } from "@/lib/results";
import type { Challenge } from "@/lib/types";

export function ResultForm({
  challenge,
  current,
  onSave,
}: {
  challenge: Challenge;
  current: string | null | undefined;
  onSave: (value: string, free: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(!current);
  const [free, setFree] = useState(challenge.resultType === "NOTE");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const type = free ? "NOTE" : challenge.resultType;
  const numeric = !free && ["REPS", "COUNT"].includes(challenge.resultType);
  const decimal = !free && ["DISTANCE", "WEIGHT"].includes(challenge.resultType);

  if (!editing && current) {
    return (
      <div className="flex items-center justify-between gap-3 border border-mustard/40 bg-mustard/5 p-4">
        <div>
          <p className="eyebrow">Twój wynik</p>
          <p className="display mt-1 text-3xl text-mustard">{current}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Edytuj wynik">
          <Pencil size={14} /> Edytuj
        </Button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = formatResult(challenge.resultType, challenge.resultUnit, value, free);
    if (!f.ok) return setError(f.error);
    setError(null);
    setSaving(true);
    try {
      await onSave(value, free);
      setEditing(false);
      setValue("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-line p-4" noValidate>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="result" className="eyebrow">
          {resultLabel(type)} <span className="normal-case tracking-normal text-cream/55">(opcjonalnie)</span>
        </label>
        {challenge.resultType !== "NOTE" && (
          <button type="button" onClick={() => setFree((f) => !f)} className="text-xs text-cream/55 underline-offset-2 hover:text-cream hover:underline">
            {free ? "Wpisz liczbowo" : "Wpisz po swojemu"}
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <input
            id="result"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={RESULT_MAX}
            inputMode={numeric || (type === "TIME" && ["s", "min"].includes(challenge.resultUnit)) ? "numeric" : decimal ? "decimal" : "text"}
            placeholder={resultPlaceholder(type, challenge.resultUnit)}
            aria-invalid={!!error}
            aria-describedby={error ? "result-err" : undefined}
            className="h-12 w-full border border-cream/20 bg-transparent px-3 text-base text-cream placeholder:text-cream/30 focus:border-mustard focus:outline-none"
          />
          {!free && challenge.resultUnit && type !== "TIME" && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cream/55">{challenge.resultUnit}</span>
          )}
        </div>
        <Button type="submit" loading={saving} size="md" className="shrink-0">
          Zapisz
        </Button>
      </div>
      {error && (
        <p id="result-err" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {current && (
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-xs text-cream/55 hover:text-cream">
          Anuluj
        </button>
      )}
    </form>
  );
}
