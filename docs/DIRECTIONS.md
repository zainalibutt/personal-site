# Visual directions — reference board

Seven candidate directions for zain.org.uk, with live examples and the specific
mechanic that would be implemented. Links verified August 2026.

---

## A — The Spectacle (3D world)

**Look at:**

- [bruno-simon.com](https://bruno-simon.com) — you drive a physics jeep around a 3D world; projects are objects you crash into. The canonical example.
- [jayransijn.com](https://jayransijn.com/) — playable 3D world with a character, a dog you play fetch with, a bike. 15-year design engineer.
- [Awwwards WebGL gallery](https://www.awwwards.com/websites/webgl/) — the whole genre in one scroll.

**Mechanic:** React Three Fiber + Rapier physics, GLTF models, orbit/character controller, raycast interaction. Projects become world objects.

**Verdict: skip.** Most-cloned archetype alive, and it brands you _creative developer / WebGL specialist_ — the opposite of "secure TypeScript systems across mobile, web and backend."

---

## B — Kinetic Editorial

**Look at:**

- [valentingassend.com](https://valentingassend.com/en/) — Next.js, R3F shaders, GSAP kinetic type, a "Lab" section for experiments. Closest to a realistic ceiling.
- [Mat Voyce case study](https://www.awwwards.com/case-study-mat-voyce-designing-a-digital-home-for-a-kinetic-creative.html) — Awwwards breakdown of how the type animation was built. Read the build notes, not just the visuals.
- [good-design.org/projects/mat-voyce](https://good-design.org/projects/mat-voyce/) — the design writeup.

**Mechanic:** GSAP ScrollTrigger timelines, Lenis smooth scroll, type scaling past viewport bounds, shader wipe transitions between routes. R3F used for rendering text to WebGL to keep CPU free.

**Verdict:** the safe premium choice. Looks expensive, mature patterns, low risk. But it's a _style_, not an idea — ten other people ship it this year.

---

## C — Spatial Canvas (your 5.6 idea)

**Look at:**

- [tldraw.com](https://tldraw.com) — the interaction model itself: pan, zoom, objects in space. Ignore that it's a drawing tool, feel the _navigation_.
- [Codrops: Infinite Canvas tutorial](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/) — Jan 2026, a full build of a seamless pan-anywhere image space in R3F at 120fps. Effectively the implementation guide.
- [Awwwards infinite canvas collection](https://www.awwwards.com/inspiration/infinite-canvas) — sites already doing it.

**Mechanic:** transformed DOM with CSS containment (keeps text real, selectable, indexable — better than canvas here), wheel/drag/pinch pan-zoom, **semantic zoom** where zooming into a project resolves the card into a full case study. Needs deep-linked routes per project, a list-view toggle, and a prerendered static fallback for SEO.

**Verdict:** strong container, and it matches "collage of my projects" naturally. Weakness: nothing about _your_ work is inherently spatial. It's a great vessel looking for a reason.

---

## D — The Instrument (command-driven)

**Look at:**

- [cmdk.paco.me](https://cmdk.paco.me) — the component powering Linear's and Raycast's palettes. Hit the demo, feel the filtering.
- [linear.app](https://linear.app) — press ⌘K. Note it's an accelerator layered on normal nav, never the only way through.
- [raycast.com](https://raycast.com) — a whole product built as a command surface.

**Mechanic:** cmdk palette as first-class nav, typed queries against your career ("show me rust", "proof-lens", "contact"), keyboard-first, streaming results. Melody is already a "command-first research terminal" — this is your own DNA turned on yourself.

**Verdict:** superb as a _layer_, insufficient alone — recruiters won't type. Highest craft-per-pound on this list and authentically yours.

---

## E — The Evidence Room (the concept play)

**Look at:**

- [forensic-architecture.org](https://forensic-architecture.org) — London research agency reconstructing events from open-source evidence. The whole visual language of provenance: timestamps, source chains, spatial reconstruction, cold precision. This is the mood board.
- [bellingcat.com](https://bellingcat.com) — open-source investigation presented as verifiable record.
- [NYT Visual Investigations](https://www.nytimes.com/spotlight/visual-investigations) — the same aesthetic with a mass-market polish budget.

**Mechanic:** each project rendered as an _evidence bundle_ — content hash resolving character-by-character on load, RFC 3161-style timestamp, chain-of-custody trail, redaction bars that lift on hover, document-scan transitions. Real hashes over real content, actually verifiable — not cosmetic. Proof-Lens gets demoed implicitly on every page load.

**Verdict:** most differentiated option here, and the only one where the visuals are an _argument_ rather than a garnish. Risk: needs restraint or it becomes hacker cosplay. The line is forensic-not-cyberpunk, archival-not-Matrix.

---

## F — Craft Maximalism (no WebGL)

**Look at:**

- [rauno.me](https://rauno.me) — Staff Design Engineer at Vercel, ex-Arc. Site built as an operating system, dock, interface sounds. Every detail deliberate.
- [devouringdetails.com](https://devouringdetails.com) — Rauno's book on interaction detail. **Read this regardless of which direction wins.**
- [emilkowal.ski](https://emilkowal.ski) — Linear web team. See `/design` for his component previews.

**Mechanic:** View Transitions API, FLIP layout morphs, spring physics, obsessive focus/keyboard states, optimistic UI, correct `prefers-reduced-motion`.

**Verdict:** not a headline direction — it's the **floor**. Whatever wins sits on this or the whole thing feels student-grade.

---

## G — Living System (data-driven / generative)

**Look at:**

- [PartyKit Cursor Party](https://blog.partykit.io/posts/cursor-party/) — multiplayer cursors on any static site via one script tag. Other visitors appear as ghosts, with cursor chat.
- [Liveblocks multiplayer](https://liveblocks.io/multiplayer) — the productised version of presence.
- [Codrops](https://tympanus.net/codrops/) — the standing library for generative/shader technique.

**Mechanic:** visual field generated from real inputs — commit history, London time of day, gym sessions, live visitor cursors. Never identical twice.

**Verdict:** the presence variant is startlingly effective for how cheap it is. Works better as a homepage _feature_ than as the organising idea. Hold in reserve.

---

## Recommended blend

**E** as the concept · **F** as the floor · **D** as the accent · **C** for the projects section.
Skip **A**. Borrow **B**'s transition polish. Keep **G** in reserve.
