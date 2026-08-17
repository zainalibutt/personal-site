/**
 * The age-group-detection card image.
 *
 * This project has no interface. It ran from a notebook, so there is no screen
 * to photograph and no branding to crop — and the obvious fallback, a stock
 * photograph of faces, would be someone else's image of someone else's face on
 * a page about classifying faces. Both problems have the same answer: the
 * project *is* a comparison, so the card is the comparison.
 *
 * Every number here is read from the repository's own reported results. Nothing
 * on this figure is invented; if the figures change, change them in one place
 * below and re-run.
 *
 *   npm run figures
 */
import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = path.join(
  process.cwd(),
  "public",
  "projects",
  "age-group-detection",
  "hero.png",
);

/** Source: github.com/zainalibutt/age-group-detection, reported results. */
const MODELS = [
  { name: "HOG + SVM", accuracy: 0.7106, macroF1: 0.7008, ms: 0.02, mb: 0.1 },
  { name: "HOG + MLP", accuracy: 0.7294, macroF1: 0.7181, ms: 0.02, mb: 10.41 },
  { name: "ResNet18", accuracy: 0.7871, macroF1: 0.7796, ms: 19.91, mb: 42.72 },
];

const CLASSES = ["Child", "Young", "Middle-Aged", "Senior"];

/** Bars start here rather than at zero: four classes means chance is 25%, and a
 *  bar drawn from zero spends three quarters of its length saying nothing. The
 *  axis is labelled so this is stated, not hidden. */
const FLOOR = 0.25;

const WIDTH = 1280;
const HEIGHT = 800;

const row = (m: (typeof MODELS)[number], best: boolean) => {
  const fill = ((m.accuracy - FLOOR) / (1 - FLOOR)) * 100;
  return `
    <div class="row ${best ? "best" : ""}">
      <div class="name">${m.name}</div>
      <div class="track"><div class="bar" style="width:${fill.toFixed(2)}%"></div></div>
      <div class="figs">
        <span class="acc">${m.accuracy.toFixed(4)}</span>
        <span class="dim">F1 ${m.macroF1.toFixed(4)}</span>
        <span class="dim">${m.ms} ms</span>
        <span class="dim">${m.mb} MB</span>
      </div>
    </div>`;
};

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background:
      radial-gradient(70% 55% at 88% 78%, rgba(44,148,190,0.16) 0%, rgba(44,148,190,0) 100%),
      radial-gradient(120% 85% at 50% -8%, #102046 0%, #070d1e 42%, #04070f 100%);
    color: #e6edfb;
    font-family: Inter, sans-serif;
    padding: 74px 84px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .eyebrow {
    font-family: "IBM Plex Mono", monospace;
    font-size: 19px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #9cb2da;
  }
  h1 { font-size: 46px; font-weight: 400; letter-spacing: -0.02em; margin-top: 20px; max-width: 22ch; }
  .rows { display: flex; flex-direction: column; gap: 30px; margin-top: 8px; }
  .row { display: grid; grid-template-columns: 210px 1fr; gap: 12px 26px; align-items: center; }
  .name { font-family: "IBM Plex Mono", monospace; font-size: 22px; color: #9cb2da; }
  .row.best .name { color: #e6edfb; }
  .track { height: 20px; background: rgba(38,54,95,0.55); border-radius: 999px; overflow: hidden; }
  .bar { height: 100%; background: #3f6ed0; border-radius: 999px; }
  .row.best .bar { background: #86b5ff; }
  .figs {
    grid-column: 2; display: flex; gap: 26px;
    font-family: "IBM Plex Mono", monospace; font-size: 19px;
  }
  .acc { color: #e6edfb; }
  .row.best .acc { color: #86b5ff; }
  .dim { color: #6d84ad; }
  footer {
    display: flex; justify-content: space-between; align-items: flex-end;
    font-family: "IBM Plex Mono", monospace; font-size: 18px; color: #6d84ad;
    border-top: 1px solid #26365f; padding-top: 22px;
  }
  .classes { color: #9cb2da; letter-spacing: 0.04em; }
</style></head>
<body>
  <div>
    <div class="eyebrow">Accuracy · identical splits</div>
    <h1>Three approaches to the same four classes.</h1>
  </div>

  <div class="rows">
    ${MODELS.map((m, i) => row(m, i === MODELS.length - 1)).join("")}
  </div>

  <footer>
    <span class="classes">${CLASSES.join("  ·  ")}</span>
    <span>Axis from ${FLOOR} — chance on four classes</span>
  </footer>
</body></html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
