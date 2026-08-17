"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, setFocusState } from "@/lib/motion-layer";

/**
 * Expands an artefact in place.
 *
 * This is NOT a shared-element morph. There is one box. Focusing it promotes it
 * to `position: fixed` at its final near-fullscreen geometry, then opens a
 * `clip-path` window that starts exactly on its resting rect — so its four
 * corners travel outward, and content that was always inside is revealed rather
 * than introduced.
 *
 * Why clip-path and not transform: a transform would scale the case-study text
 * up from card size, which is both blurry in transit and the exact failure both
 * this avoids. Clipping leaves every glyph at its final size from the
 * first frame.
 *
 * The hero is the one thing that does scale — it is an image, so it survives it,
 * and the expanded layout keeps its aspect ratio identical to the card's so the
 * scale is always uniform and never distorts.
 */

const GUTTER = 24;
const OPEN_MS = 620;
const CLOSE_MS = 420;
const OPEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOSE_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const RADIUS = 16;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function finalGeometry(): Box {
  const gutter = Math.min(GUTTER, window.innerWidth * 0.04);
  return {
    left: gutter,
    top: gutter,
    width: window.innerWidth - gutter * 2,
    height: window.innerHeight - gutter * 2,
  };
}

/** The clip that makes `outer` show exactly the region covered by `inner`. */
function clipTo(outer: Box, inner: DOMRect): string {
  const top = Math.max(0, inner.top - outer.top);
  const right = Math.max(0, outer.left + outer.width - (inner.left + inner.width));
  const bottom = Math.max(0, outer.top + outer.height - (inner.top + inner.height));
  const left = Math.max(0, inner.left - outer.left);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${RADIUS}px)`;
}

function promote(box: HTMLElement, geometry: Box): void {
  box.style.position = "fixed";
  box.style.left = `${geometry.left}px`;
  box.style.top = `${geometry.top}px`;
  box.style.width = `${geometry.width}px`;
  box.style.height = `${geometry.height}px`;
  box.style.zIndex = "50";
}

function demote(box: HTMLElement): void {
  box.style.position = "";
  box.style.left = "";
  box.style.top = "";
  box.style.width = "";
  box.style.height = "";
  box.style.zIndex = "";
  box.style.clipPath = "";
}

function cancel(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel();
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

    if (focused && !isExpanded.current) {
      isExpanded.current = true;
      cancel(box);
      cancel(hero);

      // The slot keeps the artefact's footprint in the field via its own
      // aspect-ratio, so promoting the box out of flow reflows nothing.
      const rest = slot.getBoundingClientRect();
      const geometry = finalGeometry();

      box.dataset.expanded = "true";
      promote(box, geometry);
      setFocusState("opening", slug);

      if (reduced) {
        box.style.clipPath = "";
        setFocusState("focused", slug);
        return;
      }

      // Forced layout: the hero must be measured in its expanded position
      // before the inverse transform can be worked out.
      const heroFinal = hero.getBoundingClientRect();

      const opening = box.animate(
        [
          { clipPath: clipTo(geometry, rest) },
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
        ],
        { duration: OPEN_MS, easing: OPEN_EASE, fill: "both" },
      );
      // Cancelling drops the fill, which leaves the element in its natural
      // expanded state — so this both finishes the transition and repairs it if
      // the timeline froze (backgrounded tab) and never advanced past frame 0.
      let openSettled = false;
      const settleOpen = () => {
        if (openSettled) return;
        openSettled = true;
        clearTimeout(openGuard);
        cancel(box);
        cancel(hero);
        box.style.clipPath = "";
        hero.style.transform = "";
        setFocusState("focused", slug);
      };
      const openGuard = setTimeout(settleOpen, OPEN_MS + 80);
      void opening.finished.then(settleOpen).catch(settleOpen);

      if (heroFinal.width > 0) {
        const scale = rest.width / heroFinal.width;
        hero.style.transformOrigin = "0 0";
        hero.animate(
          [
            {
              transform: `translate(${rest.left - heroFinal.left}px, ${rest.top - heroFinal.top}px) scale(${scale})`,
            },
            { transform: "none" },
          ],
          { duration: OPEN_MS, easing: OPEN_EASE, fill: "both" },
        );
      }
      return;
    }

    if (!focused && isExpanded.current) {
      isExpanded.current = false;
      cancel(box);
      cancel(hero);
      setFocusState("closing", slug);

      if (reduced) {
        box.dataset.expanded = "false";
        demote(box);
        setFocusState("idle");
        return;
      }

      const rest = slot.getBoundingClientRect();
      const geometry = finalGeometry();
      const heroFinal = hero.getBoundingClientRect();

      const closing = box.animate(
        [
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
          { clipPath: clipTo(geometry, rest) },
        ],
        { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" },
      );

      if (heroFinal.width > 0) {
        const scale = rest.width / heroFinal.width;
        hero.animate(
          [
            { transform: "none" },
            {
              transform: `translate(${rest.left - heroFinal.left}px, ${rest.top - heroFinal.top}px) scale(${scale})`,
            },
          ],
          { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" },
        );
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        cancel(box);
        cancel(hero);
        box.dataset.expanded = "false";
        demote(box);
        hero.style.transform = "";
        setFocusState("idle");
      };

      // `finished` never settles while the document timeline is frozen (a
      // backgrounded tab), which would strand the artefact mid-collapse.
      const guard = setTimeout(settle, CLOSE_MS + 140);
      void closing.finished.then(settle).catch(settle);
    }
  }, [focused, slug]);

  return { slotRef, boxRef, heroRef };
}
