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

      {/* the about copy. Currently placeholder-honest rather than
          placeholder-fake — Zain has not written this yet. */}
      <div className="text-muted space-y-4 text-pretty">
        <p>
          I build product end to end — mobile, web and the backend underneath.
          Most of what I make circles the same question: how do you know a record
          is true?
        </p>
        <p>
          Cryptographic provenance, filings pulled from primary sources, ledgers
          that reconcile themselves. Recently out of university, already shipping
          for clients.
        </p>
        <p>
          Based in {site.location}. Currently open to roles and freelance work.
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
              className="text-accent flex items-baseline justify-between py-3 transition-colors hover:text-ink"
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
