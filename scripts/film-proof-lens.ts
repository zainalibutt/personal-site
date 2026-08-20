/**
 * Proof-Lens card preview.
 *
 * Opens on the product's own homepage, then travels to a shared verification
 * link — the public route that sits outside `AuthenticatedShell`, so a
 * recruiter can walk it with no account. The film uploads the real original
 * photo from the committed evidence bundle and records the verdict the API
 * actually returns.
 *
 * Nothing is staged. The digest on screen is the SHA-256 of the file being
 * uploaded, the signature is the one the capture device produced, and the
 * timestamp is the RFC 3161 token from April 2026. If the API said no, this
 * film would show it saying no.
 *
 *   PL_SHARE_URL="https://proof-lens.vercel.app/verify/s/<token>" npm run film:pl
 *
 * The share link must point at capture `baf3a498-c930-4b3f-a827-4a924f8c985b`,
 * because that is the capture the committed original belongs to. A link for any
 * other capture verifies the wrong file and legitimately fails — which is the
 * system working, but not the shot.
 */
import path from "node:path";
import { film } from "./film-lib";

/** The byte-exact original from Proof-Lens's own evidence bundle. A re-export
 *  would change the hash and fail verification for real. */
const ORIGINAL =
  process.env.PL_ORIGINAL ??
  path.join(
    process.cwd(),
    "..",
    "Proof-Lenss",
    "docs",
    "captureevidencebundle",
    "capture.jpg",
  );

const SHARE = process.env.PL_SHARE_URL;

async function main() {
  if (!SHARE) {
    throw new Error(
      "PL_SHARE_URL is not set — generate a share link for capture " +
        "baf3a498-c930-4b3f-a827-4a924f8c985b and pass it in.",
    );
  }
  const share = SHARE;

  await film({
    slug: "proof-lens",
    /* Opens where the product introduces itself, then travels to the shared
       link — which is the actual sequence a recruiter lives: read what this
       is, then follow a link someone sent them. Starting cold on a token URL
       showed a verification panel with no idea what was being verified. */
    url: "https://proof-lens.vercel.app",
    /* Tighter than a desktop window so the verdict is legible once the whole
       frame is 490 CSS px wide in the field. */
    viewport: { width: 900, height: 506 },
    /* The homepage, which is also frame 0 — so the still the card rests on and
       the first frame of playback are the same picture, and hovering starts
       the film rather than cutting to it. The verdict was tried here first and
       reads as anonymous UI fragments at card size; the masthead does not. */
    posterAt: 0.8,
    async scene(s) {
      /* Long enough to read "Capture proof. Verify independently." */
      await s.hold(2200);

      await s.goto(share, 1100);

      /* A real upload through the page's own input. The OS picker cannot be
         filmed, so the cursor arrives at the drop zone and the file lands —
         which is what a viewer sees when someone drags one in anyway. */
      await s.moveTo(".vdz", 700);
      await s.page.locator("input[type=file]").first().setInputFiles(ORIGINAL);
      /* Long enough to read the filename and size the zone now shows. */
      await s.hold(1000);

      await s.click("button:has-text('Verify Capture')", 520);

      /* The drop zone narrates itself while busy — hash, credentials,
         signature, anchor, 1.2s apart. Whatever the API's latency allows us to
         see is what the film shows; padding it to catch all four would be
         inventing a duration the software did not take. */
      await s.page.waitForSelector(".ep", { timeout: 30_000 });
      await s.hold(400);

      /* Frame each beat by the thing it is about, rather than by a wheel
         distance that only happens to work at one viewport height. */
      await s.scrollTo(".ep__header", 900);
      await s.hold(1800);

      /* The digest, and then the checks under it. This is the whole argument:
         the file that just went up hashes to the value the credential was
         signed over four months earlier. */
      await s.scrollTo(".ep__hash", 900);
      await s.hold(2000);

      await s.scrollTo(".ep__proofs", 900);
      await s.hold(2600);
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
