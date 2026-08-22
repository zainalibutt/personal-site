/**
 * Filming harness for artefact card previews.
 *
 * Follows the idiom `scripts/og.ts` already established: drive the real thing
 * with Playwright and commit what it produced. Nothing here composes or
 * interpolates a frame — every frame is a state the software actually painted,
 * which is the standard decision 23 set for the Revenue OS card.
 *
 * Capture is CDP `Page.startScreencast`, not Playwright's built-in
 * `recordVideo`. The built-in encodes soft VP8 at viewport size, and small type
 * downscaled into a ~490px card turns to mush. The screencast hands back real
 * painted frames at device resolution with timestamps, so a 2x capture can be
 * downscaled into the card and stay crisp.
 *
 * Two things the harness has to do that are easy to forget:
 *
 * 1. **Draw the cursor.** Playwright's recorded output does not contain the OS
 *    pointer — a filmed click looks like the page moving on its own. The cursor
 *    is a DOM element following a scripted path, kept in step with the real
 *    `page.mouse` so `:hover` fires when the drawn cursor arrives, not before.
 *
 * 2. **Ack every screencast frame.** Chrome emits nothing further until the
 *    previous frame is acknowledged. Miss one and the recording silently ends
 *    early while the script carries on happily to the end of the shot list.
 */
import { chromium, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

/** The drawn pointer. Prefixed so a page's own styles cannot reach it. */
const CURSOR_ID = "__film_cursor";

/** Frames arrive base64 with a wall-clock timestamp, in seconds. */
type ScreencastFrame = {
  data: string;
  sessionId: number;
  metadata: { timestamp?: number };
};

export type Target = string | { x: number; y: number };

export type Stage = {
  page: Page;
  /** Glide the cursor onto something and stop. Hover states fire on arrival. */
  moveTo(target: Target, ms?: number): Promise<void>;
  /** Glide, press, and really click — the app has to actually respond. */
  click(target: Target, ms?: number): Promise<void>;
  /** Type at a human rate into whatever holds focus. */
  type(text: string, perKey?: number): Promise<void>;
  /** Glide something into the middle of frame. Never jump — see below. */
  scrollTo(target: string, ms?: number): Promise<void>;
  /** Travel to another page mid-film, the way a sent link is opened. */
  goto(url: string, settle?: number): Promise<void>;
  /** Let the frame breathe. Shots without holds read as a seizure. */
  hold(ms: number): Promise<void>;
};

export type Film = {
  /** Writes to `public/projects/<slug>/preview.{mp4,webp}`. */
  slug: string;
  /** Where the film opens. */
  url: string;
  /** Somewhere other than `public/projects/<slug>`, for takes and dry runs. */
  outDir?: string;
  /**
   * Composed for the card, not for a desktop window. A 1280px page squeezed
   * into a 490px card is unreadable; a smaller viewport makes the same content
   * proportionally larger in frame.
   */
  viewport?: { width: number; height: number };
  /** Delivered width. The card renders ~490 CSS px, so 1024 is a 2x file. */
  outputWidth?: number;
  /** Seconds into the finished film to lift the poster frame from. */
  posterAt?: number;
  /** Anything to run before recording starts — logins, seeding, dismissals. */
  setup?: (stage: Stage) => Promise<void>;
  /** The shot list. */
  scene: (stage: Stage) => Promise<void>;
};

/* ── the drawn cursor ─────────────────────────────────────────────────── */

async function ensureCursor(page: Page): Promise<void> {
  await page.evaluate((id: string) => {
    if (document.getElementById(id)) return;
    const el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    /* An outlined arrow rather than a dot: a dot on a dark UI reads as a
       rendering artefact, and every real pointer anyone has seen is an arrow. */
    const svg =
      '<svg width="26" height="26" viewBox="0 0 26 26" fill="none">' +
      '<path d="M5 3 L5 20 L9.6 15.8 L12.4 22 L15.6 20.6 L12.8 14.6 L19 14.2 Z" ' +
      'fill="#ffffff" stroke="rgba(0,0,0,0.55)" stroke-width="1.1" ' +
      'stroke-linejoin="round"/></svg>';
    el.innerHTML = svg;
    el.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "z-index:2147483647",
      "pointer-events:none",
      "will-change:transform",
      "transform:translate3d(-100px,-100px,0)",
      "transition-property:transform",
      "transition-timing-function:cubic-bezier(.33,0,.15,1)",
      "transition-duration:0ms",
      "filter:drop-shadow(0 2px 6px rgba(0,0,0,.45))",
    ].join(";");
    document.body.appendChild(el);
  }, CURSOR_ID);
}

