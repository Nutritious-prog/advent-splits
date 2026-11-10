# Wdrożenie: domena nazwa.pl + Vercel + Supabase + maile z kodem

Robimy to w tej kolejności, bo każdy krok potrzebuje poprzedniego:

1. GitHub (kod) → 2. Supabase staging (baza + logowanie) → 3. Vercel (strona) → 4. domena z nazwa.pl → 5. test na telefonie → 6. Resend (maile z Twojej domeny) → 7. produkcja.

Docelowo:

| | Staging (testy) | Produkcja (uczestnicy) |
|---|---|---|
| Adres | `staging.adventsplits.pl` | `adventsplits.pl` (+ `www` przekierowuje) |
| Gałąź git | `staging` | `main` |
| Supabase | projekt `advent-staging` | projekt `advent-prod` |
| Tryb testowy | włączony (tylko admin) | wyłączony |
| Maile z kodem | wbudowany mailer Supabase (tylko na Twój adres) | Resend z `kod@adventsplits.pl` |

> **Nie wklejaj kluczy ani haseł do czatu.** Wpisujesz je tylko do lokalnych plików `.env.*.local` (są w `.gitignore`) i do ustawień Vercela. Ja odpalam skrypty, które je czytają, ale ich nie wypisują.
> Nazwy przycisków w panelach się zmieniają. Jeśli coś wygląda inaczej, szukaj po sensie.

---

## Krok 0. Domena: zanim klikniesz „zamów”

- **Nazwa musi być dokładnie `adventsplits.pl`.** Ten adres jest wydrukowany na każdej grafice do relacji, w filmie promo i w zmiennej `NEXT_PUBLIC_SITE_URL`. Inna nazwa oznacza nowy render filmu.
- **Sprawdź cenę odnowienia i wyłącz automatyczne odnowienie**, jeśli nie chcesz płacić po promocji. Darmowe 3 miesiące od połowy listopada wystarczą do połowy lutego, czyli na cały grudzień i trochę po nim.
- Po wygaśnięciu ktoś inny może kupić tę domenę, a linki z grafik będą wtedy prowadzić do niego. Przy jednorazowej akcji to akceptowalne ryzyko, ale warto o nim wiedzieć.
- **Nie zamawiaj hostingu ani poczty.** Potrzebna jest sama domena. Stroną zajmie się Vercel, a maile Resend.
- Zostaw domyślne serwery DNS nazwa.pl. Rekordy dodasz w ich panelu (Krok 4).

Domenę możesz kupić od razu, a podpiąć w Kroku 4.

## Krok 1. GitHub

Repozytorium lokalne jest już gotowe (gałęzie `main` i `staging`, pierwszy commit).

1. github.com → **New repository** → nazwa `advent-splits`, **Private**. Nie zaznaczaj README, .gitignore ani licencji, bo repo musi być puste.
2. Wypchnij kod (GitHub zapyta o logowanie w przeglądarce):
   ```bash
   git remote add origin https://github.com/<twój-login>/advent-splits.git
   ```
   ```bash
   git push -u origin main staging
   ```
   Albo podaj mi adres repo, a ja dodam remote. Push zrobisz Ty, bo wymaga Twojego logowania do GitHuba.

## Krok 2. Supabase: staging

1. supabase.com → **New project**: nazwa `advent-staging`, region **Central EU (Frankfurt)**, mocne hasło do bazy (zapisz w menedżerze haseł).
2. **Data API:** Project Settings → Data API → wyłącz (aplikacja go nie używa). Jeśli tej opcji nie ma, nic nie szkodzi, bo skrypt i tak sprawdzi blokady.
3. **Connection string:** przycisk **Connect** na górze:
   - *Transaction pooler* (port **6543**) → do Vercela;
   - *Session pooler* (port **5432**) → do migracji z komputera.
4. **Klucze:** Project Settings → API Keys → klucz publiczny (`anon` / *publishable*) i tajny (`service_role` / *secret*).
5. **Logowanie:** Authentication → Sign In / Providers → **Email** włączony, rejestracje dozwolone, **Confirm email** włączone. Długość kodu (OTP) **6 cyfr**, ważność 600 s.
6. **Adres strony:** Authentication → URL Configuration → *Site URL* = `https://staging.adventsplits.pl`. Logujemy się kodem, nie linkiem, ale Supabase używa tego adresu w mailach.
7. **Szablony maili:** Authentication → Email Templates. W szablonach **Magic Link** i **Confirm signup** ustaw:
   - temat: `Twój kod do THE ADVENT SPLITS`
   - treść:
     ```html
     <h2>Twój kod: {{ .Token }}</h2>
     <p>Wpisz go w THE ADVENT SPLITS. Kod wygasa po 10 minutach. Jeśli to nie Ty, zignoruj tę wiadomość.</p>
     ```
   Ważne, żeby w treści było `{{ .Token }}`, a nie `{{ .ConfirmationURL }}`.

