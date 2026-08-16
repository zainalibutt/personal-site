import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjectSlugs } from "@/lib/content";
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

  return {
    title: project.title,
    description: project.tagline,
    openGraph: { title: project.title, description: project.tagline },
  };
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

  return (
    <main id="main" className="mx-auto w-[min(64rem,calc(100%-3rem))] pb-32">
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
