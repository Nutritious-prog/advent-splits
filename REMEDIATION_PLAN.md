# REMEDIATION_PLAN — THE ADVENT SPLITS

Plan naprawczy do AUDIT_REPORT.md.

**Status (9.11.2026):** P0: T-01 ✅, T-02 ✅ technicznie (brakuje danych od właściciela), T-03 ✅, T-04 ⏳ (Supabase + telefon). P1: T-05 ✅, T-06 ✅, T-07 ✅, T-08 ✅, T-09 ✅, T-10 ✅, T-11 ✅, T-12 ✅, T-13 ✅ w części kodowej (alert, kopia i przegląd prawny po stronie właściciela), T-14 ⏳ (infrastruktura). P2: nie rozpoczęte.
Kolejność: P0 → P1 → P2. Każde zadanie kończy się zielonym `npm test`, `npm run typecheck` i `npm run build`.

---

## P0: przed startem

### T-01 · Aktualizacja Next.js (SEC-01, DEP-01 częściowo) ✅ ZROBIONE
- **Wynik:** `next@15.5.29`, `react`/`react-dom@19.1.10`, `images.unoptimized: true`. Audit runtime: 0 critical, pozostałe high (postcss, sharp, zod) wymagają zmian wersji głównych i są nieosiągalne lub złagodzone (zob. AUDIT_REPORT, korekta DEP-01).
- **Problem:** krytyczne RCE w Next 15.5.4 (GHSA-9qr9-h5gf-34mp), do tego DoS i ujawnienie kodu.
- **Rozwiązanie:** `next@15.5.29`, `react`/`react-dom` do najnowszego patcha 19.1.x, `npm audit --omit=dev`.
- **Pliki:** `package.json`, `package-lock.json`.
- **Kryteria akceptacji:** `npm audit --omit=dev` nie zgłasza critical/high dla `next`, `sharp` ani `postcss`. Build przechodzi.
- **Regresja:** pełny przegląd ręczny: landing, dołączenie, otwarcie okienka (tryb testowy), ukończenie, wynik, grafika do relacji, panel admina, OG image.
- **Zależności:** brak. Wykonać jako pierwsze.

### T-02 · Strona prywatności bez placeholderów (LEG-01) ✅ ZROBIONE (technicznie)
- **Wynik:** guard w `lib/env-check.ts` (wspólny z T-03), nota o sessionStorage na `/prywatnosc`. **Do zrobienia przez właściciela:** ustawić `NEXT_PUBLIC_OPERATOR_NAME` i `NEXT_PUBLIC_CONTACT_EMAIL` w Vercelu.
- **Problem:** „[UZUPEŁNIJ]” widoczne w produkcji.
- **Rozwiązanie:** ustawić `NEXT_PUBLIC_OPERATOR_NAME` i `NEXT_PUBLIC_CONTACT_EMAIL`. W `app/prywatnosc/page.tsx` w produkcji brak zmiennych przerywa build lub render. Dopisać `sessionStorage` (klucz drzemki popupu) do sekcji o przechowywaniu danych.
- **Pliki:** `app/prywatnosc/page.tsx`, `lib/config.ts`, `.env.example`.
- **Kryteria:** w buildzie produkcyjnym tekst strony nie zawiera „UZUPEŁNIJ”. Bez zmiennych build kończy się czytelnym błędem.
- **Regresja:** test jednostkowy walidacji konfiguracji (T-03).
- **Zależności:** dane od właściciela.

### T-03 · Wymuszenie `NEXT_PUBLIC_SITE_URL` (CFG-01) ✅ ZROBIONE
- **Wynik:** `lib/env-check.ts`, wywołanie w `next.config.ts` (build) i `lib/config.ts` (runtime), `tests/env-check.test.ts` (6 testów).
- **Problem:** domyślne `http://localhost:3000` trafia na grafiki i do metadanych.
- **Rozwiązanie:** w `lib/config.ts`: gdy `isProd` i URL pusty lub zawiera `localhost`, rzuć błąd. Wspólna funkcja `assertProductionConfig()` także dla T-02.
- **Pliki:** `lib/config.ts`, `tests/config.test.ts` (nowy).
- **Kryteria:** build produkcyjny bez zmiennej się nie udaje. Z ustawioną domeną grafiki pokazują poprawny host.
- **Regresja:** test jednostkowy z różnymi wartościami env.
- **Zależności:** brak.

