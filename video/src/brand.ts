import { continueRender, delayRender, staticFile } from "remotion";

export const C = {
  ink: "#191919",
  deep: "#101010",
  cream: "#f2ebdd",
  mustard: "#d6a441",
  muted: "#92908a",
  line: "rgba(242,235,221,0.1)",
};

export const DISPLAY = "'Anton', Impact, 'Arial Narrow', sans-serif";
export const SANS = "'Archivo', system-ui, sans-serif";

// Same unicode ranges as the fontsource subsets, so Polish letters come from the latin-ext file.
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FACES: [string, string, string, string][] = [
  ["Anton", "anton-latin-400-normal.woff", "400", LATIN],
  ["Anton", "anton-latin-ext-400-normal.woff", "400", LATIN_EXT],
  ["Archivo", "archivo-latin-400-normal.woff", "400", LATIN],
  ["Archivo", "archivo-latin-ext-400-normal.woff", "400", LATIN_EXT],
  ["Archivo", "archivo-latin-700-normal.woff", "700", LATIN],
  ["Archivo", "archivo-latin-ext-700-normal.woff", "700", LATIN_EXT],
];

let loaded = false;
export function loadFonts() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender("fonts", { timeoutInMilliseconds: 120000 });
  const cap = (p: Promise<unknown>) => Promise.race([p, new Promise((r) => setTimeout(r, 20000))]);
  Promise.all(
    FACES.map(([family, file, weight, unicodeRange]) => {
      const f = new FontFace(family, `url(${staticFile("fonts/" + file)}) format('woff')`, { weight, unicodeRange });
      document.fonts.add(f);
      return cap(f.load());
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
