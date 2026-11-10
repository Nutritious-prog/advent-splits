# THE ADVENT SPLITS

**24 DAYS. 24 CHALLENGES. QUESTIONABLE DECISIONS.**
An interactive sports advent calendar by [@wlod_run](https://instagram.com/wlod_run). Polish UI, mobile-first, built for traffic from Instagram's in-app browser.

Core loop: **open door → reveal challenge → do it → mark complete → share.**

---

## Architecture

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router) + TypeScript | Server components + route handlers, deploys to Vercel with no config |
| UI | Tailwind CSS v4, Motion (`motion/react`), Lucide | Design tokens in `app/globals.css`, spring animations, reduced-motion support via `MotionConfig reducedMotion="user"` + CSS |
| Database | Supabase **Postgres**, reached directly over SQL from the server (`postgres` driver) | All reads and writes go through our server, so no database key ever reaches the browser |
| Local DB | **PGlite** (Postgres compiled to WASM) in `.data/` | Local dev and tests run the *same SQL, constraints and transactions* as production, with no Docker |
| Identity | Guest participant + random session token in an `httpOnly` cookie (only an HMAC hash is stored) | One-field onboarding (nickname only) |
| Cross-device | Optional e-mail sign-in with a **6-digit code** (Supabase Auth OTP) | Magic links break in Instagram's in-app browser (they open in Safari, without the session). Typing a code keeps the user in the same browser |
| Share cards | `next/og` (Satori), 1080×1920 PNG, rendered on the server | Real image files for Stories, with native share on mobile and a download fallback |

### Security model
- **RLS is enabled on every table with no policies**, and the `anon`/`authenticated` roles have their table privileges revoked. Supabase's public REST API can't read or write anything. Only the server's privileged connection (`DATABASE_URL`) can.
- Every participant endpoint resolves the participant **from the session cookie**, never from a request parameter. Nobody can touch someone else's progress.
- **Unlock dates are enforced on the server** (`lib/time.ts` → `isUnlocked`), using `ADVENT_TZ` (Europe/Warsaw). The client clock is only used for the countdown display, and that clock is corrected against `/api/time`.
- Writes are rejected if `Origin` doesn't match the host, on top of `SameSite=Lax` (sessions) and `SameSite=Strict` (admin) cookies.
- Input is validated with zod on the server. Results are re-validated and formatted on the server.
- Best-effort in-memory rate limiting covers joining, OTP and admin login. For real protection, add Vercel Firewall rules.

### Challenge assignment (`lib/assign.ts`)
1. `POST /api/doors/:day/open` checks that the day is unlocked by the server clock.
2. A transaction locks the participant row (`SELECT … FOR UPDATE`), so simultaneous taps serialize.
3. If the door already has an assignment, that assignment is returned. Refresh, reopen and retry all give the same challenge.
4. Otherwise a challenge is picked with `crypto.randomInt`, weighted by:
   - the difficulty preference (BEGINNER / INTERMEDIATE / ADVANCED / SURPRISE ME)
   - variety: same category as the neighbouring day ×0.15, a category already used 3 times ×0.35
   - no back-to-back HARD days (×0.2)
   - long challenges (>75 min) favoured on weekends
   - paid facilities down-weighted (×0.6)
   - the optional "no specialised equipment" filter
5. `INSERT … ON CONFLICT DO NOTHING`. The safety nets are `PRIMARY KEY (participant_id, day)` and `UNIQUE (participant_id, challenge_id)`, so no challenge repeats within one calendar.

Resetting progress clears completions and results **but keeps assignments**. Otherwise reset would be a way to re-roll challenges.

---

## Project map

