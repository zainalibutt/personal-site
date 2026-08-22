"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DURATION } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion-layer";
import type { ProjectSummary } from "@/lib/content";

/**
 * The field, in miniature, while an artefact is open.
 *
 * An orientation instrument, not a menu. While the camera is pushed into one
 * artefact the rest of the plane is off the edge of the frame, so a visitor has
 * no way to answer three questions a portfolio has to answer at all times:
 * where am I, what else is there, and can I get to it.
 *
 * **It is a map of the real field, not a list.** The marks sit where the
 * artefacts actually sit — two flanks, staggered down the plane — so pressing
 * one and watching the camera set off in that direction is coherent rather than
 * arbitrary. That is what earns it a place over a row of links: it explains the
 * move it is about to make. Every coordinate is measured; none is authored.
 *
 * A faint line joins the marks in the order the projects are ranked, which is
 * the one thing the positions cannot say on their own — the field's layout is
 * spatial, but the order is Zain's judgement of his own work.
 *
 * Deliberately quiet, and deliberately unframed: no panel, no border, no
 * counter. The field is its surface. Only the artefact you are in is named;
 * the others give up their names on hover or keyboard focus, because showing
 * all six at once is a navigation drawer, which is the thing this exists
 * instead of.
 *
 * Desktop only. Below `lg` the camera does not move, the open panel covers the
 * screen, and closing lands on a springboard where every artefact is already
 * one tap away inside the fold — so the artefacts carry a plain previous/next
 * instead. See `ProjectSteps`.
 */

type Side = "left" | "right";

interface Place {
  /** Normalised into the field's own bounding box, 0–1. */
  x: number;
  y: number;
  /** Which side of the centre spine this artefact actually sits on. */
  flank: Side;
}

/**
 * Measures the artefacts' resting positions, and which flank each one is on.
 *
 * Uses `offsetLeft`/`offsetTop`, which are layout values and are **not**
 * affected by the camera transform on the plane. Reading rects here would be
 * the project's oldest hazard — measuring through a live transform — and this
 * component only ever renders while that transform is live.
 *
 * The flank comes from comparing each artefact's own centre against the centre
 * of `[data-spine]`. Nothing here knows how many artefacts there are, which
 * column they were placed in, or what any of them are called.
 */
function measure(): Map<string, Place> {
  const cells = Array.from(
    document.querySelectorAll<HTMLElement>("[data-artefact]"),
  );

  const points = cells.map((cell) => ({
    slug: cell.dataset.artefact ?? "",
    x: cell.offsetLeft + cell.offsetWidth / 2,
    y: cell.offsetTop + cell.offsetHeight / 2,
  }));
  if (points.length === 0) return new Map();

  const spine = document.querySelector<HTMLElement>("[data-spine]");
  const spineCentre = spine
    ? spine.offsetLeft + spine.offsetWidth / 2
    : points.reduce((sum, p) => sum + p.x, 0) / points.length;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  // A single artefact, or a column of them, has no extent on one axis. Falling
  // back to 1 puts it dead centre rather than dividing by zero.
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;

  return new Map(
    points.map((p) => [
      p.slug,
      {
        x: (p.x - minX) / spanX,
        y: (p.y - minY) / spanY,
        flank: (p.x < spineCentre ? "left" : "right") as Side,
      },
    ]),
  );
}

