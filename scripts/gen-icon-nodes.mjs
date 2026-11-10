// Generates lib/icon-nodes.json (SVG geometry of the Lucide icons we use) for the server-side share cards.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const map = {
  activity: "activity", anchor: "anchor", armchair: "armchair", backpack: "backpack", ball: "volleyball",
  bell: "bell", biceps: "biceps-flexed", bike: "bike", box: "box", brain: "brain", camera: "camera",
  "circle-dot": "circle-dot", compass: "compass", crown: "crown", dices: "dices", disc: "disc-3",
  dribbble: "dribbble", dumbbell: "dumbbell", eye: "eye", feather: "feather", flag: "flag", flame: "flame",
  footprints: "footprints", gift: "gift", hand: "hand", heart: "heart", hourglass: "hourglass", layers: "layers",
  map: "map", medal: "medal", moon: "moon", mountain: "mountain", music: "music", orbit: "orbit",
  person: "person-standing", repeat: "repeat", rocket: "rocket", rotate: "rotate-cw", ruler: "ruler",
  shuffle: "shuffle", skull: "skull", snowflake: "snowflake", spade: "spade", sparkles: "sparkles", star: "star",
  sun: "sun", swords: "swords", target: "target", timer: "timer", tree: "tree-pine", trees: "trees",
  "trending-up": "trending-up", triangle: "triangle", trophy: "trophy", waves: "waves", wind: "wind", zap: "zap",
  check: "check", lock: "lock",
};
const out = {};
for (const [k, file] of Object.entries(map)) {
  const p = path.resolve("node_modules/lucide-react/dist/esm/icons", `${file}.js`);
  const mod = await import(pathToFileURL(p).href);
  out[k] = mod.__iconNode.map(([tag, attrs]) => {
    const { key, ...rest } = attrs;
    return [tag, rest];
  });
}
fs.writeFileSync("lib/icon-nodes.json", JSON.stringify(out));
console.log("icons:", Object.keys(out).length);
