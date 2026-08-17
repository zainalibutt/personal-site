import { ProjectCard } from "./ProjectCard";
import type { ProjectSummary } from "@/lib/content";

/**
 * The project field.
 *
 * Artefacts flank a central spine and stagger down the Y axis, alternating
 * sides.
 *
 * **On narrow screens the two flanks are `display: contents`**, so every card
 * becomes a direct child of this container and `order` can sequence them across
 * what were two separate columns. Without that the DOM order is
 * left-flank / spine / right-flank, which put Melody — a flagship — below About
 * and two lesser projects on a phone. Splitting a list into two columns and
 * hoping the source order survives is exactly the kind of layout detail that
 * quietly breaks the one rule this site has.
 *
 * The mobile sequence is deliberate: flagships, then About, then the rest.
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
  /** Where About sits in the phone sequence: straight after the flagships. */
  const spineOrder = items.filter((item) => item.project.flagship).length;

  /** Source position, with a slot opened up for the spine. */
  const orderOf = (i: number) => (i < spineOrder ? i : i + 1);

  const left = items
    .map((item, i) => ({ item, order: orderOf(i) }))
    .filter((_, i) => i % 2 === 0);
  const right = items
    .map((item, i) => ({ item, order: orderOf(i) }))
    .filter((_, i) => i % 2 === 1);

  return (
    <div className="flex flex-col gap-16 lg:grid lg:grid-cols-[1fr_minmax(0,24rem)_1fr] lg:items-start lg:gap-x-14 lg:gap-y-16">
      <Flank entries={left} offsetIndex={0} className="lg:order-1" />

      {/* `data-spine` is measured when framing a zoom: an artefact may never
          grow across the centre column, or it occludes About instead of sitting
          beside it. See docs/ARCHITECTURE.md. */}
      <div
        data-spine
        style={{ order: spineOrder }}
        className="lg:sticky lg:top-24 lg:order-2"
      >
        {children}
      </div>

      <Flank entries={right} offsetIndex={1} className="lg:order-3 lg:mt-32" />
    </div>
  );
}

function Flank({
  entries,
  offsetIndex,
  className = "",
}: {
  entries: { item: FieldItem; order: number }[];
  offsetIndex: number;
  className?: string;
}) {
  return (
    /* `contents` below the lg breakpoint: the wrapper stops generating a box, so
       its cards join the parent's flex flow and can be ordered against the other
       flank and the spine. */
    <div className={`contents lg:flex lg:flex-col lg:gap-20 ${className}`}>
      {entries.map(({ item, order }, i) => (
        <div
          key={item.project.slug}
          style={
            {
              order,
              "--stagger": `${STAGGER_REM[(i * 2 + offsetIndex) % STAGGER_REM.length]}rem`,
            } as React.CSSProperties
          }
          /* The order above sequences the phone layout only. Once the flanks are
             real columns again it would reorder cards *within* a flank, so it is
             cleared at the same breakpoint that restores them. */
          className="lg:order-none lg:mt-[var(--stagger)]"
        >
          <ProjectCard project={item.project} body={item.body} />
        </div>
      ))}
    </div>
  );
}
