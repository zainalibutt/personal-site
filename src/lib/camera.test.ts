import { describe, expect, it } from "vitest";
import { centreOf, frameOn, midFrame, toTransform } from "./camera";

const VIEWPORT = { x: 720, y: 450 };

describe("camera framing", () => {
  it("puts the framed plane point at the viewport point", () => {
    const frame = frameOn({ x: 248, y: 563 }, VIEWPORT, 2);
    // Plane point p lands at t + zoom * p.
    expect(frame.tx + 2 * 248).toBe(VIEWPORT.x);
    expect(frame.ty + 2 * 563).toBe(VIEWPORT.y);
  });

  it("recovers the framed centre from a frame", () => {
    const centre = { x: 1192, y: 691 };
    const frame = frameOn(centre, VIEWPORT, 1.8);
    expect(centreOf(frame, VIEWPORT)).toEqual(centre);
  });

  it("serialises in the order the plane applies it", () => {
    expect(toTransform({ tx: 248, ty: -538, zoom: 2 })).toBe(
      "translate(248px, -538px) scale(2)",
    );
  });
});

describe("travel midpoint", () => {
  // The two flanks as actually measured at 1440x900.
  const from = frameOn({ x: 248, y: 563 }, VIEWPORT, 2);
  const to = frameOn({ x: 1192, y: 2125 }, VIEWPORT, 2);

  it("frames the point halfway between the two artefacts", () => {
    expect(centreOf(midFrame(from, to, VIEWPORT), VIEWPORT)).toEqual({
      x: (248 + 1192) / 2,
      y: (563 + 2125) / 2,
    });
  });

  it("pulls back, so the crossing shows both artefacts", () => {
    expect(midFrame(from, to, VIEWPORT).zoom).toBeLessThan(
      Math.min(from.zoom, to.zoom),
    );
  });

  it("never pulls back past the resting field", () => {
    // Zooming out below 1 would show the plane smaller than it ever rests,
    // which reads as leaving the page rather than moving across it.
    const shallow = frameOn({ x: 248, y: 563 }, VIEWPORT, 1.15);
    const other = frameOn({ x: 1192, y: 691 }, VIEWPORT, 1.15);
    expect(midFrame(shallow, other, VIEWPORT).zoom).toBe(1);
  });

  it("is symmetric — the same crossing either way round", () => {
    const there = midFrame(from, to, VIEWPORT);
    const back = midFrame(to, from, VIEWPORT);
    expect(there.tx).toBeCloseTo(back.tx, 6);
    expect(there.ty).toBeCloseTo(back.ty, 6);
    expect(there.zoom).toBeCloseTo(back.zoom, 6);
  });
});
