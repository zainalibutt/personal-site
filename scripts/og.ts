/**
 * Open Graph images — the site card, and one per project.
 *
 * Rendered from the real page rather than composed separately, because a
 * hand-built OG card is a second design to keep in sync and it always drifts.
 * These cannot: they are the site, photographed.
 *
 * Not `ImageResponse` — that renders a flat subset of CSS with no canvas, so it
 * would draw the layout without the field, which is the only part worth sharing.
 *
 * The project cards frame the artefact AT REST in the field, and getting that
 * wrong first is what showed why. Photographing the FOCUSED state was the
 * obvious idea — it is the site's signature — but a focused artefact is a case
 * study, so every card came back as four paragraphs of body copy at thumbnail
 * size. The resting artefact is already what a link preview wants, and already
 * designed to be it: one image, the title, the tagline, the stack, set into the
 * lattice.
 *
 *   npm run og                    # dev server must be running on 3100
 *   npx tsx scripts/og.ts --only proof-lens
 */
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";
import { getProjectSlugs } from "@/lib/content";

const BASE = process.env.OG_URL ?? "http://localhost:3100";

const SITE_CARD = path.join(process.cwd(), "src", "app", "opengraph-image.jpg");
const PROJECT_CARD_DIR = path.join(process.cwd(), "public", "og");

/* The same photograph as `SITE_CARD`, at an address code can name.
   Next serves the app-directory file from a content-hashed URL it computes at
   build, which nothing in `src/` can reference — so a project added but not yet
   photographed has no card to fall back to. This copy is that fallback. */
const SITE_CARD_ALIAS = path.join(PROJECT_CARD_DIR, "site.jpg");

/** Facebook and LinkedIn both crop toward this; 1200x630 is the safe shape. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Shot wider than the OG frame and cropped down, so the type is not rendered
 *  at a size the page never actually uses. */
const SHOT_WIDTH = 1440;
const SHOT_HEIGHT = 900;

/** Device pixels per CSS pixel. Three, not two: a project crop is a fraction of
 *  the viewport, and at 2x the smaller artefacts would be enlarged past their
 *  captured resolution on the way to 1200px wide. */
const SCALE = 3;

/** How much of a card one artefact takes, in whichever dimension binds. The
 *  remainder is lattice, which is the part that makes the image recognisably
 *  this site rather than a screenshot of a component. */
const ARTEFACT_SHARE = 0.78;

const OG_RATIO = OG_HEIGHT / OG_WIDTH;

