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
import { WorkIndex } from "@/components/WorkIndex";
import { getWorkIndex } from "@/lib/repos";

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
         rather than with a generic one. The image has to be named again.

         And not only the image: `type`, `locale`, `siteName` and `url` are
         replaced too, so every project page was shipping a card with no site
         name and no canonical URL on it. Restated here for the same reason. */
      type: "website",
      locale: "en_GB",
      siteName: site.name,
      url: `${site.url}/projects/${slug}`,
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
  const index = getWorkIndex();

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

      {/* Name the thing before showing it.
          The preview used to open this header, which meant a cold visit — the
          URL that gets pasted into an application — spent its entire first
          viewport on a screenshot with the project's name below the fold. For
          Proof-Lens that screenshot was the app's sign-in form, so the page a
          recruiter landed on was a login box belonging to nothing they could
          name. */}
      <header className="py-12">
        <h1 className="text-ink text-4xl text-balance sm:text-5xl">
          {project.title}
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-lg text-pretty">
          {project.tagline}
        </p>

        <PreviewSurface
          project={summary}
          /* This is the largest element on the page and the LCP candidate on
             every cold visit, so it loads eagerly and is measured against the
             column it actually occupies rather than against a card in the
             field. */
          priority
          sizes="(min-width: 1088px) 64rem, calc(100vw - 3rem)"
          className="mt-10 w-full rounded-2xl"
        />

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

      {/* This page used to end here, and it was a dead end.
          A cold visit to /projects/<slug> — the URL that gets pasted into an
          application or a LinkedIn post — carried his name only in the JSON-LD,
          had no email, no CV, and no route anywhere except back to the field.
          A reader who arrived from outside could not tell whose work they were
          reading or how to reach him. */}
      <footer className="border-line text-muted mt-24 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t pt-8 font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
        <span>
          {site.name} · {site.location}
        </span>
        <a
          className="hover:text-ink transition-colors"
          href={`mailto:${site.links.email}`}
        >
          {site.links.email}
        </a>
      </footer>

      {/* Persistent here: there is no camera on this route and no map, so this
          is the only way to the rest of the work without going home first. */}
      <WorkIndex written={index.written} other={index.other} persistent />
    </main>
  );
}
