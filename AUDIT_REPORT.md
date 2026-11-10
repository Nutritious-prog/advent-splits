# AUDIT_REPORT — THE ADVENT SPLITS (dawniej THE UNSERIOUS ADVENT)

Data audytu: 9.11.2026 · Zakres: cały kod w repozytorium lokalnym, build produkcyjny uruchomiony lokalnie, serwer deweloperski z kontrolowanym zegarem. Brak dostępu do wdrożonej infrastruktury (Vercel, Supabase), do prawdziwych urządzeń mobilnych i do przeglądarki wbudowanej w Instagram.

> **Rozbieżność brief ↔ aplikacja (świadoma).** Brief audytu opisuje wcześniejszą wersję: „ok. 200 losowych wyzwań”, „wybór preferencji”, branding THE UNSERIOUS ADVENT. Na prośbę właściciela produkt zmieniono na **THE ADVENT SPLITS**: **24 stałe wyzwania** (ten sam kalendarz dla wszystkich, dzień N = wyzwanie N), kategorie wytrzymałościowe, brak wyboru poziomu i sprzętu (zastąpiony wersją łatwiejszą/trudniejszą oraz „zamiennikiem dyscypliny”). Audyt ocenia **aktualną** aplikację. Punkty briefu, które przestały obowiązywać, nie są raportowane jako defekty.

---

## Status napraw (aktualizacja 9.11.2026)

| ID | Status | Weryfikacja |
|---|---|---|
| SEC-01 | **Naprawione**: `next@15.5.29`, `react`/`react-dom@19.1.10` | `npm audit --omit=dev`: 0 critical (wcześniej 1). Smoke test pełnego przepływu na dev i buildzie produkcyjnym, brak błędów w konsoli. |
| DEP-01 (sharp) | **Złagodzone**: optymalizator obrazów wyłączony | `/_next/image` → 404 na buildzie produkcyjnym. |
| CFG-01 | **Naprawione**: `lib/env-check.ts` blokuje build i serwer w produkcji bez poprawnego `NEXT_PUBLIC_SITE_URL` | Build z `VERCEL_ENV=production` bez danych kończy się błędem z listą problemów. Z danymi: build OK, `og:image` i grafiki pokazują `adventsplits.pl`. 6 testów jednostkowych. |
| LEG-01 | **Naprawione technicznie**: placeholdery nie mogą trafić na produkcję; dopisano notę o sessionStorage | Strona `/prywatnosc` na buildzie produkcyjnym: 0 placeholderów. **Wymaga danych od właściciela** (nazwa/adres administratora, e-mail). |
| AUTH-01 | **Otwarte**: wymaga projektu Supabase i testu na telefonie | — |
| DATA-01 | **Naprawione**: wybór „Scal kalendarze” lub „Użyj tylko kalendarza z maila” zamiast cichego porzucenia | 3 testy scalania na prawdziwym Postgresie (PGlite + migracje), test tokenu (wygasanie, podpis). Podrobiony token → 400. Pełny przepływ OTP nadal zależy od AUTH-01. |
| SEC-02 / SEC-05 | **Naprawione**: limiter w Postgresie (`rate_limits`, klucze HMAC) dla logowania admina, OTP (per e-mail i IP), zakładania profilu | Testy: 5 prób → 6. blokada, klucze tylko jako hashe. Build prod: logowanie admina → 429 po 8 próbach. |
| SEC-03 | **Naprawione**: CSP, HSTS, Permissions-Policy, COOP (w produkcji) | `curl -I` na buildzie prod. Przejście przez landing, kalendarz, statystyki, profil, admin i okno udostępniania: 0 błędów w konsoli, podgląd grafiki się ładuje. |
| SEC-04 | **Naprawione**: tryb testowy poza developmentem wymaga flagi **i** sesji admina | 4 testy macierzy decyzji. Build prod: POST `/api/test-clock` → 403. |
| PERF-01 | **Naprawione**: hero bez `opacity: 0` (animacja CSS tylko na `transform`) | LCP 1584 ms → **96 ms** (ten sam pomiar: build prod, localhost, 375 px). Element LCP to teraz H1. CLS 0. |
| A11Y-01…05 | **Naprawione** | Na 320 px brak tekstu < 11 px i brak wychodzenia treści poza okienka. Etykiety DZIŚ/FINAŁ w `aria-label`. axe: 0 naruszeń na `/` i `/kalendarz` (dodatkowo naprawiono `aria-label` na ekranie ładowania i kontrast „/ 24”). |
| PROD-02 | **Naprawione**: prośba o e-mail dopiero po zamknięciu karty z pierwszym ukończeniem | Test w przeglądarce: otwarcie okienka bez przerwy; po ukończeniu i zamknięciu karty pojawia się „Masz już 1 / 24”. |
| CONT-01 / CONT-02 | **Naprawione**: dzień 12 → MEDIUM (300 m), nota o lodzie w teście 5 km, zamiennik 100 pięter, nowy tekst dnia 24 | Test: brak dwóch HARD dzień po dniu. `lint:copy` 0 problemów. |
| OPS-01 / LEG-02 | **Częściowo**: logi błędów w JSON, wymóg `SUPABASE_SERVICE_ROLE_KEY` przy logowaniu e-mailem, `npm run db:purge`, instrukcja kopii w README | Test purge na PGlite. Do zrobienia przez właściciela: alert w Vercelu, pierwsza kopia i test odtworzenia, przegląd prawny. |
| (nowe) DB-01 | **Naprawione**: na sterowniku produkcyjnym (`postgres`) seed oraz dodawanie/edycja wyzwań w panelu admina kończyły się błędem (podwójne kodowanie parametru jsonb; PGlite tego nie ujawniał) | Rzutowanie `$n::text::jsonb`. Pełny przepływ (dołączenie, otwarcia równoległe, ukończenie, udostępnianie, admin, scalanie, usunięcie) przetestowany na prawdziwym sterowniku `postgres`. Nowe narzędzia: `npm run verify:supabase`, flaga `--env <plik>` dla skryptów DB, `DB_POOL_MAX`. |
| (nowe) | **Naprawione**: 24.12 nagłówek pokazywał „KONIEC KALENDARZA” i okienko 24 nie było oznaczone jako dzisiejsze | Test w przeglądarce: 24.12 → „DZIŚ FINAŁ”. |