type Rect = { x: number; y: number; width: number; height: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * The region of the viewport a card is cut from.
 *
 * Centred on the artefact, widened until the artefact occupies
 * `ARTEFACT_SHARE` of it, then pushed back inside the viewport if that ran it
 * over an edge — which it does for every flank artefact, on one side or the
 * other.
 *
 * **Sized by whichever dimension binds, which is nearly always the height.** An
 * artefact is roughly square once its caption is counted; the card is 1.9:1. So
 * fitting the width and trusting the height to follow crops the tagline off the
 * bottom of every one of them, which is what the first attempt did.
 *
 * Never narrower than the card is wide in device pixels, so the result is
 * always a downsample.
 */
function frame(box?: Rect): Rect {
  // The site card: the full width of the page, from the top.
  if (!box) {
    return { x: 0, y: 0, width: SHOT_WIDTH, height: SHOT_WIDTH * OG_RATIO };
  }

  const needed = Math.max(box.width, box.height / OG_RATIO) / ARTEFACT_SHARE;
  const width = clamp(needed, OG_WIDTH / SCALE, SHOT_WIDTH);
  const height = Math.min(width * OG_RATIO, SHOT_HEIGHT);

  return {
    x: clamp(box.x + box.width / 2 - width / 2, 0, SHOT_WIDTH - width),
    y: clamp(box.y + box.height / 2 - height / 2, 0, SHOT_HEIGHT - height),
    width,
    height,
  };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/**
 * The entrance sequence settles the artefacts into the lattice, and shooting
 * before it finishes captures a half-assembled page.
 *
 * Infinite and scroll-driven animations are excluded and the wait is raced
 * against a timer, for exactly the reason `scripts/shoot.ts` does the same: the
 * arrival animation is driven by a view timeline and its `finished` promise
 * never resolves, so waiting on all of them hung this script indefinitely. The
 * rule this project already had — every animation gets a timer guard as well as
 * its `finished` promise — applies to the tooling too.
 */
async function settle(page: Page): Promise<void> {
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
}

/** Crops a viewport shot down to one card and writes it. */
async function writeCard(shot: Buffer, out: string, box?: Rect) {
  const region = frame(box);

  await sharp(shot)
    .extract({
      left: Math.round(region.x * SCALE),
      top: Math.round(region.y * SCALE),
      width: Math.round(region.width * SCALE),
      height: Math.round(region.height * SCALE),
    })
    .resize(OG_WIDTH, OG_HEIGHT)
    /* JPEG, not PNG, and measured rather than assumed. These are photographs of
       a starfield over a gradient — the two things PNG is worst at — and the
       cards came out at 940kb each, 6.3MB across the set, for images whose only
       job is to be fetched by a scraper on someone else's timeout. At quality
       92 with no chroma subsampling the file is 88kb and a 1:1 comparison of
       the lattice, the stars and the gradient shows no visible difference.

       WebP is smaller again and was rejected: X and LinkedIn are unreliable
       with it, and a card that sometimes fails to render is worth less than a
       card that is 30kb larger. */
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(out);

  console.log(`  ${path.relative(process.cwd(), out)}`);
}

async function main() {
  const only = arg("only");
  const slugs = getProjectSlugs().filter((s) => !only || s === only);

  if (only && slugs.length === 0) {
    throw new Error(`no project named "${only}"`);
  }

  await mkdir(PROJECT_CARD_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: SHOT_WIDTH, height: SHOT_HEIGHT },
    deviceScaleFactor: SCALE,
  });

  console.log(`photographing ${BASE} at ${SHOT_WIDTH}x${SHOT_HEIGHT}`);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await settle(page);

  if (!only) {
    const home = await page.screenshot();
    await writeCard(home, SITE_CARD);
    await writeCard(home, SITE_CARD_ALIAS);
  }

  for (const slug of slugs) {
    const artefact = page.locator(`[data-artefact="${slug}"]`).first();
    await artefact.waitFor({ timeout: 15000 });

    /* Everything except this project, hidden before the shutter.

       A card is 1.9:1 and an artefact is roughly square once its caption is
       counted, so any crop that contains one whole artefact also contains most
       of its neighbours — and at this scale About's paragraphs came out larger
       and more legible than the project the card is supposedly about.

       Omission, not rewriting: the layout is untouched, so the lattice still
       dents where the hidden artefacts sit and the field keeps its real shape.
       That is the same line decision 23 drew photographing Revenue OS, and it
       is the line that matters — nothing here is moved, resized or invented to
       make the picture better. */
    const hidden = await page.addStyleTag({
      content: `
        [data-artefact]:not([data-artefact="${slug}"]),
        [aria-labelledby="about-heading"],
        /* Sits just above the first row, so centring a top-flank artefact
           leaves the bottom half of it clipped along the card's top edge. */
        #work-heading {
          opacity: 0 !important;
        }`,
    });

    /* Into the middle of the viewport, and only then measured. The arrival is
       driven by a view timeline, so an artefact that has never been scrolled
       past is still sitting on its `opacity: 0` keyframe — the same reason
       `shoot.ts` has to neutralise that animation before a full-page capture.
       Centring it both runs the timeline and leaves the crop room on every
       side. Nothing is transformed at rest, so the box is safe to measure. */
    await artefact.evaluate((node) =>
      node.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await settle(page);

    const box = await artefact.boundingBox();
    if (!box) throw new Error(`${slug}: artefact has no box to frame`);

    await writeCard(
      await page.screenshot(),
      path.join(PROJECT_CARD_DIR, `${slug}.jpg`),
      box,
    );

    await hidden.evaluate((node: Element) => node.remove());
  }

  await browser.close();
  console.log(`${OG_WIDTH}x${OG_HEIGHT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
