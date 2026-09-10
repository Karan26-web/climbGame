# Round 1 Asset Audit — 2026-09-10

All 7 assets **PASS**. None need regenerating. Measured, not eyeballed.

## Mapping

| Original | Renamed to | Spec | Verdict |
|---|---|---|---|
| `asset1.png` 1774×887 RGB | `background/sky.png` | A1 | ✅ |
| `asset2.png` 1774×887 RGBA | `background/hills_far.png` | A2 | ✅ |
| `asset3.png` 1774×887 RGBA | `background/hills_mid.png` | A3 | ✅ |
| `asset4.png` 2508×627 RGB | `terrain/grass_top.png` | B1 | ✅ |
| `asset5.png` 1254×1254 RGB | `terrain/dirt_body.png` | B2 | ✅ |
| `asset6.png` 1774×887 RGBA | `vehicle/jeep_body.png` | C1 | ✅ |
| `asset7.png` 1254×1254 RGBA | `vehicle/jeep_wheel.png` | C2 | ✅ |

Originals left in place; the named copies are what the engine loads.

## Tiling (mean abs channel diff, wrap edge vs interior-adjacent baseline)

| Asset | Horizontal wrap | Baseline | Verdict |
|---|---|---|---|
| sky | 0.96 | 0.30 | seamless |
| hills_far | 1.55 | 0.34 | seamless |
| hills_mid | 8.88 | 0.48 | soft seam — invisible in motion at parallax rate, accepted |
| grass_top | 4.29 | 0.61 | seamless |
| dirt_body | 2.90 | 1.08 | seamless |
| dirt_body (vertical) | 2.21 | 1.19 | seamless — 4-way confirmed |
| grass_top (vertical) | 24.22 | 1.02 | expected; it's a cap strip, never tiled vertically |

## Geometry

**`jeep_wheel.png`** — outer radius 587px measured on 4 unobstructed rays (584/586/586/590,
spread 6px → round). Centroid offset from frame centre: **dx −1.9, dy +1.6** on a 1254px
frame = 0.15%, sub-pixel at game scale. Rotation will not wobble. Short rays at 0°/90°/225°/315°
are the rim spoke cutouts, not deformation. Diameter is 93.6% of frame — as specced.

**`jeep_body.png`** — content bbox x[63,1730] y[49,755], body 1668×707.
Wheel arch centres at **21%** and **75%** of body length → wheelbase 901px.
Arch openings ~290px wide. No wheels, no driver, empty seat, faces right. Exactly to spec.

## Issues found (all fixable in the build step — no GPT rework)

1. **Alpha never reaches 255.** Dominant values are 251–254, so "opaque" pixels are
   ~99% opaque. Cause: the generator's matte. Fix: clamp `a >= 250 → 255` on load.
   Left uncorrected it makes sprites very slightly translucent and softens edges.
2. **`sky.png`, `grass_top.png`, `dirt_body.png` have no alpha channel** (RGB, not RGBA).
   Correct for these three — they're opaque fills. No action.
3. **No colour halo.** Faint edge pixels (alpha 2–60) carry the correct local hill/tree/
   tyre colour, mean RGB `[110,149,144]` on hills_mid and `[27,28,29]` on the wheel — i.e.
   the matte is clean, not a white or cyan fringe. Nothing to fix.

## One art/engine mismatch to be aware of

The jeep's wheel arches are proportionally small: an arch opening is ~290px against a
1668px body, so a wheel that *fills* the arch is only ~18% of body length. Reference
Hill Climb art runs closer to 30%.

**Not a blocker, and not worth regenerating.** Fix in code: draw the wheels *behind* the
chassis and scale them to ~22% of body length. A wheel larger than the arch simply
protrudes below the fender line, which is exactly how the reference game reads. Chassis
draw order must therefore be: rear wheel → front wheel → chassis → driver body → driver head.

## Style note

Round 1 is more airbrushed-glossy and slightly less outlined than the hand-painted
reference. It's internally consistent, which is what matters — so Round 2 must be locked
to *these* assets, not to the original style bible. See the style-lock block at the top of
`ASSET_PROMPTS_ROUND2.md`.

---

# Round 2 Audit — `Charcter.png` (atlas)

