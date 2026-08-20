"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, setFocusState } from "@/lib/motion-layer";
import { DURATION, EASE } from "@/lib/motion";
import {
  type Frame,
  frameOn,
  heldFrame,
  holdFrame,
  midFrame,
  toTransform,
} from "@/lib/camera";

/**
 * Zooms the page into an artefact.
 *
 * The page is one plane. Focusing an artefact does two things at once:
 *
 * 1. The artefact grows **in plane coordinates**, around its own centre, so its
 *    four corners travel outward. It is absolutely positioned inside a slot
 *    that keeps its footprint, so nothing else reflows.
 * 2. The plane itself translates and scales so that artefact fills the frame.
 *
 * The second part is what makes this a camera move rather than a panel opening
 * on top of the page. Everything else — About, the other artefacts — keeps its
 * exact spatial relationship and simply moves and grows with the plane. About
 * is still to the right of Proof-Lens when Proof-Lens is open; it is just off
 * the edge of the frame.
 *
 * This is also why there is no backdrop. Dimming the surroundings would defeat
 * the whole idea.
 *
 * ## Travelling straight from one artefact to another
 *
 * The camera can also move between two focused artefacts without resting at
 * home in between. That is one route change, so both hooks re-run in the same
 * commit — the one being left and the one being arrived at — and React orders
 * them by DOM position, which is not something to build on.
 *
 * The handover is therefore explicit and symmetric, so it holds whichever hook
 * runs first: the **arriving** artefact owns the camera and travels from
 * whatever framing it finds, and the **departing** artefact collapses its own
 * box and does not touch the plane at all. Before this, the departing hook's
 * restore timer fired 580ms into the arriving hook's 660ms camera move and
 * cancelled it, leaving an artefact expanded with the camera at identity.
 */

/**
 * Fraction of the viewport the focused artefact occupies once framed.
 * The zoom is derived from these, not fixed.
 */
const FRAME_W = 0.7;
const FRAME_H = 0.86;

/** Keeps the camera sane on very wide or very narrow viewports. */
const MIN_ZOOM = 1.15;
const MAX_ZOOM = 2.6;

/** Clearance left between a growing artefact and the centre column. */
const SPINE_GAP = 28;

/** Below this the plane does not move; the artefact just opens near-fullscreen. */
const DESKTOP_MIN = 1024;

const OPEN_MS = DURATION.open;
const CLOSE_MS = DURATION.close;
const TRAVEL_MS = DURATION.travel;
const OPEN_EASE = EASE.out;
const CLOSE_EASE = EASE.inOut;
const RADIUS = 16;

function cancel(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel();
}

function getPlane(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-plane]");
}

/**
 * Returns the plane to identity so it can be measured untransformed.
 *
 * Deliberately does **not** touch the held framing. Clearing the transform is a
 * DOM operation and releasing the camera is a state change, and an open needs
 * the first without the second — it has to measure at identity while still
 * knowing where it is travelling from.
 *
 * The transition is suppressed across the change, and the change is flushed
 * before it is restored. Under `prefers-reduced-motion` the site's global
 * override gives *every* element `transition-duration: 0.01ms` — non-zero — so
 * clearing the transform starts a real transition, and a transition reports its
 * start value for the rest of the tick. Everything measured next then comes
 * back through a camera that is supposedly no longer there: an artefact
 * travelled to under reduced motion read its spine clearance through the
 * previous artefact's 2x framing and framed itself at 1.4x instead of 2x.
 */
function clearPlaneTransform(plane: HTMLElement): void {
  cancel(plane);
  const previous = plane.style.transitionProperty;
  plane.style.transitionProperty = "none";
  plane.style.transform = "";
  void plane.offsetWidth;
  plane.style.transitionProperty = previous;
}

