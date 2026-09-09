"use client";

import { useEffect, useRef } from "react";
import { subscribeFocusState, prefersReducedMotion } from "@/lib/motion-layer";
import { LERP } from "@/lib/motion";
import { publishWanderer, tidalProgress } from "@/lib/tidal";

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

/** The horizon. Everything inside it is drawn as nothing at all. */
const CORE_RADIUS = 21;

/** The photon ring sits just outside the horizon, where light that grazed the
 *  mass comes back around. Thin on purpose — a thick one reads as a bubble. */
const RING_SCALE = 1.38;

/**
 * Deflection of background stars, in pixels at one core radius.
 *
 * This is the detail that separates a black hole from a blue circle, and it
 * runs *against* everything else in this file: the lattice is spacetime and it
 * dents inward, but starlight passing a mass bends around it, so a star's
 * apparent position moves radially **outward**. Same mass, opposite sign,
 * because one of them is the sheet and the other is something travelling
 * across it.
 */
const LENS_STRENGTH = 260;

/**
 * Clearance around the About column before the wanderer starts fading, in px.
 *
 * Deliberately small. The first pass reserved 170px a side, which on a 1440
 * viewport put the mass out of sight for over half its journey, and on a
 * 1024-wide laptop would have hidden it essentially always — the flanks either
 * side of a 384px centre column are simply not wide enough to hold a 170px
 * buffer plus a fade. What actually costs legibility is the drawn disc and its
 * glow sitting *on* the words, so the buffer only has to cover that.
 */
const WANDER_CLEAR_X = 45;
const WANDER_CLEAR_Y = 60;

/** Distance over which it fades back in once clear. */
const WANDER_FADE_OVER = 130;

/**
 * How close the pointer has to be to pick it up.
 *
 * Two radii, because the wanderer spends much of its time drifting *behind* an
 * artefact, and every artefact is covered edge to edge by its own link. Refusing
 * to grab over a link at all made the toy work only in the gaps; grabbing over
 * one at the full radius would start stealing clicks from the artefacts, which
 * is the one thing on this site that must never get harder.
 *
 * So: generous over empty ground, and tight enough over a link that you have to
 * be essentially on the disc itself — which is 21px across, with a ring at 29.
 */
const GRAB_RADIUS = 70;
const GRAB_RADIUS_OVER_LINK = 34;

/**
 * Per-frame velocity retained. Higher than it was, because this is now the only
 * thing slowing a throw down — nothing pulls the mass anywhere.
 */
const THROW_DRAG = 0.965;

/**
 * Peak wander acceleration, px/frame².
 *
 * The noise drives *acceleration*, not position. That is the whole difference
 * between this and what it was: an absolute noise path meant the mass always had
 * somewhere else it was supposed to be, so throwing or dropping it anywhere
 * snapped it back like an elastic band. Accelerating instead means it wanders
 * from wherever it happens to be, and a throw simply changes where that is.
 *
 * Terminal drift is roughly `WANDER_ACCEL / (1 - THROW_DRAG)` px/frame.
 */
const WANDER_ACCEL = 0.055;

/** Edge containment. A spring, not a wall — see `moveWanderer`. Generous, so
 *  the mass is genuinely free everywhere except near the frame. */
const EDGE_MARGIN = 110;
const EDGE_SPRING = 0.012;

/** Sideways nudge away from the About column while it is wandering on its own.
 *  Zero at the centre and zero at the band edge, so there is no point at which
 *  the force flips direction — which is what a wall would do. */
const SPINE_PUSH = 0.05;

/**
 * How quickly the About-avoidance comes back after a throw.
 *
 * The avoidance is suspended entirely while the wanderer is in someone's hand
 * or still travelling, because fading it out mid-flight made the throw stutter
 * and look broken — the thing you just threw dissolved halfway across the
 * screen. Deliberate handling outranks the reading: if you drag it onto the
 * words, that is where you wanted it.
 *
 * Once it is slow again and drifting on its own, the avoidance eases back in
 * over roughly two seconds rather than snapping on.
 */
const AUTONOMY_LERP = 0.012;

/** Below this speed (px/frame) it counts as wandering again rather than still
 *  being thrown. */
const AUTONOMY_BELOW = 0.6;

/** Milliseconds per unit of noise, per axis. Different on each so the path
 *  never closes and never repeats. */
const WANDER_MS_X = 11000;
const WANDER_MS_Y = 13000;

