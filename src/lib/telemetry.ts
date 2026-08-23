/**
 * What a click means, as a pure function of the link and where it was clicked.
 *
 * Separated from the listener that calls it so it can be tested without a DOM.
 * The classification is the part with judgement in it, and the part that goes
 * quietly wrong: a rule that mistakes an in-site link for an outbound one does
 * not throw, it just files a number under the wrong name for months.
 */

export type Departure = {
  /** Shown as the event name in the analytics dashboard. */
  name: string;
  /** At most two entries — the Vercel Pro cap. A third drops the event. */
  data: Record<string, string>;
};

export type Origin = {
  /** `window.location.origin` — what counts as "this site". */
  origin: string;
  /** `window.location.pathname` — which route the visitor left from. */
  pathname: string;
};

/**
 * Returns the event a click should record, or `null` for one that should not.
 *
 * `href` is the raw attribute and `resolved` is its absolute form. Both are
 * needed: only the attribute still carries a `mailto:` scheme unambiguously,
 * and only the resolved form can be compared against this site's origin.
 */
export function classify(
  href: string,
  resolved: string,
  here: Origin,
  project?: string,
): Departure | null {
  if (href.startsWith("mailto:")) {
    return { name: "Email", data: { from: here.pathname } };
  }

  let url: URL;
  try {
    url = new URL(resolved);
  } catch {
    return null;
  }

  /* Anything that is not a web address is not a departure. `new URL` happily
     parses `javascript:`, `tel:` and `blob:`, and each of them has an origin of
     "null" — which does not match this site's, so without this they would every
     one be filed as somebody visiting a live app. */
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  if (url.origin === here.origin) {
    /* In-site navigation is already a page view, and a second event for it
       would be a worse copy of a number the dashboard has. The CV is the
       exception: it is a static file, so the analytics script never runs for it
       and the download is invisible unless it is caught here, on the way out. */
    return url.pathname.endsWith(".pdf")
      ? { name: "CV", data: { from: here.pathname } }
      : null;
  }

  const data: Departure["data"] = project
    ? { project, to: url.href }
    : { from: here.pathname, to: url.href };

  const host = url.hostname.replace(/^www\./, "");
  if (host === "github.com") return { name: "GitHub", data };
  if (host === "linkedin.com") return { name: "LinkedIn", data };
  return { name: "Live app", data };
}
