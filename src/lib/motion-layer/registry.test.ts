import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFocus,
  getFocusState,
  getView,
  getViewRect,
  previewViewId,
  registerView,
  resetMotionLayer,
  setFocus,
  setFocusState,
  subscribeFocus,
  subscribeFocusState,
  unregisterView,
} from "./index";

/** Minimal stand-in — the registry only ever calls getBoundingClientRect. */
function fakeElement(rect: Partial<DOMRect> = {}): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      ...rect,
    }),
  } as unknown as HTMLElement;
}

describe("motion layer registry", () => {
  beforeEach(() => resetMotionLayer());

  it("registers a view and reads its rect back", () => {
    const element = fakeElement({ x: 10, y: 20, width: 320, height: 200 });
    registerView("a", element);

    expect(getView("a")).toBe(element);
    expect(getViewRect("a")).toEqual({ x: 10, y: 20, width: 320, height: 200 });
  });

  it("returns null for an unknown view rather than throwing", () => {
    expect(getViewRect("missing")).toBeNull();
    expect(getView("missing")).toBeNull();
  });

  it("treats a zero-sized view as unmeasurable", () => {
    // A card that has not laid out yet must not produce a degenerate morph.
    registerView("a", fakeElement({ width: 0, height: 0 }));
    expect(getViewRect("a")).toBeNull();
  });

  it("cleans up via the returned disposer", () => {
    const dispose = registerView("a", fakeElement());
    dispose();
    expect(getView("a")).toBeNull();
  });

  it("does not let a stale disposer evict a newer registration", () => {
    // Unmount order is not guaranteed across an intercepted route transition,
    // so an old card's cleanup must not remove the incoming one.
    const first = fakeElement();
    const second = fakeElement();
    const disposeFirst = registerView("a", first);
    registerView("a", second);

    disposeFirst();

    expect(getView("a")).toBe(second);
  });

  it("supports explicit unregistration", () => {
    registerView("a", fakeElement());
    unregisterView("a");
    expect(getView("a")).toBeNull();
  });

  it("publishes focus progress to subscribers", () => {
    const listener = vi.fn();
    subscribeFocus(listener);

    setFocus("proof-lens", 0.5);

    expect(listener).toHaveBeenCalledWith("proof-lens", 0.5);
    expect(getFocus()).toEqual({ slug: "proof-lens", progress: 0.5 });
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFocus(listener);
    unsubscribe();

    setFocus("melody", 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies state changes and ignores repeats", () => {
    const listener = vi.fn();
    subscribeFocusState(listener);

    setFocusState("opening");
    setFocusState("opening");
    setFocusState("focused");

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, "opening");
    expect(listener).toHaveBeenNthCalledWith(2, "focused");
    expect(getFocusState()).toBe("focused");
  });

  it("starts idle", () => {
    expect(getFocusState()).toBe("idle");
  });

  it("derives a stable preview id from a slug", () => {
    expect(previewViewId("proof-lens")).toBe(previewViewId("proof-lens"));
    expect(previewViewId("proof-lens")).not.toBe(previewViewId("melody"));
  });
});