```
app/
  page.tsx                 Landing (pre-launch countdown, door preview, how it works, IG section, FAQ)
  kalendarz/               Calendar (24 doors, reveal, challenge card)
  statystyki/              Stats + achievements + completed list
  profil/                  Nickname, preferences, e-mail linking, invite card, reset, logout
  admin/                   Password-protected admin (stats, challenge editor, demo mode)
  admin/podglad/           Admin-only landing preview at a simulated time
  api/…                    Route handlers (see below)
components/                UI (calendar, landing, admin, primitives)
lib/
  challenges/*.ts          210 challenges, 21 per category
  assign.ts                Server-side assignment engine
  progress.ts              State, streaks, stats, achievements
  time.ts                  Europe/Warsaw unlock schedule, server clock
  session.ts, admin.ts     Sessions and admin auth
  share-card.tsx           1080×1920 story cards
supabase/migrations/       SQL schema (also run automatically on local PGlite)
supabase/seed.sql          Generated challenge seed (paste into the SQL editor)
scripts/                   migrate / seed / export-seed-sql / check-challenges / gen-icon-nodes
```

API: `POST /api/participant` · `GET|PATCH /api/me` · `POST /api/me/reset` · `POST /api/doors/:day/(open|accept|complete|result)` · `GET /api/share/:day` · `GET /api/share/invite` · `POST /api/auth/email/(start|verify)` · `POST /api/auth/logout` · `GET /api/time` · `/api/admin/*`

---

## Run locally

```bash
npm install
cp .env.example .env.local        # set ADMIN_PASSWORD and SESSION_SECRET
npm run dev
```

With `DATABASE_URL` empty, the app creates `.data/pglite`, runs the migrations and seeds 210 challenges automatically.

- Time-travel locally: set `DEV_NOW=2026-12-05T10:00:00+01:00` in `.env.local` and restart. This is **ignored in production builds**.
- Admin: `http://localhost:3000/admin`
- Validate the dataset: `npm run check:challenges`
- Typecheck: `npm run typecheck`

---

## Deploy: Supabase + Vercel

### 1. Supabase
1. Create a project in an EU region (e.g. Frankfurt).
2. **Schema:** SQL Editor → paste and run `supabase/migrations/0001_init.sql`, or run `npm run db:migrate` locally with `DATABASE_URL` set.
3. **Challenges:** SQL Editor → paste and run `supabase/seed.sql`, or run `npm run db:seed`. Both are idempotent and never overwrite admin edits.
4. **Connection string:** Project Settings → Database → Connection string → **Transaction pooler** (port `6543`). This is `DATABASE_URL`. Keep it server-only.
5. **E-mail sign-in (optional but recommended):**
   - Authentication → Providers → Email: enabled.
   - Authentication → Email Templates → **Magic Link**: put the code in the template, e.g.
     `<h2>Twój kod: {{ .Token }}</h2><p>Wpisz go w THE ADVENT SPLITS. Kod wygasa po kilku minutach.</p>`
   - **Configure custom SMTP** (Resend, Postmark, SES…) under Authentication → SMTP. Supabase's built-in mailer is limited to a few e-mails per hour, which is not enough for a campaign.
   - Copy `SUPABASE_URL` and the **anon** key (Project Settings → API). The app only uses them server-side.

