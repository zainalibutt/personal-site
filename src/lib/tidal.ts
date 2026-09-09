/**
 * Tidal text — the wanderer's pull, applied to what is written on the plane.
 *
 * The lattice has always bent under the wanderer. This lets the page's own text
 * bend with it, but only when nobody is reading, and it stops the instant
 * anybody is.
 *
 * **The contract, in order of importance.**
 *
 * 1. It runs only after a real idle — no pointer, no scroll, no key, no touch,
 *    for `IDLE_MS`. A reader is idle by any definition a machine can check, so
 *    the interval is long and the onset is slow: someone still reading gets a
 *    drift they will not notice before their next twitch of the mouse cancels
 *    it.
 * 2. Any input ends it. That single rule is what makes the whole feature safe,
 *    because the moment a visitor engages, the page is still again.
 * 3. It never runs while an artefact is focused, and never on a project route.
 *    Reading a case study is precisely when this must not happen.
 *
 * **Direction is inward**, with the lattice, not outward with the starlight.
 * `SpacetimeField` bends light outward because light passes by a mass; glyphs
 * sit *on* the sheet, so they go the way the sheet goes. That is a new rule
 * rather than a contradiction of the one in ARCHITECTURE §7, and it is the
 * difference between a tug and a lens.
 *
 * **Granularity is the effect.** Transforming a ten-line paragraph as one box
 * reads as the paragraph sliding. Transforming each block separately — every
 * About paragraph, the heading, the portrait, each part of a caption — makes
 * them lean by different amounts at different distances, and the column
 * visibly shears. That shear is the thing worth looking at; a uniform slide is
 * not.
 *
 * **Resting positions are measured once, at onset.** Re-measuring an element
 * that is currently transformed is the project's oldest hazard, and here it
 * would compound every frame. Nothing scrolls or reflows during an idle — a
 * scroll ends the idle — so one measurement holds for the whole run.
 */

/** How long with no input at all before it begins. */
const IDLE_MS = 25_000;

/** Slow in, quick out. The onset must be missable; the cancel must not be. */
const RAMP_IN_MS = 3_000;
const RAMP_OUT_MS = 300;

/** How often to check for idleness while dormant. Cheap, and nowhere near a
 *  frame loop — nothing is animating at this point. */
const POLL_MS = 500;

/**
 * The field acting on text.
 *
 * The same radius as the wanderer's pull on the lattice, so it reads as one
 * mass rather than two overlapping effects, and a much smaller peak: the
 * lattice moves about 32px at its deepest, and text doing that would be
 * illegible rather than distorted.
 */
const TIDAL_RADIUS = 340;
const TIDAL_PULL = 9;

/** As in `displace`: a vertex — here a block of text — may never travel more
 *  than this fraction of its distance to the mass, so nothing can reach it,
 *  cross it, or collide with its neighbour. */
const MAX_TRAVEL = 0.32;

/** Below this the wanderer itself does not run, so neither does this. */
const MIN_WIDTH = 1200;

interface Target {
  el: HTMLElement;
  /** Resting centre, in viewport coordinates, measured once at onset. */
  cx: number;
  cy: number;
}

/* Module state behind accessors, never exported as bindings.
   The React Compiler treats a module-level `let` read twice in a compiled hook
   as a single read — see the hazard table in docs/DECISIONS.md. Nothing here is
   read from a component, but the rule is cheap to keep. */
let enabled = false;
let started = false;
let lastInput = 0;
let progress = 0;
let raf = 0;
let poll = 0;
let targets: Target[] = [];
let wanderX = 0;
let wanderY = 0;
let lastFrame = 0;

/** How far the effect has ramped, 0 to 1. Read by `SpacetimeField`, which eases
 *  its own About-avoidance off by the same amount — the wanderer cannot tug the
 *  reading column while it is still being pushed away from it. */
export function tidalProgress(): number {
  return progress;
}

