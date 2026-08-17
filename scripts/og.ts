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

  // The entrance sequence settles the artefacts into the lattice. Shooting
  // before it finishes captures a half-assembled page.
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    );
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
