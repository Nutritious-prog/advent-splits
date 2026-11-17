# Wdrożenie: Vercel + baza Supabase + domena z nazwa.pl

Wersja 1 działa **bez logowania**: uczestnik podaje tylko nick, a kalendarz jest przypisany do przeglądarki. Potrzebujemy więc trzech rzeczy, wszystkich za darmo:

| Co | Gdzie | Plan |
|---|---|---|
| Strona (hosting) | Vercel | Hobby (darmowy, do projektów niekomercyjnych) |
| Baza danych | Supabase, projekt `advent-staging` (już założony, Londyn) | Free |
| Domena | nazwa.pl, `adventsplits.pl` | promocja 3 miesiące |

Jedno środowisko, bez osobnego stagingu: przed 1 grudnia wszystkie okienka i tak są zamknięte, więc testujesz na docelowej stronie.

> **Nie wklejaj kluczy ani haseł do czatu.** Wpisujesz je tylko do pliku `.env.production.local` (jest w `.gitignore`) i do ustawień Vercela.

---

## Krok 1. Baza w Supabase

Projekt `advent-staging` już istnieje i będzie naszą bazą produkcyjną. Nazwa nie ma znaczenia dla uczestników. Możesz ją zmienić w Project Settings → General.

1. **Data API:** Project Settings → Data API → wyłącz (aplikacja go nie używa). Jeśli tej opcji nie ma, pomiń ten punkt.
2. **Connection string:** zielony przycisk **Connect** na górze:
   - *Session pooler* (port **5432**) → do pliku lokalnego (migracje z Twojego komputera);
   - *Transaction pooler* (port **6543**) → do Vercela.
   W obu wpisz hasło do bazy w miejsce `[YOUR-PASSWORD]`. Jeśli go nie pamiętasz: Project Settings → Database → *Reset database password*.
3. Ustawień **Authentication** nie ruszamy, bo nie są potrzebne.

### Plik `.env.production.local`

W folderze `C:\Users\artur\advent-splits` utwórz plik `.env.production.local`. W Notatniku przy zapisie wybierz „Wszystkie pliki”, żeby nie dopisał `.txt`.
```bash
DATABASE_URL=<Session pooler, port 5432, z hasłem>
SESSION_SECRET=<wynik polecenia poniżej>
ADMIN_PASSWORD=<min. 12 znaków, inne niż do bazy>
NEXT_PUBLIC_SITE_URL=https://adventsplits.pl
NEXT_PUBLIC_INSTAGRAM_HANDLE=wlod_run
NEXT_PUBLIC_OPERATOR_NAME=<imię i nazwisko (administrator danych w polityce prywatności)>
NEXT_PUBLIC_CONTACT_EMAIL=<mail do kontaktu w sprawie danych, np. Twój Gmail>
```
`SESSION_SECRET` wygeneruj w terminalu:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Napisz „env gotowy”. Wtedy:
- założę tabele w bazie;
- wgram 24 wyzwania;
- sprawdzę, że publiczne API Supabase nie ma dostępu do danych.

Klucze nie pojawią się w czacie.

## Krok 2. Vercel

1. vercel.com → zaloguj się przez GitHuba → **Add New → Project** → importuj `advent-splits`. Framework wykryje się sam (Next.js). Region funkcji (Londyn, obok bazy) jest już ustawiony w `vercel.json`.
2. Rozwiń **Environment Variables** i dodaj te same zmienne co w pliku `.env.production.local`. Różnica jest jedna: `DATABASE_URL` to tutaj *Transaction pooler* (port **6543**).
3. **Deploy.** Po chwili strona działa pod adresem `advent-splits-<coś>.vercel.app`.
4. Nie ustawiaj `ENABLE_TEST_MODE`. Na produkcji tryb testowy jest wyłączony.

## Krok 3. Domena nazwa.pl → Vercel

### Przed zamówieniem
- Nazwa musi być dokładnie **`adventsplits.pl`**. Ten adres jest na grafikach do relacji i w filmie.
- Sprawdź **cenę odnowienia** i wyłącz automatyczne odnowienie, jeśli nie chcesz płacić po promocji. Trzy miesiące od połowy listopada wystarczą do połowy lutego.
- **Nie zamawiaj hostingu ani poczty**, wystarczy sama domena.
- Zostaw domyślne serwery DNS nazwa.pl.

### W Vercelu
Project → Settings → **Domains** → dodaj:
1. `adventsplits.pl` (Production);
2. `www.adventsplits.pl` → **Redirect to adventsplits.pl**.

Vercel pokaże, jakie rekordy DNS dodać. Przepisz wartości **z panelu Vercela**, bo mogą się różnić od przykładów poniżej.

### W panelu nazwa.pl
Panel klienta → **Domeny** → `adventsplits.pl` → **Strefa DNS** / **Rekordy DNS**:

| Typ | Nazwa (host) | Wartość |
|---|---|---|
| A | `@` (pusta / `adventsplits.pl`) | IP z Vercela (np. `76.76.21.21`) |
| CNAME | `www` | `cname.vercel-dns.com` (lub wartość z Vercela) |

- **Usuń** domyślne rekordy A i CNAME dla `@` i `www`, jeśli nazwa.pl je dodał (np. parking, „strona w budowie”). Dwa rekordy A naraz to najczęstsza przyczyna problemów.
- Zmiany działają zwykle po kilku minutach, czasem do kilku godzin. Vercel sam wystawi certyfikat HTTPS. W Domains zobaczysz wtedy „Valid Configuration”.
- Napisz mi, gdy dodasz rekordy, a sprawdzę z zewnątrz DNS i certyfikat.

## Krok 4. Test na telefonie

1. Wyślij sobie `https://adventsplits.pl` w DM na Instagramie i otwórz go **w Instagramie**.
2. Dołącz z nickiem. Przed 1 grudnia zobaczysz kalendarz z zamkniętymi okienkami i odliczanie.
3. Zamknij przeglądarkę Instagrama, otwórz link jeszcze raz i sprawdź, czy nadal jesteś zalogowany jako ten sam nick.
4. Pobierz grafikę zaproszenia (Profil → Grafika zaproszenia).
5. W `/admin` (Twoje `ADMIN_PASSWORD`) → Demo możesz przeklikać, jak wygląda każdy dzień, bez ruszania prawdziwych danych.
6. Na koniec w Profilu → **Usuń moje konto**, żeby Twój testowy profil nie wisiał w statystykach.

## Krok 5. Przed 1 grudnia

- **Kopia bazy:** Supabase → Database → Backups. W planie Free kopie robią się automatycznie, ale nie da się ich pobrać. Jeśli chcesz mieć własną, poproś mnie, a zrobię ją przez `pg_dump`.
- **Alert na błędy:** Vercel → Logs → filtr `level":"error` → możesz ustawić powiadomienie.
- **Uśpienie bazy:** darmowy projekt Supabase usypia się po tygodniu bez ruchu. Od połowy listopada wejścia z rolki go nie dopuszczą, ale jeśli strona długo stoi pusta, zajrzyj do panelu Supabase i kliknij *Restore*.
- **Link w bio** na Instagramie zmień na `adventsplits.pl`.

---

## Co jest moje, a co Twoje

| Ty (konta, płatności, hasła) | Ja |
|---|---|
| zakup domeny, konto Vercel | `vercel.json`, poradnik, kod |
| wpisanie kluczy do `.env.production.local` i do Vercela | tabele, wyzwania i weryfikacja bazy |
| rekordy DNS w nazwa.pl | sprawdzenie DNS i HTTPS z zewnątrz |
| test na telefonie | poprawki tego, co wyjdzie w testach |
