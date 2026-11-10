# Film promocyjny THE ADVENT SPLITS

Materiał z aplikacji pod voiceover i przebitki. Długość ok. 1:10, 60 kl./s, bez dźwięku.

## Gotowe pliki (`out/`)

| Plik | Format | Do czego |
|---|---|---|
| `Promo-9x16-napisy.mp4` | 1080×1920 | Reels / Stories / mobilna strona, z napisami |
| `Promo-9x16-czyste.mp4` | 1080×1920 | to samo bez napisów (pod Twój voiceover i własne napisy) |
| `Promo-16x9-napisy.mp4` | 1920×1080 | strona internetowa, YouTube, z napisami po lewej |
| `Promo-16x9-czyste.mp4` | 1920×1080 | to samo bez napisów |

Intro z logotypem i plansza końcowa (adventsplits.pl, @wlod_run, start 1 grudnia) są w obu wersjach.

**Surowe ujęcia** (do własnego montażu): `public/rec/s*.mp4`. To nagrania ekranu telefonu 1170×2532 (3× gęstość pikseli), 60 kl./s, bez ramki. Grafiki z aplikacji w pełnej rozdzielczości: `public/rec/card-*.png`.

## Plan i czasy (pod voiceover)

```
intro      0:00.0 – 0:03.0   logo, „24 dni · 24 wyzwania · 1–24 grudnia”
landing    0:02.4 – 0:10.3   strona główna             „24 dni. 24 wyzwania.”
join       0:09.8 – 0:16.1   dołączenie z nickiem      „Dołączasz w 10 sekund.”
calendar   0:15.7 – 0:22.7   kalendarz, zoom na dzień 7 „Codziennie nowe okienko.”
challenge  0:22.3 – 0:38.9   karta wyzwania, odhaczenie, odznaki, wynik
share      0:38.5 – 0:45.4   grafika do relacji (wyskakuje z telefonu)
stats      0:45.0 – 0:53.0   statystyki i medal
finale     0:52.6 – 1:06.7   24/24, FINISHER, grafika podsumowania
outro      1:06.4 – 1:10.5   adventsplits.pl · @wlod_run
```
Aktualne czasy wypisze `npx tsx record/timecodes.ts`.

## Jak zmienić i wyrenderować ponownie

Wymaga uruchomionej aplikacji w trybie produkcyjnym z trybem testowym (opis w historii projektu; port domyślny 3006).

```bash
npm run record                 # nagrywa wszystkie sceny od nowa (node record/record.mjs [url] [scena ...])
npm run studio                 # podgląd montażu w Remotion Studio
node render.mjs video          # renderuje wszystkie 4 wersje do out/
node render.mjs stills Promo-9x16-napisy 600,1200   # pojedyncze klatki do sprawdzenia
```

- Teksty napisów, kolejność scen, zoomy (klucze kamery) i momenty z grafikami: `src/timeline.ts`.
- Wygląd (telefon, tło, napisy, intro, outro): `src/Promo.tsx`.
- Scenariusz klikania w aplikacji: `record/record.mjs`.

Montaż jest zrobiony w [Remotion](https://www.remotion.dev). Osoby prywatne i firmy do 3 osób używają go za darmo, większe firmy potrzebują licencji.
