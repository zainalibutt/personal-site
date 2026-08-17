import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFocusState,
  resetMotionLayer,
  setFocusState,
  subscribeFocusState,
} from "./index";

describe("focus lifecycle", () => {
  beforeEach(() => resetMotionLayer());

  it("starts idle", () => {
    expect(getFocusState()).toEqual({ state: "idle", slug: null });
  });

  it("publishes state changes to subscribers", () => {
    const listener = vi.fn();
    subscribeFocusState(listener);

    setFocusState("opening", "proof-lens");

    expect(listener).toHaveBeenCalledWith("opening", "proof-lens");
    expect(getFocusState()).toEqual({ state: "opening", slug: "proof-lens" });
  });

  it("ignores a repeated state for the same project", () => {
    const listener = vi.fn();
    subscribeFocusState(listener);

    setFocusState("opening", "melody");
    setFocusState("opening", "melody");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reports the same state against a different project", () => {
    // Two artefacts can be mid-transition together — one closing as another
    // opens — so the slug is part of the identity, not decoration.
    const listener = vi.fn();
    subscribeFocusState(listener);

    setFocusState("opening", "melody");
    setFocusState("opening", "iou");

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("walks a full open and close cycle", () => {
    const seen: string[] = [];
    subscribeFocusState((state) => seen.push(state));

    setFocusState("opening", "iou");
    setFocusState("focused", "iou");
    setFocusState("closing", "iou");
    setFocusState("idle");

    expect(seen).toEqual(["opening", "focused", "closing", "idle"]);
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFocusState(listener);
    unsubscribe();

    setFocusState("focused", "replay");

    expect(listener).not.toHaveBeenCalled();
  });
});
