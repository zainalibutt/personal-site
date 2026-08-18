"use client";

import { useEffect, useRef } from "react";
import { subscribeFocusState, prefersReducedMotion } from "@/lib/motion-layer";
import { LERP } from "@/lib/motion";

/**
 * The field — a coordinate lattice the page's contents deform.
 *
 * Zain's model for the site was "one massive graph, X Y". This makes that
 * literal, and it earns its place against the subject: the work is about
 * records, evidence and measurement, and a measurement grid is what all of that
 * is drawn on.
 *
 * Three masses deform it, and they are all the same function at different
 * strengths — not three separate effects:
 *
 *   1. Each artefact, faintly and permanently, so the page's structure is
 *      visible in the field before you touch anything.
 *   2. The cursor, as a small travelling mass.
 *   3. The focused artefact, whose well deepens as the camera pushes in.
 *
 * Canvas 2D rather than WebGL: this is crisp blue line work on white, which
 * canvas draws natively, and it costs no dependency.
 */

const SPACING = 66; // px between lattice lines
const STEP = 9; // sampling along each line — smaller is smoother, costlier

/**
 * Hard ceiling on how far a vertex may travel toward a mass, as a fraction of
 * its distance to it.
 *
 * Without this the pull near a strong well exceeds the distance, vertices
 * overshoot past the centre and out the other side, and neighbouring lines
 * cross — which is what produced the spikes and folded shapes near an open
 * artefact. Capping below 0.5 guarantees ordering is preserved, so the sheet
 * can compress but never fold through itself.
 */
const MAX_TRAVEL = 0.4;

const STAR_COUNT = 220;
const CURSOR_RADIUS = 190;
const CURSOR_PULL = 26;

/**
 * The wanderer: a fourth mass, drifting, with nothing drawn where it is.
 *
 * Nothing is rendered on purpose. You see the lattice bend and travel and there
 * is no object there — which is how you find something invisible in the first
 * place, and the only version of this that cannot end up looking like clip-art.
 * A drawn disc would be decoration; an unexplained distortion is the idea.
 *
 * Wider and weaker than the cursor, so it reads as something distant and heavy
 * rather than as a second pointer.
 */
const WANDER_RADIUS = 340;
const WANDER_PULL = 34;

/** Milliseconds per unit of noise, per axis. Different on each so the path
 *  never closes and never repeats. */
const WANDER_MS_X = 11000;
const WANDER_MS_Y = 13000;

/** Below this the wanderer does not run at all — it is the one thing here that
 *  keeps the loop awake permanently, and a phone should not pay for it. */
const WANDER_MIN_WIDTH = 1024;

/**
 * Deterministic 1D value noise, smoothstepped between integer samples.
 *
 * This is what stops the drift reading as a DVD logo. A bouncing object reverses
 * at a wall, which is a straight line and a hard corner; noise has neither, and
 * because value noise tends toward its own mean the mass stays loosely central
 * without ever being pushed back by anything.
 */
function makeNoise(seed: number): (t: number) => number {
  const at = (i: number) => {
    let h = Math.imul(i ^ seed, 0x27d4eb2d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    return (h >>> 0) / 0xffffffff;
  };
  return (t: number) => {
    const i = Math.floor(t);
    const f = t - i;
    const s = f * f * (3 - 2 * f);
    return at(i) * (1 - s) + at(i + 1) * s;
  };
}
const REST_RADIUS = 260;
const REST_PULL = 14;
/** Hovering an artefact deepens its own well — the field previews the open. */
const HOVER_RADIUS = 340;
const HOVER_PULL = 34;
const FOCUS_RADIUS = 520;
const FOCUS_PULL = 118;
const MAX_DPR = 2;

interface Mass {
  x: number;
  y: number;
  radius: number;
  pull: number;
}

/**
 * Displacement toward a mass, falling off with distance.
 *
 * `1 / (1 + (d/r)^2)` rather than a gaussian: it has a longer tail, so the
 * lattice bends gently a long way out instead of stopping abruptly, which is
 * what makes it read as a continuous sheet rather than a local dimple.
 */
function displace(x: number, y: number, masses: Mass[]): [number, number] {
  let dx = 0;
  let dy = 0;
  for (const m of masses) {
    if (m.pull === 0) continue;
    const vx = m.x - x;
    const vy = m.y - y;
    const distanceSq = vx * vx + vy * vy;
    const distance = Math.sqrt(distanceSq) || 1;
    const falloff = 1 / (1 + distanceSq / (m.radius * m.radius));
    // Clamped so a vertex can never reach, let alone pass, the mass centre.
    const travel = Math.min(m.pull * falloff, distance * MAX_TRAVEL);
    const amount = travel / distance;
    dx += vx * amount;
    dy += vy * amount;
  }
  return [dx, dy];
}

interface Star {
  nx: number;
  ny: number;
  r: number;
  a: number;
  phase: number;
}

/** Deterministic, so the sky is the same on every resize and every reload. */
function makeStars(count: number): Star[] {
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };
  return Array.from({ length: count }, () => {
    const bright = random();
    return {
      nx: random(),
      ny: random(),
      // Mostly faint pinpricks, a few brighter ones — an even spread reads as
      // noise rather than a sky.
      r: bright > 0.97 ? 1.6 : bright > 0.85 ? 1.1 : 0.7,
      a: 0.22 + bright * 0.5,
      phase: random() * Math.PI * 2,
    };
  });
}

