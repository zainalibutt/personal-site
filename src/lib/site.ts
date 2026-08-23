export const site = {
  name: "Zain Butt",
  role: "Full-stack product engineer",
  location: "London, UK",
  /** The same fact as `location`, in the shape schema.org asks for. Two keys
   *  rather than a parse of the sentence above: "UK" is not a country code and
   *  guessing one from prose is how a machine-readable claim goes wrong. */
  address: { locality: "London", countryCode: "GB" },
  url: "https://zain.org.uk",
  /** The one sentence a visitor should leave with — docs/BRIEF.md §1.
   *  Rendered as the opening claim of About. */
  thesis: "I'm incredibly adaptable, especially with today's tools.",
  description:
    "Full-stack product engineer in London, building secure TypeScript systems across mobile, web and backend.",
  links: {
    github: "https://github.com/zainalibutt",
    linkedin: "https://linkedin.com/in/zain-butt-dev",
    // Confirmed by Zain, 2026-08-18. A role address (hello@) was considered and
    // dropped: this one already exists, and it is the address on the CV that is
    // downloadable from the same page — two different addresses on one screen
    // is a worse problem than a personal-looking one.
    email: "zain@zain.org.uk",
  },
} as const;

export type Site = typeof site;