### 2. Vercel
1. Import the repository. The framework is detected automatically.
2. Environment variables (Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `ADMIN_PASSWORD` | strong password (≥10 chars, required in production) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | for e-mail codes (optional) |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://advent.twojadomena.pl` (printed on share cards) |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE` | `wlod_run` |
| `SUPABASE_SERVICE_ROLE_KEY` | optional, server-only: lets "Usuń moje konto" also delete the login record holding the e-mail |
| `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` | shown on `/prywatnosc` (privacy policy). **Fill in before launch** |
| `ENABLE_TEST_MODE` | leave empty in production. `true` only on a staging deploy |
| `ADVENT_START` / `ADVENT_DAYS` / `ADVENT_TZ` | `2026-12-01` / `24` / `Europe/Warsaw` |

3. Deploy, add your custom domain, then redeploy so `NEXT_PUBLIC_SITE_URL` is baked in.
4. Optional: set the function region close to the database (Project Settings → Functions → e.g. `fra1`).

### Production config guard
`lib/env-check.ts` stops the build (and the server) on real production deploys when required public config is missing:
- `NEXT_PUBLIC_SITE_URL`: must be set, `https://`, not localhost (it is printed on every share card);
- `NEXT_PUBLIC_OPERATOR_NAME` and `NEXT_PUBLIC_CONTACT_EMAIL`: data for the privacy policy.

Strict mode is on when `VERCEL_ENV=production` (set automatically by Vercel) or `REQUIRE_PROD_CONFIG=true` (other hosts). Local builds and Vercel previews are not strict.

### 3. Launch checklist
- [ ] `/admin` → Demo → preview every state (before start, Dec 1, mid, Dec 24, after) and the landing preview
- [ ] Join on a real iPhone **from inside Instagram** (paste the link into a DM and open it there)
- [ ] Link an e-mail, open the site in Safari, sign in with the code, and check the progress is there
- [ ] Download a share card on iOS and Android
- [ ] Vercel Firewall: rate-limit `/api/participant`, `/api/auth/*`, `/api/admin/login`
- [ ] Update the Instagram bio link with the final domain

### Timeline behaviour
- **Before 1 Dec 00:00 (Warsaw):** landing with countdown. Joining is open, all doors are locked, and the server refuses to open any.
- **1–24 Dec:** one new door at every Warsaw midnight. Past doors stay available.
- **After 24 Dec:** the calendar stays accessible, missed doors can still be done, and nothing is deleted.
- All dates come from `ADVENT_START`, `ADVENT_DAYS` and `ADVENT_TZ`.

---

## Privacy and accounts
- E-mail is stored **only in Supabase Auth**. Participants hold just `auth_user_id` (migration `0002_no_email_copy.sql`).
- Guests are asked to add an e-mail in a popup before opening a new door. "Może później" snoozes it for the browser session, and X/Esc cancels without opening the door.
- "Usuń moje konto" in the profile deletes the participant, progress and sessions, plus the Supabase Auth user when `SUPABASE_SERVICE_ROLE_KEY` is set.
- `/prywatnosc`: a plain-language Polish privacy policy (only necessary cookies, so no consent banner).

## Form of address (on / ona / neutralnie)
Participants pick a form of address when joining (editable in the profile). UI strings use `pick(gender, m, f, n)` from `lib/gender.ts`. Challenge texts can contain `[męska|żeńska]` markup, e.g. `[Przebiegłem|Przebiegłam]`. The server renders it per participant, and the neutral form becomes `Przebiegłem/am`. Use the same markup when adding challenges in the admin panel.

## Quality checks
```bash
npm test                 # unit tests: unlock times (incl. DST), streaks, picker, results, gender markup
npm run lint:copy        # mechanical copy checks for all challenges
npm run check:challenges # ids, icons, required fields
npm run db:seed -- --overwrite   # replace challenge texts in the DB with the seed files (local: stop npm run dev first)
```

## Test mode
The floating "Tryb testowy" button simulates any advent day for the real participant flow, in this browser only. It is always on in local development. On any other deployment it needs `ENABLE_TEST_MODE=true` **and** an admin session, so visitors can never time-travel even if the flag is set by mistake.

## Security and operations

### Security headers
Production responses carry `Content-Security-Policy` (self only, no third-party scripts), `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy` (`next.config.ts`). CSP is not sent in development because hot reload needs eval and a websocket. The Next image optimizer is disabled (`images.unoptimized`), because the app does not use `next/image`.

### Rate limits
Sensitive endpoints use a limiter stored in Postgres (`rate_limits` table, migration 0005), so limits hold across serverless instances. Keys are HMAC hashes, with no raw e-mails or IPs:
- admin login: 8 / 15 min per IP;
- OTP send: 3 / 15 min per e-mail, 10 / 15 min per IP;
- OTP verify: 5 / 15 min per e-mail;
- profile creation: 20 / h per IP.

Recommended extra layer: Vercel Firewall rate-limit rules for `/api/admin/login`, `/api/auth/*` and `/api/participant`.

### Signing in when the device already has a guest calendar
If an e-mail that already owns a calendar is used on a device with a guest calendar, the user chooses between **Scal kalendarze** (merge: completed days from both are kept, the newest result wins, the guest profile is removed) and **Użyj tylko kalendarza z maila**. The decision is bound to a signed, 10-minute, httpOnly token (`/api/auth/email/resolve`).

### Monitoring
Every server error is one JSON line in the logs with `"level":"error"` (method, path, error name and message, short stack; no bodies or cookies). In Vercel: Logs → filter `level":"error` → create an alert, or add Sentry later.

### Backups and retention
- **Before 1 Dec and weekly in December:** `pg_dump "$DATABASE_URL" --no-owner --format=custom -f advent-YYYY-MM-DD.dump` (use the session pooler or direct connection string for dumps). Alternatively use a Supabase plan with daily backups for the event period.
- **Restore test (once, on staging):** `pg_restore --no-owner --clean -d "$STAGING_DATABASE_URL" advent-YYYY-MM-DD.dump`, then open the staging app and check a few calendars.
- **End of retention** (the privacy policy promises at most 12 months after 24 Dec): `npm run db:purge` (dry run), then `npm run db:purge -- --confirm`. This deletes all participant data and, with `SUPABASE_SERVICE_ROLE_KEY`, the login e-mails in Supabase Auth. Make a backup first.

## Admin and demo mode
`/admin` (password from `ADMIN_PASSWORD`, 12-hour signed cookie):
- **Statystyki:** participants, linked accounts, revealed, completed, completion rate, daily active participants (Warsaw dates), per-door completion, most-assigned challenges, sign-ups. Aggregates only, with no nicknames or e-mails.
- **Wyzwania:** search and filter the pool; add, edit or disable challenges; change difficulty and descriptions; "Uzupełnij z seedu" inserts new seed records. Disabled challenges are never drawn, but stay with people who already have them.
- **Demo / podgląd:** an isolated `is_demo` participant plus a simulated clock that is passed **only to admin endpoints**. Presets: before start / Dec 1 / mid / Dec 24 / after end. Scenarios: "all states" (locked, available, opened, completed), "all done", "reset". A landing preview at the simulated time is also available. The demo participant can never be reached through a public session and is excluded from stats. Public endpoints always use the real server clock.

---

## Content: one shared calendar
`lib/challenges/calendar.ts` holds **24 endurance challenges, one per day** (`day` field). Everyone gets the same challenge on the same day, so results are comparable. Categories: Bieganie, Rower, Pływanie, Wzniesienia i marsz, Siłownia, Mobility, Multisport. Each day has an easier and a harder version plus a **swap** for another discipline (a runner on a swim day, a cyclist on a run day). Harder sessions fall on weekends, recovery days come in between, and the dates are themed (Mikołajki on the 6th, the winter solstice on the 21st, Wigilia on the 24th).

Progress is shown as a **finisher medal** with 24 segments (`lib/medal.ts`, `components/Medal.tsx`): every completed day lights up its segment. Badges show progress bars until they are earned.

Migration `0004_fixed_calendar.sql` adds `day` and `swap`, switches to the endurance categories and retires the old random pool. The weighted random picker remains only as a fallback for days without a scheduled challenge.

## What still needs configuring (outside the code)
- A Supabase project, a Vercel project, a domain and the environment variables above.
- Custom SMTP plus the e-mail template containing `{{ .Token }}`, if you want e-mail sign-in. Without it the app works fully in guest mode and hides the e-mail options.
- Vercel Firewall rate-limit rules (the in-app limiter is per instance and best-effort).
