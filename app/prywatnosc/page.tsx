import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { config } from "@/lib/config";

export const metadata = { title: "Prywatność — THE ADVENT SPLITS" };

const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_NAME || "[UZUPEŁNIJ: imię i nazwisko / nazwa firmy, adres]";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "[UZUPEŁNIJ: e-mail kontaktowy]";

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="display text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-cream/75">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4">
        <Link href="/" aria-label="Strona główna">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <p className="eyebrow">Krótko i po ludzku</p>
        <h1 className="display mt-2 text-6xl">Prywatność</h1>
        <p className="mt-5 text-lg text-cream/75">
          Zbieramy tylko to, co jest potrzebne, żeby kalendarz działał. Bez reklam, bez analityki śledzącej, bez sprzedawania danych, bez newslettera.
        </p>

        <S title="Kto odpowiada za dane">
          <p>
            Administratorem danych jest {OPERATOR}, twórca projektu THE ADVENT SPLITS (@{config.instagram}). Kontakt w sprawie danych: {CONTACT}.
          </p>
        </S>

        <S title="Co zbieramy">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-cream">Nick</strong>, który wybierasz. Widać go na Twoich grafikach do relacji.
            </li>
            <li>
              <strong className="text-cream">Postęp w kalendarzu:</strong> odkryte wyzwania, ukończenia z datą, wpisane przez Ciebie wyniki i preferencje (poziom, sprzęt).
            </li>
            <li>
              <strong className="text-cream">Adres e-mail</strong>, tylko jeśli go dodasz. Służy wyłącznie do logowania kodem na innym urządzeniu. Jedyne maile, jakie dostaniesz,
              to kody logowania. Adres jest przechowywany w module logowania (Supabase Auth), a nie w danych kalendarza.
            </li>
          </ul>
          <p>Nie zbieramy haseł, imienia i nazwiska, numeru telefonu, lokalizacji ani zdjęć. Grafiki do relacji generują się w locie i nie są zapisywane.</p>
        </S>

        <S title="Po co i na jakiej podstawie">
          <p>
            Żeby świadczyć usługę, o którą prosisz: prowadzić Twój kalendarz, zapamiętać postęp i umożliwić logowanie (art. 6 ust. 1 lit. b RODO). Zanonimizowane statystyki zbiorcze
            (np. ile osób ukończyło dany dzień) pomagają nam ulepszać wyzwania i nie pozwalają nikogo zidentyfikować (art. 6 ust. 1 lit. f RODO).
          </p>
        </S>

        <S title="Ciasteczka">
          <p>
            Używamy wyłącznie niezbędnych ciasteczek: jednego, które pamięta, że to Ty (sesja), oraz technicznych dla panelu organizatora. Żadnych ciasteczek reklamowych ani
            analitycznych, dlatego nie pokazujemy banera zgód.
          </p>
          <p>
            Dodatkowo przeglądarka zapamiętuje na czas jednej wizyty (sessionStorage), że odłożyłeś lub odłożyłaś przypomnienie o zapisaniu postępu, żeby nie pokazywać go
            ponownie. Ta informacja nie opuszcza Twojego urządzenia.
          </p>
        </S>

        <S title="Komu powierzamy dane">
          <p>
            Dane są przechowywane u dostawców infrastruktury, którzy przetwarzają je wyłącznie na nasze zlecenie: Supabase (baza danych i logowanie, serwery w UE), Vercel (hosting
            strony) oraz dostawca wysyłki maili z kodami. Nie przekazujemy danych nikomu w celach marketingowych.
          </p>
        </S>

        <S title="Jak długo">
          <p>
            Do czasu usunięcia konta przez Ciebie. Po zakończeniu projektu kalendarz zostaje dostępny przez jakiś czas na nadrabianie, a potem usuniemy wszystkie dane, nie później niż
            12 miesięcy po 24 grudnia.
          </p>
        </S>

        <S title="Twoje prawa">
          <p>
            Możesz w każdej chwili poprawić nick, a w profilu jednym przyciskiem <strong className="text-cream">usunąć konto ze wszystkimi danymi</strong>. Masz też prawo dostępu do
            danych, ich przeniesienia, ograniczenia przetwarzania i sprzeciwu. Napisz na {CONTACT}. Przysługuje Ci również skarga do Prezesa Urzędu Ochrony Danych Osobowych.
          </p>
        </S>

        <S title="Zdrowie i bezpieczeństwo">
          <p>
            Wyzwania to zabawa, a nie porada medyczna ani plan treningowy. Ćwiczysz na własną odpowiedzialność i w swoim tempie. Ból to sygnał, żeby przerwać.
          </p>
        </S>

        <Link href="/" className="mt-12 inline-flex min-h-12 items-center bg-mustard px-6 text-sm font-bold uppercase tracking-[0.12em] text-ink">
          Wróć do kalendarza
        </Link>
      </main>
    </div>
  );
}
