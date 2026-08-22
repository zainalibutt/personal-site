# zain.org.uk — Build Brief

Master context document. Everything a one-shot build prompt needs.
Last updated: 2026-08-16.

---

## 1. Thesis — "Depth, not distance"

The site never takes you somewhere else. It takes you **closer**.

Every navigation is a zoom, not a page swap. Content that appears was always
there — you just couldn't resolve it yet. This is the resolution to the single
constraint that matters most (see §6): rich, memorable motion with **zero
navigational cost**. You cannot get lost in a site that never moves you.

The one sentence a visitor should leave with:

> _"I'm incredibly adaptable, especially with today's tools."_

---

## 2. Audience

**Primary:** a UI/UX-heavy recruiter or design-engineering hiring manager.

Zain's public work already proves systems depth — cryptography, SEC filings,
ledgers, local-first sync. What it has never proved is **visual and
interaction craft**. This site is the missing evidence, and the portfolio read
must stay effortless while it proves it.

**Secondary:** freelance clients, collaborators, fellow engineers.

**Positioning:** fresh graduate, paid freelance experience, London. Frame around
range, adaptability and shipped output rather than years served. Nothing to
actively downplay — the work is strong, the tenure is simply short and
shouldn't be the headline.

---

## 3. The interaction model (the core of the build)

Zain's own description, which is the spec:

> A warm entry with an about, and the projects floating beneath it. Each project
> has a preview of what it does. Once clicked it doesn't redirect, it refocuses —
> like a ghost redirect. It zooms in, revealing more information, like it was
> always there but you just couldn't see it.

Concretely:

1. **Entry** — warm, calm, a name and a line. Not a hero-with-scroll-hint.
   About sits here, brief and human.
2. **Project field** — cards floating beneath the fold. Each card is a _live
   preview_ of the thing working, not a static thumbnail.
3. **Focus** — clicking a card expands it in place via a shared-element morph.
   The card becomes the case study. Background recedes, does not unmount.
4. **Release** — Esc, backdrop click, or a close affordance returns it. The card
   settles back exactly where it was.

**Non-negotiable:** the route changes on focus, so every project is
deep-linkable and shareable. A cold visit to `/projects/proof-lens` renders the
full case study directly — this keeps SEO and link-sharing intact while the
in-session experience stays seamless.

### Why this and not the alternatives

| Direction                       | Verdict                                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — 3D world                    | Overkill; you lose track of why you're there. Rejected.                                                                                                                                            |
| B — Kinetic editorial           | Beautiful, but easy to get lost. Borrow its transition polish only.                                                                                                                                |
| C — Free-roam infinite canvas   | Right _idea_, wrong _control scheme_. Dragging to hunt for work means the work is overshadowed by the effort of finding it. **We keep C's semantic zoom and throw away its free-roam navigation.** |
| D — Command palette             | Visually poor as a primary surface. Optional accelerator at most.                                                                                                                                  |
| E — Forensic/evidence aesthetic | Rejected — reads dull. The warm direction replaces it.                                                                                                                                             |
| F — Craft maximalism            | Adopted wholesale as the quality floor.                                                                                                                                                            |
| G — Living system               | Held in reserve; see open question on the visitor mosaic.                                                                                                                                          |

The build is therefore **C's zoom on rails, at F's level of craft, with B's
polish** — and none of their navigation problems.

---

## 4. Content architecture — future projects must be seamless

Hard requirement from Zain: adding a project later must be trivial.

**Design:** one MDX file per project in `content/projects/`. Typed frontmatter,
schema-validated at build. Dropping in a new file automatically produces:

- a card in the project field
- a deep-linkable route at `/projects/<slug>`
- an OG image
- sitemap and RSS entries

No registry to update by hand, no layout to touch. Ordering and flagship status
are frontmatter flags, not code changes.

### Project roster

| Project             | Status    | Note                                                                                                  |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| **Proof-Lens**      | Flagship  | Cryptographic media provenance — device signatures, RFC 3161 timestamping, offline-verifiable bundles |
| **Melody**          | Flagship  | Command-first public-company research terminal, SEC filings + delayed market data                     |
| Replay              | Secondary | Local-first Windows photo/video timeline: trips, days, moments                                        |
| IOU                 | Secondary | Group-trip expense and round ledger — Expo, Express, Supabase                                         |
| age-group-detection | Secondary | Four-class classifier: HOG/SVM vs MLP vs ResNet18                                                     |

Format: **rich card → deep dive.** Cards carry a live preview and a one-line
claim; the focused state carries the full case study.

---

## 5. Visual language

- **Palette: deep space blue.** Superseded the white/Word-blue direction on
  2026-08-17 at Zain's request, which had itself superseded the warm direction.
  `#060a16` ground, `#e2eaf9` text, `#7fa9f5` accent, `#1e2a48` rules.
