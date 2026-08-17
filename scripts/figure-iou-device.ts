/**
 * The IOU card image.
 *
 * IOU is the only phone-shaped artefact on a page of landscape ones. Declaring
 * a 4:3 card and letting `object-fit: contain` letterbox the screenshot left
 * two dark bands either side and shrank the device until the £66 bill was
 * unreadable — the same failure the flagship crops fixed, arriving by a
 * different route.
 *
 * So the dead space becomes the design: the capture is composed onto the site's
 * own ground at the card's real ratio, which means the card can go back to
 * `cover` and the device can be as large as the frame allows.
 *
 * Reads from `assets/raw/`, which is gitignored — this regenerates on Zain's
 * machine, not in CI.
 *
 *   npm run figures
 */
import sharp from "sharp";
import path from "node:path";

const SRC = path.join(
  process.cwd(),
  "assets",
  "raw",
  "projects",
  "iou",
  "review.png",
);
const OUT = path.join(process.cwd(), "public", "projects", "iou", "hero.png");

/** Matches the `aspectRatio` in iou.mdx. Change both together. */
const WIDTH = 1200;
const HEIGHT = 900;

/** Everything below this in the source is empty app background. */
const CROP = { left: 0, top: 0, width: 271, height: 460 };

const DEVICE_HEIGHT = 740;

/** The page's own ground, so the card reads as part of the field rather than as
 *  a tile pasted onto it. Mirrors the body gradient in globals.css. */
const ground = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
     <defs>
       <radialGradient id="g" cx="50%" cy="-8%" r="120%">
         <stop offset="0%" stop-color="#102046"/>
         <stop offset="42%" stop-color="#070d1e"/>
         <stop offset="100%" stop-color="#04070f"/>
       </radialGradient>
       <radialGradient id="c" cx="86%" cy="80%" r="70%">
         <stop offset="0%" stop-color="#2c94be" stop-opacity="0.16"/>
         <stop offset="100%" stop-color="#2c94be" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
     <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#c)"/>
   </svg>`,
);

async function main() {
  const device = await sharp(SRC)
    .extract(CROP)
    .resize({ height: DEVICE_HEIGHT })
    .png()
    .toBuffer();
  const { width = 0, height = 0 } = await sharp(device).metadata();

  // Blurred separately: compositing a hard ellipse and blurring afterwards
  // would blur the device with it.
  const shadow = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
         <ellipse cx="${WIDTH / 2}" cy="${(HEIGHT + height) / 2 - 10}"
                  rx="${width * 0.62}" ry="26" fill="#000" opacity="0.55"/>
       </svg>`,
    ),
  )
    .blur(34)
    .png()
    .toBuffer();

  await sharp(ground)
    .composite([
      { input: shadow },
      {
        input: device,
        top: Math.round((HEIGHT - height) / 2),
        left: Math.round((WIDTH - width) / 2),
      },
    ])
    .png()
    .toFile(OUT);

  console.log(
    `wrote ${path.relative(process.cwd(), OUT)} (${WIDTH}x${HEIGHT}, device ${width}x${height})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