export function SpacetimeField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let raf = 0;
    let idleFrames = 0;

    // Eased state, so the field always trails the input rather than snapping.
    const cursor = {
      x: -9999,
      y: -9999,
      tx: -9999,
      ty: -9999,
      weight: 0,
      tw: 0,
    };
    let focusWeight = 0;
    let focusTarget = 0;
    /**
     * First-load sequence, in place of a loading screen.
     *
     * The brief allows a loader but does not ask for one, and on a static site
     * that renders this fast a loader would be theatre. Instead the lattice
     * arrives flat and the artefacts settle into it — the page assembling
     * itself, using the signature rather than covering it.
     */
    let entrance = reduced ? 1 : 0;

    const stars = makeStars(STAR_COUNT);

    /* Two octaves per axis: one slow sweep plus a smaller, faster wobble, so the
       path is not a single smooth arc. Weighted to sum to 1. */
    const noiseX = [makeNoise(0x5eed), makeNoise(0xbeef)];
    const noiseY = [makeNoise(0xc0de), makeNoise(0xfade)];
    const drift = (n: ((t: number) => number)[], t: number) =>
      n[0](t) * 0.66 + n[1](t * 2.3 + 7) * 0.34;

    /** Set in `resize`, because it depends on viewport width. */
    let wanders = false;
    const wanderer = { x: 0, y: 0 };

    const moveWanderer = (now: number) => {
      if (!wanders) return;
      // Mapped into the middle 84% of the viewport. Value noise sits around its
      // own mean, so this is a tendency rather than a boundary — it never has to
      // be turned around at an edge.
      wanderer.x = (0.08 + 0.84 * drift(noiseX, now / WANDER_MS_X)) * width;
      wanderer.y = (0.08 + 0.84 * drift(noiseY, now / WANDER_MS_Y)) * height;
    };

    /**
     * Nebulae are painted once into an offscreen canvas rather than every
     * frame. Large radial gradients are the single most expensive thing here
     * and they never change.
     */
    let nebula: HTMLCanvasElement | null = null;

    const paintNebula = () => {
      const off = document.createElement("canvas");
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      off.width = Math.floor(width * dpr);
      off.height = Math.floor(height * dpr);
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Four clouds that were four blues, which is why the ground read flat —
         nothing separates tones that differ only in lightness once they are all
         at 16% alpha. They now travel in hue as well: indigo overhead, cyan on
         the right flank, a warmer blue below. Alphas stay low and let the hue do
         the work, because this must not compete with the lattice drawn over it. */
      const clouds = [
        { nx: 0.16, ny: 0.28, r: 0.62, c: "58, 104, 206", a: 0.2 },
        { nx: 0.84, ny: 0.66, r: 0.58, c: "44, 148, 190", a: 0.19 },
        { nx: 0.52, ny: 0.05, r: 0.46, c: "92, 74, 192", a: 0.18 },
        { nx: 0.72, ny: 1.02, r: 0.5, c: "48, 118, 174", a: 0.13 },
      ];

      for (const cloud of clouds) {
        const cx = cloud.nx * width;
        const cy = cloud.ny * height;
        const radius = cloud.r * Math.max(width, height);
        const g = octx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(${cloud.c}, ${cloud.a})`);
        g.addColorStop(0.45, `rgba(${cloud.c}, ${cloud.a * 0.38})`);
        g.addColorStop(1, `rgba(${cloud.c}, 0)`);
        octx.fillStyle = g;
        octx.fillRect(0, 0, width, height);
      }
      nebula = off;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-evaluated on every resize, so dragging a window across the threshold
      // starts or stops it rather than leaving it in whatever state the page
      // happened to load at.
      wanders = !reduced && width >= WANDER_MIN_WIDTH;
      moveWanderer(performance.now());
      paintNebula();
      wake();
    };

    /** Artefact centres, read live so they track the camera as it moves. */
    const readMasses = (): Mass[] => {
      const masses: Mass[] = [];
      const wells = document.querySelectorAll<HTMLElement>("[data-well]");
      for (const well of wells) {
        const r = well.getBoundingClientRect();
        if (r.width === 0) continue;
        // Off-screen artefacts still bend the edge of the field, so the lattice
        // stays continuous rather than flattening at the viewport boundary.
        if (r.bottom < -400 || r.top > height + 400) continue;

        const state = well.dataset.well;
        let radius = REST_RADIUS;
        let pull = REST_PULL;
        if (state === "focused") {
          radius = FOCUS_RADIUS;
          pull = REST_PULL + FOCUS_PULL * focusWeight;
        } else if (state === "hover") {
          radius = HOVER_RADIUS;
          pull = HOVER_PULL;
        }

        masses.push({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          radius,
          // The whole field fades up on first load, so the lattice starts flat
          // and the page's structure settles into it.
          pull: pull * entrance,
        });
      }
      if (cursor.weight > 0.01) {
        masses.push({
          x: cursor.x,
          y: cursor.y,
          radius: CURSOR_RADIUS,
          pull: CURSOR_PULL * cursor.weight,
        });
      }
      if (wanders) {
        masses.push({
          x: wanderer.x,
          y: wanderer.y,
          radius: WANDER_RADIUS,
          pull: WANDER_PULL * entrance,
        });
      }
      return masses;
    };

    const draw = () => {
      const masses = readMasses();
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      if (nebula) {
        ctx.drawImage(nebula, 0, 0, width, height);
      }

      // Stars sit in the sheet, so they are displaced by the same masses as the
      // lattice. Without this they float on top and the depth falls apart.
      for (const star of stars) {
        const x = star.nx * width;
        const y = star.ny * height;
        const [dx, dy] = displace(x, y, masses);
        const twinkle = 0.78 + 0.22 * Math.sin(now / 1400 + star.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(214, 230, 255, ${star.a * twinkle})`;
        ctx.arc(x + dx, y + dy, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 1;

      // The lattice sits *under* the reading — body copy crosses these lines.
      // It earns weight only as a well deepens, so the bend reads as depth
      // rather than as noise.
      const intensity = Math.min(1, focusWeight * 0.9 + cursor.weight * 0.1);
      const alpha = 0.13 + intensity * 0.24;
      ctx.strokeStyle = `rgba(129, 166, 235, ${alpha})`;

      const left = -SPACING;
      const top = -SPACING;
      const right = width + SPACING;
      const bottom = height + SPACING;

      ctx.beginPath();
      for (let y = top; y <= bottom; y += SPACING) {
        let started = false;
        for (let x = left; x <= right; x += STEP) {
          const [dx, dy] = displace(x, y, masses);
          if (started) ctx.lineTo(x + dx, y + dy);
          else {
            ctx.moveTo(x + dx, y + dy);
            started = true;
          }
        }
      }
      for (let x = left; x <= right; x += SPACING) {
        let started = false;
        for (let y = top; y <= bottom; y += STEP) {
          const [dx, dy] = displace(x, y, masses);
          if (started) ctx.lineTo(x + dx, y + dy);
          else {
            ctx.moveTo(x + dx, y + dy);
            started = true;
          }
        }
      }
      ctx.stroke();
    };

    const tick = () => {
      const before = [
        cursor.x,
        cursor.y,
        cursor.weight,
        focusWeight,
        entrance,
        wanderer.x,
        wanderer.y,
      ].join();

      // Included in the idle comparison rather than special-cased: the loop then
      // stays awake for the honest reason that something is genuinely still
      // moving. This is the one thing on the page that never settles, which is
      // why it is desktop-only — see WANDER_MIN_WIDTH.
      moveWanderer(performance.now());

      cursor.x += (cursor.tx - cursor.x) * LERP.cursor;
      cursor.y += (cursor.ty - cursor.y) * LERP.cursor;
      cursor.weight += (cursor.tw - cursor.weight) * LERP.cursorWeight;
      focusWeight += (focusTarget - focusWeight) * LERP.focus;
      entrance += (1 - entrance) * LERP.entrance;
      if (entrance > 0.999) entrance = 1;

      draw();

      // Stop the loop once nothing is moving. An ambient background must not
      // hold a rAF open for the life of the page.
      const after = [
        cursor.x,
        cursor.y,
        cursor.weight,
        focusWeight,
        entrance,
        wanderer.x,
        wanderer.y,
      ].join();
      idleFrames = before === after ? idleFrames + 1 : 0;
      if (idleFrames > 20) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      idleFrames = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      cursor.tx = event.clientX;
      cursor.ty = event.clientY;
      if (cursor.weight < 0.01) {
        // Arrive at the pointer rather than sliding in from the last position.
        cursor.x = event.clientX;
        cursor.y = event.clientY;
      }
      cursor.tw = 1;
      wake();
    };

    const onPointerLeave = () => {
      cursor.tw = 0;
      wake();
    };

    resize();

    if (reduced) {
      // Static lattice: artefacts still dent it, nothing follows anything.
      focusWeight = 0;
      draw();
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(raf);
      };
    }

    /**
     * The camera animates the artefacts' positions independently of anything
     * this component eases, so the idle check cannot see that movement and would
     * stop drawing mid-transition. Keep the loop awake for the length of a
     * camera move — and only that long. A background must never hold a
     * requestAnimationFrame open for the life of the page.
     */
    let sustain = 0;
    const sustainThrough = (ms: number) => {
      clearInterval(sustain);
      const until = performance.now() + ms;
      sustain = window.setInterval(() => {
        wake();
        if (performance.now() > until) {
          clearInterval(sustain);
          sustain = 0;
        }
      }, 100);
    };

    const unsubscribe = subscribeFocusState((state) => {
      focusTarget = state === "opening" || state === "focused" ? 1 : 0;
      if (state === "opening" || state === "closing") sustainThrough(900);
      wake();
    });

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      clearInterval(sustain);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
