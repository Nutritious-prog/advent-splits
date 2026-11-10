export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-20" aria-busy="true">
      <h1 className="sr-only">Ładowanie kalendarza…</h1>
      <div role="status" className="sr-only">
        Ładowanie kalendarza
      </div>
      <div aria-hidden>
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-12 w-56" />
        <div className="skeleton mt-6 h-2 w-full" />
        <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5]" />
          ))}
        </div>
      </div>
    </main>
  );
}
