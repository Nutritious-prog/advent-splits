"use client";
import { GENDERS, GENDER_LABEL, type Gender } from "@/lib/gender";

export function GenderPicker({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  return (
    <fieldset>
      <legend className="eyebrow">Jak mamy się do Ciebie zwracać?</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {GENDERS.map((g) => {
          const on = value === g;
          return (
            <label
              key={g}
              className={`flex min-h-16 cursor-pointer flex-col items-center justify-center border px-1 py-2 text-center transition-colors ${
                on ? "border-mustard bg-mustard/10" : "border-line hover:border-cream/30"
              }`}
            >
              <input type="radio" name="gender" value={g} checked={on} onChange={() => onChange(g)} className="sr-only" />
              <span className="text-sm font-bold tracking-[0.08em]">{GENDER_LABEL[g].title}</span>
              <span className="mt-0.5 text-[0.7rem] text-cream/55">{GENDER_LABEL[g].example}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-cream/55">Tak napiszemy komunikaty i gotowe podpisy do Twoich relacji.</p>
    </fieldset>
  );
}
