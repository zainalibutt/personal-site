"use client";

import { useCallback } from "react";
import { registerField } from "@/lib/motion-layer";
import { ProjectCard } from "./ProjectCard";
import type { ProjectSummary } from "@/lib/content";

/**
 * The project field.
 *
 * Artefacts flank a central spine and stagger down the Y axis, alternating
 * sides — the wireframe layout. On narrow screens it collapses to one column in
 * source order, so the reading order and the visual order never disagree.
 *
 * The field registers itself with the motion layer so opening a project can
 * push the camera toward that sector.
 */

/** Vertical stagger per flank position, in rem. Keeps the two sides off-beat. */
const STAGGER_REM = [0, 7, 3, 10, 6];

export function ProjectField({
  projects,
  children,
}: {
  projects: ProjectSummary[];
  /** The central spine — about copy and portrait. */
  children: React.ReactNode;
}) {
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    return registerField(element);
  }, []);

  const left = projects.filter((_, i) => i % 2 === 0);
  const right = projects.filter((_, i) => i % 2 === 1);

  return (
    <div ref={ref} className="origin-center will-change-transform">
      <div className="grid items-start gap-x-10 gap-y-16 lg:grid-cols-[1fr_minmax(0,24rem)_1fr] lg:gap-x-14">
        <Flank projects={left} offsetIndex={0} className="lg:order-1" />

        <div className="lg:order-2 lg:sticky lg:top-24">{children}</div>

        <Flank projects={right} offsetIndex={1} className="lg:order-3 lg:mt-32" />
      </div>
    </div>
  );
}

function Flank({
  projects,
  offsetIndex,
  className = "",
}: {
  projects: ProjectSummary[];
  offsetIndex: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-14 lg:gap-20 ${className}`}>
      {projects.map((project, i) => (
        <div
          key={project.slug}
          style={{
            // Applied as a custom property so it can be ignored below `lg`.
            "--stagger": `${STAGGER_REM[(i * 2 + offsetIndex) % STAGGER_REM.length]}rem`,
          } as React.CSSProperties}
          className="lg:mt-[var(--stagger)]"
        >
          <ProjectCard project={project} />
        </div>
      ))}
    </div>
  );
}
