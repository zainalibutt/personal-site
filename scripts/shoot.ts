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

/**
 * Waits for every running animation to finish, rather than guessing a delay.
 *
 * Infinite animations are excluded, and the whole wait is raced against a
 * timer. The phone springboard idles forever by design, so its `finished`
 * promise never resolves — which hung every mobile shoot indefinitely. The
 * project's own rule is that an animation gets a timer guard as well as its
 * `finished` promise; the harness enforcing that rule did not follow it.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);

    await Promise.race([
      Promise.all(finite.map((a) => a.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.waitForTimeout(150);
}

/**
 * A full-page capture stitches from scroll position zero, so any element driven
 * by a *view* timeline never enters its range and is photographed at its `from`
 * keyframe — which for the arrival animation is `opacity: 0`. The frame then
 * shows four of six artefacts missing and a void where the page should be, and
 * the page itself is perfectly fine.
 *
 * That is the worst possible failure for a harness whose entire job is to be
 * believed, so the full-page shot neutralises those animations first. The
 * viewport shots leave them alone: there the arrival is real and worth seeing.
 */
const FREEZE_ARRIVAL = `
  .artefact-cell {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }`;

async function shoot(page: Page, name: string, fullPage = false) {
  await settle(page);
  const file = path.join(OUT, `${name}.png`);

  const frozen = fullPage
    ? await page.addStyleTag({ content: FREEZE_ARRIVAL })
    : null;
  await page.screenshot({ path: file, fullPage });
  if (frozen) await frozen.evaluate((node: Element) => node.remove());

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
  // `force` skips Playwright's stability check. On a phone the artefacts idle
  // with an infinite animation, so they are never "stable" and the default
  // check waits for a settling that will never come. Clickability is asserted
  // properly further down with a raw mouse click at coordinates, which is a
  // truer test anyway.
  await firstCard.hover({ force: true });
  await shoot(page, "03-hover");

  // Focused states, both flanks — the left/right asymmetry is the thing worth
  // checking, since the camera has to frame each one differently.
  for (const slug of ["proof-lens", "melody"]) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    /* Scoped to the field. A bare href matches the previous/next links inside
       other artefacts' case studies too, and `.first()` then picked whichever
       happened to come first in the DOM — which was a hidden control belonging
       to a different project. The harness must click the thing it names. */
    await page
      .locator(`[data-artefact="${slug}"] a[href="/projects/${slug}"]`)
      .first()
      .click({ force: true });
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
    // The phone springboard is sized to fit the fold, so there is legitimately
    // nothing to scroll there. Without this the check reports BLOCKED for the
    // layout working exactly as intended, and a false alarm that fires every
    // run is one nobody reads.
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 1,
    );
    console.log(
      scrollable
        ? `  scroll over artefact: ${before} -> ${after} ${after > before ? "OK" : "BLOCKED"}`
        : `  scroll over artefact: page fits the viewport, nothing to scroll`,
    );

    /* What matters on a phone is no longer "are the flagships above About" —
       that was the right check while the page scrolled and About sat halfway
       down it. The springboard now fits the fold, so the guarantee worth
       asserting is that *nothing* needs scrolling to be seen, plus that the
       strongest work still comes first in the one DOM stream.

       The old check failed the moment a third flagship was added, because About
       sits after the first full row of icons by design. It was reporting a
       layout decision as a regression. */
    if (WIDTH < 1024) {
      await page.goto(BASE, { waitUntil: "networkidle" });
      const fold = await page.evaluate(() => {
        const cells = [...document.querySelectorAll(".artefact-cell")];
        const below = cells.filter(
          (c) => c.getBoundingClientRect().bottom > window.innerHeight + 1,
        ).length;
        const flags = cells.map((c) =>
          c.querySelector("[data-flagship='true']") ? 1 : 0,
        );
        const firstNonFlag = flags.indexOf(0);
        const orderedFirst =
          firstNonFlag === -1 || !flags.slice(firstNonFlag).includes(1);
        return { total: cells.length, below, orderedFirst };
      });
      console.log(
        `  artefacts within the fold: ${fold.total - fold.below}/${fold.total} ${
          fold.below === 0 ? "OK" : "OVERFLOWING"
        }`,
      );
      console.log(
        `  flagships first in the DOM: ${fold.orderedFirst ? "OK" : "OUT OF ORDER"}`,
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

    /* The portrait opens a `<dialog>` in the top layer, and its size comes
       from the picture inside it. That is exactly the arrangement that can
       resolve to nothing while still reporting `open` — the first version
       measured 2x2px and looked, from every boolean, like it worked. So the
       assertion is about the pixels, not the state. Desktop only: the portrait
       is not rendered in the springboard. */
    if (WIDTH >= 768) {
      await page.goto(BASE, { waitUntil: "networkidle" });
      const trigger = page.locator(".portrait-trigger");
      if (await trigger.count()) {
        await trigger.click();
        await page.waitForTimeout(500);
        const shown = await page.evaluate(() => {
          const dialog = document.querySelector<HTMLDialogElement>(
            ".portrait-modal",
          );
          if (!dialog) return null;
          const box = dialog.getBoundingClientRect();
          return {
            open: dialog.open,
            w: Math.round(box.width),
            h: Math.round(box.height),
            centred: Math.abs(box.x + box.width / 2 - window.innerWidth / 2) < 4,
          };
        });
        if (shown) {
          const big = shown.open && shown.w > 200 && shown.h > 200;
          console.log(
            `  portrait enlarges: ${shown.w}x${shown.h}` +
              `${shown.centred ? " centred" : " OFF-CENTRE"} ${big ? "OK" : "COLLAPSED"}`,
          );
          await page.screenshot({ path: path.join(OUT, "06-portrait.png") });
        }
        await page.keyboard.press("Escape");
      }
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
