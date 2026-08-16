"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

/**
 * The focused state of a project — the "ghost redirect".
 *
 * This is not a page. The project field beneath it stays mounted; the route
 * changes so the URL is real and shareable, but nothing unmounts. The shared
 * `layoutId`s (see <ProjectCard />) carry the card into this shell, so the
 * content reads as having always been there, just too small to resolve.
 *
 * Exit must always be obvious — Esc, backdrop, and a visible close control.
 * Navigation legibility outranks everything (docs/BRIEF.md §6).
 */
export function FocusShell({
  slug,
  title,
  tagline,
  children,
}: {
  slug: string;
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => router.back()}
        className="bg-sand-950/40 fixed inset-0 backdrop-blur-sm"
        aria-hidden
      />

      <motion.div
        layoutId={`card-${slug}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`focus-title-${slug}`}
        className="border-line bg-bg relative mx-auto my-8 w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-2xl border"
      >
        {/* this is the zoom. The card's preview should expand into
            the hero of the case study, not cross-fade into it. */}
        <motion.div
          layoutId={`preview-${slug}`}
          className="bg-sand-200 dark:bg-sand-800 aspect-[21/9] w-full"
        />

        <button
          onClick={() => router.back()}
          className="bg-bg/80 text-ink absolute top-4 right-4 rounded-full px-4 py-2 text-sm backdrop-blur"
        >
          Close <kbd className="text-muted ml-1">Esc</kbd>
        </button>

        <div className="px-6 py-8 sm:px-10 sm:py-12">
          <motion.h1
            layoutId={`title-${slug}`}
            id={`focus-title-${slug}`}
            className="text-ink text-4xl sm:text-5xl"
          >
            {title}
          </motion.h1>
          <motion.p
            layoutId={`tagline-${slug}`}
            className="text-muted mt-3 max-w-2xl text-lg text-pretty"
          >
            {tagline}
          </motion.p>

          <div className="mt-10">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
