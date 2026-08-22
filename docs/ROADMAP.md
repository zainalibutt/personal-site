# Roadmap

Phased plan for zain.org.uk. One phase at a time; each has an exit condition so
"done" is not a matter of opinion.

Status legend: **▶ active** · ○ queued · ✓ complete

---

## ✓ Phase 0 — Foundation

Scaffold, routing, content pipeline, deploy target, test harness.

Delivered: Next 16 + React 19 + Tailwind v4, MDX with zod-validated
frontmatter, intercepted routes, the camera-zoom interaction, `npm run shoot`
screenshot harness, `frontend-design` / `vercel` / `typescript-lsp` plugins.

Settled and recorded in `docs/ARCHITECTURE.md`: the artefact expands in plane
coordinates while the camera frames it; neighbours keep their spatial
relationship rather than being covered.

---

## ✓ Phase 1 — The field

**The signature.** Everything else on this page stays quiet so this can be the
one memorable thing.

A blue mesh — a coordinate lattice — that the page's contents deform. Zain's own
model for the site was _"one massive graph, X Y"_; this makes that literal. It
also earns its place against the subject: the work is about records, evidence
and measurement, and a measurement grid is the substrate all of that sits on.

Three kinds of mass deform it, all one function at different strengths:

1. **Artefacts at rest** — each project dents the lattice faintly, so the page's
   structure is legible in the field before any interaction.
2. **The cursor** — a small travelling mass. Zain's idea, and the right one:
   it makes the field feel like a material rather than a backdrop.
3. **The focused artefact** — the well deepens as the camera pushes in, so the
   opening reads as the page bending around what you selected.

**Exit condition — measured 2026-08-18:**

| Criterion                             | Result                                                 |
| ------------------------------------- | ------------------------------------------------------ |
| 60fps at 1440×900                     | median frame interval **16.90ms = 59.2fps** (p90 21ms) |
| Idles at zero cost                    | **superseded** — see below                             |
| Static under `prefers-reduced-motion` | **0 repaints**, lattice drawn once                     |
| The open reads as one movement        | **Signed off by Zain, 2026-08-18**                     |

**The zero-idle criterion was retired deliberately**, not failed. Decision 18
adds a wandering fourth mass that never stops, so the loop never sleeps — on
desktop only, and never under reduced motion. A phone still idles at exactly
zero, verified across five consecutive windows.

**Explicitly not in this phase:** WebGL. Canvas 2D draws crisp blue line work
natively and costs no dependency. Revisit only if the lattice demonstrably
cannot carry the idea.

---

## ▶ Phase 2 — Opening choreography

Built; awaiting Zain's eyes on the feel, which is the only thing that can close
this one.

- ✓ **One motion language.** `src/lib/motion.ts` holds every duration and
  easing, mirrored as custom properties in `globals.css`. Durations and curves
  were previously scattered across three files, which is exactly why the open,
  the close and the hover did not agree with each other.
- ✓ **Staggered reveal.** The case study resolves in sequence just behind the
  opening edge — title, then metadata, then the writing. Kept deliberately
  small: the premise is that this content was always there, so a large entrance
  would contradict it.
- ✓ **Hover previews the well.** Hovering an artefact deepens its own dent in
  the lattice, so the field forecasts the open before you commit to it. The
  card lift is no longer a separate effect bolted on top.
- ✓ **Entrance instead of a loader.** See the decision log — a loader on a
  static site this fast is theatre. The lattice arrives flat and the artefacts
  settle into it, which uses the signature rather than covering it.

**Exit condition:** open, close and hover feel like one hand made them.

---

## ○ Phase 3 — Content and assets

The largest remaining gap, and **mostly not code**. Read this split before
starting: most of the phase cannot be finished without Zain, so a session that
opens here should do the left column first and then ask, rather than stalling.

### Can be done without Zain — ✓ done

- ✓ **Flagship crops.** Melody, Proof-Lens and IOU now use detail regions cropped
  from `assets/raw/projects/`, not full-window captures. Melody leads with the
  command bar and the chart; Proof-Lens with the headline and the three checks,
  which also drops the test email address that was visible in the old hero.
- ✓ **About copy drafts** — three registers in `docs/ABOUT_DRAFTS.md`, with what
  each one wins and loses. Not wired into the page; Zain reacts first.
- ✓ **`What I'd change` sections** carry specific questions per project, as MDX
  comments so nothing invented renders.

### Since resolved with Zain

- ✓ **Every artefact has a real image.** Replay is cropped from the captures he
  supplied. Age-group-detection has no interface — it ran from a notebook — so
  its card is a **generated figure of its own reported results**, built by
  `npm run figures` from numbers read off the repository. A stock photograph of
  faces was the obvious fallback and the wrong one.
- ✓ **About copy** is Draft A, the register he picked, with the freelance work
  made specific from his CV, and `site.thesis` — his own sentence — opening it.
- ✓ **Thesis in the case studies, not on the entry screen** — his call. Proof-Lens
  and Melody each open by naming the question; age-group-detection opens by
  saying plainly that it is a demonstration, not a product.
