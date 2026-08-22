# Architecture — the motion layer

How focusing an artefact actually works, and the rules that took more than one
attempt to get right. Written down because the code no longer shows the reasoning.

---

## 1. The mechanic

### It is a camera, not a panel

The first replacement still opened the artefact **over** the page — it went
`position: fixed`, so About sat behind it. Zain's correction: _"my about page
isn't underneath it, it's still next to it relative to the standing state of the
page."_

So `<main>` carries `data-plane` and is the surface the camera moves. Focusing
an artefact does two things at once:

1. The artefact grows **in plane coordinates**, around its own centre, absolutely
   positioned inside a slot that keeps its footprint. Nothing reflows.
2. The plane translates and scales (`ZOOM`, currently 1.35) so that artefact
   fills `FRAME_W` of the viewport.

Everything else moves and grows with the plane and keeps its exact spatial
relationship. Measured: focusing Proof-Lens (left flank) puts About to its
right; focusing Melody (right flank) puts About to its left. Correct in both.

### The rule that kept getting broken

**An artefact must never grow across the centre spine.** Both earlier attempts
failed the same way: the artefact grew so wide in plane space that it covered
About regardless of where the camera was. Making the artefact bigger is _always_
the wrong lever.

So growth is bounded by measurement, not by a constant. `frame()` reads
`[data-spine]` and caps the artefact's half-width at the distance to the spine
minus a gap. The **camera** then supplies the magnification — currently landing
around 2.15x — rather than the artefact supplying it.

Measured at 1280px: the artefact occupies 70% of the viewport with **zero**
overlap against About, which sits 76px clear to the right of Proof-Lens and to
the left of Melody.

### Counter-scaling the content

Because the artefact stays small in plane space while the camera magnifies
heavily, its content is authored at the size it will occupy **on screen** and
then scaled by `1/zoom` to fit the small plane footprint. The camera scales it
back up, so body copy lands at 1x however hard the camera pushes. Without this,
text would render at 2.15x.

`.expand-scroll` carries that counter-scale, set imperatively alongside the
geometry. It must be cleared on collapse with everything else.

### One artefact, one label

The resting label is hidden while focused. The expanded artefact carries its own
title, so leaving the label visible renders the project twice — which is exactly
what it looked like.

**There is deliberately no backdrop.** Dimming the surroundings would defeat the
entire mechanic.

### The growth itself

One box, expanding in place. `src/components/useBoxExpand.ts`.

1. Focusing promotes the artefact to `position: fixed` at a near-fullscreen
   geometry (viewport minus a gutter).
2. A `clip-path: inset()` window opens from exactly its resting rect to zero, so
   all four corners diverge outward from wherever the artefact sits in the field.
3. The case study is already inside, rendered at final size, revealed as the
   window opens.

**`clip-path`, not `transform`, is the load-bearing choice.** A transform would
scale the case-study text up from card size — blurry in transit, and the exact
failure this mechanism exists to avoid. Clipping leaves every glyph at final size
from the first frame.

The hero is the one thing that scales, because it is an image and survives it.
The expanded layout gives the hero a grid column but **never its own aspect
ratio** — that comes from frontmatter and is identical in both states, which is
what keeps the scale uniform and stops the screenshot stretching. Do not give
the expanded hero an aspect ratio.

### Consequences

- Focus is derived from `usePathname()`, not local state, so the browser back
  button and the close control were the same code path — see §8 for why they
  are no longer, now that history can hold more than one artefact.
- Case studies are server-rendered in `page.tsx` and passed into the client
  cards, so expansion needs no fetch. They are `inert` at rest — five case
  studies must not sit in the accessibility tree of the home page.
- The slot holds the artefact's footprint via its own `aspect-ratio`, so
  promoting the box out of flow reflows nothing.
- **The intercepted route must not render `null`.** An empty slot makes the
  router drop the intercepted branch and unmount the entire field. It renders an
  inert hidden marker instead. Its only job is keeping home mounted.