- **Mode: dark only.** The page does not follow `prefers-color-scheme` in
  either direction. A `data-theme="light"` palette exists, unused.
- **The signature:** a spacetime lattice with starfield and nebula, deformed by
  the artefacts, the cursor and the focused project. See `docs/ROADMAP.md`.
- **Layout: central spine, flanking artefacts.** Name and links centred at the
  top, About in the middle column with the portrait, project artefacts
  alternating left and right and staggered down the Y axis. From Zain's
  wireframe. Collapses to a single column below `lg`.
- **Hover:** artefacts lift and scale (currently 1.06). Tunable in one place in
  `ProjectCard`.
- **Type: warm editorial** — an old-style or transitional serif for headings
  against a neutral grotesk body. Confirmed. Deliberately avoids the
  mono-and-dark-grey default of every engineer portfolio.
- **Design flow: straight to code.** Figma cannot represent a zoom-morph, and
  the morph _is_ the design. A live style tile and an in-browser motion
  prototype replace static mockups.
- **Visitor presence: declined.** No mosaic, no multiplayer cursors. Focus stays
  on the work. Direction G is closed.
- **Motion:** shared-element morphs, spring physics, generous easing. Every
  animation must survive `prefers-reduced-motion`.
- **Personal thread:** photographs of Zain anchored in the About section. Gym and
  personal life woven in rather than siloed on their own page.

### Loading screen

Explicit instruction: **no pretension.** No "compiling shaders", no percentage
theatre, no technical boasting in the loader. If a loader is needed at all:
the name _Zain_ pulsing, with a thin progress bar at the bottom. Nothing else.

---

## 6. Anti-requirements

Ranked. The first one outranks everything in this document including §5.

1. **Poor navigation is the cardinal sin.** A beautiful WASD 2D or 3D motion
   system is nullified by bad wayfinding. If a visual choice makes the work
   harder to find, the visual choice loses. Always.
2. No loader that brags about what it's loading.
3. No getting lost — position and exit must always be obvious.
4. Nothing that reads as "shipped product" at the cost of memorable. Zain's
   words: _"I'd rather it be memorable than shipped. If I wanted shipped I'd
   stick with GitHub."_

---

## 7. Stack

| Layer     | Choice                                | Why                                                                                                                                  |
| --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | Next.js 16.3.1, App Router            | Known from `light-learning`. **Intercepting + parallel routes are what make the ghost-redirect work** while keeping deep links real. |
| Language  | TypeScript strict, React 19.2         | Matches every repo Zain owns. React Compiler enabled.                                                                                |
| Styling   | Tailwind v4                           | Already his tool                                                                                                                     |
| Motion    | `motion` v13                          | `layoutId` shared-element morphs are precisely the §3 spec                                                                           |
| Fonts     | Fraunces (display) + Inter (body)     | Warm editorial pairing per §5. Both variable, self-hosted via `next/font`.                                                           |
| Content   | MDX + typed frontmatter               | Satisfies §4 seamless-addition                                                                                                       |
| Hosting   | **Vercel**                            | Confirmed. Preview URL per PR — ideal for iterating on motion                                                                        |
| Domain    | zain.org.uk, registrar **Namecheap**  | DNS target unconfirmed                                                                                                               |
| Analytics | Privacy-friendly (Plausible or Umami) | Confirmed preference                                                                                                                 |
| Testing   | Vitest + Playwright                   | Matches `Melody`                                                                                                                     |

Deployed as SSG on Vercel — no static export, because intercepting routes need
the App Router runtime. Still effectively static, still free.

---

## 8. Contact & CTA

- Job hunting **now**, and freelancing in parallel.
- Willing to publish: email, LinkedIn (`zain-butt-dev`), GitHub
  (`zainalibutt`), and phone.
- CVs exist, tailored per role, including a law-oriented one. Which to host is
  an open question.

---

## 10. Open questions

- Writing/notes section — wanted, or not? Cheap to add now, annoying to retrofit.
- Which CV to host, if any. Zain has several tailored versions plus a law one.
- Contact email address to publish. `hello@zain.org.uk` is assumed and stubbed
  in `src/lib/site.ts`; it needs setting up as a forward at Namecheap.
- Namecheap DNS: not pointed anywhere yet. Not blocking — five minutes once
  there is a deployment to point at.
- The "I was here" mosaic Zain liked — visitor presence was declined, so this
  was likely a _layout_ he saw rather than a feature. Worth identifying if it
  resurfaces.
- The About section has no copy yet, and no photograph. Blocked on assets.

---

## 11. Repo

- **Name:** `personal-site` · **Visibility:** private until launch, then public.
- Owner: [@zainalibutt](https://github.com/zainalibutt)
