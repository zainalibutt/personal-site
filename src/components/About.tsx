import { Portrait } from "./Portrait";
import { site } from "@/lib/site";

/**
 * The central spine. Sits between the flanking artefacts and carries the only
 * prose on the entry screen.
 */
export function About() {
  return (
    <section
      aria-labelledby="about-heading"
      className="max-md:text-center md:space-y-6"
    >
      <div className="flex items-start justify-between gap-6 max-md:hidden">
        <h2 id="about-heading" className="text-ink text-3xl">
          About
        </h2>

        <Portrait src="/portrait/zain.png" alt={site.name} size={96} />
      </div>

      {/* The phone gets two sentences and nothing else — no heading, no
          portrait, no link list. It sits between the two rows of icons, which
          is where it can be read without being in the way. Everything it would
          otherwise link to is already in the page header. */}
      <p className="text-muted mx-auto max-w-[34ch] text-[0.9375rem] leading-relaxed text-pretty md:hidden">
        I build product end to end — mobile, web, and the backend underneath.
        Computer Science graduate in {site.location}, freelancing now, looking
        for a graduate or product engineering role.
      </p>

      {/* Draft A of docs/ABOUT_DRAFTS.md, which Zain picked: plain register,
          concrete nouns, no thesis. The thesis lives in the case studies
          instead, where it has evidence sitting next to it — his call, and the
          right one, since a thesis on the entry screen has to be taken on
          trust.

          Still a draft in register rather than in voice. The specifics are
          true — they are read off the CV — but the wording has not had a pass
          from Zain himself. */}
      <div className="text-muted space-y-4 text-pretty max-md:hidden">
        {/* `site.thesis` finally has a home. It is Zain's own sentence and was
            written as "the one sentence a visitor should leave with", then sat
            unrendered for two days while the thesis moved into the case
            studies. It belongs here: the claim first, its scope immediately
            after, and the evidence for both in the paragraph below. */}
        <p>
          <span className="text-ink">{site.thesis}</span> I build product end to
          end — mobile, web, and the backend underneath.
        </p>
        <p>
          Recent work: a tool that proves a file has not been altered since it
          was captured, a keyboard-first terminal for reading company filings
          from primary sources, and a ledger that settles group expenses without
          a spreadsheet. Alongside those, freelance builds for paying clients —
          an operations platform for a cross-border logistics team, and a
          booking site for a private tutor.
        </p>
        <p>
          Computer Science graduate, {site.location}. Open to roles and
          freelance work.
        </p>
      </div>

      {/* No link list. Every one of these — email, CV, GitHub, LinkedIn — was
          already in the page header a few hundred pixels above, and the same
          three were in the footer below, so LinkedIn alone appeared three
          times on one screen. They live in the header now, which is the one
          place a visitor looks for them before they have read anything. */}
    </section>
  );
}
