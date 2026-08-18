import { ProjectCard } from "./ProjectCard";
import type { ProjectSummary } from "@/lib/content";

/**
 * The project field.
 *
 * Artefacts flank a central spine and stagger down the Y axis, alternating
 * sides.
 *
 * **There is one DOM stream, in the order a person should meet things:**
 * flagships, then About, then the rest. Nothing reorders it — not `order`, not
 * two flank containers, not a positive `tabindex`. Everything a phone shows,
 * a keyboard tabs through and a screen reader announces is that one sequence.
 *
 * Two earlier versions each got half of this. Splitting the items into a left
 * and a right container gave the DOM left-flank / spine / right-flank, so a
 * phone met Melody — a flagship — below About and two lesser projects. Fixing
 * that with CSS `order` moved what the eye saw and left the focus order exactly
 * where it was, which is worse: the page then disagreed with itself.
 *
 * The desktop flanks are therefore built by *placement*, not by grouping. Each
 * card is assigned a grid column and a row; the spine spans every row in the
 * middle column. The two flanks share rows and the stagger comes from a margin
 * — see `DRIFT_REM` for why it cannot come from the placement.
 *
 * On a phone the same cards render as a springboard of app icons. Decision 17.
 *
 * A server component: the case studies are server-rendered here and handed to
 * the client cards as children, so expanding one needs no fetch.
 */

export interface FieldItem {
  project: ProjectSummary;
  body: React.ReactNode;
}

/**
 * Vertical offset per card, in rem, applied at `lg`.
 *
 * The two flanks share rows — card 0 and card 1 both sit in row 1, card 2 and
 * card 3 in row 2 — so the stagger has to come from a margin. It cannot come
 * from the row placement: a card spanning two rows sizes the *first* of them to
 * its full height, which drove the second flagship 1044px down the page and
 * clean off the first screen.
 *
 * Odd indices are the right flank and carry the larger offset, so the two
 * columns stay off-beat rather than reading as a table.
 */
const DRIFT_REM = [0, 8, 2, 10, 4];

export function ProjectField({
  items,
  children,
}: {
  items: FieldItem[];
  /** The central spine — about copy and portrait. */
  children: React.ReactNode;
}) {
  /** About goes straight after the flagships, in the DOM, for everyone. */
  const spineAt = items.filter((item) => item.project.flagship).length;

  const cards = items.map((item, i) => (
    <div
      key={item.project.slug}
      style={
        {
          "--col": i % 2 === 0 ? 1 : 3,
          "--row": Math.floor(i / 2) + 1,
          "--drift": `${DRIFT_REM[i % DRIFT_REM.length]}rem`,
          "--bob": `${(i % 3) * 1.1 + 5.4}s`,
          "--bob-delay": `${i * 0.7}s`,
        } as React.CSSProperties
      }
      /* Placement is scoped to `lg` through variables rather than written
         inline, because the phone layout is a two-column grid of its own and an
         inline `grid-column: 3` would land in a column that does not exist. */
      className="artefact-cell lg:[grid-column-start:var(--col)] lg:[grid-row-start:var(--row)] lg:mt-[var(--drift)]"
    >
      <ProjectCard project={item.project} body={item.body} index={i} />
    </div>
  ));

  return (
    <div
      className={[
        // Phone: a springboard. Two columns of icons with About between them,
        // which is where the flagships end up either side of the first row.
        "project-field grid grid-cols-2 gap-x-4 gap-y-7",
        // Tablet: the conventional two-up grid of full panels. It was a single
        // column, which at 900px wide ran to 4,600px of scrolling — legible,
        // but structurally the same "wade through everything" shape the phone
        // springboard exists to avoid.
        "md:gap-x-8 md:gap-y-14",
        "lg:grid lg:grid-cols-[1fr_minmax(0,24rem)_1fr] lg:items-start lg:gap-x-14 lg:gap-y-12",
      ].join(" ")}
    >
      {cards.slice(0, spineAt)}

      {/* `data-spine` is measured when framing a zoom: an artefact may never
          grow across the centre column, or it occludes About instead of sitting
          beside it. See docs/ARCHITECTURE.md. */}
      <div
        data-spine
        /* `max-lg:` on the span, so it cannot compete with the explicit column
           at `lg` — two rules setting `grid-column` at the same breakpoint
           resolve by stylesheet order, which is not something to rely on. */
        className="max-lg:col-span-2 lg:sticky lg:top-24 lg:[grid-column:2] lg:[grid-row:1/-1] lg:self-start"
      >
        {children}
      </div>

      {cards.slice(spineAt)}
    </div>
  );
}