/** The point a framed artefact is held at. */
function viewportCentre() {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Works out how far an artefact may grow, and how hard the camera pushes in.
 *
 * The artefact grows only as far as its own column allows — never across the
 * centre spine, because that is what puts it *on top of* About instead of
 * beside it. The zoom then does the rest of the work of filling the frame.
 *
 * Because the artefact stays small in plane space and the camera is doing the
 * magnifying, its content has to be authored at screen size and counter-scaled
 * by 1/zoom. That is what keeps body copy at 1x however far the camera pushes.
 *
 * **Reads rects, so the plane must be at identity.** The spine clearance is a
 * distance, and a distance measured through a 2x camera comes back twice as
 * generous — which would let the artefact grow across the spine on a travel.
 * `layoutExpanded` clears the transform before calling this.
 */
function frame(slot: HTMLElement, desktop: boolean) {
  const restWidth = slot.offsetWidth;
  const restHeight = slot.offsetHeight;

  if (!desktop) {
    const width = window.innerWidth - 32;
    return {
      width,
      height: window.innerHeight * 0.88,
      zoom: 1,
      restWidth,
      restHeight,
    };
  }

  const slotRect = slot.getBoundingClientRect();
  const centre = slotRect.left + slotRect.width / 2;
  const spine = document.querySelector<HTMLElement>("[data-spine]");

  // Half-width available before the artefact would cross the spine.
  let halfLimit = Number.POSITIVE_INFINITY;
  if (spine) {
    const spineRect = spine.getBoundingClientRect();
    halfLimit =
      centre < spineRect.left
        ? spineRect.left - SPINE_GAP - centre
        : centre - (spineRect.right + SPINE_GAP);
  }

  const width = Math.max(restWidth, Math.min(restWidth * 1.6, halfLimit * 2));
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, (window.innerWidth * FRAME_W) / width),
  );
  const height = (window.innerHeight * FRAME_H) / zoom;

  return { width, height, zoom, restWidth, restHeight };
}

/** What the collapsed state looks like, in the artefact's own coordinates. */
interface RestGeometry {
  /** Clip window at rest: the artefact's resting rect inside the opened box. */
  inset: { top: number; right: number; bottom: number; left: number };
  /** Transform that puts the expanded hero back over the resting one. */
  heroFrom: string | null;
}

/**
 * Writes the expanded geometry onto the artefact and works out where the camera
 * has to sit. Shared by the opening transition, the resize handler and the
 * travel, so the framing can never drift out of step with the viewport.
 *
 * **Clears the plane transform first.** Everything measured here is either a
 * layout value or a rect that must be read in plane coordinates. The caller
 * applies the returned frame afterwards.
 */
