"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";
import { api } from "@/lib/client";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/login", { body: { password } });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <Wordmark />
      <h1 className="display mt-8 text-5xl">Panel admina</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="pw" className="eyebrow">
          Hasło
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 border border-cream/20 bg-transparent px-3 focus:border-mustard focus:outline-none"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={busy} size="lg">
          <Lock size={16} /> Wejdź
        </Button>
      </form>
    </main>
  );
}
