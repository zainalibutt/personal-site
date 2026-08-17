"use client";

import { usePathname } from "next/navigation";

/**
 * A soft fade at the viewport edge while a project is focused.
 *
 * The camera model deliberately leaves neighbouring content in frame, but at
 * high zoom that content gets cut mid-word at the screen edge and reads as
 * broken rather than as a page continuing past the frame. This softens only the
 * outermost few percent.
 *
 * It must live OUTSIDE `[data-plane]`: `position: fixed` inside a transformed
 * ancestor resolves against that ancestor, not the viewport, so it would be
 * dragged around by the camera.
 */
export function EdgeFade() {
  const pathname = usePathname();
  if (!pathname.startsWith("/projects/")) return null;
  return <div className="edge-fade" aria-hidden />;
}
