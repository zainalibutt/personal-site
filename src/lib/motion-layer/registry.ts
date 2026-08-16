import type { FocusState, Rect, ViewId } from "./types";

/**
 * The view registry and focus channel.
 *
 * Deliberately module-level rather than React context: per-frame values must
 * never flow through React state or props (docs/ARCHITECTURE.md §2.2). Cards
 * register their preview surfaces here; the focused view reads the source rect
 * back out and publishes progress. React re-renders exactly zero times during a
 * morph.
 */

const views = new Map<ViewId, HTMLElement>();

/**
 * The project field itself. Registered so focusing a card can push the whole
 * field toward that card — the "zoom into that sector" rather than a card
 * politely sliding to the middle.
 */
let fieldElement: HTMLElement | null = null;

export function registerField(element: HTMLElement): () => void {
  fieldElement = element;
  return () => {
    if (fieldElement === element) fieldElement = null;
  };
}

export function getField(): HTMLElement | null {
  return fieldElement;
}

type FocusListener = (slug: string | null, progress: number) => void;
type StateListener = (state: FocusState) => void;

const focusListeners = new Set<FocusListener>();
const stateListeners = new Set<StateListener>();

let currentState: FocusState = "idle";
let currentSlug: string | null = null;
let currentProgress = 0;

/** Returns its own cleanup, so it drops straight into a ref callback. */
export function registerView(id: ViewId, element: HTMLElement): () => void {
  views.set(id, element);
  return () => {
    // Guard against a later registration for the same id having replaced this
    // one — unmount order is not guaranteed during route transitions.
    if (views.get(id) === element) views.delete(id);
  };
}

export function unregisterView(id: ViewId): void {
  views.delete(id);
}

export function getView(id: ViewId): HTMLElement | null {
  return views.get(id) ?? null;
}

export function getViewRect(id: ViewId): Rect | null {
  const element = views.get(id);
  if (!element) return null;
  const { x, y, width, height } = element.getBoundingClientRect();
  if (width === 0 || height === 0) return null;
  return { x, y, width, height };
}

/** Called imperatively, potentially every frame. Never from a React setState. */
export function setFocus(slug: string | null, progress: number): void {
  currentSlug = slug;
  currentProgress = progress;
  for (const listener of focusListeners) listener(slug, progress);
}

export function getFocus(): { slug: string | null; progress: number } {
  return { slug: currentSlug, progress: currentProgress };
}

export function setFocusState(state: FocusState): void {
  if (state === currentState) return;
  currentState = state;
  for (const listener of stateListeners) listener(state);
}

export function getFocusState(): FocusState {
  return currentState;
}

export function subscribeFocus(listener: FocusListener): () => void {
  focusListeners.add(listener);
  return () => focusListeners.delete(listener);
}

export function subscribeFocusState(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/** Test seam. Not called in application code. */
export function resetMotionLayer(): void {
  views.clear();
  fieldElement = null;
  focusListeners.clear();
  stateListeners.clear();
  currentState = "idle";
  currentSlug = null;
  currentProgress = 0;
}