function layoutExpanded(
  slot: HTMLElement,
  box: HTMLElement,
  hero: HTMLElement | null,
  plane: HTMLElement | null,
  desktop: boolean,
): { rest: RestGeometry; frame: Frame | null } {
  if (plane) clearPlaneTransform(plane);

  const target = frame(slot, desktop);

  if (desktop) {
    // The camera does the framing, so the artefact simply grows about its own
    // centre and the plane moves to meet it.
    box.style.left = `${-((target.width - target.restWidth) / 2)}px`;
    box.style.top = `${-((target.height - target.restHeight) / 2)}px`;
  } else {
    // There is no camera on a phone — the plane never moves — so the artefact
    // has to place itself. Growing symmetrically about its own centre was
    // correct while a resting artefact was as wide as the column; now that it
    // is an 80px icon sitting in one half of a two-column springboard, the same
    // spread throws the panel off the side of the screen.
    const rect = slot.getBoundingClientRect();
    box.style.left = `${(window.innerWidth - target.width) / 2 - rect.left}px`;
    box.style.top = `${(window.innerHeight - target.height) / 2 - rect.top}px`;
  }

  box.style.width = `${target.width}px`;
  box.style.height = `${target.height}px`;

  /* Where the resting artefact sits *inside* the opened box, so the clip can
     open from the icon itself rather than from the box's centre. On desktop the
     two coincide; on a phone they do not, and assuming they did is what made
     the panel appear to unfold from the wrong place. */
  const boxRect = box.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const inset = {
    top: Math.max(0, slotRect.top - boxRect.top),
    right: Math.max(0, boxRect.right - slotRect.right),
    bottom: Math.max(0, boxRect.bottom - slotRect.bottom),
    left: Math.max(0, slotRect.left - boxRect.left),
  };

  const scroll = box.querySelector<HTMLElement>(".expand-scroll");
  if (scroll) {
    scroll.style.width = `${target.width * target.zoom}px`;
    scroll.style.height = `${target.height * target.zoom}px`;
    scroll.style.transformOrigin = "0 0";
    scroll.style.transform = `scale(${1 / target.zoom})`;
  }

  // The close control sits outside the scroll container so it can pin to the
  // artefact's corner, which means it misses that counter-scale and the camera
  // magnifies it alone. Without this it renders at `zoom` and covers the tagline.
  const close = box.querySelector<HTMLElement>("[data-close]");
  if (close) {
    close.style.transformOrigin = "100% 0";
    close.style.transform = `scale(${1 / target.zoom})`;
  }

  /* The hero is the one thing that scales, because it is an image and survives
     it. Captured here rather than measured again at close time: the open and
     the close are geometric mirrors, so this is the same value in both
     directions, and re-reading it later is the project's oldest hazard. */
  let heroFrom: string | null = null;
  if (hero) {
    hero.style.transform = "";
    const heroFinal = hero.getBoundingClientRect();
    if (heroFinal.width > 0) {
      // The hero's aspect ratio is identical in both states, so this scale is
      // always uniform and the screenshot never stretches.
      const scale = target.restWidth / heroFinal.width;
      heroFrom = `translate(${slotRect.left - heroFinal.left}px, ${slotRect.top - heroFinal.top}px) scale(${scale})`;
    }
  }

  /* Where the camera has to sit to hold this artefact in the middle of the
     screen. The centre is in plane-local coordinates and the scale is applied
     about the plane's own origin, so where that origin already sits on screen
     has to come back out of the translation. */
  let cameraFrame: Frame | null = null;
  if (desktop && plane) {
    const planeRect = plane.getBoundingClientRect();
    const centre = {
      x: boxRect.left - planeRect.left + boxRect.width / 2,
      y: boxRect.top - planeRect.top + boxRect.height / 2,
    };
    const viewport = viewportCentre();
    cameraFrame = frameOn(centre, viewport, target.zoom);
    cameraFrame.tx -= planeRect.left;
    cameraFrame.ty -= planeRect.top;
  }

  return { rest: { inset, heroFrom }, frame: cameraFrame };
}

