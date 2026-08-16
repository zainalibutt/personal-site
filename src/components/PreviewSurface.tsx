"use client";

import { useCallback } from "react";
import Image from "next/image";
import { previewViewId, registerView } from "@/lib/motion-layer";
import type { ProjectSummary } from "@/lib/content";

/**
 * The preview surface — shared by the card and the focused view, and the single
 * element the morph animates.
 *
 * Dimensions are reserved from frontmatter before any media exists, and the
 * placeholder is the project's own warm colour rather than a grey box. Both
 * The requirement is absolute (docs/ARCHITECTURE.md §2.7): no layout
 * shift, no blank interval, no spinner.
 */
export function PreviewSurface({
  project,
  register = false,
  priority = false,
  className = "",
}: {
  project: ProjectSummary;
  /** Only the card registers. The focused view reads the card's rect. */
  register?: boolean;
  /** Flagships sit above the fold, so they load eagerly for LCP. */
  priority?: boolean;
  className?: string;
}) {
  const { preview, slug, title } = project;

  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !register) return;
      return registerView(previewViewId(slug), element);
    },
    [slug, register],
  );

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: preview.aspectRatio,
        backgroundColor: preview.dominantColour,
        // The FLIP inversion in renderers.ts assumes a top-left origin.
        transformOrigin: "0 0",
      }}
    >
      {/* Warm depth on the placeholder so an assetless card still reads as
          designed rather than unfinished. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 20% 0%, rgba(255,255,255,0.22), transparent 60%)",
        }}
      />

      {preview.poster && (
        <Image
          src={preview.poster}
          alt={preview.alt ?? ""}
          fill
          className={preview.fit === "contain" ? "object-contain" : "object-cover"}
          sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
        />
      )}

      {preview.type === "video" && preview.src && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={preview.src}
          poster={preview.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={preview.alt ?? `${title} preview`}
        />
      )}

      {/* flagship miniatures mount here. Proof-Lens and Melody get
          bespoke interactive demos; the surface below them stays as the
          pre-enhancement state so the card is complete before they load. */}
    </div>
  );
}
