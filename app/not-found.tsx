import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="eyebrow">Błąd 404</p>
      <h1 className="display mt-3 text-6xl">Zgubiona trasa</h1>
      <p className="mt-4 text-cream/65">Tej strony nie ma. Może to był GPS art, który poszedł nie tak.</p>
      <Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center bg-mustard px-6 text-sm font-bold uppercase tracking-[0.12em] text-ink">
        Wróć na start
      </Link>
    </main>
  );
}
