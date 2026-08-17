/**
 * Motion layer.
 *
 * Much smaller than it was. The original version carried a view registry and a
 * swappable renderer because the signature transition coordinated two separate
 * elements — a card and a modal — across two component trees, and needed to
 * pass rects between them.
 *
 * That mechanism is gone. There is now one box that expands in place
 * (`useBoxExpand`), so there is nothing to coordinate and no rects to publish.
 * What survives is the part that was actually load-bearing: an explicit
 * lifecycle other code can observe, and a capability check — with per-frame
 * work still living entirely outside React.
 *
 * See docs/ARCHITECTURE.md.
 */

/** docs/ARCHITECTURE.md §2.4. */
export type FocusState =
  | "idle"
  | "previewing"
  | "opening"
  | "focused"
  | "closing";

type StateListener = (state: FocusState, slug: string | null) => void;

const listeners = new Set<StateListener>();
let currentState: FocusState = "idle";
let currentSlug: string | null = null;

/** Called imperatively. Never from a React setState. */
export function setFocusState(state: FocusState, slug: string | null = null): void {
  if (state === currentState && slug === currentSlug) return;
  currentState = state;
  currentSlug = slug;
  for (const listener of listeners) listener(state, slug);
}

export function getFocusState(): { state: FocusState; slug: string | null } {
  return { state: currentState, slug: currentSlug };
}

export function subscribeFocusState(listener: StateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Test seam. Not called in application code. */
export function resetMotionLayer(): void {
  listeners.clear();
  currentState = "idle";
  currentSlug = null;
}