## A. Podsumowanie wykonawcze

Logika biznesowa kalendarza jest solidna i została **zweryfikowana testami**, nie tylko przeglądem kodu:

- serwer egzekwuje harmonogram Europe/Warsaw na granicach 30.11→1.12 i 23.12→24.12 oraz po wydarzeniu;
- nie da się otworzyć przyszłego okienka (także z podrobionym ciasteczkiem trybu testowego na buildzie produkcyjnym);
- 15 równoległych żądań daje dokładnie 1 przydział;
- ukończenie jest idempotentne, a klient nie może wybrać wyzwania ani znacznika czasu.

Autoryzacja jest poprawna: żaden endpoint nie przyjmuje identyfikatora uczestnika, a wszystkie endpointy administracyjne zwracają 401 bez ważnego ciasteczka. Bundle przeglądarki nie zawiera treści przyszłych wyzwań ani sekretów.

**Główny problem blokujący jest poza kodem aplikacji:** zainstalowany Next.js **15.5.4** ma opublikowaną krytyczną podatność **zdalnego wykonania kodu** w protokole React Server Components (GHSA-9qr9-h5gf-34mp), a aplikacja używa App Routera. Poprawka to aktualizacja do 15.5.29 (bez zmiany wersji głównej).

Pozostałe blokery startu to konfiguracja i treści prawne:

- placeholdery „[UZUPEŁNIJ]” na stronie prywatności;
- brak zabezpieczenia przed drukowaniem `localhost:3000` na grafikach, gdy nie ustawiono `NEXT_PUBLIC_SITE_URL`;
- logowanie e-mailem (jedyna droga odzyskania postępu między urządzeniami) nigdy nie zostało przetestowane end-to-end.

**Rekomendacja: CONDITIONAL GO** (szczegóły w sekcji H).

---

## B. Scorecard

| Kategoria | Ocena | Uzasadnienie |
|---|---|---|
| UI design | **7/10** | Spójna paleta, typografia Anton + Archivo, charakter editorial. Słabsze punkty: mikrotypografia na okienkach (8–9,6 px), mieszanka EN/PL w odznakach. |
| Mobile UX | **7/10** | Brak przepełnienia poziomego 320–1440 px (zmierzone). Rdzeń pętli jest krótki, ale wtrąca się w niego popup zapisu postępu. Brak testu na prawdziwym iOS i Androidzie oraz w przeglądarce Instagrama. |
| Animacje | **7/10** | Animacja otwarcia okienka, konfetti i medal są dopracowane. Hero zależy od JS (opóźnia LCP), a całe drzewo kalendarza renderuje się co sekundę. `prefers-reduced-motion` sprawdzone tylko w kodzie. |
| Dostępność | **7/10** | axe: 0 naruszeń na /kalendarz, /statystyki, /profil, /prywatnosc. Na stronie głównej: brak `<main>`, 1 błąd kontrastu. Bardzo małe teksty na okienkach. |
| Bezpieczeństwo | **4/10** | Logika aplikacji ok. 8/10, ale ocenę obniża krytyczne CVE frameworka. Brak CSP/HSTS, limity zapytań tylko w pamięci jednej instancji. |
| Trwałość danych | **8/10** | Transakcje, unikalne ograniczenia i idempotencja przetestowane. Minusy: logowanie e-mailem może po cichu porzucić postęp gościa, odzyskiwanie między urządzeniami nieprzetestowane. |
| Wydajność | **6/10** | Mierzone lokalnie, bez throttlingu: TTFB 41 ms, CLS 0, LCP 1584 ms, JS 174 KB. Brak pomiaru na realnej sieci mobilnej. |
| Niezawodność | **6/10** | Brak monitoringu błędów, kopie zapasowe zależą od planu Supabase (niezweryfikowane), limity zapytań nie działają między instancjami serverless. |
| Jakość wyzwań | **8/10** | 24 przemyślane jednostki z zamiennikami i notami bezpieczeństwa. Dwa ciężkie dni z rzędu (12–13) przy deklaracji „dość łatwe”. |
| Gotowość do startu | **4/10** | Blokery: CVE frameworka, strona prywatności, konfiguracja domeny na grafikach, nieprzetestowane odzyskiwanie konta. |

