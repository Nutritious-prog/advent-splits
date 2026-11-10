"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="eyebrow">Coś się wysypało</p>
      <h1 className="display mt-3 text-6xl">Skurcz serwera</h1>
      <p className="mt-4 text-cream/65">Nie Twoja wina. Daj nam chwilę na rozciąganie i spróbuj ponownie. Twój postęp jest bezpieczny.</p>
      <button onClick={reset} className="mt-8 inline-flex min-h-12 items-center justify-center bg-mustard px-6 text-sm font-bold uppercase tracking-[0.12em] text-ink">
        Spróbuj ponownie
      </button>
    </main>
  );
}
