"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  cameraPush,
  getField,
  getViewRect,
  previewViewId,
  resetCamera,
  selectRenderer,
  setFocusState,
  type Rect,
} from "@/lib/motion-layer";

function cancelAnimations(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel();
}

/**
 * Navigation must never be held hostage by an animation. Backgrounded tabs,
 * throttled timelines and cancelled animations can all leave `finished`
 * unsettled — so the exit races the morph and leaves anyway.
 */
const CLOSE_ESCAPE_HATCH_MS = 600;

function withTimeout(promise: Promise<unknown>, ms: number): Promise<unknown> {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * Drives the open and close of a focused project.
 *
 * Two things move, both imperatively: the hero preview does a FLIP from the
 * card's rect, and the whole field pushes toward that card so the zoom reads as
 * entering that sector rather than the card walking to the middle. React starts
 * and finishes them; no frame passes through state, and the case-study body is
 * never measured (docs/ARCHITECTURE.md §2.5).
 */
export function useFocusMorph(slug: string) {
  const heroRef = useRef<HTMLDivElement>(null);
  /**
   * The card's rect at rest, captured on open. Reused on close rather than
   * re-measured, because by then the card is being viewed through the pushed
   * field transform and would measure a few pixels further out each cycle.
   */
  const originRef = useRef<Rect | null>(null);
  const router = useRouter();
  const closing = useRef(false);

  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;

    cancelAnimations(element);

    const field = getField();
    // Return the field to rest before measuring, so the card rect below is its
    // true layout position rather than one seen through a live transform.
    if (field) resetCamera(field);

    const from = getViewRect(previewViewId(slug));
    originRef.current = from;

    if (!from) {
      // Cold visit, or the card was never mounted. Nothing to morph from — the
      // view simply renders. Correct behaviour, not a failure.
      setFocusState("focused");
      return;
    }

    const to = element.getBoundingClientRect();
    setFocusState("opening");

    if (field) cameraPush(field, from, "in");

    let cancelled = false;
    element.style.willChange = "transform";

    void selectRenderer()
      .morph({ from, to, element, direction: "in" })
      .then(() => {
        if (cancelled) return;
        element.style.willChange = "";
        setFocusState("focused");
      });

    return () => {
      cancelled = true;
      cancelAnimations(element);
      element.style.willChange = "";
      // Unmounted without going through close() — browser back, or a Strict
      // Mode remount. Put the camera back or the field stays pushed forever.
      if (!closing.current) {
        const current = getField();
        if (current) resetCamera(current);
      }
    };
  }, [slug]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    setFocusState("closing");

    const element = heroRef.current;
    const from = originRef.current;
    const field = getField();

    if (field) cameraPush(field, from ?? { x: 0, y: 0, width: 0, height: 0 }, "out");

    if (element && from) {
      cancelAnimations(element);
      const to = element.getBoundingClientRect();
      element.style.willChange = "transform";
      await withTimeout(
        selectRenderer().morph({ from, to, element, direction: "out" }),
        CLOSE_ESCAPE_HATCH_MS,
      );
    }

    setFocusState("idle");
    router.back();
  }, [router]);

  return { heroRef, close };
}
