"use client";
import { Check, ShieldCheck } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { EmailAuth, type AuthMode } from "@/components/EmailAuth";

/**
 * Shown to guests AFTER they complete a challenge (audit PROD-02): the reward moment
 * comes first, the request to secure progress second.
 */
export function SaveProgressSheet({
  open,
  completed,
  days,
  emailEnabled,
  onLater,
  onLinked,
}: {
  open: boolean;
  completed: number;
  days: number;
  emailEnabled: boolean;
  onLater: () => void;
  onLinked: (mode: AuthMode) => void;
}) {
  return (
    <Sheet open={open} onClose={onLater} label="Zabezpiecz postęp">
      <div className="p-5 pt-7 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center bg-mustard text-ink">
          <ShieldCheck size={24} aria-hidden />
        </div>
        <p className="eyebrow mt-5">
          Masz już {completed} / {days}
        </p>
        <h2 className="display mt-2 text-5xl">Nie zgub postępu</h2>
        <p className="mt-4 leading-relaxed text-cream/75">
          Żeby nie stracić swoich okienek, dodaj maila. <strong className="text-cream">Nic Ci nie wysyłamy, zero spamu.</strong> Potrzebujemy go tylko po to, żeby móc Cię
          zalogować. Na nowym urządzeniu zalogujesz się jednorazowym kodem z maila.
        </p>
        <ul className="mt-5 grid gap-2 text-sm">
          {["Bez hasła, tylko kod z maila", "Zero newsletterów i reklam", "Usuniesz konto jednym kliknięciem"].map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-cream/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-mustard/15 text-mustard">
                <Check size={13} strokeWidth={3} aria-hidden />
              </span>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {emailEnabled ? (
            <EmailAuth cta="Wyślij kod" onDone={onLinked} />
          ) : (
            <p className="border border-dashed border-mustard/40 p-4 text-sm text-cream/60">
              Podgląd: logowanie e-mailem nie jest jeszcze skonfigurowane (brak kluczy Supabase), więc tu pojawi się pole na maila i kod.
            </p>
          )}
        </div>

        <button onClick={onLater} className="mt-5 flex min-h-12 w-full items-center justify-center text-sm font-semibold text-cream/60 hover:text-cream">
          Może później
        </button>
        <p className="text-center text-xs text-cream/55">
          <a href="/prywatnosc" target="_blank" className="underline underline-offset-2 hover:text-cream/70">
            Jak dbamy o Twoje dane
          </a>
        </p>
      </div>
    </Sheet>
  );
}
