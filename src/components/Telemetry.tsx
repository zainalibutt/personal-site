"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { classify } from "@/lib/telemetry";

/**
 * Outbound-click telemetry.
 *
 * Page views already record every route this site owns, including which
 * artefact was opened — the URL changes for each one. What they cannot see is
 * the moment a visitor *leaves*: the CV downloaded, the email started, the
 * repository read, the deployed app tried. On a site whose job is to end in one
 * of those four actions, that is the only interesting half.
 *
 * **One delegated listener rather than handlers on the links.** The outbound
 * links are not in one place — four in the page header, one or two per case
 * study rendered from MDX. Instrumenting them individually would mean either
 * custom MDX components or an edit to every content file every time a project
 * is added, and the standing rule is that adding a project stays one file. A
 * listener on the document classifies whatever is actually there.
 *
 * No cookie, no identifier, no personal data: an event carries the destination
 * — one of Zain's own links — and the route it was clicked from.
 *
 * **Requires a Vercel Pro plan.** Custom events are not collected on Hobby, and
 * `track()` is inert both there and outside a Vercel deployment, so this is
 * silent rather than broken until the plan supports it. Pro also caps custom
 * data at two properties per event, and a third would drop the event rather
 * than truncate it — which is why `classify` returns at most two.
 */
export function Telemetry() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Untrusted clicks are the page's own — the artefact surface forwards a
      // synthetic one to the caption link — and would double-count.
      if (!event.isTrusted) return;
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      /* Which project was being read when the visitor left for its repository
         or its live app. Taken from the enclosing artefact rather than from the
         URL, because the case studies also render inside the field on the home
         route, where the path says nothing. */
      const project =
        link.closest("[data-artefact]")?.getAttribute("data-artefact") ??
        undefined;

      const departure = classify(
        link.getAttribute("href") ?? "",
        link.href,
        { origin: window.location.origin, pathname: window.location.pathname },
        project,
      );

      if (departure) track(departure.name, departure.data);
    }

    // Capture, so a handler that stops propagation on its way to navigating
    // cannot also stop the record of it.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
