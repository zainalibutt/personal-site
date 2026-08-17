"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, setFocusState } from "@/lib/motion-layer";

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
 */

/**
 * How much the plane scales when focused. Kept modest and constant: the
 * artefact's own growth supplies most of the sense of arrival, and text inside
 * it renders at this scale, so a large value would blow the typography up.
 * Everything visible grows by exactly this much.
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

const OPEN_MS = 660;
const CLOSE_MS = 440;
const OPEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOSE_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const RADIUS = 16;

/** The transform currently holding the plane. Only one artefact opens at a time. */
let activePlaneTransform: string | null = null;

function cancel(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel();
}

function getPlane(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-plane]");
}

/** Returns the plane to identity so it can be measured untransformed. */
function resetPlane(plane: HTMLElement): void {
  cancel(plane);
  plane.style.transform = "";
  activePlaneTransform = null;
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

export function useBoxExpand(focused: boolean, slug: string) {
  const slotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const isExpanded = useRef(false);

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
      if (plane) resetPlane(plane);

      const target = frame(slot, desktop);
      const { restWidth, restHeight, zoom } = target;

      // Grow around the slot's centre, so every corner moves outward.
      const spreadX = Math.max(0, (target.width - restWidth) / 2);
      const spreadY = Math.max(0, (target.height - restHeight) / 2);

      box.dataset.expanded = "true";
      box.style.position = "absolute";
      box.style.left = `${-spreadX}px`;
      box.style.top = `${-spreadY}px`;
      box.style.width = `${target.width}px`;
      box.style.height = `${target.height}px`;
      box.style.zIndex = "50";

      // Counter-scale: the content is laid out at the size it will occupy on
      // screen, then shrunk by 1/zoom so it fits the artefact's small plane
      // footprint. The camera scales it back up, landing typography at 1x.
      const scroll = box.querySelector<HTMLElement>(".expand-scroll");
      if (scroll) {
        scroll.style.width = `${target.width * zoom}px`;
        scroll.style.height = `${target.height * zoom}px`;
        scroll.style.transformOrigin = "0 0";
        scroll.style.transform = `scale(${1 / zoom})`;
      }
      setFocusState("opening", slug);

      if (reduced) {
        if (plane) resetPlane(plane);
        setFocusState("focused", slug);
        return;
      }

      // Forced layout: both the hero and the plane framing depend on the
      // artefact's post-growth geometry.
      const heroFinal = hero.getBoundingClientRect();

      const opening = box.animate(
        [
          {
            clipPath: `inset(${spreadY}px ${spreadX}px ${spreadY}px ${spreadX}px round ${RADIUS}px)`,
          },
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
        ],
        { duration: OPEN_MS, easing: OPEN_EASE, fill: "both" },
      );

      if (heroFinal.width > 0) {
        // The hero's aspect ratio is identical in both states, so this scale is
        // always uniform and the screenshot never stretches.
        const scale = restWidth / heroFinal.width;
        const restRect = slot.getBoundingClientRect();
        hero.style.transformOrigin = "0 0";
        hero.animate(
          [
            {
              transform: `translate(${restRect.left - heroFinal.left}px, ${restRect.top - heroFinal.top}px) scale(${scale})`,
            },
            { transform: "none" },
          ],
          { duration: OPEN_MS, easing: OPEN_EASE, fill: "both" },
        );
      }

      if (desktop && plane) {
        const planeRect = plane.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();
        // Centre of the grown artefact, in the plane's own untransformed space.
        const centreX = boxRect.left - planeRect.left + boxRect.width / 2;
        const centreY = boxRect.top - planeRect.top + boxRect.height / 2;
        // Solve for the translate that lands that centre on the viewport centre
        // once the plane is scaled about its top-left corner.
        const tx = window.innerWidth / 2 - planeRect.left - zoom * centreX;
        const ty = window.innerHeight / 2 - planeRect.top - zoom * centreY;
        const transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
        activePlaneTransform = transform;

        plane.animate([{ transform: "none" }, { transform }], {
          duration: OPEN_MS,
          easing: OPEN_EASE,
          fill: "forwards",
        });
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
        if (desktop && plane && activePlaneTransform) {
          cancel(plane);
          plane.style.transform = activePlaneTransform;
        }
        setFocusState("focused", slug);
      };
      // A frozen document timeline (backgrounded tab) never settles `finished`
      // and would strand the artefact mid-open with the page scroll locked.
      const openGuard = setTimeout(settleOpen, OPEN_MS + 80);
      void opening.finished.then(settleOpen).catch(settleOpen);
      return;
    }

    if (!focused && isExpanded.current) {
      isExpanded.current = false;
      cancel(box);
      cancel(hero);
      setFocusState("closing", slug);

      const restore = () => {
        box.dataset.expanded = "false";
        box.style.position = "";
        box.style.left = "";
        box.style.top = "";
        box.style.width = "";
        box.style.height = "";
        box.style.zIndex = "";
        box.style.clipPath = "";
        hero.style.transform = "";
        const scroll = box.querySelector<HTMLElement>(".expand-scroll");
        if (scroll) {
          scroll.style.width = "";
          scroll.style.height = "";
          scroll.style.transform = "";
          scroll.style.transformOrigin = "";
        }
        if (plane) resetPlane(plane);
        setFocusState("idle");
      };

      if (reduced) {
        restore();
        return;
      }

      const restWidth = slot.offsetWidth;
      const restHeight = slot.offsetHeight;
      const spreadX = Math.max(0, (box.offsetWidth - restWidth) / 2);
      const spreadY = Math.max(0, (box.offsetHeight - restHeight) / 2);
      const heroFinal = hero.getBoundingClientRect();
      const restRect = slot.getBoundingClientRect();

      const closing = box.animate(
        [
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
          {
            clipPath: `inset(${spreadY}px ${spreadX}px ${spreadY}px ${spreadX}px round ${RADIUS}px)`,
          },
        ],
        { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" },
      );

      if (heroFinal.width > 0) {
        const scale = restWidth / heroFinal.width;
        hero.animate(
          [
            { transform: "none" },
            {
              transform: `translate(${restRect.left - heroFinal.left}px, ${restRect.top - heroFinal.top}px) scale(${scale})`,
            },
          ],
          { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" },
        );
      }

      if (plane && activePlaneTransform) {
        const from = activePlaneTransform;
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
  }, [focused, slug]);

  return { slotRef, boxRef, heroRef };
}
