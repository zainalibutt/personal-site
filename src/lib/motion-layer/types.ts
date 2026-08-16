/**
 * Motion layer — shared types.
 *
 * This is the seam described in docs/ARCHITECTURE.md §3. Everything React
 * touches is on this side of the boundary; everything that runs per frame is on
 * the other. The renderer is swappable: the DOM implementation ships today, and
 * a WebGL one could replace it without a single change above this line.
 */

export type ViewId = string;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** docs/ARCHITECTURE.md §2.4. */
export type FocusState =
  | "idle"
  | "previewing"
  | "opening"
  | "focused"
  | "closing";

export interface MorphRequest {
  /** Where the element visually starts. */
  from: Rect;
  /** Where it currently sits in layout — the animation resolves to this. */
  to: Rect;
  element: HTMLElement;
  direction: "in" | "out";
}

export interface MotionRenderer {
  readonly name: string;
  /** Checked at call time, not module load — capability gating lives here. */
  supported(): boolean;
  morph(request: MorphRequest): Promise<void>;
}
