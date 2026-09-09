"use client";

import { useEffect, useRef, useState } from "react";
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
  active = false,
  sizes = "(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw",
  className = "",
}: {
  project: ProjectSummary;
  /** Flagships sit above the fold, so they load eagerly for LCP. */
  priority?: boolean;
  /** Hovered or focused. A video preview plays only while this is true. */
  active?: boolean;
  /**
   * Layout hint for the image candidate.
   *
   * The default describes the *field* — a card is about a third of the
   * viewport on a flank. The cold project route is a single 64rem column, so
   * without an override the browser sizes for 34vw and fetches a 640w file for
   * a box up to 1024px wide, which is the one place on the site where this
   * image is the largest thing on screen.
   */
  sizes?: string;
  className?: string;
}) {
  const { preview, title } = project;
  const videoRef = useRef<HTMLVideoElement>(null);
  /* Kept separate from `active` so the poster stays put until there is a
     decoded frame to cross to. Switching on `active` alone shows a black gap
     for however long the first fetch takes. */
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /* Touch has no hover, and a card that autoplays on scroll-past is four
       videos fighting for a phone's bandwidth. `hover` is the honest signal
       here — a narrow desktop window still has a pointer. */
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const stilled = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canHover.matches || stilled.matches) return;

    if (!active) {
      video.pause();
      return;
    }

    /* Deliberate hover, not a cursor passing over on its way somewhere else.
       Without this, crossing the field left to right starts every video. */
    const intent = window.setTimeout(() => {
      void video.play().catch(() => undefined);
    }, 120);

    return () => window.clearTimeout(intent);
  }, [active]);

  /* The card opens by expanding this same box, so the element is never
     unmounted and playback simply continues — no handing `currentTime` over. */

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
          className={
            preview.fit === "contain" ? "object-contain" : "object-cover"
          }
          sizes={sizes}
          priority={priority}
        />
      )}

      {preview.type === "video" && preview.src && (
        <video
          ref={videoRef}
          /* Crossfaded in on the first decoded frame rather than mounted
             visible. `preload="none"` means there is nothing to show until
             playback actually starts, and an empty video element painted over
             the poster is a black rectangle. */
          className={[
            "absolute inset-0 h-full w-full object-cover",
            "transition-opacity duration-500 ease-[var(--ease-out-soft)]",
            "motion-reduce:transition-none",
            playing ? "opacity-100" : "opacity-0",
          ].join(" ")}
          src={preview.src}
          poster={preview.poster}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={() => setPlaying(true)}
          /* Back to the poster on pause, so a half-played frame is never what
             the card rests on. */
          onPause={() => setPlaying(false)}
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

      {/* Flagship miniatures mount here. Proof-Lens and Melody get
          bespoke interactive demos; the surface below them stays as the
          pre-enhancement state so the card is complete before they load. */}
    </div>
  );
}
