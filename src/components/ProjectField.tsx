import { ProjectCard } from "./ProjectCard";
import type { ProjectSummary } from "@/lib/content";

/**
 * The project field.
 *
 * Artefacts flank a central spine and stagger down the Y axis, alternating
 * sides. On narrow screens it collapses to one column in source order, so
 * reading order and visual order never disagree.
 *
 * A server component: the case studies are server-rendered here and handed to
 * the client cards as children, so expanding one needs no fetch.
 */

export interface FieldItem {
  project: ProjectSummary;
  body: React.ReactNode;
}

/** Vertical stagger per flank position, in rem. Keeps the two sides off-beat. */
const STAGGER_REM = [0, 7, 3, 10, 6];

export function ProjectField({
  items,
  children,
}: {
  items: FieldItem[];
  /** The central spine — about copy and portrait. */
  children: React.ReactNode;
}) {
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);

  return (
    <div className="grid items-start gap-x-10 gap-y-16 lg:grid-cols-[1fr_minmax(0,24rem)_1fr] lg:gap-x-14">
      <Flank items={left} offsetIndex={0} className="lg:order-1" />

      <div className="lg:sticky lg:top-24 lg:order-2">{children}</div>

      <Flank items={right} offsetIndex={1} className="lg:order-3 lg:mt-32" />
    </div>
  );
}

function Flank({
  items,
  offsetIndex,
  className = "",
}: {
  items: FieldItem[];
  offsetIndex: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-14 lg:gap-20 ${className}`}>
      {items.map((item, i) => (
        <div
          key={item.project.slug}
          style={
            {
              "--stagger": `${STAGGER_REM[(i * 2 + offsetIndex) % STAGGER_REM.length]}rem`,
            } as React.CSSProperties
          }
          className="lg:mt-[var(--stagger)]"
        >
          <ProjectCard project={item.project} body={item.body} />
        </div>
      ))}
    </div>
  );
}
