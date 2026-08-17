/**
 * The site's motion language, in one place.
 *
 * Before this, durations and easings were scattered across `useBoxExpand`, the
 * field, and a handful of Tailwind utilities — which is why the open, the close
 * and the hover did not feel like one hand made them. Everything that moves now
 * reads from here.
 *
 * `globals.css` mirrors these as custom properties for the CSS-driven parts.
 * Keep the two in sync; there is no build step tying them together.
 */

export const DURATION = {
  /** An artefact opening. The longest move on the site — everything else is
   *  measured against it. */
  open: 660,
  /** Closing is faster than opening. Leaving should never feel laboured. */
  close: 440,
  /** Content resolving inside an opened artefact. */
  reveal: 420,
  /** Hover and other micro-states. */
  micro: 260,
  /** The lattice settling on first load. */
  entrance: 1100,
} as const;

export const EASE = {
  /** Decelerating. Everything that arrives. */
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Symmetric. Everything that leaves. */
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/**
 * Per-frame easing factors for the field, which is driven by a raf loop rather
 * than by keyframes. Higher is faster. These are deliberately slower than the
 * artefact's own timings: the field should trail the interaction, not race it.
 */
export const LERP = {
  cursor: 0.14,
  cursorWeight: 0.09,
  focus: 0.075,
  entrance: 0.045,
} as const;
