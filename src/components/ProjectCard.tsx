"use client";

import Link from "next/link";
import { PreviewSurface } from "./PreviewSurface";
import type { ProjectSummary } from "@/lib/content";

/**
 * A card in the project field.
 *
 * The card registers its preview surface with the motion layer; the focused
 * view reads that rect back to morph from. No `layoutId`, no shared-element
 * library — FLIP over the case-study subtree was rejected, and the
 * card is otherwise inert (docs/ARCHITECTURE.md §1).
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="border-line bg-surface group relative overflow-hidden rounded-2xl border">
      <Link
        href={`/projects/${project.slug}`}
        scroll={false}
        prefetch
        className="block focus-visible:outline-none"
        aria-label={`${project.title} — ${project.tagline}`}
      >
        {/* the preview surface. Flagships get bespoke interactive
            miniatures, the rest get looping video. The card must already look
            complete before either arrives. */}
        <PreviewSurface project={project} register className="w-full" />

        <div className="space-y-2 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-ink text-2xl">{project.title}</h3>
            <span className="text-muted shrink-0 text-sm tabular-nums">
              {project.year}
            </span>
          </div>

          <p className="text-muted text-pretty">{project.tagline}</p>

          <ul className="text-muted flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
            {project.stack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
      </Link>
    </article>
  );
}
