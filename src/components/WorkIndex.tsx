"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import type { Repo } from "@/lib/repos";
import type { ProjectSummary } from "@/lib/content";

/**
 * Everything public, behind one control.
 *
 * The field shows what has been written up. It cannot show what has not, so a
 * visitor has no way of knowing the rest exists — and on this site the rest
 * includes the largest repository of the lot. "Selected work" implies a
 * selection was made from something; this is the something.
 *
 * A native `<dialog>` again, for the reasons the portrait uses one: the top
 * layer sits outside the document flow, so it is not dragged by the transform
 * on `[data-plane]`, and Esc, the focus trap and inerting the page behind all
 * arrive with the element rather than being re-implemented.
 *
 * It also carries the identity block, which is why it is on the project routes
 * as well. A cold visit to /projects/<slug> — the URL most likely to be pasted
 * into an application — had his name nowhere on screen, no email, no CV and no
 * way back to anything but the field.
 */
export function WorkIndex({
  written,
  other,
  /**
   * Whether to render while a project route is open.
   *
   * On the field this control hides once an artefact is focused: the camera has
   * moved, `ProjectMap` becomes the orientation instrument, and two fixed
   * navigation affordances on one screen is the drawer this site exists
   * instead of. A cold project page has no camera and no map, so there it
   * stays — it is the only way off that page.
   */
  persistent = false,
}: {
  written: ProjectSummary[];
  other: Repo[];
  persistent?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const focused = !persistent && /^\/projects\/[^/]+$/.test(pathname);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="work-index-trigger"
        data-hidden={focused}
        /* Inert rather than merely invisible while an artefact is focused, so
           it does not sit in the tab order off the edge of the frame — the same
           mistake the artefacts themselves used to make. */
        inert={focused}
      >
        <span aria-hidden className="work-index-rule" />
        All work
        <span className="work-index-count">
          {written.length + other.length}
        </span>
      </button>

      <dialog
        ref={dialog}
        className="work-index-modal"
        aria-label="Everything public"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="work-index-head">
          <p className="section-label work-index-label">Everything public</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="work-index-close"
            aria-label="Close index"
          >
            Close <kbd>Esc</kbd>
          </button>
        </div>

        <div className="work-index-scroll">
          <section aria-labelledby="work-index-written">
            <h2 id="work-index-written" className="work-index-group">
              Written up
            </h2>
            <ul className="work-index-list">
              {written.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/projects/${project.slug}`}
                    scroll={false}
                    onClick={() => dialog.current?.close()}
                  >
                    <span className="work-index-name">{project.title}</span>
                    <span className="work-index-desc">{project.tagline}</span>
                    <span className="work-index-meta">
                      <span className="work-index-year">{project.year}</span>
                      {project.evidence && <span>{project.evidence}</span>}
                      {project.repo && <span>source</span>}
                      {project.live && <span>live</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {other.length > 0 && (
            <section aria-labelledby="work-index-other">
              <h2 id="work-index-other" className="work-index-group">
                Also public on GitHub
              </h2>
              {/* Not written up, and saying so is the point. These are the
                  repositories a visitor would only find by leaving. */}
              <ul className="work-index-list">
                {other.map((repo) => (
                  <li key={repo.name}>
                    <a href={repo.url}>
                      <span className="work-index-name">{repo.name}</span>
                      <span className="work-index-desc">
                        {repo.description}
                      </span>
                      <span className="work-index-meta">
                        <span className="work-index-year">{repo.pushed}</span>
                        {repo.language && <span>{repo.language}</span>}
                        {repo.live && <span>live</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* The identity block. On a project route this is the only place the
            page says whose work it is. */}
        <div className="work-index-foot">
          <span>
            {site.name} · {site.location}
          </span>
          <span className="work-index-links">
            <a href={`mailto:${site.links.email}`}>Email</a>
            <a href="/ZainButt-CV.pdf" target="_blank" rel="noopener">
              CV
            </a>
            <a href={site.links.github}>GitHub</a>
            <a href={site.links.linkedin}>LinkedIn</a>
          </span>
        </div>
      </dialog>
    </>
  );
}
