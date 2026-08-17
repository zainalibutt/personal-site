import Image from "next/image";
import { site } from "@/lib/site";

/**
 * The central spine. Sits between the flanking artefacts and carries the only
 * prose on the entry screen.
 */
export function About() {
  return (
    <section aria-labelledby="about-heading" className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <h2 id="about-heading" className="text-ink text-3xl">
          About
        </h2>

        <Image
          src="/portrait/zain.png"
          alt="Zain Butt"
          width={96}
          height={96}
          priority
          className="border-line size-24 shrink-0 rounded-full border object-cover"
        />
      </div>

      {/* Draft A of docs/ABOUT_DRAFTS.md, which Zain picked: plain register,
          concrete nouns, no thesis. The thesis lives in the case studies
          instead, where it has evidence sitting next to it — his call, and the
          right one, since a thesis on the entry screen has to be taken on
          trust.

          Still draft copy, not his. The specifics are true — they are read
          off his CV — but the voice has not been through him yet. */}
      <div className="text-muted space-y-4 text-pretty">
        <p>
          I build product end to end — mobile, web, and the backend underneath.
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

      <ul className="text-sm">
        {[
          { label: "Email", href: `mailto:${site.links.email}` },
          { label: "GitHub", href: site.links.github },
          { label: "LinkedIn", href: site.links.linkedin },
        ].map((link) => (
          <li key={link.label} className="border-line border-b">
            <a
              href={link.href}
              className="text-accent hover:text-ink flex items-baseline justify-between py-3 transition-colors"
            >
              <span>{link.label}</span>
              <span aria-hidden>→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
