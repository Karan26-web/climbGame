# Asset status — 2 prompts left

`Charcter.png` delivered **all of P0 plus most of P1 and P2**. I sliced it into 29
sprites (see below) and verified the whole vehicle assembles: `docs/vehicle_assembly_test.png`.

**Only two assets are still missing. Everything else is either done or my job.**

---

## ⚠️ Style lock — attach a reference image

Attach `assets/vehicle/jeep_body.png` with both prompts and prepend:

```
STYLE REFERENCE: Match the attached image's art style EXACTLY — soft airbrushed cartoon
rendering, thick dark charcoal #2B2118 outline of even weight, glossy top-left specular
highlights, saturated palette, chunky rounded forms. Same lighting: top-left at 45 degrees.
```

Then paste **BLOCK 0** from `ASSET_PROMPTS.md`, then the prompt.

---

## ⚠️ One delivery rule for these two

**Generate each one as its own image. Do NOT put both on one sheet.**

These are 1774px-wide seamless parallax layers — they only work at full width. The
`Charcter.png` atlas worked out fine for small sprites because I could slice it, but a
background layer squeezed into a shared sheet is unusable: it loses both its width and
its edge-to-edge tiling.

---

### STILL NEEDED 1 — `background/trees_near.png` — 1774×887

Biggest remaining visual upgrade. There's currently a hard depth gap between the mid
hills and the playfield — the jeep looks pasted onto a postcard. This closes it.

```
[STYLE REFERENCE] [BLOCK 0]
ASSET: Near tree-line parallax layer, 1774x887, seamlessly tileable LEFT TO RIGHT,
transparent everywhere except the trees.
A row of full-colour cartoon broadleaf trees and bushes along the BOTTOM THIRD of the
frame. Chunky rounded canopies built from overlapping leaf lobes in #558B2F through
#7CB342 with #AED581 sun-catch on the upper left of each canopy; short stubby brown
#6D4C41 trunks. Vary the tree heights and widths noticeably. Full saturation and
contrast — these are close to the camera, so NO atmospheric haze and NO desaturation.
Soft thin outline only.
CRITICAL: the trees stand on an invisible flat baseline at the very BOTTOM EDGE of the
frame. Draw NO ground, NO soil, NO grass strip, NO horizon under them. Everything above
and between the trees is fully transparent.
CRITICAL TILING: a tree must be split exactly across the seam so the left edge continues
the right edge — a canopy cut off at the right edge must resume at the left edge at the
same height. Verify by butting two copies side by side.
No sky, no shadow, no background fill.
```

### STILL NEEDED 2 — `background/foreground_grass.png` — 1774×256

```
[BLOCK 0]
ASSET: Foreground grass strip, 1774x256, seamlessly tileable LEFT TO RIGHT, transparent
above the blades.
A dense band of tall grass blades, weeds and a few wildflower silhouettes rising from the
BOTTOM edge. Dark, cool and low contrast — #33691E through #1B5E20, as if in shadow and
slightly out of focus, because this passes in front of the camera. Blades reach
irregularly to about 70% of the frame height with uneven spacing and a few crossing
blades. No outline.
Transparent above and between the blades. NO ground, NO soil, NO shadow. Left and right
edges must match for seamless looping. No background fill.
```

---

## What I now have (36 sprites)

| Category | Files | Source |
|---|---|---|
| Background | `sky` `hills_far` `hills_mid` | Round 1 |
| Terrain | `grass_top` `dirt_body` | Round 1 |
| Vehicle | `jeep_body` `jeep_wheel` | Round 1 |
| Vehicle | `driver_body` `driver_head` | atlas |
| Pickups | `coin_sheet` (8f) `fuel_can` `gem` `boost` `star` `heart` `wrench` | atlas |
| UI | `icon_play` `icon_pause` `icon_gear` `icon_restart` `icon_home` `icon_sound_on` `icon_sound_off` | atlas |
| FX | `dust_sheet` (5f) `smoke_sheet` (5f) | atlas |
| Props | `tyre_stack` `cone` `crate` `barrel` `rock_small` `bush` `flag_finish` `flag_checkpoint` `signpost` `ramp` `log` | atlas |

Regenerate any time with `python3 tools/slice_atlas.py`.
Re-verify the vehicle with `python3 tools/composite_test.py`.

## Still on my plate, not GPT's

Gas/brake pedals, RPM + boost gauges, fuel bar, 9-slice panels, coin sparkle, title text.
All code — they need to be crisp at any DPI and driven by live values.

Note the atlas gave me UI *icons* but not the **gas and brake pedals**, which are the two
most important controls. That's intentional — I'm drawing those in canvas so I get the
pressed state and hit area for free, and no baked-in "GAS"/"BRAKE" text.
