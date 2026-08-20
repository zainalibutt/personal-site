/**
 * The camera — the one thing allowed to move the plane.
 *
 * The plane transform used to live as a module-level string inside
 * `useBoxExpand`, written by whichever artefact's effect happened to run. That
 * was fine while only one artefact could ever be moving: opening wrote it,
 * closing read it back, and the two never overlapped.
 *
 * Travelling straight from one artefact to another breaks that assumption.
 * Both hooks run in the same commit — the departing one and the arriving one —
 * and React gives no ordering guarantee beyond DOM order. Measured before this
 * existed: the departing artefact's restore timer fired 580ms in and reset the
 * plane, cancelling the arriving artefact's 660ms camera move. The artefact
 * ended up expanded with the camera at identity.
 *
 * So the plane gets a single owner with an explicit handover. A frame is a
 * value, not a string, because the travel needs to interpolate through a
 * computed midpoint and parsing a matrix back out is how drift starts.
 */

/**
 * A camera framing: the plane is translated by `tx, ty` then scaled by `zoom`.
 *
 * Plane point `p` lands on screen at `t + zoom * p`, which is the whole of the
 * geometry — `centreOf` below is that identity solved the other way.
 */
export interface Frame {
  tx: number;
  ty: number;
  zoom: number;
}

export function toTransform(frame: Frame): string {
  return `translate(${frame.tx}px, ${frame.ty}px) scale(${frame.zoom})`;
}

/**
 * The framing the plane is currently holding, and the artefact that owns it.
 *
 * Behind accessors, and living here rather than beside the hook that uses it,
 * for a reason worth writing down. **The React Compiler is enabled**, and a
 * bare module-level `let` read twice inside a compiled hook body is not two
 * reads — the compiler is free to treat them as one cached value. It did:
 *
 *     const travelFrom = activeFrame;   // logged null
 *     ...
 *     activeFrame = cameraFrame;
 *     travelFrom === null               // logged false, on a const
 *
 * The camera consequently believed every open was a travel that started from
 * where it was going, so it cut instantly to the destination and then bobbed in
 * place. An imported call is opaque to that analysis. Callers still order every
 * read before any write, because the ordering is what makes it correct rather
 * than merely currently working.
 */
let held: Frame | null = null;

export function heldFrame(): Frame | null {
  return held;
}

export function holdFrame(frame: Frame | null): void {
  held = frame;
}

/** Frames plane point `centre` at viewport point `viewport`, at `zoom`. */
export function frameOn(
  centre: { x: number; y: number },
  viewport: { x: number; y: number },
  zoom: number,
): Frame {
  return {
    tx: viewport.x - zoom * centre.x,
    ty: viewport.y - zoom * centre.y,
    zoom,
  };
}

/** The plane point a frame holds at `viewport`. The inverse of `frameOn`. */
export function centreOf(
  frame: Frame,
  viewport: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: (viewport.x - frame.tx) / frame.zoom,
    y: (viewport.y - frame.ty) / frame.zoom,
  };
}

/**
 * How far the camera pulls back at the midpoint of a travel.
 *
 * A straight interpolation between two framings at ~2x is a lateral pan across
 * up to 950px of plane, which reads as being dragged sideways rather than as
 * moving between two objects. Rising first shows both the artefact being left
 * and the one being approached, which is the honest picture: they are two real
 * things in one space.
 *
 * Deliberately shallow. Nothing is open during the crossing, so too much
 * pull-back and the midpoint is indistinguishable from the resting field —
 * which would make a travel look exactly like closing and reopening, the thing
 * it exists instead of. At 0.75 the camera is still visibly pushed in.
 */
const PULLBACK = 0.75;

/**
 * The midpoint of a travel between two framings.
 *
 * Never pulls back past 1. Zooming out below the resting field would show the
 * plane smaller than it ever is at rest, which reads as leaving the page rather
 * than moving within it — and "depth, not distance" is the whole premise.
 */
export function midFrame(
  from: Frame,
  to: Frame,
  viewport: { x: number; y: number },
): Frame {
  const a = centreOf(from, viewport);
  const b = centreOf(to, viewport);
  const zoom = Math.max(1, Math.min(from.zoom, to.zoom) * PULLBACK);
  return frameOn({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, viewport, zoom);
}
