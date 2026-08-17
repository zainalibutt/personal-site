import { getAllProjects } from "@/lib/content";
import { site } from "@/lib/site";
import { About } from "@/components/About";
import { EdgeFade } from "@/components/EdgeFade";
import { ProjectBody } from "@/components/ProjectBody";
import { ProjectField, type FieldItem } from "@/components/ProjectField";
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
        <header className="flex flex-col items-center pt-8 pb-8 text-center md:pt-16 md:pb-14 lg:pt-20 lg:pb-16">
          <h1 className="text-ink text-4xl tracking-[-0.03em] text-balance md:text-6xl lg:text-7xl">
            {site.name}
          </h1>
          <p className="text-muted mt-2 max-w-xl text-pretty md:mt-4 md:text-lg lg:text-xl">
            {site.role} · {site.location}
          </p>

          <nav
            aria-label="Elsewhere"
            className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm md:mt-8"
          >
            <a
              className="text-accent hover:text-ink underline underline-offset-8 transition-colors"
              href={site.links.github}
            >
              GitHub
            </a>
            <a
              className="text-accent hover:text-ink underline underline-offset-8 transition-colors"
              href={site.links.linkedin}
            >
              LinkedIn
            </a>
            <a
              className="text-accent hover:text-ink underline underline-offset-8 transition-colors"
              href={`mailto:${site.links.email}`}
            >
              Email
            </a>
          </nav>
        </header>

        <h2 id="work-heading" className="sr-only">
          Selected work
        </h2>

        <ProjectField items={items}>
          <About />
        </ProjectField>
      </main>
    </>
  );
}
