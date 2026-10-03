/**
 * The five app icons the phone springboard is built from.
 *
 * Four of the five projects shipped with a logo. This one did not, because it
 * never had a front end to put one on — so the mark is drawn to join that set
 * rather than to start a new one: a letterform-scale symbol in brushed silver
 * on black, with a single coloured element, which is the pattern the other four
 * already follow (Melody's green clef, Proof-Lens's blue aperture, Replay's
 * violet play).
 *
 * The symbol is a detection reticle over four bars — the four classes, ranked,
 * with the winning one picked out. It says what the project does at 72px, which
 * a letterform would not.
 *
 *   npm run figures
 */
import sharp from "sharp";
import path from "node:path";

const OUT = path.join(
  process.cwd(),
  "public",
  "projects",
  "age-group-detection",
  "icon.png",
);

const OUT_REVENUE = path.join(
  process.cwd(),
  "public",
  "projects",
  "revenue-os",
  "icon.png",
);

/** Zain's own logos, which only need resizing. Gitignored source, so this
 *  regenerates on his machine and not in CI. */
const SUPPLIED: Record<string, string> = {
  "proof-lens": "prooflens.png",
  melody: "melody.png",
  replay: "replay.png",
  iou: "iou.png",
  river: "river.png",
};

/** What the springboard actually renders at, doubled for density. */
const ICON_PX = 512;

/** Matches the supplied logos, so the set can be treated identically. */
const SIZE = 1254;

/** Relative bar lengths, in the reported accuracy order. The longest is the one
 *  that won; see scripts/figure-age-groups.ts for the figures themselves. */
const BARS = [0.52, 0.66, 0.8, 1];
const WINNER = 3;

const bar = (i: number) => {
  const y = 470 + i * 108;
  const w = 300 + BARS[i] * 320;
  const fill = i === WINNER ? "url(#accent)" : "url(#steel)";
  return `<rect x="316" y="${y}" width="${w}" height="58" rx="29" fill="${fill}"/>`;
};

/** Corner brackets, drawn as four rotations of one L. */
const bracket = (rotation: number) =>
  `<path d="M232 352 L232 232 L352 232" fill="none" stroke="url(#steel)"
     stroke-width="34" stroke-linecap="round" stroke-linejoin="round"
     transform="rotate(${rotation} 627 627)"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1254 1254">
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff"/>
      <stop offset="18%"  stop-color="#c9d2e0"/>
      <stop offset="46%"  stop-color="#7d8798"/>
      <stop offset="54%"  stop-color="#e8edf5"/>
      <stop offset="82%"  stop-color="#98a2b3"/>
      <stop offset="100%" stop-color="#5d6675"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#bcd6ff"/>
      <stop offset="42%"  stop-color="#5b8ae8"/>
      <stop offset="58%"  stop-color="#86b5ff"/>
      <stop offset="100%" stop-color="#2b4fa0"/>
    </linearGradient>
  </defs>

  <rect width="1254" height="1254" fill="#000000"/>
  ${[0, 90, 180, 270].map(bracket).join("\n  ")}
  ${BARS.map((_, i) => bar(i)).join("\n  ")}
</svg>`;

/* Revenue OS has no logo either, and no interface that can be shown. Its mark is
   the thing the system is actually about: a gate that will not open without a
   countersignature. Same brushed-silver family, same single coloured element. */
const revenueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1254 1254">
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff"/>
      <stop offset="18%"  stop-color="#c9d2e0"/>
      <stop offset="46%"  stop-color="#7d8798"/>
      <stop offset="54%"  stop-color="#e8edf5"/>
      <stop offset="82%"  stop-color="#98a2b3"/>
      <stop offset="100%" stop-color="#5d6675"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#bcd6ff"/>
      <stop offset="45%"  stop-color="#5b8ae8"/>
      <stop offset="60%"  stop-color="#86b5ff"/>
      <stop offset="100%" stop-color="#2b4fa0"/>
    </linearGradient>
  </defs>

  <rect width="1254" height="1254" fill="#000000"/>

  <!-- the shackle: an approval that has to be granted before anything passes -->
  <path d="M430 566 V440 a197 197 0 0 1 394 0 V566"
        fill="none" stroke="url(#steel)" stroke-width="76" stroke-linecap="round"/>

  <!-- the body: a ledger of three entries, the last one verified -->
  <rect x="330" y="566" width="594" height="420" rx="74" fill="url(#steel)"/>
  <rect x="430" y="676" width="394" height="42" rx="21" fill="#0b0d12" opacity="0.55"/>
  <rect x="430" y="762" width="394" height="42" rx="21" fill="#0b0d12" opacity="0.55"/>
  <rect x="430" y="848" width="394" height="42" rx="21" fill="url(#accent)"/>
</svg>`;

async function main() {
  await sharp(Buffer.from(svg)).resize(ICON_PX, ICON_PX).png().toFile(OUT);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);

  await sharp(Buffer.from(revenueSvg))
    .resize(ICON_PX, ICON_PX)
    .png()
    .toFile(OUT_REVENUE);
  console.log(`wrote ${path.relative(process.cwd(), OUT_REVENUE)}`);

  for (const [slug, file] of Object.entries(SUPPLIED)) {
    const from = path.join(
      process.cwd(),
      "assets",
      "raw",
      "projects",
      "project_logos",
      file,
    );
    const to = path.join(process.cwd(), "public", "projects", slug, "icon.png");
    await sharp(from).resize(ICON_PX, ICON_PX).png().toFile(to);
    console.log(`wrote ${path.relative(process.cwd(), to)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