- ✓ **Live links.** All three deployed apps are now linked from their case
  studies; the site previously only offered source code.

### Since resolved with Zain, part two

- ✓ **The retrospectives are written.** Drafted 2026-08-18 on his instruction to
  "freestyle with relevance" — having previously been held back as
  uninventable. The rule they follow: every claim is either visible in the
  repository or a judgement about the design, never a recollection. Each is
  marked in-file where a draft still stands.
- ✓ **Contact address settled** — `zain@zain.org.uk`, the one already on the CV.
  A separate `hello@` was considered and dropped: two addresses on one screen is
  worse than one that looks personal.
- ✓ **CV published, redacted.** The phone number is removed from the PDF's
  content stream, not covered over, and verified absent from the raw bytes, the
  page stream and the extracted text.

### Still open

- **A closer pass over the remaining copy** — age-group-detection, Revenue OS,
  and About's closing line. Four of six retrospectives are drawn straight from
  source material: Proof-Lens from the dissertation, and Melody, IOU and Replay
  from project notes. A technical reader can tell a retrospective that was lived
  from one that was reconstructed, which is why the rest matter.
- Whether a writing section exists.

**Exit condition:** no placeholder text, and no artefact without a real image.

**Sixth artefact added 2026-08-18** — Revenue OS, private, third in the order.
Its card is the real production dashboard. The reporting panel was hidden in the
DOM before capture and the page reloaded afterwards to reverse it — omission
rather than rewriting, which would have been a fabricated record on a site whose
argument is that fabricated records are the problem. The crop then clears every
element carrying third-party or personal data, measured rather than eyeballed.
The generated boundary figure sits inside the case study, where it explains what
a screenshot cannot. Decision 23.

**Both halves are now met** — but see the voice pass above before anyone reads
it.

---

## ✓ Phase 4 — Type and identity

**Closed 2026-08-18.** Zain approved the graded ground ("the gradient is
magnificent"), then named the remaining gap himself — the page read clean but
cheap. Decisions 21 and 22 answer that: material and grain, editorial furniture,
crops that show a detail rather than a window, and a header with real scale.

- ✓ **Type.** Three display faces were built and shot; see decision 13. Bodoni
  Moda won on Zain's preference, but the finding was that the display face
  renders in four places and therefore cannot carry identity. The change that
  did land is a **monospace reserved for data** — years, stack chips, metadata
  labels, never prose.
- ✓ **Colour depth.** The ground is graded rather than flat and the nebulae now
  travel in hue as well as lightness. Decision 14.
- ✓ **Favicon** — `src/app/icon.svg`, the signature reduced to three lattice
  lines and one mass. Exaggerated well past the real field, because a subtle
  deformation at 16px is no deformation.
- ✓ **OG image** — `npm run og` photographs the real page at 1200×630 rather
  than composing a second design that would drift out of sync.
- ✓ **404** renders the field. It previously dropped the visitor out of the
  world entirely, which is the one thing the camera model exists to avoid.

- ✓ **The phone is its own thing.** Five app icons on one screen, About as two
  sentences between the rows, everything one tap from the fold. Same DOM as
  desktop; CSS chooses the face. Decision 17.

**Exit condition:** a stranger could tell two screenshots of this site from two
screenshots of any other portfolio.

---

## ▶ Phase 5 — Ship

**Live at [zain.org.uk](https://zain.org.uk) since 2026-08-18.**

- ✓ **Analytics** — Vercel Web Analytics, not the Plausible this roadmap
  assumed. Free, no cookies, no banner, inert outside a Vercel deployment.
- ✓ **DNS** — apex `A` record at Namecheap, `www` CNAME, and a 308 from `www` to
  the apex written into `next.config` rather than the Vercel dashboard so the
  rule lives with the code. Canonical tags resolve per route.
- ✓ **Lighthouse** — 97 performance / 100 accessibility / 100 best-practices /
  100 SEO on the live site, LCP 0.6s, CLS 0, TBT 40ms. Performance was 99 before
  the wanderer; the 2 points are its permanent render loop, knowingly spent.
- ✓ **axe** — clean on home, phone, a cold project page and the 404. The contrast
  it cannot compute through the canvas measures 7.44:1 at worst, against a
  4.5:1 requirement.
- ✓ **Security headers** — CSP, X-Frame-Options, nosniff, referrer policy,
  permissions policy. Decision 19.
- ✓ **Keyboard walkthrough** — tab order identical at 390px and 1440px; one real
  WCAG 2.5.3 failure found and fixed.
- ✓ **Repo made public**, after a pass over the history: the working tree and
  every commit were checked for secrets, personal data and anything that did not
  belong in a published record.

**Exit condition:** live on zain.org.uk, green Lighthouse, no a11y violations.
**Met.**

---

## Working rules

- Screenshot before claiming a visual change works. A headless preview pane
  cannot composite frames; `npm run shoot` can.
- Every animation gets a timer guard as well as its `finished` promise. This
  has bitten four separate animations already.
