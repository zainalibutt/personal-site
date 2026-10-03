# Decision log

Chronological. Each entry records what was decided, what it replaced, and why —
so a later session does not reopen something already settled, and so the
reasoning survives when the code no longer shows it.

Newest last. Visual record of the same journey: [`docs/PROGRESS.md`](PROGRESS.md).

---

## 1 · Next.js + React over Astro, Vite or vanilla

**Decided:** 2026-08-16

Intercepting routes make a deep-linkable, crawlable, cold-visit-safe "expand in
place" nearly free. Rebuilding elsewhere would spend real effort re-solving
navigation, which is the site's highest-priority constraint.

The case _against_ — React's
reconciliation fighting frame-perfect motion — was answered by moving animation
out of React entirely rather than by changing framework.

**Still holds.** Nothing since has strained it.

---

## 2 · Navigation legibility outranks visual ambition

**Decided:** 2026-08-16 · **Zain's cardinal rule**

> "A beautiful WASD motion 2D or 3D can be nulled with poor nav. My work is
> overshadowed by how hard it is to find it, regardless of visual appeal."

Five design directions were rejected for this one reason. It is the tie-breaker
whenever a visual choice and a wayfinding choice conflict.

**Consequences that trace directly to it:** the exit races the morph against a
timer so navigation can never hang; every animation has a timer guard; the
close control and the browser back button were the same code path, until
history could hold more than one artefact — decision 26.

---

## 3 · `layoutId` shared-element morph — adopted, then scrapped

**Adopted:** 2026-08-16 · **Scrapped:** 2026-08-17

The first mechanic used `motion`'s `layoutId` to morph a card into a panel. It
demonstrably worked in a browser test.

The objection that settled it: a single
FLIP must never encompass a content-heavy case-study subtree. Zain then rejected
it on sight for a different and better reason — a morph is _two_ elements, and
it reads as a swap. His words: _"not a new artefact"_.

**Replaced by** one box whose bounds expand. `motion` was uninstalled; nothing
used it once the animation went imperative.

**Lesson recorded:** the browser test proving it "worked" measured the wrong
thing. It never had a video, a demo and a full case study inside it.

---

## 4 · `clip-path`, not `transform`, for the expansion

**Decided:** 2026-08-17

The artefact's corners travel outward by animating `clip-path: inset()` from its
resting rect to zero. A transform would scale the case-study text up from card
size — blurry in transit, which is the failure the whole mechanism avoids.
Clipping leaves every glyph at final size from the first frame; text is
_revealed_, not zoomed.

The hero is the only thing that scales, because it is an image and survives it.
Its aspect ratio is identical in both states, so the scale is always uniform.

---

## 5 · A camera, not a panel

**Decided:** 2026-08-17 · **Zain's correction**

The first in-place version still went `position: fixed`, so About sat behind it.

> "My about page isn't underneath it, it's still next to it relative to the
> standing state of the page."

`<main>` became `data-plane`: focusing an artefact grows it in _plane_
coordinates and simultaneously translates and scales the whole plane to frame
it. Everything else keeps its spatial relationship.

**Verified asymmetrically**, which is the real proof it is a camera: focusing a
left-flank artefact puts About on the right; focusing a right-flank one puts it
on the left.

**Corollary:** no backdrop, ever. Dimming the surroundings defeats the mechanic.

---

## 6 · An artefact may never grow across the centre spine

**Decided:** 2026-08-17 · after two failed attempts

Both earlier attempts failed identically: the artefact grew so wide in plane
space that it covered About regardless of where the camera was. **Making the
artefact bigger is always the wrong lever.**

Growth is now bounded by measurement, not a constant — `frame()` reads
`[data-spine]` and caps the half-width at the distance to it. The _camera_
supplies the magnification instead.

**Follows from this:** because the artefact stays small in plane space while the
camera magnifies heavily, its content is authored at on-screen size and
counter-scaled by `1/zoom`. Without that, body copy renders at 2.15×.

---

## 7 · Palette: warm → white → deep space

**Warm:** proposed 2026-08-16 · **White:** 2026-08-16 · **Space:** 2026-08-17

Warm cream with a serif and a terracotta accent was the first direction, and it
was rejected. It is the combination every portfolio template reaches for, which
is precisely why it had to go: the ground is the first thing a visitor reads,
and reading as a template undercuts everything built on top of it.

White with Word blue came next, from Zain's own brief, and held for a day.

Deep space blue replaced it with an unplanned payoff: both flagship screenshots
are dark-themed apps. On white they sat on the page as foreign rectangles; on
this ground they read as windows into the same space.

**The page does not follow `prefers-color-scheme` in either direction.** A
`data-theme="light"` palette exists, unused.

---

## 8 · The field is the signature — and it is Canvas 2D

**Decided:** 2026-08-17

A lattice, starfield and nebulae that the page's contents deform. It makes
Zain's own model of the site literal — _"one massive graph, X Y"_ — and earns
its place against the subject, since the work is about records and measurement.

