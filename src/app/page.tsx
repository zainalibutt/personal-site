import { getAllProjects } from "@/lib/content";
import { site } from "@/lib/site";
import { About } from "@/components/About";
import { EdgeFade } from "@/components/EdgeFade";
import { ProjectBody } from "@/components/ProjectBody";
import { ProjectField, type FieldItem } from "@/components/ProjectField";
import { ProjectMap } from "@/components/ProjectMap";
import { SpacetimeField } from "@/components/SpacetimeField";

export default function Home() {
  // Case studies are rendered here, on the server, and handed to the cards.
  // They sit clipped inside each artefact so expanding one is instant and
  // needs no fetch — see docs/ARCHITECTURE.md.
  const items: FieldItem[] = getAllProjects().map((project) => {
    const { body, ...summary } = project;
    return { project: summary, body: <ProjectBody source={body} /> };
  });

  return (
    <>
      {/* Both sit outside the plane: they are fixed to the viewport, and
          `position: fixed` inside a transformed ancestor resolves against that
          ancestor instead. */}
      <SpacetimeField />
      <EdgeFade />

      {/* Outside the plane for the same reason as those two, and *before* it so
          that tabbing while an artefact is open goes instrument first, then the
          artefact itself. It renders nothing until something is focused. */}
      <ProjectMap projects={items.map((item) => item.project)} />

      {/* `data-plane` marks the surface the camera moves. Focusing an artefact
          translates and scales this whole element, so every other item keeps its
          spatial relationship instead of being covered over. */}
      <main
        id="main"
        data-plane
        /* The deep bottom padding is desktop breathing room. On a phone the
           springboard is sized to the fold, so 160px of nothing underneath is
           160px of scroll for no reason. */
        className="mx-auto w-[min(96rem,calc(100%-3rem))] origin-top-left pb-10 will-change-transform md:pb-40"
      >
        {/* the entry. Name and links centred, per the wireframe. */}
        {/* Tighter on a phone: the springboard below is sized to clear the fold
            on a 667px viewport, and every pixel this header spends is one the
            icons do not have. */}
        <header className="flex flex-col items-center pt-8 pb-8 text-center md:pt-16 md:pb-14 lg:flex-row lg:items-end lg:justify-between lg:pt-24 lg:pb-20 lg:text-left">
          <div>
            {/* The role as a mono label rather than a sentence under the name.
                It is data about him, which is what the monospace is for, and it
                gives the name something to sit against instead of floating. */}
            <p className="text-muted font-mono text-[0.625rem] tracking-[0.12em] text-balance uppercase md:text-xs md:tracking-[0.2em]">
              {site.role} · {site.location}
            </p>
            <h1 className="text-ink mt-3 text-5xl tracking-[-0.035em] text-balance md:mt-4 md:text-7xl lg:text-[6.5rem] lg:leading-[0.92]">
              {site.name}
            </h1>
          </div>

          {/* The only place these live now. They were here, again under About,
              and again in the footer — LinkedIn three times on one screen —
              which made the page feel like it was asking rather than showing.

              The CV came up from the About list rather than being dropped: the
              site argues the case, but a PDF is still the artefact a recruiter
              forwards to someone else, and it is a different object from the
              page it sits on. The published copy is redacted — the phone
              number is removed from the content stream, not covered over, so
              it survives neither copy-paste nor a parser. The original stays
              in the gitignored `assets/raw/documents/`. */}
          <nav
            aria-label="Elsewhere"
            className="mt-6 flex flex-wrap justify-center gap-2 md:mt-8 lg:mt-0 lg:shrink-0 lg:justify-end"
          >
            <a className="link-chip" href={site.links.github}>
              GitHub
            </a>
            <a className="link-chip" href={site.links.linkedin}>
              LinkedIn
            </a>
            <a className="link-chip" href="/ZainButt-CV.pdf">
              CV
            </a>
            {/* Carries the accent at rest. Four equal chips is a list; one of
                them being the thing he actually wants clicked makes it a
                nav. */}
            <a
              className="link-chip link-chip--primary"
              href={`mailto:${site.links.email}`}
            >
              Email
            </a>
          </nav>
        </header>

        {/* Was `sr-only`. A sighted visitor got a name and then some floating
            rectangles, with nothing saying they were a considered set. */}
        <h2 id="work-heading" className="section-label mb-10 md:mb-12">
          Selected work
        </h2>

        <ProjectField items={items}>
          <About />
        </ProjectField>
        {/* The page used to simply stop after the last artefact, which reads as
            unfinished however good the thing above it is. Inside the plane, so
            the camera carries it like everything else.

            Hidden on a phone: the springboard is sized to the fold, and a
            footer whose every link is already in the header above cost 148px of
            scroll to say nothing new. */}
        <footer className="border-line text-muted mt-28 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t pt-8 font-mono text-[0.6875rem] tracking-[0.14em] uppercase max-md:hidden md:mt-40">
          <span>
            {site.name} · {site.location}
          </span>
          {/* The address written out, not a third "GitHub · LinkedIn" pair.
              A sign-off, which is what a footer is for — the navigation is
              settled at the top of the page and does not need restating at the
              bottom of it. */}
          <a
            className="hover:text-ink transition-colors"
            href={`mailto:${site.links.email}`}
          >
            {site.links.email}
          </a>
        </footer>
      </main>
    </>
  );
}