export function useBoxExpand(focusedSlug: string | null, slug: string) {
  const slotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const isExpanded = useRef(false);
  /** Captured while the plane is at identity; replayed in reverse on close. */
  const restGeometry = useRef<RestGeometry | null>(null);

  const focused = focusedSlug === slug;

  useEffect(() => {
    const slot = slotRef.current;
    const box = boxRef.current;
    const hero = heroRef.current;
    if (!slot || !box || !hero) return;

    const reduced = prefersReducedMotion();
    const plane = getPlane();
    const desktop = window.innerWidth >= DESKTOP_MIN;

    if (focused && !isExpanded.current) {
      isExpanded.current = true;
      cancel(box);
      cancel(hero);

      /* Another artefact still holds the camera: this is a travel, not an open
         from the resting field. Captured before the transform is cleared, which
         is what makes the measurements below honest — and read before anything
         writes it back, which is what keeps it true under the React Compiler.
         See `heldFrame` for the bug that rule exists to prevent. */
      const travelFrom = heldFrame();
      if (plane) clearPlaneTransform(plane);

      box.dataset.expanded = "true";
      box.style.position = "absolute";
      box.style.zIndex = "50";

      // Counter-scale lives in here: content is laid out at the size it will
      // occupy on screen, then shrunk by 1/zoom to fit the artefact's small
      // plane footprint. The camera scales it back up, landing type at 1x.
      const { rest, frame: cameraFrame } = layoutExpanded(
        slot,
        box,
        hero,
        plane,
        desktop,
      );
      restGeometry.current = rest;

      /* Everything derived from the framing being left is resolved here, while
         `travelFrom` is still the value that was read above. Only then is the
         new framing recorded. Reads first, write last — the whole rule. */
      const travelling = travelFrom !== null && cameraFrame !== null && desktop;
      const travelKeyframes =
        travelling && travelFrom && cameraFrame
          ? [
              { transform: toTransform(travelFrom) },
              /* Rises, crosses, descends. A straight interpolation between two
                 framings at ~2x is a lateral drag across the plane; pulling
                 back through the midpoint shows both the artefact being left
                 and the one being approached, which is what makes it read as
                 one space rather than two destinations. */
              {
                transform: toTransform(
                  midFrame(travelFrom, cameraFrame, viewportCentre()),
                ),
                offset: 0.5,
              },
              { transform: toTransform(cameraFrame) },
            ]
          : null;

      holdFrame(cameraFrame);
      setFocusState("opening", slug);

      /* Closes over the local framing rather than reading the held one back —
         it runs a second later, by which time the camera may belong to someone
         else, and this must settle where *this* artefact was framed. */
      const settleFrame = () => {
        if (!plane) return;
        if (cameraFrame) {
          cancel(plane);
          plane.style.transform = toTransform(cameraFrame);
        } else {
          clearPlaneTransform(plane);
        }
      };

      if (reduced) {
        // No travel and no push — the camera simply is where it needs to be.
        settleFrame();
        setFocusState("focused", slug);
        return;
      }

      /* On a travel the artefact stays shut until the camera has landed, then
         opens exactly as it would from the field.

         Not a stylistic choice. Content inside an artefact is authored at
         screen size and counter-scaled by `1/zoom` so the camera lands it at
         1x — which means while the camera is at any other zoom, that content is
         at the wrong size. Opening during the crossing revealed the case study
         at about 62% and grew it into place, which is the scaling transition
         this mechanism exists to avoid. Held shut, every glyph is at final size
         from the first frame it is visible, exactly as on a normal open. */
      const openDelay = travelling ? TRAVEL_MS : 0;

      /* The reveal inside the artefact is CSS, keyed off `data-expanded`, which
         flips at the start of the crossing. Left alone it would play out behind
         a shut clip and be finished before the artefact was visible, so the
         arrival would have no sequence at all. Push it by the same delay. */
      box.style.setProperty("--reveal-lead", `${openDelay + 160}ms`);

      const opening = box.animate(
        [
          {
            clipPath: `inset(${rest.inset.top}px ${rest.inset.right}px ${rest.inset.bottom}px ${rest.inset.left}px round ${RADIUS}px)`,
          },
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
        ],
        {
          duration: OPEN_MS,
          delay: openDelay,
          easing: OPEN_EASE,
          fill: "both",
        },
      );

      if (rest.heroFrom) {
        hero.style.transformOrigin = "0 0";
        hero.animate([{ transform: rest.heroFrom }, { transform: "none" }], {
          duration: OPEN_MS,
          delay: openDelay,
          easing: OPEN_EASE,
          fill: "both",
        });
      }

      if (plane && cameraFrame) {
        if (travelKeyframes) {
          plane.animate(travelKeyframes, {
            duration: TRAVEL_MS,
            easing: CLOSE_EASE,
            fill: "forwards",
          });
        } else {
          plane.animate(
            [{ transform: "none" }, { transform: toTransform(cameraFrame) }],
            { duration: OPEN_MS, easing: OPEN_EASE, fill: "forwards" },
          );
        }
      }

      let openSettled = false;
      const settleOpen = () => {
        if (openSettled) return;
        openSettled = true;
        clearTimeout(openGuard);
        cancel(box);
        cancel(hero);
        box.style.clipPath = "";
        hero.style.transform = "";
        // The plane keeps its transform via an inline style rather than a
        // filling animation, so nothing is left holding a frame.
        settleFrame();
        setFocusState("focused", slug);
      };
      // A frozen document timeline (backgrounded tab) never settles `finished`
      // and would strand the artefact mid-open with the page scroll locked.
      const openGuard = setTimeout(settleOpen, openDelay + OPEN_MS + 80);
      void opening.finished.then(settleOpen).catch(settleOpen);
      return;
    }

    if (!focused && isExpanded.current) {
      isExpanded.current = false;
      cancel(box);
      cancel(hero);
      setFocusState("closing", slug);

      /* Another artefact is taking the camera. This one collapses its own box
         and leaves the plane entirely alone — including in `restore`, whose
         timer would otherwise land in the middle of the arriving artefact's
         travel and cancel it. */
      const handingOver = focusedSlug !== null;
      const rest = restGeometry.current;
      /* Read once, before `restore` or the plane animation below can write it,
         for the same reason the open captures its travel framing up front. */
      const leaving = handingOver ? null : heldFrame();

      const restore = () => {
        box.dataset.expanded = "false";
        box.style.position = "";
        box.style.left = "";
        box.style.top = "";
        box.style.width = "";
        box.style.height = "";
        box.style.zIndex = "";
        box.style.clipPath = "";
        box.style.removeProperty("--reveal-lead");
        hero.style.transform = "";
        const scroll = box.querySelector<HTMLElement>(".expand-scroll");
        if (scroll) {
          scroll.style.width = "";
          scroll.style.height = "";
          scroll.style.transform = "";
          scroll.style.transformOrigin = "";
        }
        const close = box.querySelector<HTMLElement>("[data-close]");
        if (close) {
          close.style.transform = "";
          close.style.transformOrigin = "";
        }
        restGeometry.current = null;
        if (handingOver) return;
        if (plane) clearPlaneTransform(plane);
        holdFrame(null);
        setFocusState("idle");
      };

      if (reduced) {
        restore();
        return;
      }

      /* Replayed from what was captured at open time, with the plane at
         identity. The close used to measure these again through the live camera
         transform and undo it by hand; on a travel there is no way to undo it,
         because the arriving artefact's animation is already driving the plane.
         Capturing once is also what the project's own hazard table says to do. */
      const closedInset = rest
        ? `inset(${rest.inset.top}px ${rest.inset.right}px ${rest.inset.bottom}px ${rest.inset.left}px round ${RADIUS}px)`
        : `inset(0px 0px 0px 0px round ${RADIUS}px)`;

      const closing = box.animate(
        [
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
          { clipPath: closedInset },
        ],
        { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" },
      );

      if (rest?.heroFrom) {
        hero.style.transformOrigin = "0 0";
        hero.animate([{ transform: "none" }, { transform: rest.heroFrom }], {
          duration: CLOSE_MS,
          easing: CLOSE_EASE,
          fill: "both",
        });
      }

      if (plane && leaving) {
        const from = toTransform(leaving);
        holdFrame(null);
        plane.style.transform = "";
        plane.animate([{ transform: from }, { transform: "none" }], {
          duration: CLOSE_MS,
          easing: CLOSE_EASE,
          fill: "both",
        });
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        cancel(box);
        cancel(hero);
        restore();
      };
      const guard = setTimeout(settle, CLOSE_MS + 140);
      void closing.finished.then(settle).catch(settle);
    }
  }, [focused, focusedSlug, slug]);

  /**
   * Reframe on resize.
   *
   * The geometry and the camera are both derived from viewport size, and they
   * are computed once at open. Without this, resizing while an artefact is open
   * leaves the box sized for the old viewport and the plane scaled for it —
   * which overflows the screen and clips the case study.
   */
  useEffect(() => {
    if (!focused) return;
    const slot = slotRef.current;
    const box = boxRef.current;
    const hero = heroRef.current;
    if (!slot || !box) return;

    let frameId = 0;
    const onResize = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const plane = getPlane();
        const desktop = window.innerWidth >= DESKTOP_MIN;
        if (plane) cancel(plane);
        const { rest, frame: cameraFrame } = layoutExpanded(
          slot,
          box,
          hero,
          plane,
          desktop,
        );
        // Refreshed, not just recomputed: the close replays these, and a stale
        // capture would collapse the artefact into where it used to be.
        restGeometry.current = rest;
        holdFrame(cameraFrame);
        // Applied directly rather than animated: this tracks a drag-resize, so
        // it has to land on the same frame as the new viewport size.
        if (plane) {
          plane.style.transform = cameraFrame ? toTransform(cameraFrame) : "";
        }
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameId);
    };
  }, [focused]);

  return { slotRef, boxRef, heroRef };
}
