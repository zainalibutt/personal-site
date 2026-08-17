import { getAllProjects } from "@/lib/content";
import { site } from "@/lib/site";
import { About } from "@/components/About";
import { ProjectBody } from "@/components/ProjectBody";
import { ProjectField, type FieldItem } from "@/components/ProjectField";

export default function Home() {
  // Case studies are rendered here, on the server, and handed to the cards.
  // They sit clipped inside each artefact so expanding one is instant and
  // needs no fetch — see docs/ARCHITECTURE.md.
  const items: FieldItem[] = getAllProjects().map((project) => {
    const { body, ...summary } = project;
    return { project: summary, body: <ProjectBody source={body} /> };
  });

  return (
    <main id="main" className="mx-auto w-[min(96rem,calc(100%-3rem))] pb-40">
      {/* the entry. Name and links centred, per the wireframe. */}
      <header className="flex flex-col items-center py-24 text-center sm:py-32">
        <h1 className="text-ink text-5xl text-balance sm:text-7xl">
          {site.name}
        </h1>
        <p className="text-muted mt-5 max-w-xl text-lg text-pretty sm:text-xl">
          {site.role} · {site.location}
        </p>

        <nav
          aria-label="Elsewhere"
          className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm"
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
  );
}