export function ProjectMap({ projects }: { projects: ProjectSummary[] }) {
  const pathname = usePathname();
  const [places, setPlaces] = useState<Map<string, Place>>(new Map());
  /** The side currently rendered, which lags `side` across a flank change. */
  const [renderedSide, setRenderedSide] = useState<Side | null>(null);

  const match = /^\/projects\/([^/]+)$/.exec(pathname);
  const focusedSlug = match?.[1] ?? null;

  /* Measured from the DOM rather than derived from the grid rules, so the map
     cannot drift out of agreement with the field it describes — and so nothing
     here has to know that the field is two flanks of three. */
  useEffect(() => {
    const remeasure = () => setPlaces(measure());
    remeasure();
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, []);

  /* Positions come from the layout, names and order from the content. Anything
     the field has not placed yet is simply absent, so the map is never a
     half-truth about where things are. */
  const marks = projects.flatMap((project) => {
    const place = places.get(project.slug);
    return place
      ? [{ ...place, slug: project.slug, title: project.title }]
      : [];
  });

  const index = marks.findIndex((m) => m.slug === focusedSlug);
  /**
   * The free flank.
   *
   * About sits in the centre spine, so the camera puts it on the far side of
   * whichever artefact is framed: focus something on the left flank and About
   * appears to its right, leaving the left of the screen open. The map takes
   * that open side. Derived from the focused artefact's measured position
   * against the spine — never from which project it is.
   */
  const side = index === -1 ? null : marks[index].flank;

  /**
   * Crossing flanks hides the map rather than flying it across the screen.
   *
   * Animating it from one side to the other would drag a navigation instrument
   * over the artefact you just asked to see, and it is the one thing on screen
   * whose job is to stay still. It leaves, the camera travels, it arrives on
   * the other side — moving only while nobody can see it move.
   *
   * `renderedSide` is therefore allowed to lag `side`, and the gap between them
   * *is* the hidden state: the map is visible exactly when the two agree. Both
   * catch-up cases are settled during render rather than from an effect, so
   * arriving and leaving cost no extra committed frame.
   */
  if (side !== null && renderedSide === null) setRenderedSide(side);
  if (side === null && renderedSide !== null) setRenderedSide(null);

  const visible = side !== null && side === renderedSide;

  /* The one case that genuinely has to wait: the flank changed, so the map is
     already fading out and may not move until it has gone. */
  useEffect(() => {
    if (side === null || renderedSide === null || side === renderedSide) return;
    const swap = setTimeout(
      () => setRenderedSide(side),
      prefersReducedMotion() ? 0 : DURATION.travel,
    );
    return () => clearTimeout(swap);
  }, [side, renderedSide]);

  if (!focusedSlug || index === -1 || !renderedSide) return null;

  return (
    <nav
      aria-label="Other work"
      /* Fixed to the viewport, and therefore rendered outside the plane: a
         fixed element inside a transformed ancestor resolves against that
         ancestor, so in the plane this would be dragged along by the camera —
         which is the one thing an orientation instrument must not do. */
      className="project-map max-lg:hidden"
      data-side={renderedSide}
      data-visible={visible}
    >
      <div className="project-map-plot">
        {/* The ranking, drawn through the real positions. `preserveAspectRatio`
            is off so the line lands exactly on the marks, which are placed by
            percentage; the stroke is kept hairline regardless. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="project-map-thread"
        >
          <polyline
            vectorEffect="non-scaling-stroke"
            points={marks.map((m) => `${m.x * 100},${m.y * 100}`).join(" ")}
          />
        </svg>

        <ul>
          {marks.map((mark) => {
            const current = mark.slug === focusedSlug;
            return (
              <li
                key={mark.slug}
                style={
                  {
                    "--x": `${mark.x * 100}%`,
                    "--y": `${mark.y * 100}%`,
                  } as React.CSSProperties
                }
              >
                <Link
                  href={`/projects/${mark.slug}`}
                  scroll={false}
                  prefetch
                  aria-current={current ? "page" : undefined}
                  data-current={current}
                >
                  {/* The mark is decoration; the name is the accessible name,
                      and it is in the tree at all times even though only the
                      current one is painted. A map whose links are called
                      nothing is not a navigation instrument. */}
                  <span aria-hidden className="project-map-mark" />
                  <span className="project-map-name">{mark.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Previous and next, for the layouts with no camera.
 *
 * Rendered at the foot of the case study, which is where a reader who has
 * finished one is looking. It is not a second copy of the map: the map is
 * desktop-only and this is not, so exactly one of the two is ever in the
 * document.
 */
export function ProjectSteps({
  previous,
  next,
}: {
  previous: ProjectSummary | null;
  next: ProjectSummary | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Other work" className="project-steps lg:hidden">
      {previous ? (
        <Link href={`/projects/${previous.slug}`} scroll={false} prefetch>
          <span className="project-steps-label">
            <span aria-hidden>← </span>Previous
          </span>
          <span className="project-steps-title">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={`/projects/${next.slug}`}
          scroll={false}
          prefetch
          className="project-steps-next"
        >
          <span className="project-steps-label">
            Next<span aria-hidden> →</span>
          </span>
          <span className="project-steps-title">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
