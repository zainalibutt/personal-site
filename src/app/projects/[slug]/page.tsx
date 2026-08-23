import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjectSlugs } from "@/lib/content";
import { jsonLd, projectGraph } from "@/lib/schema";
import { site } from "@/lib/site";
import { ProjectBody } from "@/components/ProjectBody";
import { PreviewSurface } from "@/components/PreviewSurface";

/**
 * The full page for a project — what a COLD visit renders.
 *
 * In-session, this route is intercepted by app/@modal/(.)projects/[slug] and
 * shown as a focused overlay instead. This file is what a shared link, a search
 * crawler, or a hard refresh gets, and it must stand alone completely.
 */

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  const card = projectCard(slug);

  return {
    title: project.title,
    description: project.tagline,
    openGraph: {
      title: project.title,
      description: project.tagline,
      /* Declaring `openGraph` here replaces the root layout's wholesale, image
         included — which is why these routes shipped with no card at all
         rather than with a generic one. The image has to be named again. */
      images: [
        {
          url: card ?? SITE_CARD,
          width: 1200,
          height: 630,
          alt: card
            ? `${project.title} — ${project.tagline}`
            : `${site.name} — ${site.role}`,
        },
      ],
    },
  };
}

/** The site's own card, at the address `npm run og` writes it to. */
const SITE_CARD = "/og/site.jpg";

/**
 * The card a link preview shows, if it has been taken.
 *
 * Written by `npm run og`, which photographs this project focused in the field
 * — so it is the site itself rather than a second design drifting out of sync.
 *
 * **Absent is a valid state, and it must not produce a broken image.** Dropping
 * one `.mdx` file into `content/projects/` is the only step required to add a
 * project; the photograph cannot be part of that step, because taking it needs
 * the site running. Until it is taken the project inherits the site card from
 * the root layout — generic, but true, and not a 404 in somebody's inbox.
 */
function projectCard(slug: string): string | undefined {
  const file = path.join(process.cwd(), "public", "og", `${slug}.jpg`);
  return fs.existsSync(file) ? `/og/${slug}.jpg` : undefined;
}

/** Absolute, for structured data — which has no `metadataBase` to resolve
 *  against and is read by things that never fetch the page it came from. */
function absolute(pathname: string | undefined): string | undefined {
  return pathname ? `${site.url}${pathname}` : undefined;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || project.draft) notFound();

  const { body, ...summary } = project;
  const card = projectCard(slug);

  return (
    <main id="main" className="mx-auto w-[min(64rem,calc(100%-3rem))] pb-32">
      {/* The work itself, machine-readable, attributed to the same person node
          the root layout declares. This route is what a crawler gets — the
          in-session view is an interception the crawler never runs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(projectGraph(summary, absolute(card))),
        }}
      />

      <Link
        href="/"
        className="text-accent mt-12 inline-block text-sm underline underline-offset-4"
      >
        ← All work
      </Link>

      <header className="py-12">
        <PreviewSurface
          project={summary}
          className="mb-10 w-full rounded-2xl"
        />
        <h1 className="text-ink text-4xl text-balance sm:text-5xl">
          {project.title}
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-lg text-pretty">
          {project.tagline}
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div>
            <dt className="text-muted">Year</dt>
            <dd className="text-ink tabular-nums">{project.year}</dd>
          </div>
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="text-ink">{project.role}</dd>
          </div>
          <div>
            <dt className="text-muted">Stack</dt>
            <dd className="text-ink">{project.stack.join(" · ")}</dd>
          </div>
        </dl>

        {(project.repo || project.live) && (
          <nav className="mt-6 flex gap-6 text-sm">
            {project.live && (
              <a
                className="text-accent underline underline-offset-4"
                href={project.live}
              >
                Live
              </a>
            )}
            {project.repo && (
              <a
                className="text-accent underline underline-offset-4"
                href={project.repo}
              >
                Source
              </a>
            )}
          </nav>
        )}
      </header>

      <ProjectBody source={body} />
    </main>
  );
}
