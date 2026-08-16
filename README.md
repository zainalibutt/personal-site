# zain.org.uk

Personal site of Zain Butt — full-stack product engineer, London.

- **Live:** https://zain.org.uk _(not yet deployed)_
- **GitHub:** [@zainalibutt](https://github.com/zainalibutt)
- **LinkedIn:** [zain-butt-dev](https://linkedin.com/in/zain-butt-dev)

## The idea

"Depth, not distance." The site never navigates away — it zooms in. Clicking a
project card morphs it in place into the full case study while the page beneath
stays mounted, and the URL still changes so every project is deep-linkable.

Full rationale in [`docs/BRIEF.md`](docs/BRIEF.md). Directions considered and
rejected are in [`docs/DIRECTIONS.md`](docs/DIRECTIONS.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
`motion` · MDX · Vitest · Playwright · deployed on Vercel.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

| Script              | Does                              |
| ------------------- | --------------------------------- |
| `npm run dev`       | Dev server on :3000               |
| `npm run build`     | Production build                  |
| `npm run check`     | Typecheck, lint and unit tests    |
| `npm run test`      | Vitest                            |
| `npm run format`    | Prettier                          |

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

| Path                                | Role                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `src/app/page.tsx`                  | Entry and project field                                 |
| `src/app/projects/[slug]/page.tsx`  | Full case study — what a **cold visit** renders         |
| `src/app/@modal/(.)projects/[slug]` | Intercepted focused view — what an **in-session** click renders |
| `src/components/ProjectCard.tsx`    | Card, holds the source `layoutId`s                      |
| `src/components/FocusShell.tsx`     | Focused state, holds the matching `layoutId`s           |

The shared `layoutId` values across the last two files are what make the morph
work. Keep them in sync.
