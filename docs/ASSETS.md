# Asset shot list

What to capture, in priority order. Drop everything raw and unedited into
`assets/raw/` — processing, cropping and compression happen in the build.

---

## Tier 1 — bare minimum

The site cannot ship without these.

### Portrait

- **1 photo of Zain**, chest-up, looking at camera.
- Natural light, near a window, mid-morning or late afternoon. Never overhead
  ceiling light and never flash.
- Plain-ish background — a wall, not a busy room.
- Warm tones in shot if possible (wood, brick, cream wall) to match §5 of the brief.

### Project stills

- **Proof-Lens** — 3 screenshots
- **Melody** — 3 screenshots
- **Replay, IOU, age-group-detection** — 1 hero screenshot each

Requirements: real data, never placeholder. Browser chrome cropped out. 2× /
retina resolution. PNG.

---

## Tier 2 — the big upgrade

This is the single highest-value tier. Card previews that _move_ are the
difference between a portfolio and a demonstration.

### Project videos — 10–20s each, no audio needed

Show the **core action**, not a tour.

| Project             | What to record                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Proof-Lens**      | The full capture → sign → verify loop. Ideally ending on a verification succeeding.       |
| **Melody**          | A command being typed and results streaming in. The command-first nature must be visible. |
| Replay              | Scrubbing a timeline; photos resolving into a trip or day.                                |
| IOU                 | Adding an expense and the split recalculating live.                                       |
| age-group-detection | An image going in, class probabilities coming out.                                        |

Requirements: 1920×1080 or higher, 30–60fps, MP4 (h.264). Move the cursor
deliberately and slowly — jittery cursor movement ruins a loop. Do a couple of
takes; the last one is always the calmest.

### Portrait set

- Straight-on, 3/4 turn, and one candid working shot.
- One environmental frame — desk, gym, or somewhere in London that means
  something to you.

---

## Tier 3 — texture

Optional, but these are what make an About section feel like a person rather
than a CV.

- 2–3 personal/gym photos. Environmental and candid beat posed selfies.
- Notebooks, whiteboard sketches, early wireframes — physical process artefacts.
- A signature or short handwritten note, scanned or photographed flat.
- Anything with your hands in it. Hands read as real.

---

## Technical specs

| Type        | Format                               | Spec                                                                                      |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Photos      | JPEG or HEIC, straight off the phone | ≥3000px long edge. **Do not crop or filter** — full frame gives room to art-direct later. |
| Screenshots | PNG                                  | 2× / retina, no browser chrome, real content                                              |
| Video       | MP4 (h.264)                          | ≥1920×1080, 30–60fps, 10–20s, audio optional                                              |
| Documents   | PDF                                  | CV(s), whichever version should be public                                                 |

---

## Delivery

```
assets/raw/
  portrait/
  projects/
    proof-lens/
    melody/
    replay/
    iou/
    age-group-detection/
  personal/
  documents/
```

Nothing here is committed — `assets/raw/` is gitignored. Optimised derivatives
land in `public/` at build time.
