/**
 * The Revenue OS boundary figure.
 *
 * Revenue OS is private and stays private, and its live views carry third-party
 * personal data — prospect names and business addresses — which cannot go on a
 * public page whatever the crop. So the card shows the part that is both safe
 * and the most worth showing: the boundary the database enforces before a
 * message is allowed to claim it was sent.
 *
 * Every rule quoted below is the real exception text from
 * `enforce_outreach_boundary` and `lock_verified_sent_ledger`. Nothing here is
 * invented, and nothing here identifies anybody.
 *
 *   npm run figures
 */
import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = path.join(
  process.cwd(),
  "public",
  "projects",
  "revenue-os",
  "boundary.png",
);

const WIDTH = 1280;
const HEIGHT = 720;

/** The three states a message can be in. Reaching the next one is a gate. */
const STAGES = ["Drafted", "Approved", "Verified sent"];

/** Verbatim from the migrations. */
const RULES = [
  "An approval record is required before outreach can enter the approval queue.",
  "A named approved batch is required before sent state can be recorded.",
  "Verified Gmail message ID and sent timestamp are required for sent state.",
  "Sent outreach must use the approved sender alias.",
  "Verified sent-message ledger fields are immutable.",
];

const stage = (label: string, i: number) => `
  <div class="stage ${i === STAGES.length - 1 ? "final" : ""}">
    <span class="n">${String(i + 1).padStart(2, "0")}</span>
    <span class="label">${label}</span>
  </div>
  ${i < STAGES.length - 1 ? '<div class="gate"><span>&#9679;</span></div>' : ""}`;

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    width:${WIDTH}px;height:${HEIGHT}px;color:#e6edfb;font-family:Inter,sans-serif;
    padding:66px 74px;display:flex;flex-direction:column;justify-content:space-between;
    background:
      radial-gradient(70% 55% at 88% 78%, rgba(44,148,190,.16) 0%, rgba(44,148,190,0) 100%),
      radial-gradient(120% 85% at 50% -8%, #102046 0%, #070d1e 42%, #04070f 100%);
  }
  .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:18px;letter-spacing:.16em;
    text-transform:uppercase;color:#9cb2da}
  h1{font-size:44px;font-weight:400;letter-spacing:-.02em;margin-top:18px;max-width:24ch}
  .flow{display:flex;align-items:center;gap:22px}
  .stage{flex:1;border:1px solid #26365f;border-radius:14px;padding:22px 24px;
    background:rgba(17,29,61,.5);box-shadow:inset 0 1px 0 0 rgba(255,255,255,.06)}
  .stage.final{border-color:rgba(134,181,255,.55);background:rgba(30,52,104,.55)}
  .n{display:block;font-family:"IBM Plex Mono",monospace;font-size:16px;color:#6d84ad;letter-spacing:.1em}
  .label{display:block;margin-top:8px;font-size:26px}
  .stage.final .label{color:#86b5ff}
  .gate{width:34px;height:34px;flex:none;border-radius:50%;border:1px solid #3f6ed0;
    display:flex;align-items:center;justify-content:center;color:#86b5ff;font-size:11px}
  .rules{border-top:1px solid #26365f;padding-top:20px;display:flex;flex-direction:column;gap:7px}
  .rule{font-family:"IBM Plex Mono",monospace;font-size:14.5px;color:#8ba0c8;
    display:flex;gap:12px;align-items:baseline}
  .rule::before{content:"raise";color:#4b5b8b;flex:none}
  footer{font-family:"IBM Plex Mono",monospace;font-size:15px;color:#6d84ad;
    display:flex;justify-content:space-between;padding-top:4px}
</style></head>
<body>
  <div>
    <div class="eyebrow">Outreach boundary &middot; enforced in Postgres</div>
    <h1>A message cannot claim to have been sent.</h1>
  </div>

  <div class="flow">${STAGES.map(stage).join("")}</div>

  <div class="rules">${RULES.map((r) => `<div class="rule">${r}</div>`).join("")}</div>

  <footer>
    <span>Database triggers, not application checks</span>
    <span>Private repository</span>
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