---

## C. Ustalenia

Legenda weryfikacji: **[POTWIERDZONE TESTEM]**, **[POTWIERDZONE W KODZIE]** (przegląd kodu, bez uruchomienia), **[RYZYKO NIEZWERYFIKOWANE]**.

### CRITICAL

#### SEC-01 · Next.js 15.5.4: zdalne wykonanie kodu (RSC) i inne podatności frameworka [POTWIERDZONE: npm audit]
- **Komponent:** zależności, `package.json:26` (`"next": "15.5.4"`).
- **Opis:** `npm audit --omit=dev` raportuje dla `next` poziom **critical**: „Next.js is vulnerable to RCE in React flight protocol” (GHSA-9qr9-h5gf-34mp). Do tego DoS w Server Components (high) i ujawnienie kodu źródłowego Server Actions (moderate). Aplikacja używa App Routera z komponentami serwerowymi, więc jest w zakresie podatności.
- **Dowód:** wynik `npm audit` z 9.11.2026: `next critical … fix: next@15.5.29 (isSemVerMajor: false)`.
- **Reprodukcja:** `npm audit --omit=dev`. Exploitu celowo nie uruchamiano.
- **Wpływ:** potencjalne przejęcie serwera bez uwierzytelnienia, a więc dostęp do `DATABASE_URL` i pełnej bazy uczestników.
- **Naprawa:** `next@15.5.29` (+ zgodne `react`/`react-dom` 19.1.x z poprawkami), rebuild, `npm audit --omit=dev` bez critical/high dla `next`.
- **Nakład:** 0,5–1 h z testami regresji.

### HIGH

#### LEG-01 · Strona prywatności z placeholderami w buildzie produkcyjnym [POTWIERDZONE TESTEM]
- **Komponent:** `app/prywatnosc/page.tsx:7-8`.
- **Opis:** bez `NEXT_PUBLIC_OPERATOR_NAME` i `NEXT_PUBLIC_CONTACT_EMAIL` strona pokazuje „[UZUPEŁNIJ: …]”.
- **Dowód:** na buildzie produkcyjnym (`next start`) tekst strony zawierał 3 wystąpienia „UZUPEŁNIJ”.
- **Wpływ:** brak administratora danych i kontaktu, czyli niekompletny obowiązek informacyjny RODO. Wygląda też nieprofesjonalnie.
- **Naprawa:** ustawić zmienne. Build powinien kończyć się błędem w produkcji, gdy są puste.
- **Nakład:** 15 min (+ dane od właściciela).

#### CFG-01 · Brak wymuszenia `NEXT_PUBLIC_SITE_URL`: `localhost:3000` na grafikach i w metadanych [POTWIERDZONE W KODZIE + obserwacja lokalna]
- **Komponent:** `lib/config.ts:13`, `lib/share-card.tsx` (`siteHost()`), `app/layout.tsx` (`metadataBase`).
- **Opis:** domyślna wartość to `http://localhost:3000`. W produkcji nic tego nie blokuje.
- **Dowód:** grafiki wygenerowane lokalnie drukują „localhost:3000”. Kod nie ma walidacji `isProd`.
- **Wpływ:** jedno przeoczenie w konfiguracji Vercela i każda udostępniona relacja reklamuje „localhost:3000”, a podglądy linków mają błędne adresy obrazów. To uderza w główny kanał wzrostu (Instagram).
- **Naprawa:** w `config.ts` rzucać błąd, gdy `isProd` i brak `NEXT_PUBLIC_SITE_URL` (albo gdy zawiera `localhost`).
- **Nakład:** 15 min.

#### AUTH-01 · Odzyskiwanie postępu między urządzeniami nigdy nie przetestowane end-to-end [RYZYKO NIEZWERYFIKOWANE]
- **Komponent:** `app/api/auth/email/start|verify`, `components/EmailAuth.tsx`, konfiguracja Supabase Auth.
- **Opis:** jedyną drogą powrotu do kalendarza na innym urządzeniu jest kod OTP z maila, a ten wymaga projektu Supabase, szablonu z `{{ .Token }}` i własnego SMTP. Lokalnie funkcja jest wyłączona. Bez konfiguracji UI ukrywa logowanie, więc gość nie ma żadnej drogi odzyskania. Typowy scenariusz z Instagrama (przeglądarka w aplikacji → „Otwórz w Safari”) kończy się wtedy nowym, pustym profilem.
- **Dowód:** brak `SUPABASE_URL`/`SUPABASE_ANON_KEY` w środowisku audytu. Ścieżki `email/start` i `verify` nie zostały wykonane ani razu.
- **Wpływ:** utrata postępu i frustracja w kluczowym scenariuszu mobilnym.
- **Naprawa:** skonfigurować Supabase Auth + SMTP i przejść scenariusz testowy (IG → Safari → kod → ten sam kalendarz). Opcjonalnie dodać jednorazowy „kod odzyskiwania” niezależny od maila.
- **Nakład:** 2–3 h konfiguracji i testów.

