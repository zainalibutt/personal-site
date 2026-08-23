import { getAllProjects, type ProjectSummary } from "./content";
import { site } from "./site";

/**
 * Structured data.
 *
 * The page already says who Zain is; this says it in the one form a machine can
 * read without inferring. It matters for a single scenario, which happens to be
 * the likeliest one on a job hunt: somebody is handed his name, searches it, and
 * gets a result page assembled by something that never saw the lattice.
 *
 * `sameAs` is the load-bearing part. It is what ties this domain, the GitHub
 * account and the LinkedIn profile together as one person rather than three
 * strangers who share a name.
 *
 * Nothing here is authored twice. Every value is read from `site.ts` or from
 * the same MDX frontmatter the cards are built from, so a claim cannot drift
 * out of agreement with the page that makes it.
 */

/** Stable node identities, so the project pages can point at the person rather
 *  than restating him on every route. */
const PERSON = `${site.url}/#person`;
const WEBSITE = `${site.url}/#website`;

/** Every technology named across the work, deduplicated, in first-seen order.
 *  Derived rather than listed: a hand-kept skills array is a second source of
 *  truth that goes stale the first time a project is added. */
function knowsAbout(): string[] {
  return [...new Set(getAllProjects().flatMap((project) => project.stack))];
}

/** Person and site. Emitted on every route from the root layout. */
export function identityGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON,
        name: site.name,
        url: site.url,
        jobTitle: site.role,
        description: site.description,
        image: `${site.url}/portrait/zain.png`,
        // Already a `mailto:` in the page header, so this exposes nothing new.
        email: `mailto:${site.links.email}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.address.locality,
          addressCountry: site.address.countryCode,
        },
        sameAs: [site.links.github, site.links.linkedin],
        knowsAbout: knowsAbout(),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE,
        url: site.url,
        name: site.name,
        description: site.description,
        inLanguage: "en-GB",
        author: { "@id": PERSON },
        publisher: { "@id": PERSON },
      },
    ],
  };
}

/**
 * One project.
 *
 * `SoftwareSourceCode` rather than the vaguer `CreativeWork`: all six are
 * software with a repository behind them, and the specific type is the one that
 * has somewhere honest to put the repository URL.
 *
 * The stack goes in `keywords`, not `programmingLanguage`. Half of it is not a
 * language — Supabase, RFC 3161, ResNet18 — and a structured claim that is
 * *nearly* right is worse than a looser one that is exactly right.
 */
export function projectGraph(project: ProjectSummary, image?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": `${site.url}/projects/${project.slug}#project`,
    name: project.title,
    abstract: project.tagline,
    url: `${site.url}/projects/${project.slug}`,
    author: { "@id": PERSON },
    creator: { "@id": PERSON },
    isPartOf: { "@id": WEBSITE },
    dateCreated: String(project.year),
    keywords: project.stack,
    ...(project.repo ? { codeRepository: project.repo } : {}),
    ...(image ? { image } : {}),
  };
}

/**
 * Serialises a graph for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because a `</script>` occurring inside any string value would
 * otherwise close the element early and spill the rest of the JSON into the
 * document as markup. Everything here is Zain's own copy, so this is not
 * guarding against an attacker — it is guarding against a tagline that one day
 * contains a tag.
 */
export function jsonLd(graph: object): string {
  return JSON.stringify(graph).replace(/</g, "\u003c");
}