> Wbudowany mailer Supabase wysyła maile **tylko na adresy członków Twojego zespołu w Supabase** i ma bardzo niski limit. Do testów na Twoim mailu wystarczy. Uczestnicy dostaną maile dopiero po Kroku 6.

### Plik `.env.staging.local`

W folderze projektu utwórz plik `.env.staging.local`:
```bash
DATABASE_URL=<Session pooler, port 5432>
SESSION_SECRET=<losowy ciąg, min. 32 znaki>
ADMIN_PASSWORD=<min. 12 znaków, inne niż do bazy>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<klucz publiczny>
SUPABASE_SERVICE_ROLE_KEY=<klucz tajny>
NEXT_PUBLIC_SITE_URL=https://staging.adventsplits.pl
NEXT_PUBLIC_INSTAGRAM_HANDLE=wlod_run
ENABLE_TEST_MODE=true
```
`SESSION_SECRET` wygenerujesz w PowerShellu:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Napisz „env stagingu gotowy”. Wtedy uruchomię migracje, wgranie 24 wyzwań i weryfikację, która wyśle jeden testowy kod na Twój mail.

## Krok 3. Vercel

1. vercel.com → zaloguj się przez GitHuba → **Add New → Project** → importuj `advent-splits`. Framework wykryje się sam (Next.js). Region **fra1** (Frankfurt) jest już ustawiony w `vercel.json`.
2. **Zanim klikniesz Deploy**, rozwiń *Environment Variables*. Na razie dodaj zmienne **tylko dla środowiska Preview** (staging), z wartościami z `.env.staging.local`, z jedną różnicą: `DATABASE_URL` to tu *Transaction pooler* (port **6543**).
3. Pierwszy deploy produkcji (`main`) się **nie uda**, bo nie ma jeszcze zmiennych Production. To celowe zabezpieczenie: aplikacja nie zbuduje się na produkcji bez kompletnej konfiguracji. Zignoruj ten błąd do Kroku 7.
4. Settings → **Deployment Protection** → *Vercel Authentication*: ustaw **Only Production Deployments** albo wyłącz. Inaczej staging będzie wymagał logowania do Vercela i przeglądarka w Instagramie go nie otworzy.
5. Wypchnij gałąź `staging` (Krok 1 już to zrobił) albo w zakładce Deployments kliknij **Redeploy** przy gałęzi `staging`. Staging będzie działać pod adresem `advent-splits-git-staging-<coś>.vercel.app`.

## Krok 4. Domena nazwa.pl → Vercel

### W Vercelu
Project → Settings → **Domains** → dodaj kolejno:
1. `adventsplits.pl` → zostaw przypisaną do **Production**.
2. `www.adventsplits.pl` → wybierz **Redirect to adventsplits.pl**.
3. `staging.adventsplits.pl` → przypisz do **Preview** i gałęzi **`staging`** (*Git Branch*).

Przy każdej domenie Vercel pokaże, jakie rekordy DNS dodać. **Przepisz wartości z panelu Vercela**, bo mogą się różnić od poniższych przykładów.

### W panelu nazwa.pl
Panel klienta → **Domeny** → `adventsplits.pl` → **Strefa DNS** / **Rekordy DNS** → dodaj:

| Typ | Nazwa (host) | Wartość | Po co |
|---|---|---|---|
| A | `@` (pusta / `adventsplits.pl`) | IP z panelu Vercela (np. `76.76.21.21`) | strona główna |
| CNAME | `www` | `cname.vercel-dns.com` (lub wartość z Vercela) | przekierowanie www |
| CNAME | `staging` | `cname.vercel-dns.com` (lub wartość z Vercela) | staging |

- Jeśli nazwa.pl ma już domyślne rekordy A lub CNAME dla `@` albo `www` (np. „strona w budowie”, parking), **usuń je**. Dwa rekordy A dla tej samej nazwy to najczęstsza przyczyna problemów.
- Rekordy działają zwykle po kilku minutach, czasem do kilku godzin. Vercel sam wystawi certyfikat HTTPS. W Domains zobaczysz „Valid Configuration”.

## Krok 5. Test na telefonie (staging)

