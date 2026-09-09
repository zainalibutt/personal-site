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
        Computer Science graduate, 2:1, {site.address.locality}. Unrestricted UK
        right to work, looking for {site.seeking}.
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
        {/* The opening span used to be `site.thesis` — "I'm incredibly
            adaptable, especially with today's tools." It was retired, and the
            reasoning is worth keeping: it was the only unfalsifiable sentence
            on a site whose whole argument is that a claim should be checkable,
            the only intensifier in ~4,500 words, and in 2026 "today's tools"
            reads to an engineer as "I use AI" — which is the suspicion the
            retrospectives below exist to answer, handed to him for free in the
            brightest ink on the page.

            What replaces it is the through-line the work already has, in the
            words the flagship already uses. It does the job the thesis was
            meant to do and, unlike the thesis, the six artefacts either side of
            this column are the evidence for it. */}
        <p>
          <span className="text-ink">
            Everything below asks the same question: how do you know a record is
            true?
          </span>{" "}
          I build product end to end — mobile, web, and the backend underneath.
        </p>
        {/* Second, not third. These four facts — level, classification, work
            authorisation, and the role being asked for — are what a recruiter
            screening a graduate pipeline actually acts on, and in the previous
            order they fell below the fold at 1366 while the paragraph above
            them was severed mid-phrase at the fold edge: "...reported roughly
            60% higher operational". The noun never arrived, and the only client
            number on the screen was the half of a sentence that got cut.

            Swapping them puts the decisive four lines above the fold and moves
            the descriptive paragraph to where being cut costs nothing. */}
        <p>
          {site.education.degree}, {site.education.classification},{" "}
          {site.education.institution}. Final-year project{" "}
          {site.education.finalYearProject}%. {site.location}, with{" "}
          {site.rightToWork} — looking for {site.seeking}, and taking freelance
          work now.
        </p>
        <p>
          Recent work: a tool that proves a file has not been altered since it
          was captured, a keyboard-first terminal for reading company filings
          from primary sources, and a ledger that settles group expenses without
          a spreadsheet. Alongside those, freelance builds for paying clients —
          an operations platform for a cross-border logistics team, whose client
          reported roughly 60% higher operational efficiency and kept me on for
          support, and a booking site for a private tutor who reported two- to
          threefold growth in enquiries.
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
