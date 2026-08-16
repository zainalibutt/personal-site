/**
 * Motion layer public API — the seam from docs/ARCHITECTURE.md §3.
 *
 * The shape, kept deliberately small:
 *
 *   registerView(id, el) · unregisterView(id) · setFocus(slug, progress)
 *
 * Swapping the renderer (DOM today, WebGL if it is ever justified) touches
 * `renderers.ts` and nothing else. No React component imports a renderer
 * directly — they go through `useFocusMorph`.
 */
export {
  registerView,
  unregisterView,
  registerField,
  getField,
  getView,
  getViewRect,
  setFocus,
  getFocus,
  setFocusState,
  getFocusState,
  subscribeFocus,
  subscribeFocusState,
  resetMotionLayer,
} from "./registry";

export {
  domRenderer,
  reducedMotionRenderer,
  prefersReducedMotion,
  selectRenderer,
  cameraPush,
  resetCamera,
} from "./renderers";

export type {
  FocusState,
  MorphRequest,
  MotionRenderer,
  Rect,
  ViewId,
} from "./types";

/** Stable id for a project's preview surface, shared by card and focused view. */
export function previewViewId(slug: string): string {
  return `preview:${slug}`;
}
