"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client";

export type AuthMode = "linked" | "switched" | "created" | "already" | "merged";
type Counts = { opened: number; done: number };
type VerifyResponse = { mode: AuthMode } | { mode: "conflict"; device: Counts; account: Counts };

export function EmailAuth({
  cta = "Wyślij kod",
  onDone,
}: {
  cta?: string;
  onDone: (mode: AuthMode) => void;
}) {
  const [step, setStep] = useState<"email" | "code" | "conflict">("email");
  const [conflict, setConflict] = useState<{ device: Counts; account: Counts } | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/email/start", { body: { email } });
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<VerifyResponse>("/api/auth/email/verify", { body: { email, code } });
      if (r.mode === "conflict") {
        setConflict({ device: r.device, account: r.account });
        setStep("conflict");
      } else onDone(r.mode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resolve(action: "merge" | "switch") {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ mode: AuthMode }>("/api/auth/email/resolve", { body: { action } });
      onDone(r.mode);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (step === "conflict" && conflict) {
    return (
      <div className="flex flex-col gap-3 border border-mustard/50 bg-mustard/5 p-4" role="group" aria-labelledby="conflict-h">
        <p id="conflict-h" className="display text-2xl">
          Masz dwa kalendarze
        </p>
        <p className="text-sm leading-relaxed text-cream/80">
          Ten e-mail ma już kalendarz ({conflict.account.done} ukończonych). Na tym urządzeniu masz drugi ({conflict.device.done} ukończonych z{" "}
          {conflict.device.opened} odkrytych). Scalimy je w jeden: z obu zostaje to, co zrobione.
        </p>
        <Button onClick={() => resolve("merge")} loading={busy}>
          Scal kalendarze
        </Button>
        <button
          type="button"
          onClick={() => resolve("switch")}
          disabled={busy}
          className="min-h-11 text-xs text-cream/60 underline-offset-2 hover:text-cream hover:underline"
        >
          Użyj tylko kalendarza z maila (postęp z tego urządzenia zostanie usunięty)
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return step === "email" ? (
    <form onSubmit={start} className="flex flex-col gap-3" noValidate>
      <label htmlFor="email" className="eyebrow">
        Adres e-mail
      </label>
      <div className="flex gap-2">
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ty@example.com"
          className="h-12 min-w-0 flex-1 border border-cream/20 bg-transparent px-3 text-base placeholder:text-cream/30 focus:border-mustard focus:outline-none"
        />
        <Button type="submit" loading={busy} disabled={!email.includes("@")}>
          <Mail size={16} /> {cta}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-cream/55">Wyślemy 6-cyfrowy kod. Bez linków, bez haseł, bez newslettera.</p>
    </form>
  ) : (
    <form onSubmit={verify} className="flex flex-col gap-3" noValidate>
      <label htmlFor="otp" className="eyebrow">
        Kod z e-maila ({email})
      </label>
      <div className="flex gap-2">
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="display h-12 min-w-0 flex-1 border border-cream/20 bg-transparent px-3 text-2xl tracking-[0.3em] placeholder:text-cream/20 focus:border-mustard focus:outline-none"
        />
        <Button type="submit" loading={busy} disabled={code.length < 6}>
          Potwierdź
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="button" onClick={() => setStep("email")} className="self-start text-xs text-cream/55 hover:text-cream">
        Zmień adres / wyślij ponownie
      </button>
    </form>
  );
}