/**
 * Below this the wanderer does not run at all.
 *
 * It is the one thing here that keeps the render loop awake permanently, so it
 * has to be worth the frames. Measured across 45 samples of drift: at 1440px it
 * is clearly visible three quarters of the time, at 1024px only a fifth — the
 * flanks either side of the centre column are too narrow there for it to emerge
 * from behind the reading. A narrow laptop therefore gets the old behaviour,
 * zero cost when nothing moves, rather than a permanent loop it can barely see.
 */
const WANDER_MIN_WIDTH = 1200;

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
    /**
     * Position, velocity and whether it is currently in someone's hand.
     *
     * It used to be a pure function of the clock — position read straight off
     * the noise, no state at all. Being able to pick it up means it needs a
     * real position that something else can overwrite, and a velocity to keep
     * when let go.
     */
    const wanderer = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fade: 1,
      autonomy: 1,
      placed: false,
    };
    const grab = { held: false, overLink: false, dx: 0, dy: 0 };
    /** Held by identity so the star pass can exclude it — see `lens`. */
    const wanderMass: Mass = {
      x: 0,
      y: 0,
      radius: WANDER_RADIUS,
      pull: 0,
    };

    const moveWanderer = (now: number) => {
      if (!wanders) return;

      if (!wanderer.placed) {
        // Start somewhere sensible rather than flying in from the origin.
        wanderer.x = width * 0.24;
        wanderer.y = height * 0.42;
        wanderer.placed = true;
      }

      if (grab.held) {
        // Held: it goes exactly where the hand goes, and remembers how fast it
        // was moving. Smoothed, because a single frame's delta at the moment of
        // release is noisy enough to turn a gentle placement into a launch.
        const nx = cursor.tx + grab.dx;
        const ny = cursor.ty + grab.dy;
        wanderer.vx = wanderer.vx * 0.55 + (nx - wanderer.x) * 0.45;
        wanderer.vy = wanderer.vy * 0.55 + (ny - wanderer.y) * 0.45;
        wanderer.x = nx;
        wanderer.y = ny;
      } else {
        /* Noise accelerates it; nothing positions it. Scaled by `autonomy` so a
           fresh throw is not immediately steered — it coasts first, then starts
           wandering again from wherever it ended up. */
        const ax = (drift(noiseX, now / WANDER_MS_X) - 0.5) * WANDER_ACCEL;
        const ay = (drift(noiseY, now / WANDER_MS_Y) - 0.5) * WANDER_ACCEL;
        wanderer.vx += ax * 2 * wanderer.autonomy;
        wanderer.vy += ay * 2 * wanderer.autonomy;

        /* A sideways bias out of the reading column, applied as a force rather
           than a boundary. Zero at the centre line and zero at the band edge, so
           it never reverses direction at a point — it just makes lingering over
           the words less likely than lingering anywhere else. */
        /* Eased off while the tidal effect is running. The avoidance exists to
           keep the wanderer off the words while they are being read, and an
           idle page is the one state where nobody is reading them — so during
           an idle it is allowed onto the column, disc faded, and the text
           leans instead. It comes back the moment anything is touched, because
           `tidalProgress` collapses to zero in 300ms. */
        const spine = document.querySelector<HTMLElement>("[data-spine]");
        const avoidance = 1 - tidalProgress();
        if (spine && wanderer.autonomy > 0.5 && avoidance > 0) {
          const r = spine.getBoundingClientRect();
          if (r.width > 0) {
            const half = r.width / 2 + WANDER_CLEAR_X;
            const dx = wanderer.x - (r.left + r.width / 2);
            if (Math.abs(dx) < half) {
              const t = dx / half;
              wanderer.vx += t * (1 - Math.abs(t)) * SPINE_PUSH * avoidance;
            }
          }
        }

        wanderer.vx *= THROW_DRAG;
        wanderer.vy *= THROW_DRAG;

        /* Caught at the edges by a spring rather than a wall. A wall reverses
           velocity, which is the bounce this whole thing was built to avoid;
           a spring turns it around over several frames and the drag settles it. */
        if (wanderer.x < EDGE_MARGIN) {
          wanderer.vx += (EDGE_MARGIN - wanderer.x) * EDGE_SPRING;
        } else if (wanderer.x > width - EDGE_MARGIN) {
          wanderer.vx -= (wanderer.x - (width - EDGE_MARGIN)) * EDGE_SPRING;
        }
        if (wanderer.y < EDGE_MARGIN) {
          wanderer.vy += (EDGE_MARGIN - wanderer.y) * EDGE_SPRING;
        } else if (wanderer.y > height - EDGE_MARGIN) {
          wanderer.vy -= (wanderer.y - (height - EDGE_MARGIN)) * EDGE_SPRING;
        }

        wanderer.x += wanderer.vx;
        wanderer.y += wanderer.vy;
      }

      /* And where it does cross, it gets out of the way of the reading. About is
         the only prose on the entry screen, and a dark disc with a bright ring
         travelling under body copy is exactly the kind of visual that costs
         legibility — which loses, every time.

         Distance to the *padded* spine box, so the fade begins well before any
         overlap. Zero inside, rising smoothly outside: continuous everywhere,
         so nothing snaps on or off. Measured live, which is safe here only
         because the value feeds a fade and never accumulates — during a camera
         move this reads through the transform and briefly lies, and a brief lie
         about opacity is invisible. */
      const spine = document.querySelector<HTMLElement>("[data-spine]");
      let clearance = Number.POSITIVE_INFINITY;
      if (spine) {
        const r = spine.getBoundingClientRect();
        if (r.width > 0) {
          const dx = Math.max(
            r.left - WANDER_CLEAR_X - wanderer.x,
            0,
            wanderer.x - (r.right + WANDER_CLEAR_X),
          );
          const dy = Math.max(
            r.top - WANDER_CLEAR_Y - wanderer.y,
            0,
            wanderer.y - (r.bottom + WANDER_CLEAR_Y),
          );
          clearance = Math.hypot(dx, dy);
        }
      }
      const t = Math.min(1, clearance / WANDER_FADE_OVER);
      const smooth = t * t * (3 - 2 * t);

      /* `autonomy` is how much of the About-avoidance applies: 0 while held or
         still flying, 1 once it is wandering under its own steam again. Blended
         rather than switched, so nothing pops at either end. */
      const speed = Math.hypot(wanderer.vx, wanderer.vy);
      const wandering = !grab.held && speed < AUTONOMY_BELOW;
      wanderer.autonomy +=
        ((wandering ? 1 : 0) - wanderer.autonomy) * AUTONOMY_LERP;
      wanderer.fade = 1 - wanderer.autonomy * (1 - smooth);

      /* The position, for anything outside this canvas that needs it. The
         `data-wander` attribute below carries the same numbers but only outside
         production, so it cannot be the channel a shipped feature reads. */
      publishWanderer(wanderer.x, wanderer.y);

      /* Development only. The wanderer is the one thing here that cannot be
         verified from a screenshot — a bright star and a photon ring are the
         same colour to a pixel threshold, which is exactly how the first
         attempt at checking this measured the wrong object entirely. */
      if (process.env.NODE_ENV !== "production") {
        canvas.dataset.wander = [
          Math.round(wanderer.x),
          Math.round(wanderer.y),
          wanderer.fade.toFixed(3),
          Math.hypot(wanderer.vx, wanderer.vy).toFixed(2),
          wanderer.autonomy.toFixed(2),
          grab.held ? 1 : 0,
        ].join(",");
      }
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
        wanderMass.x = wanderer.x;
        wanderMass.y = wanderer.y;
        /* Full strength regardless of `fade`. The mass is always there — only
           the *drawing* of it gets out of the way of the reading. Fading the
           pull too made the lattice go flat wherever the disc was hidden, which
           read as the thing ceasing to exist rather than passing behind
           something. Zain's call, and the right one: a bend in the mesh under
           body copy costs nothing legible. */
        wanderMass.pull = WANDER_PULL * entrance;
        masses.push(wanderMass);
      }
      return masses;
    };

    /**
     * Bends starlight around the wanderer.
     *
     * Applied to the stars *instead of* the wanderer's own inward pull, which
     * is why `wanderMass` is filtered out of their mass list before this runs.
     * The lattice keeps being dented inward; the light does the opposite. That
     * asymmetry is the entire difference between this and a blue circle.
     *
     * Returns null for a star behind the horizon, which is then not drawn —
     * light that close does not come back out.
     */
    const lens = (x: number, y: number): [number, number] | null => {
      if (!wanders) return [x, y];
      const dx = x - wanderer.x;
      const dy = y - wanderer.y;
      const r = Math.hypot(dx, dy);
      if (wanderer.fade > 0.5 && r < CORE_RADIUS * RING_SCALE) return null;
      // Falls off as 1/r, so the shift is obvious at the ring and negligible a
      // few hundred pixels out.
      // Also unfaded: an invisible mass still bends the light behind it, which
      // is the one clue that something is there at all while the disc is hidden.
      const push = (LENS_STRENGTH * entrance) / r;
      return [x + (dx / r) * push, y + (dy / r) * push];
    };

    /** Core, photon ring and a little glow, drawn after the lattice so the
     *  horizon swallows the grid rather than being striped by it — which is
     *  also what a horizon does. */
    const drawWanderer = () => {
      if (!wanders || entrance < 0.05 || wanderer.fade < 0.02) return;
      const { x, y, fade } = wanderer;
      const ring = CORE_RADIUS * RING_SCALE;

      const glow = ctx.createRadialGradient(x, y, ring, x, y, ring * 5.5);
      glow.addColorStop(0, `rgba(150, 190, 255, ${0.22 * entrance * fade})`);
      glow.addColorStop(0.35, `rgba(110, 150, 230, ${0.07 * entrance * fade})`);
      glow.addColorStop(1, "rgba(110, 150, 230, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, ring * 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.fillStyle = "#01030a";
      ctx.arc(x, y, CORE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Brighter on one limb. A real disk beams toward you on the side rotating
      // into view; this is a fixed axis rather than a physical simulation, but
      // an evenly lit ring reads as a drawn circle and this does not.
      const limb = ctx.createLinearGradient(x - ring, y, x + ring, y);
      limb.addColorStop(0, `rgba(226, 238, 255, ${0.95 * entrance * fade})`);
      limb.addColorStop(0.5, `rgba(150, 190, 255, ${0.5 * entrance * fade})`);
      limb.addColorStop(1, `rgba(120, 160, 235, ${0.28 * entrance * fade})`);
      ctx.strokeStyle = limb;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, ring, 0, Math.PI * 2);
      ctx.stroke();
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
      //
      // The wanderer is the exception, and is excluded here: it acts on the
      // starfield as a lens rather than as a well, pushing apparent positions
      // outward instead of pulling them in. See `lens`.
      const starMasses = masses.filter((m) => m !== wanderMass);
      for (const star of stars) {
        const x = star.nx * width;
        const y = star.ny * height;
        const [dx, dy] = displace(x, y, starMasses);
        const lensed = lens(x + dx, y + dy);
        if (!lensed) continue;
        const twinkle = 0.78 + 0.22 * Math.sin(now / 1400 + star.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(214, 230, 255, ${star.a * twinkle})`;
        ctx.arc(lensed[0], lensed[1], star.r, 0, Math.PI * 2);
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

      // Last, so the horizon swallows the lattice instead of being striped by
      // it. Grid lines terminating at the edge of a black disc is both the
      // clearer image and the more correct one.
      drawWanderer();
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
        wanderer.vx,
        wanderer.vy,
        wanderer.autonomy,
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
        wanderer.vx,
        wanderer.vy,
        wanderer.autonomy,
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
      if (!grab.held) {
        // Only worth setting over empty ground: a link's own `cursor: pointer`
        // wins against a style on the body, so there is nothing to show there.
        const over =
          nearWanderer(event.clientX, event.clientY, event.target) &&
          !interactive(event.target);
        setCursor(over ? "grab" : "");
      }
      wake();
    };

    const onPointerLeave = () => {
      cursor.tw = 0;
      wake();
    };

    /** Whether this component is currently overriding the page's cursor, so it
     *  only ever clears a style it set itself. */
    let styledCursor = false;
    const setCursor = (value: string) => {
      if (!value && !styledCursor) return;
      document.body.style.cursor = value;
      styledCursor = value !== "";
    };

    const interactive = (target: EventTarget | null) =>
      Boolean((target as HTMLElement)?.closest?.("a, button"));

    const nearWanderer = (x: number, y: number, target: EventTarget | null) => {
      if (!wanders) return false;
      const radius = interactive(target) ? GRAB_RADIUS_OVER_LINK : GRAB_RADIUS;
      return Math.hypot(x - wanderer.x, y - wanderer.y) < radius;
    };

    /* A grab that began on top of a link has to swallow the click that pointerup
       would otherwise produce, or picking the thing up navigates. Capture phase
       and once, so it can never outlive the gesture that armed it. */
    const swallowNextClick = () => {
      window.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        { capture: true, once: true },
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      // Mouse only. On a touch screen a drag is how you scroll, and quietly
      // eating that to play with a background ornament would be indefensible —
      // though in practice the wanderer does not run at those widths anyway.
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (!nearWanderer(event.clientX, event.clientY, event.target)) return;

      grab.overLink = interactive(event.target);
      grab.held = true;
      grab.dx = wanderer.x - event.clientX;
      grab.dy = wanderer.y - event.clientY;
      wanderer.vx = 0;
      wanderer.vy = 0;
      wanderer.autonomy = 0;
      setCursor("grabbing");
      // Stops the drag turning into a text selection across the page.
      event.preventDefault();
      wake();
    };

    const onPointerUp = () => {
      if (!grab.held) return;
      grab.held = false;
      if (grab.overLink) swallowNextClick();
      grab.overLink = false;
      setCursor("");
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
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      setCursor("");
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
