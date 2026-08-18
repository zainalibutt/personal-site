/**
 * Open Graph image.
 *
 * Rendered from the real page rather than composed separately, because a
 * hand-built OG card is a second design to keep in sync and it always drifts.
 * This one cannot: it is the site, photographed.
 *
 * Not `ImageResponse` — that renders a flat subset of CSS with no canvas, so it
 * would draw the layout without the field, which is the only part worth sharing.
 *
 *   npm run og      # dev server must be running on 3100
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import path from "node:path";

const BASE = process.env.OG_URL ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "src", "app", "opengraph-image.png");

/** Facebook and LinkedIn both crop toward this; 1200x630 is the safe shape. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Shot wider than the OG frame and cropped down, so the type is not rendered
 *  at a size the page never actually uses. */
const SHOT_WIDTH = 1440;
const SHOT_HEIGHT = 900;
const CROP_HEIGHT = Math.round(SHOT_WIDTH * (OG_HEIGHT / OG_WIDTH));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: SHOT_WIDTH, height: SHOT_HEIGHT },
    deviceScaleFactor: 2,
  });

  await page.goto(BASE, { waitUntil: "networkidle" });

  /* The entrance sequence settles the artefacts into the lattice, and shooting
     before it finishes captures a half-assembled page.

     Infinite and scroll-driven animations are excluded and the wait is raced
     against a timer, for exactly the reason `scripts/shoot.ts` does the same:
     the arrival animation is driven by a view timeline and its `finished`
     promise never resolves, so waiting on all of them hung this script
     indefinitely. The rule this project already had — every animation gets a
     timer guard as well as its promise — applies to the tooling too. */
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((a) => {
      const timing = a.effect?.getComputedTiming();
      return (
        timing?.iterations !== Infinity &&
        !("timeline" in a && a.timeline
          ? a.timeline.constructor.name.includes("ViewTimeline")
          : false)
      );
    });

    await Promise.race([
      Promise.all(finite.map((a) => a.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.waitForTimeout(600);

  const shot = await page.screenshot();
  await browser.close();

  await sharp(shot)
    .extract({
      left: 0,
      top: 0,
      width: SHOT_WIDTH * 2,
      height: CROP_HEIGHT * 2,
    })
    .resize(OG_WIDTH, OG_HEIGHT)
    .png()
    .toFile(OUT);

  console.log(
    `wrote ${path.relative(process.cwd(), OUT)} (${OG_WIDTH}x${OG_HEIGHT})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
