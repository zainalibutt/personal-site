"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ProjectSummary } from "@/lib/content";

/**
 * A card in the project field.
 *
 * The `layoutId` values here are the mechanism behind "depth, not distance"
 * (docs/BRIEF.md §1): they pair with the identical ids in <FocusShell />, so
 * clicking a card morphs it into the case study rather than navigating away.
 * Keep the ids in sync across both files or the morph silently degrades into a
 * cut.
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <motion.article
      layoutId={`card-${project.slug}`}
      className="group border-line bg-surface relative overflow-hidden rounded-2xl border"
    >
      <Link
        href={`/projects/${project.slug}`}
        scroll={false}
        className="block focus-visible:outline-none"
        aria-label={`${project.title} — ${project.tagline}`}
      >
        {/* the preview surface. Flagships (preview.type === "demo")
            get a bespoke interactive miniature; everything else gets a looping
            muted video. This placeholder is deliberately plain. */}
        <motion.div
          layoutId={`preview-${project.slug}`}
          className="bg-sand-200 dark:bg-sand-800 aspect-[16/10] w-full"
        />

        <div className="space-y-2 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <motion.h3
              layoutId={`title-${project.slug}`}
              className="text-ink text-2xl"
            >
              {project.title}
            </motion.h3>
            <span className="text-muted shrink-0 text-sm tabular-nums">
              {project.year}
            </span>
          </div>

          <motion.p
            layoutId={`tagline-${project.slug}`}
            className="text-muted text-pretty"
          >
            {project.tagline}
          </motion.p>

          <ul className="text-muted flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
            {project.stack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
      </Link>
    </motion.article>
  );
}