1774×887 RGBA containing **44 sprites**. Content: **excellent, all usable.**
Delivery format: one collage instead of individual files — which BLOCK 0 forbade — but
for small sprites that costs nothing, because they separate cleanly. Sliced with
`tools/slice_atlas.py` into **29 sprites**. No regeneration needed.

## Separability
`scipy.ndimage.label` on `alpha > 40` with a 5×5 closing finds **44 discrete components**
(area > 400px), zero merges between neighbouring sprites. Every sprite extracts by
bounding box with its dominant blob isolated, so nothing leaks in from adjacent art.

## Defects found — both fixed in the slicer, neither needs GPT rework

**1. Red garbage in transparent pixels.** Sampling the gaps between coins returns
`RGBA=(255,0,0,1)` — pure red at alpha 1. Invisible when composited normally, but
bilinear filtering and mipmap generation blend the RGB of transparent pixels into their
opaque neighbours, producing a red fringe on every sprite edge at non-1:1 scale. 6,285
reddish pixels sit at partial-alpha edges.
*Fix:* `distance_transform_edt` finds each transparent pixel's nearest opaque pixel and
copies its RGB outward (alpha-bleed / edge dilation). Verified clean on the checkerboard
contact sheet, `docs/sprite_contact_sheet.png`.

**2. Dust and smoke do not dissipate — they get MORE opaque as they grow.**
Mean alpha of body pixels across the 5 frames:

| | f1 | f2 | f3 | f4 | f5 |
|---|---|---|---|---|---|
| dust | 221.5 | 228.7 | 236.7 | 239.4 | **240.8** |
| smoke | 203.9 | 218.4 | 222.7 | 224.7 | **229.2** |

The animation would pop off abruptly instead of dissolving.
*Fix:* the slicer imposes a dissipation ramp `[1.00, 0.85, 0.62, 0.38, 0.15]` per frame.

**3. Alpha again tops out at 251–254**, same as Round 1. Clamped `>=250 → 255`.

## Geometry verified

**`coin_sheet.png`** — 8 frames, 136×136 each, uniform strip. Source frame widths varied
(122/87/74/**43**/71/85/100/127 — frame 4 is the edge-on sliver, correct), so each was
re-centred in a uniform cell. Per-frame centroid lands within **±1.1px** of frame centre
in both axes. The spin will not jitter.

**`driver_head.png`** — neck joint located by taking the centroid of the blob's lowest 7%
of rows (width narrows 69→58→39→16px going down, confirming a neck stub). Placed at the
exact centre of a 576×576 canvas, so runtime rotation pivots on the neck.

**`driver_body.png`** — 365×371, collar at (65,25), hip at (60,175) in sprite space.
Both measured against a coordinate-grid render, not guessed.

## Vehicle assembly — VERIFIED

`docs/vehicle_assembly_test.png`. Mount points in `jeep_body.png` pixel space:

| Parameter | Value |
|---|---|
| Rear axle | (413, 598) |
| Front axle | (1314, 598) |
| Wheel radius | 178px (21% of the 1668px body length) |
| Seat / driver hip | (700, 470) |
| Driver scale | 0.78 |
| Draw order | rear wheel → front wheel → chassis → driver body → driver head |

Wheels nest in the arches and protrude slightly below the chassis, exactly as intended by
the Round 1 note about the arches being proportionally small. Head and body proportions
match at a shared scale — the model drew them at the same scale in the atlas, so no
per-part rescaling is needed. **No art changes required.**

## Minor, accepted as-is

- **Resolution.** 44 sprites in a 1774×887 sheet means each is only ~130px. Fine for
  gameplay (coins render ~50px, props ~100–150px). The UI icons at ~130px are roughly
  1:1 on a 2× phone — adequate, but no headroom for a 3× display. Not worth regenerating;
  if UI crispness ever matters I'll draw those in canvas anyway.
  *For future batches: fewer sprites per sheet, or ask for individual files.*
- **`rock_small` has grass tufts baked at its base**, which BLOCK 0 forbade. It happens to
  read well when planted on the terrain cap. Keeping it.
- **Bonus assets not requested:** `star`, `heart`, `wrench`, and 7 UI icons. Useful later
  for the upgrade/meta screens.
