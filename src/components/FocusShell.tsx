"use client";

import { useEffect } from "react";
import { PreviewSurface } from "./PreviewSurface";
import { useFocusMorph } from "./useFocusMorph";
import type { ProjectSummary } from "@/lib/content";

/**
 * The focused state of a project — the "ghost redirect".
 *
 * Structure matters here. The **shell** (hero preview, title, tagline) is the
 * only part that animates. The **body** below it is prepared in advance and
 * never enters a measured animation, which is the specific failure both
 * the reason it was dropped: a single FLIP whose correctness depends on the size
 * and timing of MDX content.
 *
 * Exit stays unambiguous — Escape, backdrop, and a visible close control.
 * Navigation legibility outranks everything.
 */
export function FocusShell({
  project,
  children,
}: {
  project: ProjectSummary;
  children: React.ReactNode;
}) {
  const { heroRef, close } = useFocusMorph(project.slug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div
        onClick={() => void close()}
        className="bg-sand-950/40 motion-fade fixed inset-0 backdrop-blur-sm"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`focus-title-${project.slug}`}
        className="border-line bg-bg motion-rise relative mx-auto my-8 w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-2xl border"
      >
        {/* this is the zoom. The preview travels from the card into
            this hero. Camera path, easing language and how the content resolves
            out of it are yours — the mechanism is in lib/motion-layer. */}
        <div ref={heroRef}>
          <PreviewSurface project={project} className="w-full" />
        </div>

        <button
          onClick={() => void close()}
          className="bg-bg/80 text-ink absolute top-4 right-4 rounded-full px-4 py-2 text-sm backdrop-blur"
        >
          Close <kbd className="text-muted ml-1">Esc</kbd>
        </button>

        {/* Static from here down. Never measured, never transformed. */}
        <div className="px-6 py-8 sm:px-10 sm:py-12">
          <h1
            id={`focus-title-${project.slug}`}
            className="text-ink text-4xl sm:text-5xl"
          >
            {project.title}
          </h1>
          <p className="text-muted mt-3 max-w-2xl text-lg text-pretty">
            {project.tagline}
          </p>

          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
