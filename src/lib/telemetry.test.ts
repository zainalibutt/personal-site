import { describe, expect, it } from "vitest";
import { classify, type Origin } from "./telemetry";

const here: Origin = {
  origin: "https://zain.org.uk",
  pathname: "/projects/proof-lens",
};

/** What a browser hands the listener: the raw attribute and its resolved form. */
function link(href: string, resolved = href) {
  return [href, resolved] as const;
}

describe("classify", () => {
  it("records the CV, which is a static file no page view can see", () => {
    const result = classify(
      ...link("/ZainButt-CV.pdf", "https://zain.org.uk/ZainButt-CV.pdf"),
      here,
    );
    expect(result).toEqual({ name: "CV", data: { from: here.pathname } });
  });

  it("records an email, whose scheme only survives on the raw attribute", () => {
    const result = classify(
      "mailto:zain@zain.org.uk",
      "mailto:zain@zain.org.uk",
      here,
    );
    expect(result).toEqual({ name: "Email", data: { from: here.pathname } });
  });

  it("ignores in-site navigation, which is already a page view", () => {
    expect(
      classify(
        ...link("/projects/melody", "https://zain.org.uk/projects/melody"),
        here,
      ),
    ).toBeNull();
    expect(classify(...link("/", "https://zain.org.uk/"), here)).toBeNull();
  });

  it("names the repository and the profile, ignoring a www prefix", () => {
    expect(
      classify(...link("https://github.com/zainalibutt/Melody"), here)?.name,
    ).toBe("GitHub");
    expect(
      classify(...link("https://www.linkedin.com/in/zain-butt-dev"), here)
        ?.name,
    ).toBe("LinkedIn");
  });

  it("treats any other host as a live app", () => {
    expect(classify(...link("https://proof-lens.vercel.app"), here)?.name).toBe(
      "Live app",
    );
  });

  it("attributes an outbound click to the artefact it was made inside", () => {
    const result = classify(
      ...link("https://melody-terminal.vercel.app"),
      here,
      "melody",
    );
    expect(result?.data).toEqual({
      project: "melody",
      to: "https://melody-terminal.vercel.app/",
    });
  });

  /* Two is the Vercel Pro cap, and a third property drops the whole event
     rather than truncating it — so this is the assertion that stops a future
     "just add one more dimension" from silently deleting the data. */
  it("never carries more than two properties", () => {
    const cases = [
      classify(
        ...link("/ZainButt-CV.pdf", "https://zain.org.uk/ZainButt-CV.pdf"),
        here,
      ),
      classify("mailto:zain@zain.org.uk", "mailto:zain@zain.org.uk", here),
      classify(...link("https://github.com/zainalibutt/IOU"), here, "iou"),
      classify(...link("https://iou-lac.vercel.app"), here),
    ];

    for (const result of cases) {
      expect(Object.keys(result?.data ?? {}).length).toBeLessThanOrEqual(2);
    }
  });

  /* `new URL` parses these perfectly well and gives each an origin of "null",
     which does not match this site's — so the naive rule files every one of
     them as a visit to a live app. */
  it("ignores schemes that are not web addresses", () => {
    expect(classify("javascript:void 0", "javascript:void 0", here)).toBeNull();
    expect(classify("tel:+441234567890", "tel:+441234567890", here)).toBeNull();
    expect(classify("#main", "https://zain.org.uk/#main", here)).toBeNull();
  });
});