### MEDIUM

#### DATA-01 · Logowanie e-mailem po cichu porzuca bieżący postęp gościa [POTWIERDZONE W KODZIE]
- **Komponent:** `app/api/auth/email/verify/route.ts:26-30`.
- **Opis:** jeśli mail ma już profil A, a bieżące urządzenie ma profil-gościa B z postępem, kod niszczy sesję B i przełącza na A. Postęp B zostaje osierocony, bez ostrzeżenia i bez scalenia.
- **Reprodukcja (po konfiguracji Supabase):** urządzenie 1: dołącz, podepnij mail X. Urządzenie 2: dołącz jako nowy gość, ukończ okienko 3, w popupie podaj mail X i kod. Okienko 3 z urządzenia 2 znika.
- **Wpływ:** utrata danych użytkownika, który dołączył dwa razy (częste przy przeskakiwaniu IG ↔ Safari).
- **Naprawa:** przy `owner && current && owner≠current` zwrócić tryb `conflict`. UI pyta „Masz postęp na tym urządzeniu (N okienek). Scalić z kontem?”, a scalenie dla każdego dnia zachowuje wpis z ukończeniem i bierze nowszy wynik.
- **Nakład:** 3–4 h.

#### SEC-02 · Limity zapytań tylko w pamięci jednej instancji [POTWIERDZONE TESTEM lokalnie / RYZYKO na Vercelu]
- **Komponent:** `lib/ratelimit.ts:4` (Map w pamięci), użycia: `admin/login/route.ts:7`, `auth/email/*`, `participant/route.ts:13`, `doors/route`.
- **Dowód:** lokalnie limiter działa (logowanie admina: 7 × 401, potem 429). Na Vercelu każda instancja ma własną mapę, więc limit się rozmnaża.
- **Wpływ:** osłabiona ochrona przed brute-force hasła admina i kodów OTP oraz przed spamem zakładania profili.
- **Naprawa:** reguły Vercel Firewall (rate limit na `/api/admin/login`, `/api/auth/*`, `/api/participant`) albo licznik w Postgresie lub Upstash. Licznik prób OTP per e-mail trzymać w bazie.
- **Nakład:** 1–3 h.

#### SEC-03 · Brak nagłówków CSP, HSTS i Permissions-Policy [POTWIERDZONE TESTEM]
- **Komponent:** `next.config.ts:14-22`.
- **Dowód:** odpowiedź `/` w buildzie produkcyjnym zawiera tylko `X-Content-Type-Options`, `Referrer-Policy` i `X-Frame-Options: DENY`.
- **Wpływ:** brak warstwy obrony w głąb na wypadek przyszłej podatności XSS. HSTS może dodawać Vercel dla domeny (niezweryfikowane).
- **Naprawa:** CSP z `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'` (lub nonce), `frame-ancestors 'none'`, a do tego `Strict-Transport-Security` i `Permissions-Policy`.
- **Nakład:** 1–2 h z testem, że nic się nie psuje.

#### SEC-04 · `ENABLE_TEST_MODE=true` daje podróż w czasie każdemu odwiedzającemu [POTWIERDZONE W KODZIE]
- **Komponent:** `lib/test-clock.ts:18-19`, `app/api/test-clock/route.ts`.
- **Opis:** flaga przeznaczona na staging nie wymaga sesji admina. Ustawiona omyłkowo na produkcji (albo na stagingu podpiętym do produkcyjnej bazy) pozwala każdemu odkryć wszystkie 24 wyzwania przed czasem i manipulować seriami.
- **Dowód:** na buildzie produkcyjnym bez flagi tryb jest poprawnie wyłączony (POST `/api/test-clock` → 403, ciasteczko offsetu ignorowane). Ryzyko dotyczy tylko konfiguracji z flagą.
- **Naprawa:** poza `NODE_ENV=development` wymagać dodatkowo `isAdmin()` i nigdy nie łączyć stagingu z produkcyjną bazą.
- **Nakład:** 30 min.

#### SEC-05 · OTP: brak limitu prób na adres e-mail po stronie aplikacji [RYZYKO NIEZWERYFIKOWANE]
- **Komponent:** `app/api/auth/email/verify/route.ts:13` (limit tylko per IP, w pamięci).
- **Wpływ:** rozproszony brute-force 6-cyfrowego kodu jest ograniczany głównie przez limity Supabase Auth, których nie weryfikowano.
- **Naprawa:** licznik nieudanych weryfikacji per e-mail w bazie (np. 5 na kod, potem wymagane wysłanie nowego).
- **Nakład:** 1–2 h.

#### PERF-01 · LCP zależy od JavaScriptu (hero zaczyna od `opacity: 0`) [POTWIERDZONE POMIAREM]
- **Komponent:** `components/landing/Landing.tsx:113-114`.
- **Dowód:** build produkcyjny, localhost, viewport 375×812, bez throttlingu: TTFB 41 ms, DCL 69 ms, **LCP 1584 ms**, CLS 0, JS 174 KB transferu, 20 zapytań. Duży nagłówek jest niewidoczny do hydratacji i animacji.
- **Wpływ:** na telefonie z 4G w przeglądarce Instagrama LCP będzie wyraźnie wyższy (nie zmierzono).
- **Naprawa:** renderować H1 widoczny od razu (animować tylko `transform`, bez `opacity: 0` na starcie) albo zrobić wejście CSS-em bez czekania na hydratację.
- **Nakład:** 30 min.

