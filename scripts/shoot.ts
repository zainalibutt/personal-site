/**
 * Screenshot harness.
 *
 * Exists because a headless preview pane cannot composite frames: it
 * returns no image and freezes every animation at time 0, so several real
 * visual defects shipped while measurements said everything was fine. This runs
 * a real Chromium, waits for animations to actually settle, and writes PNGs that
 * can be looked at.
 *
 *   npx tsx scripts/shoot.ts                 # default states, 1440x900
 *   npx tsx scripts/shoot.ts --w 390 --h 844 # mobile
 *   npx tsx scripts/shoot.ts --url http://localhost:3100
 */
import { chromium, type Page } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), ".screens");

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg("url", "http://localhost:3100");
const WIDTH = Number(arg("w", "1440"));
const HEIGHT = Number(arg("h", "900"));

/** Waits for every running animation to finish, rather than guessing a delay. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    );
  });
  await page.waitForTimeout(150);
}

async function shoot(page: Page, name: string, fullPage = false) {
  await settle(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  ${name}.png`);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    // 1, not 2. These are read on screen, and cost scales with pixel
    // count: a 2880x1800 frame is ~6,900 tokens to look at, and every frame
    // already in the conversation is re-sent on every later turn. At 1x the
    // same frame is ~1,700 and is no harder to judge a layout from.
    // Pass --retina if a frame is ever needed for print or presentation.
    deviceScaleFactor: process.argv.includes("--retina") ? 2 : 1,
  });

  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  console.log(`shooting ${BASE} at ${WIDTH}x${HEIGHT}`);
  await page.goto(BASE, { waitUntil: "networkidle" });

  await shoot(page, "01-home");
  await shoot(page, "02-home-full", true);

  // Hover state on the first artefact.
  const firstCard = page.locator("article").first();
  await firstCard.hover();
  await shoot(page, "03-hover");

  // Focused states, both flanks — the left/right asymmetry is the thing worth
  // checking, since the camera has to frame each one differently.
  for (const slug of ["proof-lens", "melody"]) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.locator(`a[href="/projects/${slug}"]`).first().click();
    // Wait on the actual state change, not a guessed delay — a dev-server
    // recompile can swallow the click and yield a screenshot of the home page.
    await page.waitForURL(`**/projects/${slug}`, { timeout: 15000 });
    await page.locator('[data-expanded="true"]').waitFor({ timeout: 15000 });
    await shoot(page, `04-focused-${slug}`);
  }

  // Cold visit: what a shared link or a crawler actually gets.
  await page.goto(`${BASE}/projects/proof-lens`, { waitUntil: "networkidle" });
  await shoot(page, "05-cold-visit", true);

  // Interaction checks. Screenshots cannot show whether a thing is clickable or
  // whether the page still scrolls under the pointer, and both have regressed
  // here before.
  console.log("\ninteraction:");
  await page.goto(BASE, { waitUntil: "networkidle" });
  const artefact = page.locator("[data-well]").first();
  const box = await artefact.boundingBox();

  if (!box) {
    console.log("  ! could not locate an artefact");
  } else {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.scrollY);
    console.log(
      `  scroll over artefact: ${before} -> ${after} ${after > before ? "OK" : "BLOCKED"}`,
    );

    // Reading order on a phone. The flanks are two DOM containers, so stacking
    // them gives left-flank / spine / right-flank unless something forces the
    // sequence back — which once put Melody, a flagship, below About and two
    // lesser projects. Asserted rather than eyeballed: it regresses invisibly,
    // because at desktop width the layout looks perfect either way.
    if (WIDTH < 1024) {
      await page.goto(BASE, { waitUntil: "networkidle" });
      const spine = await page.locator("[data-spine]").boundingBox();
      const flagships = await page
        .locator("article")
        .filter({ hasText: /Proof-Lens|Melody/ })
        .all();
      const tops = await Promise.all(
        flagships.map(async (f) => (await f.boundingBox())?.y ?? Infinity),
      );
      const lowest = Math.max(...tops);
      console.log(
        `  flagships above About: ${flagships.length} found, ${
          spine && lowest < spine.y ? "OK" : "BURIED"
        }`,
      );
    }

    await page.goto(BASE, { waitUntil: "networkidle" });
    const box2 = await artefact.boundingBox();
    if (box2) {
      await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
      await page.waitForTimeout(1600);
      const path = new URL(page.url()).pathname;
      console.log(
        `  click artefact image: ${path} ${path.startsWith("/projects/") ? "OK" : "DEAD"}`,
      );
    }
  }

  await browser.close();

  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`);
    for (const e of errors.slice(0, 10)) console.log(`  - ${e}`);
  } else {
    console.log("\nno console errors");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
