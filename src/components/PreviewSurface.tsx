"use client";

import Image from "next/image";
import type { ProjectSummary } from "@/lib/content";

/**
 * The artefact's visible surface, in both the resting and expanded states.
 *
 * The aspect ratio comes from frontmatter and is identical in both — that is
 * what keeps the expansion's scale uniform, so the screenshot never stretches
 * in transit. Dimensions are reserved before any media exists and the
 * placeholder is the project's own colour, never a grey box: no layout shift,
 * no blank interval, no spinner (docs/ARCHITECTURE.md §2.7).
 */
export function PreviewSurface({
  project,
  priority = false,
  className = "",
}: {
  project: ProjectSummary;
  /** Flagships sit above the fold, so they load eagerly for LCP. */
  priority?: boolean;
  className?: string;
}) {
  const { preview, title } = project;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: preview.aspectRatio,
        backgroundColor: preview.dominantColour,
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

      {/* Assetless artefacts read as unfinished otherwise — a flat colour block
          looks like a failed image, not a considered placeholder. */}
      {!preview.poster && (
        <div className="absolute inset-0 flex items-end p-5">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] tracking-wide text-white/80 backdrop-blur-sm">
            Capture coming
          </span>
        </div>
      )}

      {/* flagship miniatures mount here. Proof-Lens and Melody get
          bespoke interactive demos; the surface below them stays as the
          pre-enhancement state so the card is complete before they load. */}
    </div>
  );
}