async function resolve(
  page: Page,
  target: Target,
): Promise<{ x: number; y: number }> {
  if (typeof target !== "string") return target;
  const locator = page.locator(target).first();
  /* Bring it into frame first. `page.mouse` takes viewport coordinates, so a
     control below the fold resolves to a y outside the viewport and the click
     lands on nothing — silently. The film then waits for a result that was
     never asked for, and fails thirty seconds later somewhere else entirely. */
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(220);
  const box = await locator.boundingBox();
  if (!box) throw new Error(`film: nothing to aim at for "${target}"`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/* ── recording ────────────────────────────────────────────────────────── */

async function startRecording(page: Page, dir: string, scale: number) {
  const client = await page.context().newCDPSession(page);
  const frames: { file: string; t: number }[] = [];
  const writes: Promise<void>[] = [];
  let n = 0;

  client.on("Page.screencastFrame", (params: ScreencastFrame) => {
    /* Ack before anything else. Chrome emits nothing further until the
       previous frame is acknowledged, and a recording that quietly stops
       halfway is indistinguishable from a shot list that finished. */
    void client
      .send("Page.screencastFrameAck", { sessionId: params.sessionId })
      .catch(() => undefined);

    const file = path.join(dir, `f${String(n++).padStart(5, "0")}.jpg`);
    frames.push({ file, t: params.metadata.timestamp ?? 0 });
    writes.push(fs.writeFile(file, Buffer.from(params.data, "base64")));
  });

  const view = page.viewportSize();
  await client.send("Page.startScreencast", {
    format: "jpeg",
    /* Near-lossless. The downscale into the card would hide far worse, but the
       poster is lifted from these same frames and is looked at still. */
    quality: 95,
    everyNthFrame: 1,
    maxWidth: Math.round((view?.width ?? 1000) * scale),
    maxHeight: Math.round((view?.height ?? 562) * scale),
  });

  return async function stop() {
    await client.send("Page.stopScreencast").catch(() => undefined);
    await Promise.all(writes);
    await client.detach().catch(() => undefined);
    return frames;
  };
}

/* ── encoding ─────────────────────────────────────────────────────────── */

/** Seconds of encoded video, straight from the container. */
async function duration(file: string): Promise<number> {
  const out = await capture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number.parseFloat(out.trim()) || 0;
}

function capture(cmd: string, args: string[]): Promise<string> {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString();
    });
    child.on("error", fail);
    child.on("close", () => ok(out));
  });
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });
    child.on("error", fail);
    child.on("close", (code) => {
      if (code === 0) ok();
      else fail(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`));
    });
  });
}

/* ── the harness ──────────────────────────────────────────────────────── */

export async function film(spec: Film): Promise<void> {
  const viewport = spec.viewport ?? { width: 1000, height: 562 };
  const outputWidth = spec.outputWidth ?? 1024;
  const scale = 2;

  const outDir =
    spec.outDir ?? path.join(process.cwd(), "public", "projects", spec.slug);
  const mp4 = path.join(outDir, "preview.mp4");
  const poster = path.join(outDir, "preview.webp");
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `film-${spec.slug}-`));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    /* Filming a site that honours `prefers-reduced-motion` with the flag set
       would record the stilled version of everything worth filming. */
    reducedMotion: "no-preference",
    storageState: process.env.FILM_STATE || undefined,
  });
  const page = await context.newPage();

  const stage: Stage = {
    page,
    async moveTo(target, ms = 620) {
      await ensureCursor(page);
      const { x, y } = await resolve(page, target);
      await page.evaluate(
        (a: { id: string; x: number; y: number; ms: number }) => {
          const el = document.getElementById(a.id);
          if (!el) return;
          el.style.transitionDuration = `${a.ms}ms`;
          el.style.transform = `translate3d(${a.x}px,${a.y}px,0)`;
        },
        { id: CURSOR_ID, x, y, ms },
      );
      /* Walk the real pointer along the same clock, so the page's hover states
         land when the drawn cursor arrives rather than the instant the move was
         requested. */
      const steps = Math.max(6, Math.round(ms / 40));
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(ms / steps);
      }
      await page.waitForTimeout(90);
    },
    async click(target, ms) {
      await stage.moveTo(target, ms);
      await page.evaluate((id: string) => {
        const el = document.getElementById(id);
        if (el) el.style.transform += " scale(.82)";
      }, CURSOR_ID);
      await page.waitForTimeout(90);
      const { x, y } = await resolve(page, target);
      await page.mouse.click(x, y);
      await page.evaluate((id: string) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.transform = el.style.transform.replace(" scale(.82)", "");
        }
      }, CURSOR_ID);
      await page.waitForTimeout(120);
    },
    async type(text, perKey = 55) {
      await page.keyboard.type(text, { delay: perKey });
    },
    /* Smooth, and measured from the element's real box rather than handed to
       `scrollIntoView`. Two reasons: a jump reads as a cut and emits almost no
       frames, so the beat it lands on gets swallowed by the hold clamp below;
       and `scrollIntoView` mis-centres absolutely positioned children — a
       floating panel that had just mounted stayed off frame entirely.
       Going through a Playwright locator also means `text=` works here. */
    async scrollTo(target, ms = 900) {
      const locator = page.locator(target).first();
      await locator.waitFor({ state: "visible", timeout: 15_000 });
      const box = await locator.boundingBox();
      if (!box) return;
      const height = page.viewportSize()?.height ?? 506;
      const delta = box.y + box.height / 2 - height / 2;
      if (Math.abs(delta) < 8) return;

      /* Stepped rather than `behavior: "smooth"`, which headless Chromium does
         not reliably honour — a beat that scrolled perfectly in a real browser
         simply never moved in the recording, and left the chart the command had
         just opened sitting below the frame. Stepping also guarantees a repaint
         per step, and the screencast only emits frames when something repaints.

         Driven from `window` rather than the wheel: Melody has panels with
         their own `overflow: auto`, and a wheel event scrolls whatever sits
         under the pointer rather than the page. */
      const steps = Math.max(10, Math.round(ms / 30));
      for (let i = 0; i < steps; i++) {
        await page.evaluate(
          (d: number) => window.scrollBy(0, d),
          delta / steps,
        );
        await page.waitForTimeout(ms / steps);
      }
    },
    /* The screencast is bound to the page, not the document, so it keeps
       emitting straight through a navigation. The drawn cursor does not
       survive one — it is a DOM node — but `moveTo` re-injects it, so the
       only cost is that the pointer is absent until the next move. */
    async goto(url, settle = 900) {
      await page.goto(url, { waitUntil: "networkidle" });
      await ensureCursor(page);
      await page.waitForTimeout(settle);
    },
    async hold(ms) {
      await page.waitForTimeout(ms);
    },
  };

  await page.goto(spec.url, { waitUntil: "networkidle" });
  /* Scrollbars are chrome, and an overlay scrollbar sliding down the right
     edge of a 490px card is the most distracting thing in the frame. */
  await page
    .addStyleTag({ content: "::-webkit-scrollbar{display:none}" })
    .catch(() => undefined);
  await ensureCursor(page);
  if (spec.setup) await spec.setup(stage);

  const stop = await startRecording(page, work, scale);
  await spec.scene(stage);
  await page.waitForTimeout(250);
  const frames = await stop();
  await browser.close();

  if (frames.length < 2) throw new Error("film: recorded nothing");

  /* Variable-rate in, constant 30fps out. A static hold emits no frames at
     all, so its duration lives in the concat list rather than in a thousand
     identical JPEGs. */
  const lines: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const raw = next ? next.t - frames[i].t : 1 / 30;
    /* A still page emits no frames at all, so a deliberate hold arrives here
       as one long gap. The ceiling exists to stop a genuine stall becoming a
       frozen eternity, but set too low it silently truncates every hold in the
       shot list — 13s of choreography came back as 9.9s of film. */
    const dur = Math.min(Math.max(raw, 1 / 60), 4);
    lines.push(`file '${frames[i].file.replace(/\\/g, "/")}'`);
    lines.push(`duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, "/")}'`);
  const list = path.join(work, "frames.txt");
  await fs.writeFile(list, lines.join("\n"));

  await fs.mkdir(outDir, { recursive: true });
  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    /* JPEG frames arrive full-range, and carrying that through tags the file
       `yuvj420p`. Players then re-expand already-expanded levels and the deep
       space ground the card sits on comes back with lifted blacks. Convert to
       limited range explicitly rather than trusting `-pix_fmt` alone. */
    "-vf",
    `scale=${outputWidth}:-2:flags=lanczos:in_range=pc:out_range=tv,` +
      `format=yuv420p,fps=30`,
    "-fps_mode",
    "cfr",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "21",
    "-preset",
    "slow",
    "-g",
    "60",
    "-color_range",
    "tv",
    "-movflags",
    "+faststart",
    "-an",
    mp4,
  ]);

  /* Lifted from the encoded file, not from a source frame, so the poster is
     a frame the video will actually show. Anything else makes the
     poster-to-video handover jump. */
  const still = path.join(work, "poster.png");
  await run("ffmpeg", [
    "-y",
    "-ss",
    String(spec.posterAt ?? 0.6),
    "-i",
    mp4,
    "-frames:v",
    "1",
    still,
  ]);
  await sharp(still).webp({ quality: 82 }).toFile(poster);

  const { size } = await fs.stat(mp4);
  /* Measured off the encoded file, not off the capture clock. Those disagree
     whenever a hold hits the ceiling above, and reporting the intended length
     rather than the delivered one hides exactly the beats that got cut. */
  const secs = await duration(mp4);
  const where = path.relative(process.cwd(), outDir).replace(/\\/g, "/");
  console.log(
    `wrote ${where}/preview.mp4 ` +
      `(${outputWidth}px, ${secs.toFixed(1)}s, ${(size / 1024).toFixed(0)}kB, ` +
      `${frames.length} frames)`,
  );
  console.log(`wrote ${where}/preview.webp`);

  await fs.rm(work, { recursive: true, force: true });
}
