import { getProjectSummaries } from "@/lib/content";
import { site } from "@/lib/site";
import { ProjectCard } from "@/components/ProjectCard";

export default function Home() {
  const projects = getProjectSummaries();

  return (
    <main id="main" className="mx-auto w-[min(72rem,calc(100%-3rem))] pb-32">
      {/* the warm entry. Calm, not a hero-with-scroll-hint. This is
          the first impression and currently the plainest thing on the site. */}
      <header className="flex min-h-[70svh] flex-col justify-center py-24">
        <h1 className="text-ink text-5xl text-balance sm:text-7xl">
          {site.name}
        </h1>
        <p className="text-muted mt-6 max-w-xl text-xl text-pretty sm:text-2xl">
          {site.role} in {site.location}. {site.thesis}
        </p>

        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a
            className="text-accent underline underline-offset-4"
            href={site.links.github}
          >
            GitHub
          </a>
          <a
            className="text-accent underline underline-offset-4"
            href={site.links.linkedin}
          >
            LinkedIn
          </a>
          <a
            className="text-accent underline underline-offset-4"
            href={`mailto:${site.links.email}`}
          >
            Email
          </a>
        </nav>
      </header>

      {/* the project field. "Floating beneath" the entry — right now
          it is an ordinary grid. The cards are the thing that must feel
          alive. */}
      <section aria-labelledby="work-heading">
        <h2 id="work-heading" className="sr-only">
          Selected work
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </main>
  );
}