Three masses deform it, and they are **one function at different strengths**
rather than three effects: every artefact permanently, the cursor as a small
travelling mass (Zain's idea), and the focused artefact.

**Canvas 2D, not WebGL.** Crisp blue line work on a dark ground is what canvas
does natively; `three` would be ~150kb for no gain. This was also the one place
the "spend your boldness in one place" rule pointed at — everything else on the
page stays quiet.

---

## 9 · The commit log is part of the record

**Decided:** 2026-08-17 · **Standing, all repos**

A public repository is read as evidence of how someone works, and the commit log
is part of that evidence — often the part a technical reader trusts most, because
it is the hardest to stage after the fact.

So commits are written to be read: one change per commit, a subject that says
what changed in plain words rather than which files moved, and a body that
records _why_ whenever the reason will not be obvious in six months. Several
entries in this log started life as commit messages.

---

## 10 · Verification must be visual, and asserted

**Decided:** 2026-08-17 · after a visible defect survived several "verified" rounds

A headless preview pane cannot composite frames: it returns no image and
freezes every animation at time 0. Under it, a close button rendering at 2.3×
on top of the tagline passed every measurement.

`npm run shoot` drives a real headless Chromium, waits on `getAnimations()`
settling rather than guessed delays, and now also **asserts interaction** —
whether the artefact is clickable, whether the page still scrolls under the
pointer. Both had regressed silently.

**Standing rule:** screenshot before claiming a visual change works.

---

## 11 · One motion language, in one file

**Decided:** 2026-08-17

Durations and easing curves were spread across `useBoxExpand`, the field, and a
handful of Tailwind utilities. Nothing was individually wrong, but the open, the
close and the hover had no reason to agree with each other — which is why they
did not feel like one system.

`src/lib/motion.ts` is now the source of truth, mirrored as custom properties in
`globals.css` for the CSS-driven parts. There is no build step tying the two
together, so the mirror is a comment and a discipline.

**Rule that came out of it:** closing is faster than opening. Arriving can take
its time; leaving should never feel laboured.

---

## 12 · No loader. An entrance sequence instead.

**Decided:** 2026-08-17

The brief permits a loader — _"the name Zain pulsing, thin progress bar, nothing
else"_ — but never asked for one. On a static site that renders this fast, a
loader would manufacture a wait in order to decorate it.

Instead the first load _is_ the signature: the lattice arrives flat and the
artefacts settle into it, so the page visibly assembles itself. An orchestrated
moment that uses the concept rather than covering it.

**If a real wait ever appears** — heavy media, a flagship miniature — revisit
this. The brief's loader spec still stands for that case.

---

## 13 · Type is not the identity lever here — colour is

**Decided:** 2026-08-17 · **Zain's verdict on a three-way comparison**

Three display faces were built and shot as real frames: IBM Plex Serif, Space
Grotesk, and Bodoni Moda. Zain's reaction settled it:

> "i genuinely cant tell the difference. font changes? i like the 3rd better,
> but the font changes is the only thing i see"

He was right, and the reason matters. The display face appears in **four
places** — the name, "About", and the two heading levels inside an open project.
Everything a visitor actually reads is body copy. Swapping the display face
therefore changes almost nothing, no matter how different the faces are.

**Adopted anyway, because it was free:** Bodoni Moda for display, which he
preferred, and which argues the same thing the lattice does — drawn with rule
and compass. Fraunces went with the cream palette that decision 7 retired.

**The real change in the same pass:** a monospace reserved for _data_ — years,
stack chips, metadata labels — and never for prose. That is visible on every
card, and it is what makes the page read as records rather than as a portfolio.

**Lesson:** before proposing a typographic change, count where the face actually
renders. On a page with one column of prose and a canvas, that number is small.

---

## 14 · The ground is graded, and the nebulae travel in hue

**Decided:** 2026-08-17

The page read flat because everything in it was the same hue. Four nebula clouds
that were four blues at 16% alpha are, at that alpha, one blue. The ground was a
single flat fill under them.

Two changes, both cheap:

- `body` carries a **graded** paint — `--bg-lift` overhead falling through
  `--bg-mid` to `--bg` at the edges, plus a low cyan wash on the right flank.
  CSS only; no second canvas pass.
- The clouds now differ in **hue** as well as lightness: indigo overhead, cyan on
  the right, warmer blue below. Alphas stay low and let hue do the work, because
  this sits _under_ the lattice and must not compete with it.

**`--bg` is now the deepest value, not the average one.** The edge fade and the
skip link both resolve to it, and the edge is where the gradient bottoms out —
setting it to the mid tone draws a visible seam around the viewport.

---

## 15 · A project with no interface gets a figure, not a stock photo

**Decided:** 2026-08-17

Age-group-detection ran from a notebook. There is no screen to photograph and no
branding to crop. Zain's instruction was to find something from the web or
generate it; a stock photograph of faces was the obvious fallback and the wrong
one twice over — it is someone else's image, of someone else's face, on a page
about classifying faces.

The project _is_ a comparison, so the card is the comparison.
`scripts/figure-age-groups.ts` renders the reported results in the site's own
palette and monospace, at 1280×800, and the numbers are read from the
repository rather than invented. It blends into the case-study page exactly,
because it is painted with the same ground.

**Rule:** any generated figure states its own axis. This one starts at 0.25 and
says so, because chance on four classes is 25% and a bar from zero would spend
three quarters of its length saying nothing.

---

## 16 · The thesis lives in the case studies, not on the entry screen

**Decided:** 2026-08-17 · **Zain's call**

Three About drafts were written: plain, thesis-led, and concrete. He took the
plain one for About and asked for the thesis to be mixed into the project pages
instead —

> "i like draft As approach a lot more for the main about page, i like the
> thesis bits mixed with concrete in the clickables"

which is the better structure. A thesis on the entry screen has to be taken on
trust; the same sentence inside a case study has its evidence sitting next to
it. Proof-Lens and Melody each now open by naming the question, and say so in
terms of each other.

**Also settled here:** age-group-detection opens by stating plainly that it is a
demonstration and not a product. Saying so is cheaper than having a reader work
it out and wonder what else is oversold.

---

## 17 · The phone gets a springboard, not a stack of panels

**Decided:** 2026-08-18 · **Zain's design**

The phone layout was the desktop field stacked: five screenshot panels, each
with a tagline and a chip row, and About dropped in among them. His verdict:

> "instead of these massive panels of screenshots of UI UX and loads of writing
> and an about all thrown in ur face, that NO one on a mobile would read /
> navigate nicely. how about 5 floating (idling) app icons with relevant names
> beneath it"

He is right, and it is the site's own model applied properly — on a phone an
artefact is a thing you zoom _into_, not a thing you scroll _past_. Four of the
five projects already had logos; the fifth never had a front end, so its mark
was drawn to join that set (`scripts/figure-age-icon.ts`).

**One DOM, not two layouts.** The icon face and the panel face are both in the
markup at every width and CSS chooses. Swapping components at a breakpoint would
mean either shipping both to everyone or doing it in JavaScript, which loses
server rendering — and it would give the crawler and the screen reader a
different site from the one the eye sees.

**Sized against `dvh`, not against a guess.** Header padding, row gaps and the
tiles themselves are `clamp(…, dvh, …)`, so the springboard fits the fold on a
390×844 phone _and_ a 360×640 one by shrinking rather than by scrolling. The
lower bound stays well clear of the 44px minimum tap target. It is deliberately
not `overflow: hidden` — a phone that overflows anyway should scroll the last
few pixels, not trap them.

**What this fixed on the way.** Growing the artefact symmetrically about its own
centre was only ever correct because a resting artefact was as wide as its
column. An 80px icon in one half of a two-column grid threw the opened panel off
the side of the screen. The open and close now compute the clip inset from the
artefact's real rect inside the box, so it unfolds from the icon that was
tapped.

---

## 18 · A fourth mass, and nothing drawn where it is

**Decided:** 2026-08-18 · **Zain's idea**

> "have a star/bug/ literally anything relevant floating around the website,
> behind the text/artefacts, similar to the mouse, distorting the spacetime
> field … movement random but not DVD player like"

**Nothing is drawn.** No star, no disc, no accretion ring. You see the lattice
bend and travel and there is no object there — which is how anything invisible
is found in the first place, and the only version of this that cannot end up
looking like clip-art. A drawn body would be decoration; an unexplained
distortion is the idea, on a site whose whole subject is what you can infer from
a record.

It cost almost nothing to add because decision 8 already framed the field as
_one function at different strengths_. This is a fourth entry in the same masses
array running the same `displace()` — an instance, not a concept.

**Movement is two octaves of value noise per axis, on different periods.** A
bouncing object reverses at a wall, which is a straight line and a hard corner;
noise has neither. Because value noise sits around its own mean the mass stays
loosely central without ever being turned around at an edge.

**What it cost, stated plainly.** The field used to paint _zero_ frames when
nothing moved, and that was half of Phase 1's exit condition. A mass that never
stops means a loop that never sleeps. Zain chose full 60fps over a throttled
idle, knowingly. It is therefore **desktop only** (≥1024px) and off entirely
under `prefers-reduced-motion` — a phone should not pay for it, and the
springboard already has the icons idling.

The wanderer is included in the loop's own idle comparison rather than
special-cased, so the loop stays awake for the honest reason that something is
genuinely still moving.

**Tuning:** `WANDER_PULL` and `WANDER_RADIUS`. The first pass was too subtle to
justify the frame cost — a still frame showed nothing. Stills undersell it
either way; motion is what the eye catches.

**Revised again 2026-08-18: the noise drives acceleration, not position.**
Zain: _"i try and throw it and it zips back to the original point like a elastic
band. and same if i drag and drop."_

That was a design flaw, not a tuning problem. Position was a function of the
clock — an absolute noise path — and a throw was allowed to leave it before
being drawn back. So wherever you put the mass, it always had somewhere else it
was supposed to be, and the return read as elastic however gently it was tuned.

Now the noise supplies **acceleration**. There is no path and nothing to return
to: the mass wanders from wherever it happens to be, so a throw or a drop simply
changes where that is. Measured — dropped in a corner it had moved 44px after
nine seconds; thrown, it was still 406px from the throw origin eight seconds
later. The About avoidance survives as a sideways _force_ that is zero at the
centre line and zero at the band edge, so there is no point at which it reverses.

**Revised the same day: it is drawn after all.** Zain wanted the accretion disk
he had originally asked for, and he was right that the invisible version was
paying a permanently-awake render loop for something almost nobody would notice.

What keeps it from being a blue circle is that the physics runs _against_ the
rest of the file. The lattice is spacetime and dents **inward**; starlight
passing a mass bends **around** it, so a star's apparent position moves radially
**outward**. Same mass, opposite sign, because one of them is the sheet and the
other is something crossing it. Stars inside the photon ring are not drawn at
all — light that close does not come back out.

The core is drawn _after_ the lattice, so the horizon swallows the grid instead
of being striped by it. That is both the clearer image and the more correct one:
a horizon is where the grid stops.

**It gives way to the reading.** Zain: _"make it soft avoid the about section,
since if it goes over it, the readability is tainted."_ Two mechanisms, both
continuous, because a wall would need a side to be chosen and that choice flips
as the path crosses the centre — which is a jump, which is the bounce we were
avoiding in the first place:

1. The x path is warped toward the flanks (`|u| ** 0.45`), so it crosses the
   middle quickly rather than loitering there.
2. Within a small clearance of the About column everything fades — pull,
   lensing, and every drawn alpha — on a smoothstep. Measured at 0.000 over the
   text across 45 samples of drift.

The clearance started at 170px a side and was wrong: it hid the mass for over
half its journey at 1440px and would have hidden it permanently on a 1024
laptop. What costs legibility is the drawn disc sitting on the words, so 45px
plus a 130px fade covers it.

**`WANDER_MIN_WIDTH` is 1200, not 1024.** Measured across 45 samples: clearly
visible three quarters of the time at 1440px, a fifth at 1024px, because the
flanks either side of a 384px centre column are too narrow for it to emerge
from behind the reading. A narrow laptop keeps the old zero-cost idle rather
than running a permanent loop for something it can barely see.

**A development-only readout** (`data-wander` on the canvas, dead-code
eliminated from production) reports position and fade. It exists because the
first attempt to verify this from pixels measured a bright star instead of the
photon ring — the two are the same colour to a threshold — and reported a
failure that was not real.

---

## 19 · Security headers, and a CSP that says what it cannot do

**Decided:** 2026-08-18

The site shipped with nothing but the HSTS header Vercel sets. On most
portfolios that is a shrug; on this one it is a tell, because the entire
argument of the page is records you can verify.

The policy can be genuinely strict because the site earned it — `next/font`
self-hosts both faces at build, Vercel Analytics serves and receives on this
origin, and there is no third-party script, iframe, tracker or font CDN. Every
directive is `'self'`.

**`script-src` allows `'unsafe-inline'` and the config says so plainly.** Next's
hydration bootstrap is an inline script that changes each build; the
alternatives are a per-request nonce (needs middleware, opts every page into
dynamic rendering, and this site is entirely static at 0.7s LCP) or per-build
hashes. It buys defence against an injection vector that does not exist here:
no forms, no query rendering, no user input, no database. A policy that looks
stricter than it is would be worse.

**Development gets a looser policy, deliberately.** The strict one broke hot
reload — Next's dev server evaluates modules, and `@vercel/analytics` pulls a
debug script from `va.vercel-scripts.com` in development while serving it
same-origin in production. Shipped as-is it filled the dev console with
violations, which is exactly how a real error gets missed.

**What the sweep found, and did not find.** No secret-shaped string in any of
277 blobs across all history. The phone number never entered git. `.env.local`
and `assets/raw/` were gitignored before they could. `npm audit` clean. One
thing worth knowing before the repo goes public: the superseded Proof-Lens hero
is still a blob in history, and it shows a test email address that the current
crop removed.

---

## 20 · The wanderer can be picked up and thrown

**Decided:** 2026-08-18 · **Zain's idea**

Grab it, drag it, let go, and it carries the velocity it had, coasts, and drifts
back onto its own path. Measured: released at 8.6px/frame, decaying 2.81 → 0.44
→ 0.01 → 0, with distance-from-path falling 662 → 529 → 242 → 88 → 42px.

**It needed real state.** Position was previously a pure function of the clock —
read straight off the noise, nothing stored. Being holdable means a position
something else can overwrite, and a velocity to keep when released.

**The return is speed-gated, not timed.** While the throw is still fast the path
exerts no pull at all, so a hard throw crosses the screen instead of being
yanked back mid-flight; as drag eats the speed the pull comes in. The edges are
a spring rather than a wall, for the same reason the drift is noise rather than
a bounce — a wall reverses velocity in one frame, which is the exact artefact
this was built to avoid.

**Two grab radii, and this is the important part.** The wanderer spends much of
its time behind an artefact, and every artefact is covered edge to edge by its
own link. Refusing to grab over a link made the toy work only in the gaps;
grabbing at the full 70px would start stealing clicks from the work, which is
the one thing on this site that must never get harder. So it is 70px over empty
ground and 34px over a link — close enough that you have to be on the disc
itself, which is 21px across. A grab that began on a link swallows the click
that pointerup would otherwise fire, via a capture-phase `once` listener that
cannot outlive the gesture.

**Mouse only.** On a touch screen a drag is how you scroll, and taking that for
a background ornament would be indefensible — though in practice the wanderer
does not run at those widths anyway.

**Held over About it dims but never vanishes** (floor of 0.55). Losing the thing
in your hand reads as a bug; dimming it does not.

---

## 21 · The page had no material

**Decided:** 2026-08-18 · **Zain's verdict**

> "it feels clean but idk theres just something missing, it still looks cheap u
> get me? it doesnt scream WOW his UI skills are great"

He was right, and the cause was not colour or layout. Nothing on the page had
any _material_: a card was a 1px border, a flat fill and a corner radius, which
is the literal default.

Three changes, none of them large:

- **Grain.** The single largest reason a dark page reads as cheap is that a CSS
  gradient is _perfectly_ smooth and nothing real is. A few percent of tiled
  noise gives the ground tooth and kills the banding a large gradient produces
  on 8-bit displays. One data URI, fixed to the viewport so it behaves like film
  on the lens rather than texture on the page.
- **An edge that catches light.** An inset top highlight and a shadow with two
  falloffs instead of one. That is the difference between a shape and an object.
- **Editorial furniture.** "Selected work" was `sr-only`, so a sighted visitor
  got a name and then some floating rectangles with nothing saying they were a
  considered set. It is now a labelled section with a rule, each artefact
  carries a printed index, and there is a footer — the page used to simply stop
  after the last card, which reads as unfinished however good the thing above it
  is.

**Lesson:** "clean" and "finished" are different properties, and restraint
without craft density reads as the latter missing.

---

## 22 · A crop shows a detail, not a window

**Decided:** 2026-08-18

Both flagships were whole application windows shrunk to 445px, which is the
loudest "portfolio template" tell there is — nothing in either was readable, so
the card conveyed _that there was a screenshot_ and nothing else.

Melody is now its chart panel alone, which happens to carry the source and the
fetch time, so the card demonstrates the exact claim its case study makes about
exposing freshness rather than hiding it. Proof-Lens is the headline beside its
three checks.

**The rule:** one legible detail at close to native scale beats a whole
interface reduced until it is texture. If a reader cannot read a word of it, the
screenshot is decoration.

The header changed for the same reason. A centred name with the role as a
sentence beneath is the shape every portfolio uses; the role is now a mono label
— it is _data about him_, which is what that face is for — and the name is half
again as large against it.

---

## 23 · Revenue OS is private, and was captured without touching production

**Decided:** 2026-08-18 · **Zain's idea, with a constraint he did not set**

The sixth artefact, and the first that cannot be linked to. Its absence was
conspicuous: everything else on the page is a personal project, and a paid
system running in production is the most credible thing on it.

**The screenshot was taken from a local instance, never production.** Revenue OS
has a live cron sender with an approved-group mechanism, so seeding or
photographing the production database risked polluting a real send group. The
dashboard was run locally under its own `DEV_BYPASS_AUTH` flag, whose env file
holds only public keys — no service-role key, no Gmail credentials — so that
instance is _physically incapable_ of sending anything or writing privileged
data.

**The crop was decided by measurement.** Every element carrying third-party or
personal data was located first; the leftmost sat at x=1267, so the frame stops
at 1120. That removes the reporting panel, the named prospects and the personal
address in one cut rather than relying on a redaction bar nobody checks.

**Nothing on the card is edited.** Rewriting the visible text to something
plausible was offered and declined: a fabricated record that looks like a real
one is precisely what this site argues against.

---

## 24 · Rules, not tables — and a harness that photographed a lie

**Decided:** 2026-08-18 · after both bit on the same day

Two failures with one shape: something written for the count of things that
existed at the time, which broke silently when the count changed.

**`DRIFT_REM` was a five-entry table indexed with `i % 5`.** The sixth artefact
wrapped to the table's first value — a _left_-flank offset applied to a
_right_-flank card — so one card sat at the top of its row while its neighbour
was pushed to the bottom of the row above, and the gap between them collapsed.
Zain spotted it before any test did. The offset is now derived from flank and
row, which cannot wrap.

**The full-page screenshot showed four of six artefacts missing** — and the page
was perfectly fine. A `fullPage` capture stitches from scroll position zero, so
anything driven by a _view_ timeline never enters its range and is photographed
at its `from` keyframe, which for the arrival animation is `opacity: 0`.

That is the worst failure this harness can have, on a project whose standing
rule is to screenshot before believing a visual change works: it manufactured a
catastrophic-looking regression out of correct code. Trusting it would have
meant "fixing" a bug that did not exist. The full-page shot now neutralises those
animations first; the viewport shots leave them alone, because there the arrival
is real and worth seeing.

**Both belong to the same family as the phone assertion that checked "flagships
above About"** — correct when written, wrong the moment a third flagship
existed. Assertions and layout rules should describe the invariant, not the
instance.

---

---

## 25 · The camera travels between artefacts, and a map says where it will go

**Decided:** 2026-08-19

Opening an artefact frames it and pushes everything else off the edge. Until
now the only way to reach a second project was to close back to the field and
start again — which raises the question this site has to answer honestly:
whether "depth, not distance" survives a visitor who wants to compare two
projects.

**Artefact-to-artefact navigation already existed, and was already broken.** A
keyboard user could tab from an open Proof-Lens to Melody's caption — off
screen, but focusable — and press Enter. Measured before anything was changed:
both artefacts carried `data-expanded="true"` at 250ms, and the departing
artefact's restore timer fired at 580ms and cancelled the arriving artefact's
660ms camera move. The result was an artefact expanded at full size with the
camera at identity, its case study rendering at half scale in the wrong place.

**The camera now has one owner and an explicit handover.** `src/lib/camera.ts`
holds the framing as a value rather than a transform string, because the travel
interpolates through a computed midpoint and parsing a matrix back out is how
drift starts. The arriving artefact owns the move and travels from whatever
framing it finds; the departing one collapses its own box and does not touch the
plane. That is symmetric, so it holds whichever hook React runs first.

**The crossing rises, crosses and descends** rather than panning flat. A
straight interpolation between two framings at 2x drags the viewer sideways
across 950px of plane; pulling back to 0.75 of the zoom shows both artefacts and
reads as one space. It never pulls back past 1 — below the resting field it
would look like leaving the page rather than moving across it.

**The artefact stays shut for the whole crossing**, and this is the part that
was got wrong first. Content inside an artefact is counter-scaled by `1/zoom` so
the camera lands it at 1x, which means that while the camera is at any other
zoom that content is at the wrong size. Opening during the crossing revealed the
case study at about 62% and grew it into place — the scaling transition the
whole `clip-path` mechanism exists to avoid. Held shut, every glyph is at final
size from the first frame it is visible.

A travel is therefore the site's two existing beats in sequence — `close` for
the crossing, `open` for the arrival — and introduces no third tempo.

**The instrument is a map, not a menu.** Six marks at the artefacts' real
positions, measured from the DOM with `offsetLeft`/`offsetTop` so it cannot
drift from the field and nothing encodes how many there are. The current one is
filled; names appear one at a time on hover or focus. Showing all six names at
once is a navigation drawer, which is the thing it exists instead of.

**Below `lg` it is a plain previous/next** at the foot of the case study. There
is no camera on a phone, the open panel covers the screen, and closing lands on
a springboard where every artefact is already one tap away inside the fold — so
a map of positions would describe something nobody can see.

**Non-focused artefacts are now `inert` while one is open.** They were
focusable, off screen, with the page scroll locked: twenty of twenty-three
reachable controls were off screen, including every other project's caption.
Adding a visible map on top of an invisible one would have been two ways to do
the same thing, one of them broken. The DOM stream is untouched and they return
to the tab order the moment the camera does.

---

---

## 26 · Close leaves; Back remembers

**Decided:** 2026-08-19 · **Zain's call**

Closing and going back were deliberately one code path, and that was right while
history could only be home → project: both meant home.

Travelling between artefacts makes history home → A → B, and `router.back()`
from B then **reopens A** from a control labelled "Close". Whatever that is, it
is not closing. The two concepts had been identical by accident of the old
history shape, not by design.

So they separate. **Close and Escape leave focused mode outright** and return to
the canonical home state, however many artefacts were visited on the way in.
**Browser Back stays historical** and walks back through the artefacts actually
visited. Each control now means what it says, and neither is a worse version of
the other.

`scroll: false` on the way out: the camera is already collapsing back to where
the artefact rests in the field, and jumping the page to the top would land it
somewhere else.

---

## 27 · The navigator is a constellation, not a widget

**Decided:** 2026-08-19 · **Zain's correction**

The first version of the map was functionally right and visually wrong — small,
boxed, with a `01/06` counter and an axis rule down one side. It read as
pagination, which is the one thing a spatial instrument must not read as.

**What changed, and what did not.** Every coordinate is still measured from the
artefacts' real field positions; none is authored. What went is the framing: no
panel, no border, no counter. The field is its surface now, and legibility comes
from the marks and the type carrying a little of the ground with them rather
than from anything being covered up. It is about two thirds larger.

**Canonical order is drawn, not numbered.** A hairline joins the marks in the
order the projects are ranked — the one thing the positions genuinely cannot
say, since the layout is spatial but the order is Zain's judgement of his own
work. Replacing the counter with the thread says more and looks like less.

**It takes the free flank, and the free flank is derived.** About sits in the
centre spine, so the camera always puts it on the far side of whatever is
framed: focus a left-flank artefact and About lands on the right, leaving the
left open. The map takes the open side, decided by comparing the focused
artefact's measured centre against the spine's — never by which project it is.

That is also why the earlier version needed a scrim behind it and this one does
not. It was pinned to one side, so for half the artefacts it sat on top of About
at 2x. The fix was placement, not paint.

**Crossing flanks, it leaves rather than flies.** Animating a navigation
instrument across the viewport would drag it over the artefact you just asked to
see, and this is the one thing on screen whose job is to hold still. It fades
out, the camera crosses, it fades in on the other side — moving only while
nobody can see it move. A travel that does not change flank does not disturb it
at all: measured at zero frames below full opacity.

**Only the artefact you are in is named**, in the accent, permanently. The rest
give up their names one at a time on hover or keyboard focus. Every name is in
the accessibility tree at all times regardless — a map whose links are called
nothing is not a navigation instrument.

---

## 28 · A card per project, photographed at rest

**Decided:** 2026-08-23

Every project link shared anywhere — a recruiter's inbox, a LinkedIn message, a
Slack — rendered with **no preview image at all**. Not the site card: nothing.
`generateMetadata` declared an `openGraph` block for the title and description,
and declaring one in a child route replaces the parent's wholesale, the
file-based image included. The site's one appearance outside a browser was blank.

**The obvious shot was the wrong one, and had to be taken to see it.** The
focused state is the signature — the artefact open, the field bent around it —
so the first version photographed that. But a focused artefact _is_ a case
study, and every card came back as four paragraphs of body copy at thumbnail
size with the project's own image reduced to a corner.

The resting artefact was already the answer. It is designed to represent one
project at a glance and it contains exactly what a link preview wants: the
image, the rank, the title, the tagline, the stack.

**Neighbours are hidden before the shutter, and that is the interesting part.**
A card is 1.9:1; an artefact is roughly square once its caption is counted. So
any crop containing one whole artefact also contains most of two others — and
About, sitting in the centre spine, came out larger and more legible than the
project the card was about. Two attempts to keep them failed: cropping tighter
severed the tagline off the bottom of all six, and fading the edges with the
site's own `.edge-fade` cleaned the margins while leaving About untouched in the
middle.

So they are hidden — **omission, not rewriting**, the same line decision 23 drew
photographing Revenue OS. Nothing is moved, resized or invented: the layout is
untouched, so the lattice still dents where the hidden artefacts sit and the
field keeps its real shape.

**The `opengraph-image` file convention was dropped entirely**, and the site
card moved to `public/og/site.jpg` beside the project cards. Two things pushed
it there. Next serves the app-directory file from a content-hashed URL nothing
in `src/` can name, so a project added but not yet photographed had nothing to
fall back to — and one `.mdx` file must remain the only step to add a project,
which the photograph cannot be part of because taking it needs the site running.
Then the sweep found the second: the convention **silently drops the
`opengraph-image.alt.txt` sitting beside it** once the route declares its own
`openGraph` block, which the root layout must, for the title and description.
The most-shared card on the site described itself to nobody, in dev and in
production alike.

Naming the image explicitly costs the content hash and buys one mechanism
instead of two. The site card and every project card are now declared the same
way, with the same dimensions and the same obligation to describe themselves.

**They are JPEG, measured rather than assumed.** These are photographs of a
starfield over a gradient, which is the two things PNG is worst at: the set came
to 6.3MB, for images whose only job is to be fetched by a scraper on somebody
else's timeout. At quality 92 with no chroma subsampling a card is 88kb — a
tenth — and a 1:1 comparison of the lattice, the stars and the gradient shows no
visible difference. WebP is smaller again and was rejected: X and LinkedIn are
both unreliable with it, and a card that sometimes fails to render is worth less
than one that is 30kb larger.

---

## 29 · Telemetry records leaving, not arriving

**Decided:** 2026-08-23

Web Analytics counted page views and nothing else, which on this site answers
the uninteresting half. Every route it owns is already a page view, including
which artefact was opened — the URL changes for each. What it could not see was
the moment a visitor **left**: the CV downloaded, the email started, the
repository read, the deployed app tried. On a site whose job is to end in one of
those four, that is the whole question.

An event for opening a project was considered and dropped: it would be a second,
worse copy of a number the dashboard already holds.

**One delegated listener, not handlers on the links.** The outbound links are
not in one place — four in the page header, one or two per case study rendered
from MDX. Instrumenting them individually needs either custom MDX components or
an edit to every content file whenever a project is added, and adding a project
stays one file. A listener on the document classifies whatever is actually there.

**The classification is pure and tested**, in `src/lib/telemetry.ts` rather than
in the component. It is the part with judgement in it and the part that fails
quietly: a rule that mistakes an in-site link for an outbound one does not
throw, it files a number under the wrong name for months. The test that earned
its place asserts that `javascript:` and `tel:` are not departures — `new URL`
parses both perfectly well and gives each an origin of `"null"`, which does not
match this site's, so the naive rule recorded every one of them as somebody
visiting a live app.

**It needs a Vercel Pro plan, and it is silent until it has one.** Custom events
are not collected on Hobby. `track()` is inert there and outside a Vercel
deployment, so nothing breaks — but nothing is recorded either. Pro also caps
custom data at **two properties per event**, and a third drops the event rather
than truncating it, which is why the classifier returns at most two and a test
holds it there.

No cookie, no identifier, no personal data: an event carries a destination that
is one of Zain's own links, and the route it was clicked from.

---

## 30 · The site says who he is in a form nothing has to infer

**Decided:** 2026-08-23

A `Person` and `WebSite` graph in the root layout, and a `SoftwareSourceCode`
node on each project page pointing back at the person by `@id`.

It matters for one scenario, which happens to be the likeliest one on a job
hunt: somebody is handed his name, searches it, and gets a result assembled by
something that never rendered the lattice. `sameAs` is the load-bearing part —
it is what ties this domain, the GitHub account and the LinkedIn profile
together as one person rather than three strangers sharing a name.

**Nothing is authored twice.** Every value is read from `site.ts` or from the
same MDX frontmatter the cards are built from, so a claim cannot drift out of
agreement with the page making it. `knowsAbout` is the union of every project's
stack, derived rather than listed: a hand-kept skills array is a second source
of truth that goes stale the first time a project is added.

**The stack goes in `keywords`, not `programmingLanguage`.** Half of it is not a
language — Supabase, RFC 3161, ResNet18 — and a structured claim that is nearly
right is worse than a looser one that is exactly right.

`application/ld+json` is not an executable script type, so the CSP never
evaluates it and this stays valid if the policy is ever tightened past the
`'unsafe-inline'` decision 19 explains.

---

## 31 · The entry screen stops withholding what the CV already publishes

**Decided:** 2026-09-09

`site.thesis` — "I'm incredibly adaptable, especially with today's tools" —
opened About in the brightest ink on the page. It is retired, and the key is
gone from `site.ts` rather than left unrendered.

Three reasons, and the first is the one that settles it. **It was the only
unfalsifiable sentence on a site whose entire argument is that a claim should be
checkable.** Second, it is the only intensifier in roughly 4,500 words of
otherwise intensifier-free copy, which is itself evidence it did not belong.
Third, in 2026 "especially with today's tools" reads to an engineer as "I use
AI" — the exact suspicion the retrospectives exist to answer, handed over for
free, one scroll above six repositories with nine to thirty commits each.

What replaces it is the through-line the work already has, in the words the
flagship already uses: _how do you know a record is true?_ Unlike a thesis, the
six artefacts either side of that column are its evidence.

**The same pass added the facts the site was withholding from itself.** The
degree and classification, the final-year mark, the right to work, the role
being sought, and the outcomes the freelance clients reported were all published
on the CV and the GitHub profile and appeared nowhere here — so the two surfaces
this one links to both out-argued it. They now live in `site.education`,
`site.rightToWork` and `site.seeking`, read once and rendered in About and in
`alumniOf` on the `Person` node, so the claim cannot drift between them.

**Do not reinstate a thesis on the entry screen.** Decision 16 settled that
argument the first time, for the reason that still holds: a thesis there has to
be taken on trust.

---

## 32 · One measured fact on the face of every card

**Decided:** 2026-09-09

An optional `evidence` string in frontmatter, rendered under the tagline at rest
and carried onto the phone tile.

The strongest thing on this site is the "What I'd change" writing, and none of
it was reachable in a first pass: no retrospective content appears above the
fold at any viewport, and the deepest any of them reaches is "The problem".
Reaching Replay's 13.2s→27ms cost about six interactions. The springboard was
worse — six names and six glyphs, proving nothing at all.

So exactly one line of that evidence travels up onto the card: `124/124
anchored`, `13.2s → 27ms`, `Row-locked writes`, `Rules in DB triggers`,
`7 tags → 5 metrics`, `+8 pts, 1000× cost`.

**Roughly twenty characters, and optional.** Twenty because it sits under an
84px icon in a two-column grid and a second line breaks the fold — measured, not
assumed. Optional because a project without an honest number should say nothing
rather than reach for one.

**Monospace, because it is data.** The type rule reserves that face for exactly
this, and the tagline is the claim while this is the receipt.

A test-count was considered for Melody and rejected: the repository's README
presents a figure that excludes its end-to-end tests, and one workspace ships a
test script that prints "No API tests yet". On this site a card that invites a
check it cannot survive is worse than no card.

---

## 33 · A cold visit names the project before it shows it

**Decided:** 2026-09-09

`/projects/<slug>` opened with the preview filling the viewport and the `<h1>`
below the fold. For Proof-Lens the preview's poster frame was the app's **sign-in
screen**, so the URL most likely to be pasted into an application rendered as a
login box belonging to nothing the reader could name — and the same frame was the
card on the home page at every width above 768px, and the OpenGraph image that
appears in LinkedIn and WhatsApp. One asset, wrong in three places.

The title and tagline now come first, the preview follows, and the poster is the
frame where the verification result is on screen. The alt text had described
that frame all along.

**The cold hero is also the LCP candidate**, so it loads eagerly and takes a
`sizes` string for the 64rem column it actually occupies. The default describes
a card on a flank, which had the browser fetching a 640w file for a box twice
that wide.

**Focus follows the camera, too.** Opening an artefact makes the caption that
opened it `aria-hidden` and untabbable; closing unmounts the Close button that
was just activated. Both ends dropped focus to `<body>`, so the next Tab
restarted from the skip link. axe cannot see this — nothing is mislabelled — and
it is only visible by pressing Tab after Escape.

---

## 34 · The wanderer leans the text, but only when nobody is reading it

**Decided:** 2026-09-09 · **Zain's idea**

The lattice has always bent under the wanderer. The page's own text now bends
with it — captions, and the About column — under a contract that is the whole
reason it is allowed to exist at all.

**It runs only after 25 seconds with no input**, ramps in over three, and dies
in 300ms on the first pointer move, scroll, key or touch. A reader is idle by
any definition a machine can check, so the interval is long and the onset is
slow: somebody still reading gets a drift they will not notice before their next
twitch of the mouse cancels it. Elapsed time was the alternative and it is
worse — a sixty-second timer moves the page under whoever is reading slowly,
which is exactly the wrong person to punish.

**Never while an artefact is focused, and never on a project route.** Reading a
case study is precisely when this must not happen.

**About participates, and that was the point.** ARCHITECTURE §7 already
separates the mass from its rendering, so the mesh keeps bending where the disc
is hidden; this is the same rule applied to a second thing. It needed one
change to be possible: `SPINE_PUSH`, the force that keeps the wanderer off the
reading column, is eased off by `tidalProgress()` — the avoidance exists to
protect words that are being read, and an idle page is the one state where they
are not. It returns as the effect collapses.

**Direction is inward, with the lattice, not outward with the starlight.**
Light bends outward because it passes by a mass; glyphs sit _on_ the sheet, so
they go the way the sheet goes. That is a new rule rather than a contradiction,
and it is the difference between a tug and a lens.

**Granularity is the effect.** Transforming a ten-line paragraph as one box
reads as the paragraph sliding. Twenty-nine separate blocks — every About
paragraph, the heading, the portrait, each part of every caption — lean by
their own distance, and the column shears. A uniform slide is not worth looking
at; the differential is.

**Resting positions are measured once, at onset.** Re-measuring a transformed
element is the project's oldest hazard and here it would compound every frame.
Nothing scrolls or reflows during an idle, because a scroll ends the idle, so
one measurement holds for the run.

**Two implementation notes that cost real time.** `canvas.dataset.wander` is
development-only, so it cannot be the channel a shipped feature reads —
`publishWanderer()` exists for that. And the transform must never land on the
About wrapper: it is `position: sticky`, and a transform on it creates a
containing block that kills the stickiness, which would present as a camera bug
rather than a text bug.

Per-word displacement was considered and deliberately deferred. It is a
granularity change on the same plumbing, and the whole-block lean should be
lived with first.

---

## 35 · River enters second, and says what it is not yet

**Decided:** 2026-10-03 · **Zain's call on the order**

The seventh artefact, and a flagship behind Proof-Lens and ahead of Melody. It is
the largest and most current work on the page, and it is live at playriver.uk,
but it is an early v1 and Proof-Lens is complete. **River moves to first when it
is finished**, meaning when the 3D venues reach the live table.

**The card shows a development render, and says so.** The poster is the Rooftop
in River's visual-review harness, eight black-tie characters at dusk, and the
live game does not yet look like that: what plays today is the 2D table. So the
alt text names it a development render, the opening paragraph of the case study
says the same thing, and the hover video is the real 2D table, cut from a
recording of an actual hand. An image that passes for the live product is the
thing this site argues against; one that is labelled as the work in progress is
just the work in progress.

**The poster keeps its harness label.** The "Visual Review" caption and the dev
badges stay in the frame rather than being painted out, for the same reason the
Revenue OS card was cropped and not edited.

**The icon is a golden spade, supplied by Zain.** The first version was River's
own R, rendered in Chromium from the card back's CSS; it was replaced the same
day with an app-style spade he generated, which reads as poker at 61px where a
letterform needs explaining. The source arrived as a rounded tile inside a dark
margin, so it is cropped to an 880px square just inside the tile's rim: the
springboard rounds every icon at 22%, which is a larger radius than the tile's
own, so the original corners and rim are masked away rather than drawn twice.
The R survives as `river-monogram.png` beside it in the gitignored logos folder.

**The repository is private and the page says so.** The card carries a live
link and no source link. The work index is a snapshot of public repositories,
so River does not appear there. The snapshot had been taken while River was
still public, so until it was refreshed every project page listed a GitHub link
that now returns a 404.

**A seventh artefact costs the phone a row.** Two columns of seven is four rows,
and the fourth landed 12px past the fold on a 390x844 phone. The tile went from
7.8dvh to 7.2dvh, 66px to 61px, which clears it. A 375x667 phone now scrolls
about one row, and no tile size that is still comfortable to hit wins back a
whole row, so that is left as a layout question rather than hidden by a smaller
number.

**No em dashes in anything River adds.** The rest of the site keeps them until a
separate pass removes them everywhere at once.

---

## 36 · No em dashes on the page

**Decided:** 2026-10-03 · **Zain's call**

Every em dash a visitor can see is gone: case-study prose, image alt text, the
About section in both its phone and desktop forms, the 404 page, and the tab
title and link-card alt, which used it as a separator. Forty-one sentences in
the case studies were each repunctuated rather than find-and-replaced. The dash
became a colon where it introduced a list or an example, a comma where it
trailed a clause, a full stop where it began a new thought, and brackets where
it enclosed an aside. The wording did not change.

**Titles use a pipe.** `Zain Butt | Full-stack product engineer` and
`River | Zain Butt`, matching the separator on the CV's contact line. Link-card
alt text uses a colon between a project's name and its tagline.

**Four alt texts gained quotes.** They lived unquoted in frontmatter, and a
colon in an unquoted YAML value is the hazard that empties the whole site.

**Comments and docs keep theirs.** Nothing a visitor reads is written there, and
rewriting several hundred comments would bury the change in noise. The CV
lost its one em dash too, on the education line, through the same Word and
redaction pipeline as decision 35. One exception sits outside this repository:
the personal-site repository's GitHub description, which the work index renders
from a snapshot and would reintroduce on the next `npm run repos`.

---

## Recurring hazards

Not decisions, but they have each bitten more than once and are cheap to
forget.

| Hazard                                                                          | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A frozen document timeline strands `fill` animations on frame 0                 | Every animation gets a timer guard as well as its `finished` promise. Four separate animations so far.                                                                                                                                                                                                                                                                                                                                                                      |
| Measuring through a live transform drifts further out each cycle                | Capture the resting rect once; never re-measure through the camera.                                                                                                                                                                                                                                                                                                                                                                                                         |
| An intercepted route rendering `null` unmounts the whole field                  | Render an inert marker instead.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `overflow: hidden` creates a scroll container that swallows wheel events        | Use `overflow: clip` when only clipping is wanted.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Displacement exceeding a vertex's distance to a mass folds the sheet            | Cap travel below half the distance.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| An unquoted `: ` inside MDX frontmatter empties the whole site                  | YAML reads it as a new key, zod rejects the project, and _every_ card disappears — the page renders with no `article` at all. `npm run check` catches it; a screenshot alone looks like a layout bug. Quote the value or reword.                                                                                                                                                                                                                                            |
| Two flank columns stack in flank order, not source order                        | On a phone the DOM was left-flank / spine / right-flank, which buried a flagship below About. The flanks are `display: contents` below `lg` so `order` can re-sequence them; `npm run shoot --w 390` asserts it.                                                                                                                                                                                                                                                            |
| A module-level `let` read twice in a compiled hook is **one** read              | The React Compiler is enabled. `const from = active; ...; active = next;` left `from` holding `next` — a `const` observably changing value between two statements. The camera thought every open was a travel starting from its own destination. Put mutable module state behind imported accessors, and order every read before any write.                                                                                                                                 |
| `prefers-reduced-motion` makes every element transition for 0.01ms              | The global override sets `transition-duration: 0.01ms !important` on `*` — non-zero. Clearing a transform therefore starts a real transition, and a transition reports its start value for the rest of the tick, so anything measured next is measured through the transform that was supposedly just removed. Suppress the transition and flush the change before restoring it.                                                                                            |
| Unlayered CSS outranks every Tailwind utility                                   | Tailwind v4 puts its utilities in `@layer utilities`, and an unlayered rule beats every layer regardless of specificity. A `display: flex` appended to `globals.css` silently defeated the `lg:hidden` sitting next to it in the markup, and the phone-only nav rendered on desktop as well. Put component CSS in `@layer components`.                                                                                                                                      |
| Replacing a file in `public/` keeps serving the old bytes                       | Next 16 dev caches optimised images in `.next/dev/cache/images`, keyed by URL and width only — and per format, so `curl` returns the new PNG while the browser gets a stale WebP. Clear it after any asset swap.                                                                                                                                                                                                                                                            |
| Declaring `openGraph` defeats the `opengraph-image` file conventions            | A child route's `openGraph` discards the file-based image it would otherwise inherit, so the route ships with **no** card rather than a generic one; and any route declaring the block loses the `opengraph-image.alt.txt` beside its own image, so the card ships with no alt text. Both fail in the worst place — the page is perfect and only the link preview is wrong. Name the image, and its alt, in every route that declares the block.                            |
| A plain class declared inside an earlier media block loses to its own base rule | Source order decides between equal specificities, and a `@media (max-width: 767px)` block sitting **above** the base rule does not win just because it is a media query. `.caption-evidence` was overridden this way: the phone kept the desktop 11px, the line wrapped to two, and the springboard went 43px past the fold while the CSS looked correct. `globals.css` already documents this for `.section-label` — the override must come _after_ the rule it overrides. |
| `new URL` parses `javascript:` and `tel:`, with origin `"null"`                 | An origin comparison alone does not identify an outbound link: every non-web scheme fails to match this site's origin and is classified as leaving it. Check the protocol is `http:` or `https:` first.                                                                                                                                                                                                                                                                     |
