export const site = {
  name: "Zain Butt",
  role: "Full-stack product engineer",
  location: "London, UK",
  /** The same fact as `location`, in the shape schema.org asks for. Two keys
   *  rather than a parse of the sentence above: "UK" is not a country code and
   *  guessing one from prose is how a machine-readable claim goes wrong. */
  address: { locality: "London", countryCode: "GB" },
  url: "https://zain.org.uk",
  /**
   * The credential facts, in one place, because three surfaces state them and
   * they must not drift: About renders them, `alumniOf` in the identity graph
   * reads them, and the CV already publishes them.
   *
   * They were on the CV and the GitHub profile and nowhere on this site, which
   * meant the two surfaces this one links to both out-argued the site itself.
   */
  education: {
    degree: "BSc Computer Science",
    classification: "Upper Second-Class Honours",
    institution: "City St George's, University of London",
    finalYearProject: 83,
  },
  /** A screening gate for every UK employer, and cheaper to answer than to be
   *  asked. Stated on the CV and the GitHub README already. */
  rightToWork: "unrestricted UK right to work",
  /** What he is actually asking for. "Open to roles" committed to nothing —
   *  decision in docs/ABOUT_DRAFTS.md that was raised and never answered. */
  seeking: "a graduate or product engineering role",
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
    /**
     * This site's own repository.
     *
     * Deliberately not a fifth chip in the header — the header is the four
     * things a visitor is being asked to do, and this is not one of them. It
     * goes in the footer, where a reader who has got that far is the reader it
     * is for.
     *
     * It is here at all because the strongest evidence on this site is the
     * thing the reader is standing inside: a decision log recording what was
     * reversed, a roadmap with measured exit conditions, and a screenshot
     * harness that asserts the page is still clickable. None of it was
     * reachable from the page it describes.
     */
    source: "https://github.com/zainalibutt/personal-site",
  },
} as const;

export type Site = typeof site;
