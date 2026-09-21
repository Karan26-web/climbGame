# Theme swap — **Mountain Canyon** (midday alpine valley, pines and cliffs)

> **Status: not yet generated.** This is the art the distance-formula mock uses: snow-capped
> peaks, dark pines, a river and waterfall far below, warm sandstone cliffs. The engine
> already draws the chasm walls as cut rock and hazes the drop, so the seven parallax and
> terrain files are all that change. Generate them, drop the PNG masters in
> `art_src/mountain_canyon/pack/png_masters/`, then:
> ```sh
> python3 tools/import_theme.py art_src/mountain_canyon/pack/png_masters
> ```
> The tool repairs alpha, checks every transparent-top row count and tile seam against the
> geometry contract below, converts to `.webp` and installs. A file that fails is reported
> and NOT installed. After it passes, set the three sky constants in `index.html`
> (`#2F4A93` → the new sky's top-row colour, which the tool prints) and re-tune `R.grade`
> — the evening warm/violet grade should go to near zero for midday.

Replaces the current **Evening Spring** parallax + terrain set. **7 files change. Nothing
else in the game needs new art.**

| # | File to replace | Exact size (px) | Alpha | Transparent top (rows) |
|---|---|---|---|---|
| M1 | `assets/background/sky.webp` | **1774 × 887** | opaque | — |
| M2 | `assets/background/hills_far.webp` | **1774 × 887** | transparent above peaks | **618** |
| M3 | `assets/background/hills_mid.webp` | **1774 × 887** | transparent above ridges | **508** |
| M4 | `assets/background/trees_near.webp` | **1774 × 887** | transparent except pines | **312** |
| M5 | `assets/background/foreground_grass.webp` | **2172 × 724** | transparent above blades | **232** |
| M6 | `assets/terrain/grass_top.webp` | **2508 × 627** | opaque | — |
| M7 | `assets/terrain/dirt_body.webp` | **1254 × 1254** | opaque | — |

> Generate each at the largest the model allows, **one asset per image, never a sheet**,
> then downscale to the exact size above. PNG in, `cwebp -q 88` out (the tool does this).
> Every background layer is **tiled horizontally**: the left and right edges must meet.
> Ask for "seamlessly tileable left to right" in every layer prompt and check it.

## How to run each prompt

Paste **BLOCK 0-M** (the style bible) at the top of every prompt, then the asset's own
block. Say "transparent background (PNG alpha)" wherever the table says transparent — never
a painted checkerboard, never a flat colour to key out. No sun disc, no text, no
characters, no vehicles in any layer.

## BLOCK 0-M — MOUNTAIN CANYON STYLE BIBLE (paste at the top of every prompt)

Clean, bright, 2D mobile-game illustration. Flat cel shading with soft gradients, crisp
dark outlines (2–3 px at 1024), saturated but natural colour. Midday light from the upper
right, cool blue shadows. Palette: sky #3A8DDE to #8FC6F5, snow #F4F8FF, far peaks
#6F8FC2 / #4C6A9E, pine greens #2F6B3A / #4F9A4A / #7BC15A, sandstone cliffs #C99A5B /
#A9773F / #7A5230, river #3F8FD6 with white foam. The mood is a summer road trip in the
mountains: crisp air, no haze in the foreground, soft atmospheric haze only on the far
peaks. Match the look of a red off-road jeep on a dirt track — that is the player.

## M1 — `sky.webp` (1774 × 887, opaque)

Wide sky, clear midday blue, deep #3A8DDE at the top fading to pale #A9D6F7 at the bottom.
A few big soft cumulus clouds with flat-shaded undersides, none touching the edges. The
bottom 15% is plain pale sky (mountains will cover it). Seamlessly tileable left to right.
No sun disc.

## M2 — `hills_far.webp` (1774 × 887, transparent above row 618)

A range of tall snow-capped mountains filling only the **bottom 30%** of the frame
(the top 618 of 887 rows are fully transparent). Pale blue-grey rock #6F8FC2 with darker
#4C6A9E ridges, white snow caps, softened by distance haze (lower contrast than the
midground). Seamlessly tileable left to right. Transparent PNG.

## M3 — `hills_mid.webp` (1774 × 887, transparent above row 508)

Forested ridges filling the **bottom 43%** of the frame (top 508 rows transparent).
Dense dark pines in silhouette-like clusters, #2F6B3A to #3E7F45, with a few grey rock
outcrops. Slightly hazed. Seamlessly tileable left to right. Transparent PNG.

## M4 — `trees_near.webp` (1774 × 887, transparent above row 312)

Close pines and boulders filling the **bottom 65%** of the frame (top 312 rows
transparent). Individual tall conifers with layered bough shapes, full outlines, three
greens (#2F6B3A shadow, #4F9A4A mid, #7BC15A lit), a few warm grey boulders #9AA0A6 and
bushes at their feet. Big readable shapes — this layer scrolls fast. Seamlessly tileable
left to right. Transparent PNG.

## M5 — `foreground_grass.webp` (2172 × 724, transparent above row 232)

A strip of alpine meadow grass and small wildflowers seen from the side, blades filling
the **bottom 68%** (top 232 rows transparent), bright #7BC15A with #4F9A4A shadow, a few
white and yellow flowers. This is drawn semi-transparent in front of everything, so keep
it airy — gaps between blade clusters. Seamlessly tileable left to right. Transparent PNG.

## M6 — `grass_top.webp` (2508 × 627, opaque)

The road surface cap, seen in side section: the top ~35% is a **dirt track** edge —
packed tan earth #C99A5B with a thin fringe of green grass tufts along the very top edge,
then compact brown soil with small stones below, darkening towards the bottom. This
strip is bent along the terrain, so no large features, only fine texture. Seamlessly
tileable left to right. Opaque.

## M7 — `dirt_body.webp` (1254 × 1254, opaque)

Fill texture for the ground under the road and the cliff faces: **sandstone and packed
earth**, #A9773F with #7A5230 shadow, irregular horizontal strata, a few embedded rounded
stones and hairline cracks, all low contrast. Must tile **both** horizontally and
vertically with no visible repeat. Opaque.

## Geometry contract — the numbers the engine actually depends on

The transparent-top rows above are the `top:` fractions in `index.html`'s `LAYERS` table
(`618/887`, `508/887`, `312/887`) and `R.drawForeground` (`232/724`). `import_theme.py`
measures each delivered PNG and fails it if the horizon moved. If the art needs a different
horizon, change both the art and the constant together.

The chasm itself needs no art: walls are drawn as cut rock over `dirt_body`, the drop is
hazed to dark, and the grid, points, ruler and plank are all vector.

## QA checklist before installing

- [ ] every layer tiles left→right with no seam (the tool measures the edge difference)
- [ ] transparent rows are truly alpha 0, not painted sky
- [ ] no sun disc, text, vehicle or character in any layer
- [ ] snow caps read against the sky at 30% size — squint test
- [ ] run `node tools/shoot_gaps.js 1` after import and compare with `docs/shots/`