/** Called by `SpacetimeField` every frame with the wanderer's viewport
 *  position. The canvas publishes a `data-wander` attribute too, but only
 *  outside production, so this is the channel that actually exists. */
export function publishWanderer(x: number, y: number): void {
  wanderX = x;
  wanderY = y;
}

function eligible(): boolean {
  return (
    enabled &&
    window.innerWidth >= MIN_WIDTH &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    document.visibilityState === "visible"
  );
}

function measure(): void {
  targets = [];
  for (const el of document.querySelectorAll<HTMLElement>("[data-tidal]")) {
    const r = el.getBoundingClientRect();
    /* A `display: none` element measures as a zero box at the origin, which
       would put it 0,0 and drag it toward the top-left corner of the viewport
       for the whole run. The About column has one of these at every width —
       the phone copy and the desktop copy are separate elements, and one of
       them is always hidden. */
    if (r.width === 0 || r.height === 0) continue;
    targets.push({ el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
  }
  for (const t of targets) t.el.style.willChange = "transform";
}

function release(): void {
  for (const t of targets) {
    t.el.style.transform = "";
    t.el.style.willChange = "";
  }
  targets = [];
}

function paint(): void {
  for (const t of targets) {
    const vx = wanderX - t.cx;
    const vy = wanderY - t.cy;
    const distanceSq = vx * vx + vy * vy;
    const distance = Math.sqrt(distanceSq) || 1;
    const falloff = 1 / (1 + distanceSq / (TIDAL_RADIUS * TIDAL_RADIUS));
    const travel =
      Math.min(TIDAL_PULL * falloff, distance * MAX_TRAVEL) * progress;
    const amount = travel / distance;
    /* Inward: the sign is positive toward the mass. Sub-pixel on purpose —
       rounding makes the shear step between blocks instead of flowing. */
    const dx = (vx * amount).toFixed(2);
    const dy = (vy * amount).toFixed(2);
    t.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }
}

function frame(now: number): void {
  const dt = lastFrame ? now - lastFrame : 16;
  lastFrame = now;

  const idle = now - lastInput >= IDLE_MS;
  const wanted = idle && eligible();

  progress += wanted ? dt / RAMP_IN_MS : -(dt / RAMP_OUT_MS);
  progress = Math.max(0, Math.min(1, progress));

  if (progress === 0) {
    release();
    raf = 0;
    lastFrame = 0;
    return;
  }

  paint();
  raf = requestAnimationFrame(frame);
}

function wake(): void {
  /* `performance.now()` rather than Date.now(): the idle clock must not move
     when the system clock does. */
  lastInput = performance.now();
}

function check(): void {
  if (raf) return;
  if (performance.now() - lastInput < IDLE_MS) return;
  if (!eligible()) return;
  measure();
  lastFrame = 0;
  raf = requestAnimationFrame(frame);
}

const INPUTS = [
  "pointermove",
  "pointerdown",
  "touchstart",
  "wheel",
  "scroll",
  "keydown",
] as const;

/**
 * Starts the system. Idempotent; the listeners are attached once for the life
 * of the document and the feature is gated by `setTidalEnabled` instead, so a
 * route change costs a boolean rather than a teardown.
 */
export function startTidal(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  wake();

  for (const type of INPUTS) {
    window.addEventListener(type, wake, { passive: true });
  }
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("resize", wake);

  poll = window.setInterval(check, POLL_MS);
}

/** Turns the effect off without tearing anything down — used for route changes
 *  and for the moment an artefact takes focus. Releases immediately rather than
 *  ramping, because the reason for switching off is that something now needs
 *  reading. */
export function setTidalEnabled(next: boolean): void {
  enabled = next;
  wake();
  if (!next && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    progress = 0;
    release();
  }
}

export function stopTidal(): void {
  if (!started) return;
  started = false;
  for (const type of INPUTS) window.removeEventListener(type, wake);
  document.removeEventListener("visibilitychange", wake);
  window.removeEventListener("resize", wake);
  window.clearInterval(poll);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  progress = 0;
  release();
}
