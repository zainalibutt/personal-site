"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PreviewSurface } from "./PreviewSurface";
import { useBoxExpand } from "./useBoxExpand";
import type { ProjectSummary } from "@/lib/content";

/**
 * An artefact in the field, and its expanded state — the same box in both.
 *
 * Focus is derived from the route, not from local state, so the browser back
 * button and the close control take exactly the same path: the URL changes, the
 * box collapses. Nothing mounts or unmounts.
 */
export function ProjectCard({
  project,
  body,
}: {
  project: ProjectSummary;
  /** Server-rendered case study. Present at rest, clipped out of view. */
  body: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const focused = pathname === `/projects/${project.slug}`;
  const { slotRef, boxRef, heroRef } = useBoxExpand(focused, project.slug);

  useEffect(() => {
    if (!focused) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [focused, router]);

  return (
    <article className="group">
      {/* No backdrop. The point of the camera move is that the rest of the page
          stays visible beside the focused artefact, in its real position. */}

      {/* The slot holds the artefact's footprint via its own aspect-ratio, so
          promoting the box out of flow never reflows the field. */}
      <div
        ref={slotRef}
        className="relative"
        style={{ aspectRatio: project.preview.aspectRatio }}
      >
        <div
          ref={boxRef}
          data-expanded="false"
          className={[
            "border-line bg-bg absolute inset-0 overflow-hidden rounded-2xl border",
            "transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)]",
            "data-[expanded=false]:group-hover:-translate-y-2",
            "data-[expanded=false]:group-hover:scale-[1.06]",
            "data-[expanded=false]:group-hover:shadow-2xl",
            "data-[expanded=false]:group-hover:shadow-word-600/15",
            "data-[expanded=true]:shadow-2xl",
            "motion-reduce:transform-none motion-reduce:transition-none",
          ].join(" ")}
        >
          <div className="expand-scroll h-full overscroll-contain">
            <div className="expand-layout">
              <div ref={heroRef} className="expand-hero">
                  <PreviewSurface
                    project={project}
                    priority={project.flagship}
                    className="w-full rounded-2xl"
                  />
                </div>

                {/* Revealed by the opening clip. Inert at rest so five case
                    studies are not sitting in the accessibility tree. */}
                <div className="expand-detail" inert={!focused}>
                  <h2 className="text-ink text-3xl sm:text-4xl">
                    {project.title}
                  </h2>
                  <p className="text-muted mt-2 text-lg text-pretty">
                    {project.tagline}
                  </p>

                  <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted">Year</dt>
                      <dd className="text-ink tabular-nums">{project.year}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Role</dt>
                      <dd className="text-ink">{project.role}</dd>
                    </div>
                  </dl>

                  {(project.repo || project.live) && (
                    <nav className="mt-4 flex gap-6 text-sm">
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

                  <div className="mt-8">{body}</div>
              </div>
            </div>
          </div>

          {focused && (
            <button
              onClick={() => router.back()}
              className="bg-bg/85 text-ink border-line absolute top-4 right-4 z-10 rounded-full border px-4 py-2 text-sm backdrop-blur"
            >
              Close <kbd className="text-muted ml-1">Esc</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Field-level label. Stays put while the box expands over it. */}
      <Link
        href={`/projects/${project.slug}`}
        scroll={false}
        prefetch
        className="mt-5 block space-y-1.5 px-1 focus-visible:outline-none"
        aria-label={`${project.title} — ${project.tagline}`}
        aria-expanded={focused}
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="text-ink text-2xl">{project.title}</span>
          <span className="text-muted shrink-0 text-sm tabular-nums">
            {project.year}
          </span>
        </span>
        <span className="text-muted block text-pretty">{project.tagline}</span>
        <span className="text-muted/80 flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
          {project.stack.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </span>
      </Link>
    </article>
  );
}
