"use client";

import { useSyncExternalStore } from "react";
import { DURATION } from "./motion";

/**
 * The site's sound: one ambient bed, and the rule that a video's own music
 * takes its place.
 *
 * Off by default, and only ever on because the visitor pressed the toggle.
 * Someone reading this at work should never be surprised by audio, and a
 * browser will not play any before a gesture anyway. The choice is remembered
 * per device.
 *
 * The bed runs through Web Audio rather than `audio.volume` because iOS
 * ignores `volume` on media elements; a gain node fades everywhere.
 */

const BED_SRC = "/audio/minimal-tech-loop.mp3";
/** The file is mastered to -20 LUFS; this sits it around -30, under reading. */
const BED_LEVEL = 0.32;
const STORAGE_KEY = "sound";

let enabled = false;
let ducks = 0;
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let bed: HTMLAudioElement | null = null;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function store(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* Private windows and blocked storage: the toggle still works, it just
       is not remembered. */
  }
}

/** Builds the graph. Must run inside a user gesture the first time. */
function ensureBed() {
  if (ctx) return;
  ctx = new AudioContext();
  gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  bed = new Audio(BED_SRC);
  bed.loop = true;
  bed.preload = "auto";
  ctx.createMediaElementSource(bed).connect(gain);
}

/** Ramps the bed toward wherever it should be now. */
function settle() {
  if (!ctx || !gain || !bed) return;
  const audible = enabled && ducks === 0;
  const now = ctx.currentTime;
  const ms = audible ? DURATION.soundIn : DURATION.soundOut;

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(audible ? BED_LEVEL : 0, now + ms / 1000);

  if (enabled) {
    void ctx.resume();
    void bed.play().catch(() => undefined);
  } else {
    /* Paused after the fade so turning it off is not a cut. Re-checked at the
       end in case it was switched back on mid-fade. */
    window.setTimeout(() => {
      if (!enabled) bed?.pause();
    }, ms);
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function setSound(on: boolean) {
  enabled = on;
  store(on);
  if (on) ensureBed();
  settle();
  emit();
}

/**
 * Takes the bed out while something else is speaking. Returns the release.
 * Counted, so two overlapping callers cannot bring it back early.
 */
export function duckBed(): () => void {
  ducks += 1;
  settle();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    ducks -= 1;
    settle();
  };
}

let restored = false;

/**
 * A stored "on" cannot start audio by itself on load. It waits for the
 * visitor's first gesture, then resumes exactly as they left it.
 */
function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  if (!readStored()) return;
  enabled = true;
  emit();
  const start = () => {
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
    if (!enabled) return;
    ensureBed();
    settle();
  };
  window.addEventListener("pointerdown", start);
  window.addEventListener("keydown", start);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  restore();
  return () => listeners.delete(listener);
}

/** Whether the visitor has sound on. Always `false` on the server. */
export function useSound(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false,
  );
}