Na iPhonie (i jeśli możesz, na Androidzie):
1. Wyślij sobie `https://staging.adventsplits.pl` w DM na Instagramie i otwórz go **w Instagramie**.
2. Dołącz z nickiem. W `/admin` (hasło stagingu) ustaw tryb testowy, np. dzień 5.
3. Otwórz okienko, ukończ je i zamknij kartę. Pojawi się prośba o maila: podaj **swój** mail i wpisz kod.
4. W Instagramie: „…” → **Otwórz w przeglądarce**. Na stronie: **Zaloguj** → mail → kod. Powinieneś zobaczyć ten sam kalendarz.
5. Scalanie: w trybie prywatnym Safari dołącz jako nowy gość, ukończ inne okienko, zaloguj się tym samym mailem → „Scal kalendarze”. Oba okienka powinny być w jednym kalendarzu.
6. Pobierz grafikę do relacji i spróbuj ją udostępnić.

Wyślij mi zrzuty tego, co nie działa.

## Krok 6. Resend: maile z kodem z Twojej domeny

1. resend.com → załóż konto → **Domains → Add Domain** → `adventsplits.pl`, region **eu-west-1 (Ireland)**.
2. Resend pokaże 3–4 rekordy. Dodaj je w nazwa.pl dokładnie tak, jak są podane:
   - **MX** dla `send` (wartość typu `feedback-smtp.eu-west-1.amazonses.com`, priorytet 10);
   - **TXT** dla `send` (SPF, `v=spf1 include:amazonses.com ~all`);
   - **TXT** dla `resend._domainkey` (DKIM, długi klucz);
   - zalecany **TXT** dla `_dmarc`: `v=DMARC1; p=none;`
   Nazwy hostów w nazwa.pl wpisuj bez końcówki `.adventsplits.pl`, jeśli panel dopisuje ją sam.
3. Poczekaj, aż Resend pokaże **Verified**.
4. **API Keys → Create** z uprawnieniem *Sending access* tylko dla tej domeny. Klucz zobaczysz tylko raz.
5. W Supabase (najpierw w **staging**, żeby przetestować): Authentication → **SMTP Settings** → *Enable custom SMTP*:
   - host `smtp.resend.com`, port `465`, użytkownik `resend`, hasło = klucz API Resend;
   - nadawca `kod@adventsplits.pl`, nazwa `THE ADVENT SPLITS`.
6. Authentication → **Rate Limits** → limit maili np. 100 na godzinę.

> **Limit darmowego Resend: 100 maili dziennie, 3000 miesięcznie.** Mail jest potrzebny tylko przy zapisaniu postępów lub logowaniu na innym urządzeniu, więc zwykle wystarczy. Jeśli 1 grudnia zapisze się więcej osób, plan Pro (ok. 20 USD/mies.) możesz włączyć jednym kliknięciem.

Skrzynki pocztowej na tej domenie nie potrzebujesz. Jako kontakt w polityce prywatności podaj swój zwykły mail.

## Krok 7. Produkcja

1. Drugi projekt Supabase **`advent-prod`**: powtórz Krok 2, ale:
   - *Site URL* = `https://adventsplits.pl`;
   - SMTP z Kroku 6 (ten sam klucz Resend albo osobny).
2. Plik `.env.production.local` jak `.env.staging.local`, ale:
   - **bez** `ENABLE_TEST_MODE`;
   - `NEXT_PUBLIC_SITE_URL=https://adventsplits.pl`;
   - nowe `SESSION_SECRET` i `ADMIN_PASSWORD` (inne niż na stagingu);
   - `NEXT_PUBLIC_OPERATOR_NAME=<imię i nazwisko lub nazwa działalności>`;
   - `NEXT_PUBLIC_CONTACT_EMAIL=<mail do kontaktu w sprawie danych>`.
3. Napisz „env produkcji gotowy”. Wtedy uruchomię migracje, seed i weryfikację w trybie produkcyjnym.
4. W Vercelu dodaj te same zmienne dla **Production**, z `DATABASE_URL` na porcie 6543. Potem Deployments → **Redeploy** gałęzi `main`.
5. Sprawdź `https://adventsplits.pl` na telefonie (Krok 5 bez trybu testowego: przed 1 grudnia zobaczysz odliczanie).
6. Przed 1 grudnia:
   - pierwsza kopia zapasowa bazy (README → Backups);
   - w Vercelu alert na błędy w logach.

---

## Co jest moje, a co Twoje

| Ty (konta, płatności, hasła) | Ja |
|---|---|
| zakup domeny, konta GitHub, Supabase, Vercel, Resend | repo git, `vercel.json`, poradnik |
| wpisanie kluczy do `.env.*.local` i do Vercela | migracje, seed, `verify:supabase` na obu bazach |
| rekordy DNS w nazwa.pl | sprawdzenie DNS i certyfikatu z zewnątrz |
| test na telefonie | poprawki tego, co wyjdzie w testach |