#### PERF-02 · Pełny re-render kalendarza i strony głównej co sekundę [POTWIERDZONE W KODZIE]
- **Komponent:** `components/calendar/CalendarApp.tsx:67`, `components/landing/Landing.tsx:47`, `lib/client.ts:41-72`.
- **Opis:** `useServerClock` żyje w komponencie głównym, więc co sekundę renderuje się 24 okienek z Motion, karta wyzwania i arkusze. Ten wzorzec spowodował już wcześniej błąd utraty fokusu (naprawiony).
- **Wpływ:** zbędna praca CPU na słabszych telefonach i ryzyko podobnych błędów. Wpływu nie zmierzono.
- **Naprawa:** odliczanie w osobnym, małym komponencie z własnym zegarem. Rodzic odświeża stan tylko przy granicy odblokowania.
- **Nakład:** 1–2 h.

#### A11Y-01 · Teksty 8–9,6 px na okienkach [POTWIERDZONE POMIAREM]
- **Komponent:** `components/calendar/Door.tsx:82,87,96,103,107`.
- **Dowód:** na 375 px w kalendarzu 24 elementy mają 9,6 px (daty), a etykieta „FINAŁ” 8 px.
- **Naprawa:** minimum 11–12 px, ewentualnie ukryć datę na najwęższych ekranach (jest w `aria-label`).
- **Nakład:** 30 min.

#### A11Y-02 · Strona główna bez `<main>` i treść poza landmarkami [POTWIERDZONE: axe-core 4.10.3]
- **Komponent:** `components/landing/Landing.tsx` (sekcje nie są owinięte w `<main>`; `AppShell` ma `<main>`, ale landing go nie używa).
- **Dowód:** axe: `landmark-one-main` (1), `region` (6 węzłów).
- **Naprawa:** owinąć sekcje między `<header>` a `<footer>` w `<main>`.
- **Nakład:** 10 min.

#### A11Y-03 · Kontrast „#theadventsplits” na musztardowym tle 3,34:1 [POTWIERDZONE: axe]
- **Komponent:** `components/landing/Landing.tsx:282` (`text-ink/60` na `bg-mustard`, 12 px).
- **Naprawa:** `text-ink/80` lub pełne `text-ink`.
- **Nakład:** 5 min.

#### CONT-01 · Dwa ciężkie dni z rzędu (12 i 13) oraz test maksymalny w tygodniu 3 [POTWIERDZONE W TREŚCI]
- **Komponent:** `lib/challenges/calendar.ts:294-341` (dzień 12: 500 m przewyższenia, HARD; dzień 13: długie wybieganie 75–90 min, HARD), `:368-390` (dzień 15: test 5 km, HARD).
- **Opis:** stara logika losowania unikała HARD dzień po dniu. Stały kalendarz ma HARD w sobotę i niedzielę, a test maksymalny 2 dni później. Przy deklaracji „dość łatwe, ale bez przesady” to dla części odbiorców za dużo. Test 5 km nie ma ostrzeżenia o oblodzonej nawierzchni.
- **Naprawa:** dzień 12 jako MEDIUM (250 m bazowo, 500 m jako „trudniejsza”), w dniu 15 dodać notę o nawierzchni i rozważyć wersję „tempo, a nie max”.
- **Nakład:** 30 min (treść).

#### PROD-01 · Obietnica „porównujcie wyniki” bez żadnego mechanizmu porównania [POTWIERDZONE W KODZIE/TREŚCI]
- **Komponent:** landing (kroki, FAQ), brak widoku społecznościowego.
- **Wpływ:** rozczarowanie i słabszy dowód społeczny. Jedynym porównaniem są screeny w relacjach.
- **Naprawa (lekka):** anonimowy licznik „Dziś zaliczyło: 128 osób” na karcie dnia i w kalendarzu. Agregat jest już liczony w panelu admina.
- **Nakład:** 2–3 h.

#### PROD-02 · Popup „Nie zgub postępu” przerywa rdzeń pętli przed odsłonięciem [POTWIERDZONE W KODZIE]
- **Komponent:** `components/calendar/CalendarApp.tsx:129-130`.
- **Opis:** gość klika okienko i zanim zobaczy wyzwanie, dostaje formularz maila (raz na sesję przeglądarki). To najgorszy moment, bo przerywa „nagrodę”.
- **Naprawa:** pokazywać po pierwszym **ukończeniu** („Masz 1/24, zabezpiecz postęp”) albo jako nieblokujący baner.
- **Nakład:** 1 h.