- The motion layer shrank to a lifecycle channel and a capability check. The
  view registry and swappable renderer existed to pass rects between two
  component trees; with one box there is nothing to coordinate.

### The recurring hazard

Every animation here is guarded by a timer as well as its `finished` promise.
A frozen document timeline — backgrounded tab, hidden preview pane — leaves a
`fill` animation stranded on frame 0, which would strand the artefact
half-open with the page scroll locked. Cancelling drops the fill and leaves the
natural end state, so the guard both completes the transition and repairs it.
This has now bitten three separate animations. Assume it will bite the next one.

---

---

## 2. The field as built

Section 1 describes the camera. This section describes the surface it moves
over.

### One DOM stream, three layouts

There is exactly one order in the markup — flagships, then About, then the rest
— and nothing reorders it. Not CSS `order`, not two flank containers, not a
positive `tabindex`. What a phone shows, a keyboard tabs through and a screen
reader announces are the same sequence.

Two earlier versions each got half of this and are worth remembering:

1. **Two flank containers** put the DOM in left / spine / right order, so a
   phone met a flagship below About and two lesser projects.
2. **Fixing that with CSS `order`** moved what the eye saw and left focus order
   exactly where it was — worse, because the page then disagreed with itself.

So the desktop flanks are built by **placement, not grouping**: each card is
assigned a grid column and a row, and the spine spans every row of the middle
column. The two flanks share rows, which means the stagger has to come from a
margin — a card spanning two rows sizes the _first_ of them to its full height,
which once drove a flagship 1044px down the page.

That margin is **derived, never looked up**. See decision 24 for the table that
wrapped.

### The phone is a springboard

Below 768px the artefacts become app icons: the same cards, same DOM, with CSS
choosing the face. The icon lives _inside_ the box that expands, so opening one
still grows that object rather than swapping it for a panel.

Everything is clamped against `dvh` — header padding, row gaps, the tiles
themselves — so the springboard fits the fold by shrinking rather than
scrolling, while staying clear of the 44px minimum tap target. It is
deliberately not `overflow: hidden`: a phone that overflows anyway should scroll
the last few pixels rather than trap them.

### The wanderer

A fourth mass, running the same `displace()` as the other three. Two properties
matter and both were arrived at the hard way:

- **The noise drives acceleration, not position.** An absolute noise path meant
  the mass always had somewhere else it was supposed to be, so throwing or
  dropping it anywhere snapped it back like an elastic band. Accelerating means
  it wanders from wherever it happens to be.
- **The mass and its rendering are separate.** The About avoidance fades only
  what is _drawn_; the pull on the lattice and the lensing of the starfield run
  at full strength always. Fading the pull too made the lattice go flat wherever
  the disc was hidden, which reads as the thing ceasing to exist rather than
  passing behind something.

It can be picked up and thrown. Grab radius is 70px over empty ground and 34px
over a link, because every artefact is covered edge to edge by its own link and
stealing clicks from the work is the one thing that must never happen. A grab
begun on a link swallows the click that `pointerup` would otherwise fire.

**Cost, measured:** it is the only thing on the page that keeps a
`requestAnimationFrame` open permanently, so it runs on desktop only (≥1200px)
and never under `prefers-reduced-motion`. Lighthouse performance moved 99 → 97
and total blocking time 0 → 40ms when it landed. A phone still idles at exactly
zero repaints.

### Stacking contexts

Any element with a running animation gets its own stacking context, so the open
artefact's `z-index: 50` only ranks it _inside its own cell_. The cell carrying
a focused artefact has to be raised too, and its animation cancelled — otherwise
later cards paint over the case study. This bit twice: once from the phone's
idle bob, once from the scroll-driven arrival.

---

## 3. Travelling between artefacts

