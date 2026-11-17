"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, RotateCcw, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { GenderPicker } from "@/components/GenderPicker";
import { ShareSheet } from "@/components/calendar/ShareSheet";
import { api } from "@/lib/client";
import type { ParticipantView } from "@/lib/types";

export function ProfileClient({ participant, completed }: { participant: ParticipantView; completed: number }) {
  const router = useRouter();
  const toast = useToast();
  const [nickname, setNickname] = useState(participant.nickname);
  const [gender, setGender] = useState(participant.gender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const dirty = nickname !== participant.nickname || gender !== participant.gender;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/me", { method: "PATCH", body: { nickname, gender } });
      toast("success", "Zapisano", "Zmiany już działają.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setBusy("reset");
    try {
      await api("/api/me/reset", { body: { confirm: "RESET" } });
      toast("info", "Postęp zresetowany", "Wyzwania zostały te same. Ukończenia i wyniki wyczyszczone.");
      setConfirmReset(false);
      router.refresh();
    } catch (err) {
      toast("error", "Nie udało się", (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      await api("/api/me", { method: "DELETE", body: { confirm: "USUŃ" } });
      toast("info", "Konto usunięte", "Wszystkie Twoje dane zostały skasowane. Trzymaj się!");
      window.location.assign("/");
    } catch (err) {
      toast("error", "Nie udało się", (err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="eyebrow">Ustawienia uczestnika</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">Profil</h1>

      <form onSubmit={save} className="mt-8 flex flex-col gap-6" noValidate>
        <div>
          <label htmlFor="nick" className="eyebrow">
            Nick
          </label>
          <input
            id="nick"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            className="mt-2 h-12 w-full border border-cream/20 bg-transparent px-3 text-lg font-semibold focus:border-mustard focus:outline-none"
          />
        </div>
        <GenderPicker value={gender} onChange={setGender} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={saving} disabled={!dirty} size="lg">
          Zapisz zmiany
        </Button>
      </form>

      <div className="mt-10 flex items-start gap-3 border border-line p-4">
        <Info className="mt-0.5 shrink-0 text-mustard" size={20} aria-hidden />
        <p className="text-sm leading-relaxed text-cream/75">
          Twój kalendarz jest przypisany do tej przeglądarki. Wracaj na tym samym telefonie i w tej samej aplikacji (jeśli kalendarz otwierasz z Instagrama, wracaj przez Instagram).
          Wyczyszczenie danych przeglądarki albo tryb prywatny odetnie dostęp do postępu.
        </p>
      </div>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="display text-3xl">Zaproś ekipę</h2>
        <p className="mt-2 text-sm text-cream/60">Wspólne cierpienie to połowa cierpienia. Pobierz grafikę zaproszenia do relacji.</p>
        <Button variant="outline" className="mt-4" onClick={() => setInvite(true)}>
          <Share2 size={16} /> Grafika zaproszenia
        </Button>
      </section>

      <section className="mt-12 flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="display text-3xl">Strefa zagrożenia</h2>
        <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={completed === 0}>
          <RotateCcw size={16} /> Resetuj postęp
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} /> Usuń moje konto
        </Button>
        <a href="/prywatnosc" className="mt-1 text-center text-xs text-cream/55 underline-offset-2 hover:text-cream hover:underline">
          Polityka prywatności
        </a>
      </section>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Usuń konto">
        <div className="p-6 sm:p-8">
          <h2 className="display text-4xl">Usunąć konto?</h2>
          <p className="mt-3 text-cream/70">
            Skasujemy na zawsze Twój nick, odkryte wyzwania, ukończenia i wyniki. Tego nie da się cofnąć ani odzyskać.
          </p>
          <label htmlFor="del" className="eyebrow mt-6 block">
            Wpisz USUŃ, żeby potwierdzić
          </label>
          <input
            id="del"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            autoComplete="off"
            className="mt-2 h-12 w-full border border-cream/20 bg-transparent px-3 text-lg font-bold uppercase focus:border-danger focus:outline-none"
          />
          <div className="mt-6 grid gap-2">
            <Button variant="danger" size="lg" onClick={deleteAccount} loading={busy === "delete"} disabled={deleteText.trim().toUpperCase() !== "USUŃ"}>
              Usuń na zawsze
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Zostaję
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} label="Potwierdź reset">
        <div className="p-6 sm:p-8">
          <h2 className="display text-4xl">Na pewno?</h2>
          <p className="mt-3 text-cream/70">
            Usuniemy ukończenia, wyniki i serie. Odkryte wyzwania zostaną takie same (reset nie losuje ich od nowa). Tego nie da się cofnąć.
          </p>
          <div className="mt-6 grid gap-2">
            <Button variant="danger" onClick={reset} loading={busy === "reset"} size="lg">
              Tak, resetuj
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Jednak nie
            </Button>
          </div>
        </div>
      </Sheet>

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