### T-04 · Logowanie e-mailem end-to-end (AUTH-01)
- **Problem:** jedyna droga odzyskania postępu nie była nigdy uruchomiona.
- **Rozwiązanie (konfiguracja):** projekt Supabase (UE), szablon „Magic Link” z `{{ .Token }}`, własny SMTP (np. Resend), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Pliki:** brak zmian w kodzie (chyba że test wykaże błąd).
- **Kryteria:** na prawdziwym iPhonie: dołączenie w przeglądarce Instagrama → podpięcie maila → „Otwórz w Safari” → „Zaloguj” → kod → ten sam kalendarz z tymi samymi okienkami. To samo na Androidzie.
- **Regresja:** checklista ręczna zapisana w README. Opcjonalnie test Playwright z mockiem Supabase (T-15).
- **Zależności:** T-01. Środowisko staging (T-14).

---

## P1: ważne przed startem

### T-05 · Konflikt kont przy logowaniu: scalanie zamiast porzucania (DATA-01) ✅ ZROBIONE
- **Wynik:** `lib/merge.ts`, `/api/auth/email/resolve`, ekran wyboru w `EmailAuth`, `tests/merge.test.ts`. Pełny test end-to-end po T-04.
- **Problem:** `verify/route.ts:26-30` po cichu przełącza na istniejący profil i porzuca postęp gościa.
- **Rozwiązanie:** gdy `owner && current && owner≠current` i bieżący profil ma przydziały, zwrócić `{mode: "conflict", currentProgress, ownerProgress}`. UI pyta: „Scal” albo „Przejdź bez scalania”. Scalanie w transakcji: dla każdego dnia zachować wpis z `completed_at` (przy obu wcześniejszy `completed_at`, nowszy wynik), potem usunąć profil-gościa.
- **Pliki:** `app/api/auth/email/verify/route.ts`, nowy `lib/merge.ts`, `components/EmailAuth.tsx`, `components/calendar/SaveProgressSheet.tsx`, `app/profil/ProfileClient.tsx`.
- **Kryteria:** w scenariuszu z audytu żadne ukończone okienko nie znika. Bez zgody użytkownika nic się nie usuwa.
- **Regresja:** testy jednostkowe `merge.ts` (rozłączne dni, ten sam dzień w obu, wyniki). Test integracyjny na PGlite.
- **Zależności:** T-04.

### T-06 · Rate limiting działający między instancjami (SEC-02, SEC-05) ✅ ZROBIONE
- **Wynik:** migracja `0005_rate_limits.sql`, `lib/db-ratelimit.ts`, `sharedLimit()` na loginie admina, OTP start/verify i `/api/participant`. Reguły Vercel Firewall opisane w README (opcjonalna dodatkowa warstwa).
- **Problem:** limity w pamięci procesu.
- **Rozwiązanie:** (a) reguły Vercel Firewall dla `/api/admin/login`, `/api/auth/email/*`, `/api/participant`; (b) tabela `auth_attempts(email_hash, window_start, count)` dla weryfikacji OTP (np. maks. 5 nieudanych prób na adres na 15 min).
- **Pliki:** nowa migracja `0005_auth_attempts.sql`, `app/api/auth/email/verify/route.ts`, `lib/ratelimit.ts`, README (reguły firewalla).
- **Kryteria:** szósta błędna weryfikacja dla tego samego maila zwraca 429 niezależnie od IP i instancji.
- **Regresja:** test na PGlite symulujący 6 prób z różnych IP.
- **Zależności:** T-04.

