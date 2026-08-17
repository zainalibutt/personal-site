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
const ZOOM = 1.35;

/**
 * Fraction of the viewport the focused artefact occupies once framed.
 *
 * Deliberately not close to 1. The artefact has to leave room for its
 * neighbours to stay visible beside it — that is the entire point of moving the
 * camera rather than opening a panel. At 0.66 the About column keeps roughly
 * four fifths of itself in frame while Proof-Lens is open.
 *
 * Text inside the artefact renders at ZOOM, so ~21px body copy. That reads as
 * deliberate for a case study; if it ever needs to be exactly 1x, the fix is a
 * counter-scale of 1/ZOOM on the content wrapper, not a smaller ZOOM.
 */
const FRAME_W = 0.66;
const FRAME_H = 0.8;

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

function targetSize(desktop: boolean) {
  if (!desktop) {
    return {
      width: window.innerWidth - 32,
      height: window.innerHeight * 0.88,
    };
  }
  // Divided by ZOOM because the plane will scale it back up when framing.
  return {
    width: (window.innerWidth * FRAME_W) / ZOOM,
    height: (window.innerHeight * FRAME_H) / ZOOM,
  };
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

      const restWidth = slot.offsetWidth;
      const restHeight = slot.offsetHeight;
      const target = targetSize(desktop);

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
        const tx = window.innerWidth / 2 - planeRect.left - ZOOM * centreX;
        const ty = window.innerHeight / 2 - planeRect.top - ZOOM * centreY;
        const transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
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
