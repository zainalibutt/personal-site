"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getViewRect,
  previewViewId,
  selectRenderer,
  setFocusState,
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
 * Drives the open and close morph for a focused project.
 *
 * React's only involvement is starting and finishing the animation. No frame of
 * the morph passes through state or props, and the case-study body is never
 * measured — only the hero preview element moves (docs/ARCHITECTURE.md §2.5).
 */
export function useFocusMorph(slug: string) {
  const heroRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const closing = useRef(false);

  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;

    // Any in-flight morph holds a `fill: both` transform, which would make the
    // measurement below return the *animated* rect instead of the layout one
    // and collapse the next morph to an identity. Strict Mode double-invokes
    // this effect in dev, and a fast reopen does the same in production.
    cancelAnimations(element);

    const from = getViewRect(previewViewId(slug));
    if (!from) {
      // Cold visit, or the card was never mounted. Nothing to morph from — the
      // page simply renders. This is the correct behaviour, not a failure.
      setFocusState("focused");
      return;
    }

    const to = element.getBoundingClientRect();
    setFocusState("opening");

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
    };
  }, [slug]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;

    const element = heroRef.current;
    const from = getViewRect(previewViewId(slug));

    setFocusState("closing");

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
  }, [slug, router]);

  return { heroRef, close };
}