#### OPS-01 · Brak monitoringu błędów i niezweryfikowane kopie zapasowe [POTWIERDZONE W KODZIE / RYZYKO]
- **Komponent:** `lib/api.ts:49` (tylko `console.error`), infrastruktura.
- **Wpływ:** błędy w grudniu nie będą widoczne bez zaglądania w logi Vercela. Darmowy plan Supabase może nie mieć kopii, które da się odtworzyć, a nieaktywny projekt jest wstrzymywany (niezweryfikowane dla konkretnego konta).
- **Naprawa:** Sentry (lub alerty w logach Vercela), cotygodniowy `pg_dump` w grudniu albo plan Pro na czas wydarzenia, test odtworzenia.
- **Nakład:** 2–3 h.

#### LEG-02 · Retencja i usuwanie danych [POTWIERDZONE W KODZIE; wymaga oceny prawnej]
- **Komponent:** `app/api/me/route.ts:43-51`, `/prywatnosc`.
- **Opis:**
  - bez `SUPABASE_SERVICE_ROLE_KEY` usunięcie konta zostawia adres e-mail w Supabase Auth (tylko ostrzeżenie w logach);
  - obietnica „usuniemy dane najpóźniej 12 miesięcy po 24.12” nie ma mechanizmu;
  - przetwarzanie przez Vercel (USA) wymaga oceny podstaw transferu;
  - polityka nie wymienia `sessionStorage` (klucz drzemki popupu, technicznie niezbędny).
- **Naprawa:** ustawić klucz service role, dodać skrypt lub cron czyszczenia danych po terminie, a polityce dać ocenę prawnika.
- **Nakład:** 2 h + konsultacja prawna.

#### DEP-01 · Pozostałe podatne zależności runtime [POTWIERDZONE: npm audit]
- `zod 3.25.76` (high, wyczerpanie pamięci przy walidacji dużych kolekcji). **Złagodzone:** `lib/api.ts` odcina ciała > 20 000 znaków, a schematy mają limity długości.
- `sharp` (high, libvips) i `postcss` (high): zależności przechodnie Next. Aplikacja nie używa `next/image`, a postcss działa tylko przy buildzie.
- **Naprawa:** ~~aktualizacja Next (SEC-01) usuwa sharp i postcss z raportu~~ **Korekta (9.11, po wdrożeniu T-01):** Next 15.5.29 nadal zawiera `postcss@8.4.31` i `sharp@0.34.5`, a ich naprawa wymaga Next 16 (zmiana wersji głównej). Ocena osiągalności: postcss działa tylko przy buildzie na własnym CSS projektu (nie przetwarza danych od użytkowników). sharp używa wyłącznie optymalizator obrazów Next, który został **wyłączony** (`images.unoptimized`, `/_next/image` → 404). Zod 4 to zmiana wersji głównej, więc po starcie. Ryzyko zaakceptowane do czasu migracji na Next 16 (po wydarzeniu).

### LOW

| ID | Komponent | Opis i dowód | Naprawa |
|---|---|---|---|
| SEC-06 | `lib/api.ts:17-18` | Żądania bez nagłówka `Origin` przechodzą kontrolę CSRF. Ochronę zapewnia głównie `SameSite=Lax`. | Odrzucać brak `Origin` przy metodach zmieniających stan (z wyjątkiem `Sec-Fetch-Site: same-origin`). |
| SEC-07 | `lib/session.ts:10,28`; `lib/admin.ts:9` | Sesja 400 dni bez odświeżania i rotacji. Token admina (12 h) jest bezstanowy i nie da się go unieważnić. | Dodać `last_seen_at` i krótsze okno nieaktywności. Unieważnianie admina przez wersję w sekrecie. |
| SEC-08 | `lib/doors.ts` (`parseInt`) | Luźne parsowanie dnia: `/api/doors/1e3/open` traktowane jak dzień 1 (test: 403 LOCKED). Nieeksploatowalne. | `^\d{1,2}$`. |
| SEC-09 | `/opengraph-image`, `/api/share/invite`, `/api/app-icon/*` | Publiczne, kosztowne obliczeniowo renderowanie PNG. Częściowo cache'owane nagłówkami. | Statyczne generowanie przy buildzie albo dłuższy cache CDN. |
| SEC-10 | `supabase/seed.sql`, `lib/challenges/calendar.ts` | Pełny kalendarz w repozytorium. Publiczne repo zdradza wszystkie wyzwania. | Repo prywatne. |
| ADM-01 | `lib/api.ts:50` | Ustawienie dwóm aktywnym wyzwaniom tego samego dnia daje „Coś poszło nie tak” (500). Test: PATCH d02 → dzień 1 dał 500, unikalność w bazie zachowana. | Mapować błąd 23505 na 409 „Ten dzień ma już aktywne wyzwanie”. |
| A11Y-04 | `components/AppShell.tsx:16` | Link „Strona główna” ma 152×18 px (zmierzone), poniżej rekomendacji 24 px (WCAG 2.5.8). | `min-h-11` lub `py-3`. |
| A11Y-05 | `Door.tsx` (zamknięte) | Numery zamkniętych okienek mają 25% kryjącości (zamierzone, informacja jest też w `aria-label`). Czytelność dla słabowidzących. | 35–40%. |
| UX-01 | `ChallengeCard` | „Podejmuję wyzwanie” to dodatkowy krok bez konsekwencji w produkcie. | Zostawić, ale wizualnie drugorzędnie, albo usunąć. |
| CONT-02 | `calendar.ts:313, 616` | Zamiennik dnia 12 („170 pięter”) jest bardzo ciężki. Żart w dniu 24 („tyle przysiadów, ile ma lat / 2”) może być nieodpowiedni dla seniorów. | Złagodzić. |
| COPY-01 | odznaki, statystyki | Mieszanka EN/PL (FIRST BLOOD, HALFWAY THERE), żargon „split” niejasny dla osób spoza biegania, długi opis kafla „Seria do dziś”. | Krótkie objaśnienie „split = jeden dzień wyzwania” na landingu, skrócić opis. |
| DATA-02 | `CalendarApp` | Dwie karty: druga pokazuje nieaktualny stan do odświeżenia. Akcje i tak zwracają świeży stan z serwera. | Odświeżać na `visibilitychange`. |
| DEP-02 | `vitest` / `tinypool` | Critical w zależnościach deweloperskich, bez wpływu na runtime. | Aktualizacja vitest. |

