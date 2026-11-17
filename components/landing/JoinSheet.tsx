"use client";
import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { GenderPicker } from "@/components/GenderPicker";
import type { Gender } from "@/lib/gender";

export function JoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender>("N");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) return setError("Nick musi mieć co najmniej 2 znaki.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/participant", { body: { nickname, gender } });
      toast("success", "Witaj w grze", "Twój grudzień właśnie stał się bardziej aktywny.");
      // Full navigation: the client router may still cache the old "no profile" redirect.
      window.location.assign("/kalendarz");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Dołącz do wyzwania">
      <div className="p-5 pt-7 sm:p-8">
        <form onSubmit={join} noValidate>
          <p className="eyebrow">Krok 1 z 1. Serio.</p>
          <h2 className="display mt-2 text-5xl">Dołącz do wyzwania</h2>
          <p className="mt-3 text-cream/65">Potrzebujemy tylko nicka. Bez hasła, bez maila, bez zobowiązań (poza 24 wyzwaniami).</p>

          <label htmlFor="join-nick" className="eyebrow mt-7 block">
            Twój nick
          </label>
          <input
            id="join-nick"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            autoCapitalize="none"
            placeholder="np. kanapowy_ultras"
            aria-invalid={!!error}
            className="mt-2 h-14 w-full border border-cream/25 bg-transparent px-4 text-lg font-semibold placeholder:font-normal placeholder:text-cream/30 focus:border-mustard focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-cream/55">Będzie widoczny na Twoich grafikach do relacji.</p>

          <div className="mt-7">
            <GenderPicker value={gender} onChange={setGender} />
          </div>

          <div className="mt-6 flex gap-3 border border-line p-3 text-xs leading-relaxed text-cream/60">
            <Info size={16} className="mt-0.5 shrink-0 text-mustard" aria-hidden />
            <p>
              Postęp zapisujemy w bazie, a ta przeglądarka trzyma do niego klucz. Wracaj więc zawsze na tym samym telefonie i w tej samej przeglądarce. Wyczyszczenie danych
              przeglądarki albo tryb prywatny odetnie dostęp.{" "}
              <a href="/prywatnosc" target="_blank" className="underline underline-offset-2">
                Prywatność
              </a>
            </p>
          </div>

          {error && (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={busy} className="mt-6 w-full">
              Wchodzę <ArrowRight size={18} />
            </Button>
          </form>
      </div>
    </Sheet>
  );
}
