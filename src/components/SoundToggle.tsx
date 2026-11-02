"use client";

import { setSound, useSound } from "@/lib/sound";

/**
 * The only way sound starts on this site.
 *
 * Bottom-right, opposite the work index and dressed the same, so it reads as
 * part of the same quiet furniture rather than a feature. Unlike the index it
 * stays while an artefact is open: that is exactly when a visitor wants to hear
 * a video's music.
 */
export function SoundToggle() {
  const on = useSound();

  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={on}
      onClick={() => setSound(!on)}
    >
      <span aria-hidden className="sound-toggle-bars" data-on={on}>
        <span />
        <span />
        <span />
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
