"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  const [hovered, setHovered] = useState(false);
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
    <article
      className="group"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* No backdrop. The point of the camera move is that the rest of the page
          stays visible beside the focused artefact, in its real position. */}

      {/* The slot holds the artefact's footprint via its own aspect-ratio, so
          promoting the box out of flow never reflows the field. */}
      {/* `data-well` marks this artefact as a mass in the field. Hovering
          deepens its well so the field previews the open before you commit to
          it; focusing deepens it fully. */}
      <div
        ref={slotRef}
        data-well={focused ? "focused" : hovered ? "hover" : "rest"}
        className="artefact-slot relative"
        /* Not `aspectRatio` directly: the phone layout overrides this to a
           square, and an inline value would outrank any stylesheet. */
        style={{ "--ar": project.preview.aspectRatio } as React.CSSProperties}
      >
        <div
          ref={boxRef}
          data-expanded="false"
          className={[
            "border-line bg-bg absolute inset-0 overflow-hidden rounded-2xl border",
            "transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)]",
            "data-[expanded=false]:group-hover:-translate-y-2",
            "data-[expanded=false]:group-hover:scale-[1.04]",
            "data-[expanded=false]:group-hover:shadow-2xl",
            "data-[expanded=false]:group-hover:shadow-word-700/20",
            "data-[expanded=true]:shadow-2xl",
            "motion-reduce:transform-none motion-reduce:transition-none",
          ].join(" ")}
        >
          <div className="expand-scroll">
            <div className="expand-layout">
              <div className="expand-hero-col">
                <div ref={heroRef} className="expand-hero">
                  {/* The artefact's face on a phone. It is inside the box, not
                      beside it, so opening still grows *this* thing — the camera
                      pushes into the icon rather than swapping it for a panel.
                      Hidden from assistive tech: the caption below already
                      names the artefact, and a second name is noise. */}
                  <span aria-hidden className="artefact-icon">
                    <Image
                      src={`/projects/${project.slug}/icon.png`}
                      alt=""
                      width={512}
                      height={512}
                      priority={project.flagship}
                      className="h-full w-full object-cover"
                    />
                  </span>

                  <PreviewSurface
                    project={project}
                    priority={project.flagship}
                    className="artefact-preview w-full"
                  />
                </div>

                {/* Fills what was dead space beneath the hero. */}
                <dl
                  className="expand-meta expand-reveal"
                  style={{ "--reveal-index": 1 } as React.CSSProperties}
                >
                  <div>
                    <dt>Year</dt>
                    <dd className="font-mono tabular-nums">{project.year}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt>Built with</dt>
                    <dd className="mt-2 flex flex-wrap gap-1.5">
                      {project.stack.map((tech) => (
                        <span key={tech} className="tag">
                          {tech}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {(project.repo || project.live) && (
                    <div className="col-span-2 flex gap-5 pt-1">
                      {project.live && (
                        <a
                          className="text-accent hover:text-ink underline underline-offset-4"
                          href={project.live}
                        >
                          Live site
                        </a>
                      )}
                      {project.repo && (
                        <a
                          className="text-accent hover:text-ink underline underline-offset-4"
                          href={project.repo}
                        >
                          Source code
                        </a>
                      )}
                    </div>
                  )}
                </dl>
              </div>

              {/* Revealed by the opening clip. Inert at rest so five case
                  studies are not sitting in the accessibility tree. */}
              {/* Resolves in sequence behind the opening edge — hero, then
                  metadata, then the writing. See the reveal block in
                  globals.css. */}
              <div className="expand-detail" inert={!focused}>
                <h2
                  className="expand-reveal text-ink text-4xl leading-[1.1] text-balance"
                  style={{ "--reveal-index": 0 } as React.CSSProperties}
                >
                  {project.title}
                </h2>
                <p
                  className="expand-reveal text-muted mt-3 max-w-[46ch] text-xl leading-snug text-pretty"
                  style={{ "--reveal-index": 1 } as React.CSSProperties}
                >
                  {project.tagline}
                </p>
                <div
                  className="expand-reveal mt-10"
                  style={{ "--reveal-index": 2 } as React.CSSProperties}
                >
                  {body}
                </div>
              </div>
            </div>
          </div>

          {/* The artefact itself is the obvious thing to click, and until now
              only the caption underneath was a link. Purely a pointer target:
              the caption below carries the accessible name and the tab stop, so
              this stays out of the tree rather than duplicating it. */}
          {!focused && (
            <Link
              href={`/projects/${project.slug}`}
              scroll={false}
              prefetch
              aria-hidden
              tabIndex={-1}
              className="absolute inset-0 z-[5]"
            />
          )}

          {focused && (
            <button
              data-close
              onClick={() => router.back()}
              aria-label="Close project"
              className="border-line bg-bg/90 text-muted hover:text-ink absolute top-3 right-3 z-10 rounded-full border px-3 py-1.5 text-xs backdrop-blur transition-colors"
            >
              Close <kbd className="ml-1 font-sans opacity-70">Esc</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Hidden while focused: the expanded artefact carries its own title, so
          leaving this visible renders the project twice. */}
      <Link
        href={`/projects/${project.slug}`}
        scroll={false}
        prefetch
        /* The caption is the artefact's tab stop and its accessible name, so it
           must show focus. It previously set `focus-visible:outline-none`,
           which left the five primary navigation targets on the page with no
           keyboard indicator at all while every secondary link had one. */
        className="mt-5 block rounded-lg px-1 transition-opacity duration-300"
        // Inline rather than a utility class: the artefact's own animations put
        // competing opacity rules on this subtree, and this must always win.
        style={{
          opacity: focused ? 0 : 1,
          pointerEvents: focused ? "none" : undefined,
        }}
        /* No `aria-label`. It used to read "<title> — <tagline>", which *omits*
           the year and the stack chips that are visibly inside this link — a
           WCAG 2.5.3 failure (Label in Name, level A) on all five of the page's
           primary targets. Someone using speech input reads "Proof-Lens 2026"
           off the screen and addresses a control that is not called that.

           The link's own text is a better name anyway, and it adapts: on a
           phone the year, tagline and chips are `display: none`, so the name
           collapses to just the title. */
        aria-expanded={focused}
        aria-hidden={focused}
        tabIndex={focused ? -1 : undefined}
      >
        <span className="caption-head flex items-baseline justify-between gap-4">
          <span className="caption-title text-ink text-2xl">
            {project.title}
          </span>
          <span className="caption-detail text-muted shrink-0 font-mono text-sm tabular-nums">
            {project.year}
          </span>
        </span>
        <span className="caption-detail text-muted mt-1 block max-w-[42ch] text-pretty">
          {project.tagline}
        </span>
        <span className="caption-detail mt-3 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span key={tech} className="tag">
              {tech}
            </span>
          ))}
        </span>
      </Link>
    </article>
  );
}