---

## D. Audyt wizualny

Zrzuty ekranu zostały wykonane w panelu przeglądarki podczas audytu, ale nie zapisano ich jako pliki. Poniższe opisy odnoszą się do tych obserwacji.

- **Kalendarz 320×700 (build produkcyjny, przed startem):** układ mieści się. Odliczanie 4 kafle, siatka 4×6, dolna nawigacja bez kolizji. Daty na zamkniętych okienkach (9,6 px) są na granicy czytelności.
- **Strona główna 1440×900:** kompozycja editorial poprawna, duży nagłówek, karta odliczania po prawej. Bez przepełnienia (scrollWidth 1425 przy oknie 1440).
- **Strona główna przy pierwszym wczytaniu:** nagłówek H1 pojawia się dopiero po hydratacji (PERF-01). axe uruchomiony w trakcie animacji raportował fałszywy kontrast 1,03:1 dla elementów w połowie fade-in, co potwierdza, że treść jest początkowo niewidoczna.
- **Mocne strony:** spójna paleta (czerń, krem, musztarda), brak generycznego „dashboardowego” wyglądu, medal z segmentami i karty do relacji 1080×1920 są wyraźnie dopracowane.
- **Słabsze strony:** bardzo drobna typografia na okienkach i etykiecie „FINAŁ”, mieszanie języków w odznakach, sekcja Instagram na musztardowym tle ma słabo kontrastowy hashtag.

---

## E. Ustalenia bezpieczeństwa: podsumowanie

**Zweryfikowane jako poprawne (testami):**

| Obszar | Wynik testu |
|---|---|
| Przyszłe okienka | Dzień 1 i 24 przed czasem → 403. Dzień 25 → 404. Podrobione ciasteczko `tua_test_offset` na buildzie prod → ignorowane (`unlocked: 0`). |
| Granice czasu (Europe/Warsaw) | 30.11 23:59:50 → 403, po północy (23:00 UTC) → 200. 23.12→24.12 analogicznie. Po wydarzeniu zaległe dni otwieralne. |
| Wyścigi | 15 równoległych `open` → 1 przydział, 0 błędów. |
| Re-roll | Ponowne otwarcie, reset postępu → to samo wyzwanie. |
| Manipulacja | Klient nie może wskazać `challengeId` ani `completed_at`. Ponowne ukończenie nie zmienia znacznika czasu. |
| IDOR | Żaden endpoint nie przyjmuje ID uczestnika. Share bez sesji → 401. |
| Admin | 4 endpointy admina: 401 bez ciasteczka i z podrobionym ciasteczkiem. Słabe hasło (< 10 znaków) odrzucane w produkcji. Limit prób działa w obrębie procesu. |
| CSRF | Obcy `Origin` → 403. |
| Mass assignment | PATCH `/api/me` z `is_demo`/`auth_user_id` → odrzucone lub zignorowane. |
| XSS | Wynik `<img src=x onerror=…>` zapisany jako tekst. Brak `dangerouslySetInnerHTML` w całym projekcie. React escapuje. |
| Ciasteczka | `HttpOnly; Secure; SameSite=Lax`, host-only. |
| Bundle | Brak treści wyzwań, sekretów i source map w `.next/static`. |

**Do naprawy:** SEC-01 (CRITICAL), SEC-02 do SEC-05 (MEDIUM), SEC-06 do SEC-10 (LOW).

**Niezweryfikowane:** polityki RLS na prawdziwej instancji Supabase (migracje przejrzane: RLS włączone bez polityk, `revoke` dla `anon`/`authenticated`), limity Supabase Auth, nagłówki dodawane przez Vercel, region bazy danych.

---

## F. Priorytetowy plan działań

**P0: przed startem (blokery)**
1. SEC-01: aktualizacja Next.js do 15.5.29.
2. LEG-01: uzupełnić dane na stronie prywatności i wymusić je w buildzie.
3. CFG-01: wymusić `NEXT_PUBLIC_SITE_URL` w produkcji.
4. AUTH-01: skonfigurować Supabase Auth + SMTP i przejść scenariusz IG → Safari.

