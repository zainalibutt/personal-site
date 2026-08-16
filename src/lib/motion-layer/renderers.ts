import { setFocus } from "./registry";
import type { MorphRequest, MotionRenderer, Rect } from "./types";

/**
 * Renderer implementations.
 *
 * `domRenderer` is the shipping one. It runs an inverted-transform (FLIP)
 * animation through the Web Animations API on a SINGLE element — the preview
 * surface — so it composites off the main thread and never measures or moves
 * the case-study body. That restriction is the whole point: the review
 * rejected FLIP over content-heavy subtrees (docs/ARCHITECTURE.md §1).
 */

/** Warm, slightly overshooting. */
const OPEN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOSE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
const OPEN_DURATION = 520;
const CLOSE_DURATION = 380;

function invert(from: Rect, to: Rect): string {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

export const domRenderer: MotionRenderer = {
  name: "dom",

  supported() {
    return (
      typeof document !== "undefined" &&
      typeof Element !== "undefined" &&
      typeof Element.prototype.animate === "function"
    );
  },

  async morph({ from, to, element, direction }: MorphRequest) {
    // invert() maps rects assuming the element scales from its top-left. The
    // CSS default is centre, which silently offsets the whole morph — so set it
    // here rather than trusting every caller to remember.
    element.style.transformOrigin = "0 0";

    const inverted = invert(from, to);
    const opening = direction === "in";

    const animation = element.animate(
      opening
        ? [{ transform: inverted }, { transform: "none" }]
        : [{ transform: "none" }, { transform: inverted }],
      {
        duration: opening ? OPEN_DURATION : CLOSE_DURATION,
        easing: opening ? OPEN_EASING : CLOSE_EASING,
        fill: "both",
      },
    );

    // Publish progress imperatively so a future renderer (or any decorative
    // layer) can follow the morph without React re-rendering.
    let frame = 0;
    const tick = () => {
      const timing = animation.effect?.getComputedTiming();
      const progress = timing?.progress ?? 0;
      setFocus(null, opening ? progress : 1 - progress);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    try {
      await animation.finished;
    } catch {
      // Cancelled mid-flight by a fast close. Not an error.
    } finally {
      cancelAnimationFrame(frame);
      animation.cancel();
    }
  },
};

/**
 * The reduced-motion path. A short opacity fade with no positional movement.
 * Fully functional, not a stub — it is the accessibility contract
 * (docs/ARCHITECTURE.md §2.6).
 */
export const reducedMotionRenderer: MotionRenderer = {
  name: "reduced-motion",

  supported() {
    return domRenderer.supported();
  },

  async morph({ element, direction }: MorphRequest) {
    const opening = direction === "in";
    const animation = element.animate(
      opening ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: 120, easing: "linear", fill: "both" },
    );
    try {
      await animation.finished;
    } catch {
      // Cancelled. Fine.
    } finally {
      animation.cancel();
    }
  },
};

/** How far the field travels toward the focused card. 0 = none, 1 = centred. */
const CAMERA_TRAVEL = 0.4;
const CAMERA_SCALE = 1.14;

/**
 * Pushes the whole project field toward the focused card, so opening a project
 * reads as the camera moving into that sector rather than the card relocating
 * to the middle. Visible behind the blurred backdrop; this is the literal form
 * of "depth, not distance".
 */
/**
 * The transform currently holding the field open. Remembered so the close can
 * animate from exactly what the open ended on, rather than re-deriving it from
 * a rect that is itself being measured *through* the pushed transform — which
 * drifts a little further out on every cycle.
 */
let activePush: string | null = null;

export function resetCamera(field: HTMLElement): void {
  for (const animation of field.getAnimations()) animation.cancel();
  field.style.transform = "";
  activePush = null;
}

export function cameraPush(
  field: HTMLElement,
  focus: Rect,
  direction: "in" | "out",
): void {
  if (prefersReducedMotion() || !domRenderer.supported()) return;

  // Always start from a known-clean state. Without this a repeated open (Strict
  // Mode in dev, a fast reopen in production) stacks a second push on the first
  // and the field never returns to rest.
  for (const animation of field.getAnimations()) animation.cancel();

  if (direction === "out") {
    const from = activePush;
    activePush = null;
    if (!from) {
      field.style.transform = "";
      return;
    }
    const closing = field.animate(
      [{ transform: from }, { transform: "none" }],
      { duration: CLOSE_DURATION, easing: CLOSE_EASING, fill: "both" },
    );

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      closing.cancel();
      field.style.transform = "";
    };

    // `finished` never settles while the document timeline is frozen — a
    // backgrounded tab, or a hidden preview pane. The animation would then hold
    // its `fill: both` start frame and leave the field pushed forever, so the
    // reset is guaranteed on a timer rather than trusted to the promise.
    const guard = setTimeout(settle, CLOSE_DURATION + 120);
    void closing.finished.then(settle).catch(settle);
    return;
  }

  const focusCentreX = focus.x + focus.width / 2;
  const focusCentreY = focus.y + focus.height / 2;
  const dx = (window.innerWidth / 2 - focusCentreX) * CAMERA_TRAVEL;
  const dy = (window.innerHeight / 2 - focusCentreY) * CAMERA_TRAVEL;
  const pushed = `translate(${dx}px, ${dy}px) scale(${CAMERA_SCALE})`;
  activePush = pushed;

  field.animate([{ transform: "none" }, { transform: pushed }], {
    duration: OPEN_DURATION,
    easing: OPEN_EASING,
    fill: "forwards",
  });
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Capability gate. Called per morph so a mid-session preference change wins. */
export function selectRenderer(): MotionRenderer {
  if (prefersReducedMotion()) return reducedMotionRenderer;
  if (domRenderer.supported()) return domRenderer;
  return reducedMotionRenderer;
}
