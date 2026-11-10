import Link from "next/link";
import { BarChart3, CalendarDays, UserRound } from "lucide-react";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "/kalendarz", label: "Kalendarz", icon: CalendarDays, key: "calendar" },
  { href: "/statystyki", label: "Statystyki", icon: BarChart3, key: "stats" },
  { href: "/profil", label: "Profil", icon: UserRound, key: "profile" },
] as const;

export function AppShell({ active, children }: { active: (typeof NAV)[number]["key"]; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="Strona główna" className="flex min-h-11 items-center">
            <Wordmark />
          </Link>
          <nav aria-label="Główna nawigacja" className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={active === n.key ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 px-3 text-xs font-bold uppercase tracking-[0.14em] ${
                  active === n.key ? "text-mustard" : "text-cream/60 hover:text-cream"
                }`}
              >
                <n.icon size={15} aria-hidden /> {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6 sm:pb-16">{children}</main>
      <nav aria-label="Nawigacja" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur sm:hidden">
        <ul className="grid grid-cols-3">
          {NAV.map((n) => (
            <li key={n.key}>
              <Link
                href={n.href}
                aria-current={active === n.key ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                  active === n.key ? "text-mustard" : "text-cream/55"
                }`}
              >
                <n.icon size={20} aria-hidden />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
