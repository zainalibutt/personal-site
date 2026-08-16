export const site = {
  name: "Zain Butt",
  role: "Full-stack product engineer",
  location: "London, UK",
  url: "https://zain.org.uk",
  /** The one sentence a visitor should leave with — docs/BRIEF.md §1. */
  thesis: "I'm incredibly adaptable, especially with today's tools.",
  description:
    "Full-stack product engineer in London, building secure TypeScript systems across mobile, web and backend.",
  links: {
    github: "https://github.com/zainalibutt",
    linkedin: "https://linkedin.com/in/zain-butt-dev",
    // TODO(zain): confirm. A domain address forwarding to your inbox keeps the
    // personal one off a public page — set up hello@zain.org.uk at Namecheap.
    email: "hello@zain.org.uk",
  },
} as const;

export type Site = typeof site;
