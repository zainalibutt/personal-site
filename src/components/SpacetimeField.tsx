"use client";

import { useEffect, useRef } from "react";
import { subscribeFocusState, prefersReducedMotion } from "@/lib/motion-layer";

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
const STEP = 11; // sampling along each line — smaller is smoother, costlier
const CURSOR_RADIUS = 190;
const CURSOR_PULL = 26;
const REST_RADIUS = 260;
const REST_PULL = 14;
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
    const amount = (m.pull * falloff) / distance;
    dx += vx * amount;
    dy += vy * amount;
  }
  return [dx, dy];
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
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999, weight: 0, tw: 0 };
    let focusWeight = 0;
    let focusTarget = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        const isFocused = well.dataset.well === "focused";
        masses.push({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          radius: isFocused ? FOCUS_RADIUS : REST_RADIUS,
          pull: isFocused ? REST_PULL + FOCUS_PULL * focusWeight : REST_PULL,
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
      return masses;
    };

    const draw = () => {
      const masses = readMasses();
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      // At rest the lattice has to sit *under* the reading, not compete with
      // it — body copy crosses these lines. It earns weight only as a well
      // deepens, so the bend reads as depth rather than as noise.
      const intensity = Math.min(1, focusWeight * 0.9 + cursor.weight * 0.1);
      const alpha = 0.26 + intensity * 0.4;
      ctx.strokeStyle = `rgba(158, 184, 222, ${alpha})`;

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
      const before = [cursor.x, cursor.y, cursor.weight, focusWeight].join();

      cursor.x += (cursor.tx - cursor.x) * 0.14;
      cursor.y += (cursor.ty - cursor.y) * 0.14;
      cursor.weight += (cursor.tw - cursor.weight) * 0.09;
      focusWeight += (focusTarget - focusWeight) * 0.075;

      draw();

      // Stop the loop once nothing is moving. An ambient background must not
      // hold a rAF open for the life of the page.
      const after = [cursor.x, cursor.y, cursor.weight, focusWeight].join();
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