The camera can move straight from one focused artefact to another without
resting at home in between. See decision 25 for why, and for what was broken
before it existed.

### One owner, one explicit handover

A travel is a single route change, so both hooks re-run in the same commit — the
artefact being left and the one being arrived at — and React orders them by DOM
position. Nothing may depend on that order.

So the handover is symmetric and holds either way round:

- The **arriving** artefact owns the camera. It reads whatever framing the plane
  is holding, and travels from there.
- The **departing** artefact collapses its own box and does not touch the plane
  at all — including in its `restore`, whose timer previously landed 580ms into
  the arriving artefact's 660ms camera move and cancelled it.

The framing lives in `src/lib/camera.ts` as a value (`{ tx, ty, zoom }`), not a
transform string. The travel interpolates through a computed midpoint, and
parsing a matrix back out to find that midpoint is how drift starts.

### The shape of the crossing

Three keyframes: the framing being left, a pulled-back midpoint, the framing
being arrived at. The pull-back is 0.75 of the smaller zoom, floored at 1.

- **Why pull back at all.** A straight interpolation between two framings at 2x
  is a lateral drag across up to 950px of plane. Rising shows both artefacts,
  which is the honest picture — they are two real objects in one space.
- **Why not further.** Nothing is open during the crossing, so too deep a
  pull-back is indistinguishable from the resting field, and a travel would look
  exactly like closing and reopening. Below 1 it would show the plane smaller
  than it ever rests, which reads as leaving the page.

### The artefact stays shut for the whole crossing

**This is load-bearing, not styling.** Content inside an artefact is authored at
screen size and counter-scaled by `1/zoom` so the camera lands it at 1x — which
means that while the camera is at any _other_ zoom, that content is at the wrong
size. The first version opened the clip during the crossing and revealed the
case study at about 62%, growing it into place: precisely the scaling transition
`clip-path` was chosen over `transform` to avoid.

Held shut until the camera lands, every glyph is at final size from the first
frame it is visible, exactly as on an ordinary open. The staggered reveal inside
the artefact is CSS keyed off `data-expanded`, which flips at the _start_ of the
crossing, so `--reveal-lead` is pushed out by the same delay — otherwise the
sequence plays out behind a shut clip and is over before anyone sees it.

A travel is therefore `close` for the crossing and `open` for the arrival: the
site's two existing durations in sequence, no third tempo.

### Measurement, again

`frame()` reads rects to find the spine clearance, and a distance measured
through a 2x camera comes back twice as generous — which would let an artefact
grow across the spine. `layoutExpanded` therefore clears the plane transform
before measuring anything, and the close no longer measures at all: the clip
inset and the hero's transform are **captured at open time**, with the plane at
identity, and replayed in reverse. On a travel there is no way to undo the live
transform by hand, because the arriving artefact's animation is already driving
the plane.

Two hazards worth carrying forward, both now in the decision log's table:

- **The React Compiler is enabled**, and a module-level `let` read twice inside a
  compiled hook body may be one cached read. The camera's held framing lives
  behind imported accessors, and every read is ordered before any write.
- **`prefers-reduced-motion` gives every element a 0.01ms transition**, which is
  non-zero, so clearing the transform starts a transition that reports its start
  value for the rest of the tick. `clearPlaneTransform` suppresses the transition
  and flushes the change before restoring it.

### The instrument

`ProjectMap` renders the field in miniature, fixed to the viewport and therefore
**outside the plane** — a fixed element inside a transformed ancestor resolves
against that ancestor, and an orientation instrument that moves with the camera
is not one. It sits before `<main>` in the DOM so tabbing while an artefact is
open goes instrument first, then the artefact.

Positions are measured with `offsetLeft`/`offsetTop`, which are layout values
and immune to the camera transform. Names come from the content. Nothing encodes
how many artefacts there are.

Below `lg` it renders nothing and the artefacts carry a plain previous/next
instead. Exactly one of the two is ever in the document.