**P1: ważne przed startem**
- DATA-01 (scalanie postępu przy logowaniu)
- SEC-02 (rate limit poza pamięcią lub Vercel Firewall)
- SEC-03 (CSP/HSTS)
- SEC-04 (test mode tylko dla admina)
- PERF-01 (LCP)
- A11Y-01/02/03
- CONT-01
- PROD-02 (popup po ukończeniu)
- OPS-01 (monitoring i kopie)
- LEG-02 (klucz service role i retencja)

**P2: po starcie**
- PERF-02
- SEC-05 to SEC-10
- ADM-01
- PROD-01 (licznik „dziś zaliczyło”)
- UX-01, CONT-02, COPY-01, DATA-02
- DEP-01 (zod 4), DEP-02

---

## G. Quick wins (10)

1. `npm i next@15.5.29` i rebuild (SEC-01).
2. Ustawić `NEXT_PUBLIC_OPERATOR_NAME` i `NEXT_PUBLIC_CONTACT_EMAIL` (LEG-01).
3. Guard w `config.ts` na `NEXT_PUBLIC_SITE_URL` (CFG-01).
4. `<main>` na stronie głównej (A11Y-02).
5. `text-ink/80` dla hashtagu (A11Y-03).
6. H1 bez `opacity: 0` na starcie (PERF-01).
7. Minimalny rozmiar 11 px na okienkach (A11Y-01).
8. Dzień 12 jako MEDIUM i nota o lodzie w teście 5 km (CONT-01).
9. `isAdmin()` w trybie testowym poza developmentem (SEC-04).
10. Reguły rate-limit w Vercel Firewall dla 3 endpointów (SEC-02).

---

## H. Rekomendacja startowa: **CONDITIONAL GO**

Rdzeń produktu (integralność kalendarza, autoryzacja, trwałość przydziałów) jest zweryfikowany testami i działa poprawnie. Start jest możliwy **po wykonaniu wszystkich punktów P0**:

- krytyczna podatność frameworka (SEC-01) to jedyna rzecz, która sama w sobie byłaby NO-GO, a jej naprawa to aktualizacja patch;
- LEG-01 i CFG-01 to konfiguracja;
- AUTH-01 wymaga przejścia scenariusza na prawdziwym telefonie z Instagramem.

Jeśli start nastąpi bez skonfigurowanego logowania e-mailem, aplikacja zadziała, ale użytkownicy zmieniający przeglądarkę stracą dostęp do postępu. Trzeba to wtedy jasno komunikować.

---

## I. Pokrycie weryfikacji

**Przetestowane naprawdę (z wynikami powyżej):**
- `npm audit` (prod i całość), `npm outdated`.
- Build produkcyjny (`next build`), rozmiary bundli, skan `.next/static` pod kątem treści, sekretów i source map.
- Na buildzie produkcyjnym: nagłówki HTTP, atrybuty ciasteczka, wyłączenie trybu testowego, odrzucenie słabego hasła admina, limiter logowania admina, 401 na endpointach admina, CSRF (obcy Origin), sfałszowana sesja, walidacja wejścia, mass assignment.
- Na serwerze deweloperskim z kontrolowanym zegarem: granice 30.11→1.12, 23.12→24.12, po wydarzeniu; 15 równoległych otwarć; idempotencja ukończenia; reset bez re-rolla; próba wskazania `challengeId` i czasu; zapis wyniku z HTML; duplikat dnia w panelu admina.
- axe-core 4.10.3 na `/`, `/kalendarz`, `/statystyki`, `/profil`, `/prywatnosc` (375 px, build produkcyjny).
- Przepełnienie poziome: 320 px (4 strony), 768 px i 1440 px (strona główna i kalendarz). Pomiar rozmiarów tekstu i celów dotyku na kalendarzu (375 px).
- Pomiar wydajności strony głównej (Performance API, localhost, bez throttlingu).
- Testy jednostkowe: 21 przechodzi (`npm test`), linter treści: 0 problemów, walidacja kalendarza: OK.
- Wcześniej w tej sesji, podczas developmentu (nie powtarzano w audycie): zamykanie modala Esc, fokus w polach formularza, animacja otwarcia, konfetti, finał 24.12, generowanie kart.

**Tylko przegląd kodu:** RLS i uprawnienia w migracjach; ścieżka logowania OTP i przełączania kont (DATA-01); re-render co sekundę (PERF-02); obsługa `prefers-reduced-motion`; pułapka fokusu (kod; Esc testowane wcześniej); zachowanie wielu kart; obsługa błędów sieci (timeout 20 s).

**Nie dało się zweryfikować:**
- prawdziwe iOS i Android, przeglądarka wbudowana w Instagram (trwałość ciasteczek, pobieranie plików, `navigator.share` z plikami), klawiatura ekranowa;
- Lighthouse i pomiary na sieci mobilnej (brak narzędzia i throttlingu w środowisku);
- infrastruktura Supabase i Vercel: RLS na żywej instancji, limity Auth, wysyłka maili, kopie zapasowe, region, nagłówki CDN;
- testy obciążeniowe (celowo pominięte);
- Playwright nie jest zainstalowany w projekcie. Testy przeglądarkowe wykonano narzędziami panelu przeglądarki i curl. Do CI warto dodać Playwright (zob. REMEDIATION_PLAN, zadanie T-15).
