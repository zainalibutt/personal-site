# zain.org.uk

Personal site of Zain Butt — full-stack product engineer, London.

- **Live:** https://zain.org.uk
- **GitHub:** [@zainalibutt](https://github.com/zainalibutt)
- **LinkedIn:** [zain-butt-dev](https://linkedin.com/in/zain-butt-dev)

## The idea

"Depth, not distance." The site never navigates away — it zooms in.

`<main>` is a plane. Focusing a project grows that artefact **in plane
coordinates** via an expanding `clip-path`, and at the same time translates and
scales the plane so the camera frames it. It is a camera move, not a panel: the
other artefacts and the About column keep their real spatial relationship rather
than being covered over, and there is deliberately no backdrop. The URL still
changes, so every project is deep-linkable and a cold visit renders the full
case study as an ordinary page.

It is explicitly **not** a shared-element morph. That was built first and
scrapped — a morph is two elements pretending to be one, and it reads as a swap.
See decision 3.

Full rationale in [`docs/BRIEF.md`](docs/BRIEF.md). Directions considered and
rejected are in [`docs/DIRECTIONS.md`](docs/DIRECTIONS.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
MDX · Vitest · Playwright · deployed on Vercel. No animation library — see
[`docs/DECISIONS.md`](docs/DECISIONS.md) decision 3.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

| Script           | Does                                                    |
| ---------------- | ------------------------------------------------------- |
| `npm run dev`    | Dev server on **:3100**                                 |
| `npm run build`  | Production build                                        |
| `npm run check`  | Typecheck, lint and unit tests                          |
| `npm run test`   | Vitest                                                  |
| `npm run format` | Prettier                                                |
| `npm run shoot`  | Real headless Chromium screenshots + interaction checks |

## Adding a project

Drop one `.mdx` file into `content/projects/`. That is the whole process — it
produces the card, the `/projects/<slug>` route, the metadata and the sitemap
entry with no other file touched.

```mdx
---
title: Thing
tagline: One line on what it does.
year: 2026
role: Design and engineering
stack: [TypeScript]
flagship: false
order: 20
repo: https://github.com/zainalibutt/thing
preview:
  type: video
draft: false
---

## The problem

…
```

Frontmatter is schema-validated in [`src/lib/content.ts`](src/lib/content.ts);
an invalid file fails the test suite with a precise error rather than silently
vanishing from the grid.

> **Note:** `content/` is in `.prettierignore`. Prettier's markdown formatter
> rewrites MDX expression comments into invalid syntax.

## Architecture

| Path                                | Role                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/app/page.tsx`                  | Entry and project field                                         |
| `src/app/projects/[slug]/page.tsx`  | Full case study — what a **cold visit** renders                 |
| `src/app/@modal/(.)projects/[slug]` | Interception that keeps home mounted while the URL changes      |
| `src/components/ProjectCard.tsx`    | One artefact — the same box at rest and expanded                |
| `src/components/useBoxExpand.ts`    | The expansion and the camera                                    |
| `src/lib/camera.ts`                 | Camera framing as a value, and the travel between two artefacts |
| `src/components/ProjectMap.tsx`     | The field in miniature, while an artefact is open               |
| `src/components/SpacetimeField.tsx` | The signature — lattice, starfield, nebulae, wanderer           |

Three rules that each took more than one attempt, all in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): an artefact may never grow
across the centre spine; never re-measure through a live transform; the
intercepted route must not render `null`.
