// Lays several images out in a grid for review:  node record/grid.mjs out.png cols img1 img2 ...
import { chromium } from "playwright";
import fs from "node:fs";

const [out, colsRaw, ...imgs] = process.argv.slice(2);
const cols = Number(colsRaw) || 4;
const cellW = 1600 / cols;
const html = `<body style="margin:0;background:#000;color:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;width:1600px">
${imgs.map((f) => `<div><img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}" style="width:100%;display:block"><div>${f.split(/[\\/]/).pop()}</div></div>`).join("")}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 400 } });
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log(out, cellW);