### T-07 · Nagłówki bezpieczeństwa (SEC-03) ✅ ZROBIONE
- **Wynik:** CSP bez `upgrade-insecure-requests` (HSTS pokrywa to na domenie). Nonce dla skryptów: po starcie.
- **Problem:** brak CSP, HSTS i Permissions-Policy.
- **Rozwiązanie:** w `next.config.ts`: `Content-Security-Policy` (`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`), `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Docelowo nonce zamiast `'unsafe-inline'` dla skryptów.
- **Pliki:** `next.config.ts`.
- **Kryteria:** `curl -I /` pokazuje nagłówki. Konsola bez błędów CSP na wszystkich stronach, łącznie z udostępnianiem i pobieraniem grafik.
- **Regresja:** ręczny przegląd wszystkich ścieżek + test Playwright sprawdzający brak `securitypolicyviolation` (T-15).
- **Zależności:** T-01.

### T-08 · Tryb testowy tylko dla admina poza developmentem (SEC-04) ✅ ZROBIONE
- **Problem:** `ENABLE_TEST_MODE=true` udostępnia podróż w czasie wszystkim.
- **Rozwiązanie:** `testModeAllowed(isAdmin)`: development → true; inaczej `ENABLE_TEST_MODE === "true" && isAdmin()`. `TestToggle` renderowany tylko wtedy.
- **Pliki:** `lib/test-clock.ts`, `app/layout.tsx`, `app/api/test-clock/route.ts`.
- **Kryteria:** na buildzie produkcyjnym z flagą: anonim → 403 i ciasteczko ignorowane, admin → działa.
- **Regresja:** test jednostkowy macierzy (dev/prod × flaga × admin).
- **Zależności:** brak.

### T-09 · LCP: hero widoczny bez czekania na JS (PERF-01) ✅ ZROBIONE (LCP 1584 → 96 ms lokalnie)
- **Problem:** H1 startuje z `opacity: 0` (`Landing.tsx:113-114`), LCP 1584 ms lokalnie.
- **Rozwiązanie:** animacja wejścia tylko na `transform` (bez `opacity: 0`) albo animacja CSS (`@keyframes`) niezależna od hydratacji.
- **Pliki:** `components/landing/Landing.tsx`, `app/globals.css`.
- **Kryteria:** LCP na buildzie produkcyjnym lokalnie < 500 ms przy tych samych warunkach co w audycie. Lighthouse mobile (gdy dostępny) LCP < 2,5 s.
- **Regresja:** pomiar Performance API (skrypt z audytu) zapisany w README.
- **Zależności:** brak.

### T-10 · Dostępność: tekst, landmarki, kontrast, cele dotyku (A11Y-01 do A11Y-05) ✅ ZROBIONE
- **Wynik:** DZIŚ i FINAŁ przeniesione do dolnego wiersza i kropki (11 px nie mieści się obok numeru na 320 px), tytuł na otwartym okienku tylko od 640 px.
- **Rozwiązanie:**
  - `Door.tsx`: minimum 11 px (daty, etykiety DZIŚ i FINAŁ, tytuł), na < 360 px ukryć datę (jest w `aria-label`), numery zamkniętych okienek 40%;
  - `Landing.tsx`: `<main>` wokół sekcji, hashtag `text-ink/80`;
  - `AppShell.tsx:16`: link logo `min-h-11 flex items-center`.
- **Kryteria:** axe 0 naruszeń na `/` (po zakończeniu animacji). Brak tekstu < 11 px na `/kalendarz` (skrypt pomiarowy z audytu).
- **Regresja:** axe w Playwright (T-15).
- **Zależności:** brak.

### T-11 · Popup zapisu postępu po ukończeniu, nie przed odsłonięciem (PROD-02) ✅ ZROBIONE
- **Problem:** formularz maila przerywa moment nagrody.
- **Rozwiązanie:** wywołanie `SaveProgressSheet` przenieść z `activate()` (`CalendarApp.tsx:129`) do `complete(true)`: po pierwszym ukończeniu w sesji, z kopią „Masz {n}/24. Zabezpiecz postęp”. Otwieranie okienek zawsze bez przerw.
- **Pliki:** `components/calendar/CalendarApp.tsx`, `components/calendar/SaveProgressSheet.tsx`.
- **Kryteria:** otwarcie dostępnego okienka jako gość od razu pokazuje animację i kartę. Popup pojawia się po ukończeniu, maks. raz na sesję.
- **Regresja:** test Playwright przepływu gościa.
- **Zależności:** brak.

### T-12 · Treść: obciążenie dni 12–15 (CONT-01, CONT-02) ✅ ZROBIONE (dzień 12: 300 m zamiast 250 m z planu, wciąż MEDIUM)
- **Rozwiązanie:**
  - dzień 12: `difficulty: MEDIUM`, bazowo 250 m przewyższenia, 500 m w „trudniejszej”, zamiennik 85 pięter;
  - dzień 15: nota „przy oblodzeniu bieżnia lub przełóż test”, opcja „tempo progowe zamiast max”;
  - dzień 24: zmiana żartu o wieku.
- **Pliki:** `lib/challenges/calendar.ts`, potem `npm run export:seed` i `db:seed -- --overwrite` na stagingu.
- **Kryteria:** brak dwóch HARD dzień po dniu. `npm run lint:copy` i `check:challenges` OK.
- **Regresja:** nowy test w `tests/assign.test.ts`: w kalendarzu brak dwóch HARD z rzędu.
- **Zależności:** akceptacja treści przez właściciela.

### T-13 · Monitoring, kopie zapasowe, usuwanie danych (OPS-01, LEG-02) ✅ CZĘŚĆ KODOWA
- **Wynik:** logi JSON w `lib/api.ts`, wymóg klucza service role w `env-check`, `lib/purge.ts` + `npm run db:purge`, sekcja „Backups and retention” w README. Sentry pominięte (wymaga konta). Zamiast tego alert na logach Vercela.
- **Rozwiązanie:**
  - Sentry (lub alerty logów Vercela) w `lib/api.ts` w miejscu `console.error`;
  - harmonogram kopii: plan Supabase z kopiami na grudzień albo cotygodniowy `pg_dump` (skrypt + instrukcja odtworzenia, przetestowana raz);
  - `SUPABASE_SERVICE_ROLE_KEY` obowiązkowy w produkcji, gdy włączone logowanie e-mailem;
  - skrypt `scripts/purge.ts` usuwający dane po dacie retencji;
  - konsultacja prawna polityki (transfer do Vercel/USA, podstawy przetwarzania).
- **Pliki:** `lib/api.ts`, `lib/config.ts`, `scripts/purge.ts` (nowy), README.
- **Kryteria:** błąd 500 na stagingu widoczny w narzędziu monitoringu. Odtworzenie kopii na pustą bazę udane. Usunięcie konta kasuje użytkownika w Supabase Auth.
- **Regresja:** test jednostkowy `purge.ts` na PGlite.
- **Zależności:** T-04.

### T-14 · Środowisko staging
- **Problem:** brak izolowanego środowiska do testów przed produkcją (wymagane przez T-04, T-06, T-13).
- **Rozwiązanie:** osobny projekt Supabase i Vercel Preview z `ENABLE_TEST_MODE=true` (po T-08 tylko dla admina). Nigdy nie współdzielić bazy z produkcją.
- **Kryteria:** staging działa pod osobną domeną, ma własną bazę, a tryb testowy jest dostępny tylko po zalogowaniu admina.
- **Zależności:** T-08.
- **Stan:** kod i narzędzia gotowe: `WDROZENIE.md` (instrukcja krok po kroku), `npm run verify:supabase` (RLS, brak dostępu publicznego klucza, migracje, 24 dni, ustawienia Auth, testowy mail), `--env <plik>` dla `db:migrate`/`db:seed`/`db:purge`. Po drodze naprawiono DB-01 (jsonb na sterowniku `postgres`). Czeka na założenie projektów Supabase/Vercel przez właściciela.

---

## P2: po starcie (lub przed, jeśli zostanie czas)

### T-15 · Testy E2E w Playwright
- **Zakres:**
  - landing i odliczanie;
  - dołączenie, otwarcie okienka (tryb testowy), ukończenie, wynik, grafika (status 200, PNG 1080×1920);
  - zamknięte okienko (toast, 403 z API);
  - granice czasu przez `/api/test-clock`;
  - responsywność 320/375/768/1440 (brak przepełnienia);
  - axe na kluczowych stronach;
  - 401 dla endpointów admina;
  - brak naruszeń CSP.
- **Pliki:** `playwright.config.ts`, `e2e/*.spec.ts`, `package.json` (skrypt `test:e2e`).
- **Kryteria:** `npm run test:e2e` zielony lokalnie na PGlite.
- **Zależności:** T-07, T-10.

### T-16 · Odliczanie w izolowanym komponencie (PERF-02)
- **Rozwiązanie:** `<Countdown target serverNow />` z własnym `useServerClock`. `CalendarApp` i `Landing` nie trzymają `now` w stanie. Odświeżenie stanu przy odblokowaniu przez jeden `setTimeout` do `nextUnlockAt`.
- **Pliki:** `lib/client.ts`, `components/calendar/CalendarApp.tsx`, `components/landing/Landing.tsx`, nowy `components/Countdown.tsx`.
- **Kryteria:** React Profiler: brak re-renderu siatki okienek co sekundę. Odliczanie i auto-odblokowanie działają (tryb „Północ za 10 s”).
- **Zależności:** brak.

### T-17 · Licznik społecznościowy „dziś zaliczyło” (PROD-01)
- **Rozwiązanie:** publiczny endpoint `/api/pulse?day=N` (tylko dla odblokowanych dni) zwracający liczbę ukończeń, cache 60 s. Wyświetlany na karcie wyzwania i pod siatką.
- **Pliki:** `app/api/pulse/route.ts`, `components/calendar/ChallengeCard.tsx`, `CalendarApp.tsx`.
- **Kryteria:** dla przyszłych dni → 404. Brak danych osobowych w odpowiedzi.
- **Zależności:** brak.

### T-18 · Drobne poprawki bezpieczeństwa i panelu (SEC-06 do SEC-10, ADM-01)
- **Rozwiązanie:**
  - wymaganie `Origin` lub `Sec-Fetch-Site` dla metod zmieniających stan;
  - ścisłe parsowanie dnia `^\d{1,2}$`;
  - błąd 23505 mapowany na 409 z komunikatem w panelu;
  - okno nieaktywności sesji (np. 90 dni od `last_seen_at`) i odświeżanie `last_seen_at` raz na dobę;
  - statyczne OG i ikony;
  - repozytorium prywatne.
- **Kryteria:** testy jednostkowe dla parsowania dnia i mapowania błędów. Ręczny test duplikatu dnia w panelu pokazuje komunikat zamiast 500.
- **Zależności:** T-01.

### T-19 · UX i copy (UX-01, COPY-01, DATA-02)
- **Rozwiązanie:**
  - przycisk „Podejmuję wyzwanie” jako drugorzędny;
  - krótkie objaśnienie „split” na landingu;
  - skrócony opis „Seria do dziś”;
  - decyzja o polskich odpowiednikach nazw odznak (lub świadome zostawienie EN jako brandingu);
  - odświeżenie stanu na `visibilitychange`.
- **Zależności:** decyzje właściciela dot. copy.

### T-20 · Zależności po starcie (DEP-01, DEP-02)
- **Rozwiązanie:** zod 4 (zmiana API: przegląd wszystkich schematów), vitest do wersji bez podatnego tinypool.
- **Kryteria:** `npm audit` bez high/critical.
- **Zależności:** T-15 (siatka testów przed zmianą wersji głównej).

---

## Kolejność wykonania (proponowana)

1. **Dzień 1:** T-01 → T-03 → T-02 → T-08 → T-09 → T-10 (szybkie i bez zależności).
2. **Dzień 2:** T-14 (staging) → T-04 (logowanie e-mailem na prawdziwym telefonie) → T-07.
3. **Dzień 3:** T-05 → T-06 → T-11 → T-12 → T-13.
4. **Po starcie:** T-15 do T-20.
