"use client";

import Link from "next/link";
import { PreviewSurface } from "./PreviewSurface";
import type { ProjectSummary } from "@/lib/content";

/**
 * An artefact in the project field.
 *
 * Hover lifts and expands it. The card registers its preview surface with the
 * motion layer; the focused view reads that rect back to morph from. No
 * `layoutId` — see docs/ARCHITECTURE.md §1.
 *
 * hover character is yours. The scale is one constant below.
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="group">
      <Link
        href={`/projects/${project.slug}`}
        scroll={false}
        prefetch
        className="block rounded-2xl focus-visible:outline-none"
        aria-label={`${project.title} — ${project.tagline}`}
      >
        <div
          className={[
            "border-line bg-surface overflow-hidden rounded-2xl border",
            "transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)]",
            "group-hover:-translate-y-2 group-hover:scale-[1.06] group-hover:shadow-2xl",
            "group-hover:shadow-word-600/15",
            "group-focus-visible:-translate-y-2 group-focus-visible:scale-[1.06]",
            "motion-reduce:transform-none motion-reduce:transition-none",
          ].join(" ")}
        >
          <PreviewSurface
            project={project}
            register
            priority={project.flagship}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5 px-1 pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-ink text-2xl">{project.title}</h3>
            <span className="text-muted shrink-0 text-sm tabular-nums">
              {project.year}
            </span>
          </div>

          <p className="text-muted text-pretty">{project.tagline}</p>

          <ul className="text-muted/80 flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
            {project.stack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
      </Link>
    </article>
  );
}
