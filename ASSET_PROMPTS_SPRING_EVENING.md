# Theme swap — **Evening Spring** (golden-hour, late-spring countryside)

> **Status: installed.** The delivered pack (`art_src/evening_spring/pack`) passed the
> geometry contract exactly — every transparent-top row count, every size, and a clean
> left/right seam on all seven files. Two defects were found and repaired on import, and
> the sky colour constants in the engine now match the art:
>
> | | |
> |---|---|
> | `hills_mid` | composited from two pieces, meeting on a straight line across the full width at row 613 — read as a seam in the sky. Repaired with a haze dissolve (`tools/import_theme.py`). |
> | `trees_near` | a flat green block with a pale edge pasted over one bush at x 80–273 / y 735–760. Repaired by copying a clean stretch of the same bush band. |
> | engine | `#0288D1` → `#2F4A93` (the sky art's own top row, measured), loading gradient and `theme-color` updated, and a warm/violet evening grade now runs over the world layer so the midday jeep and props sit in the scene. |
>
> Re-run after any re-render — it repairs, verifies and installs in one step:
> ```sh
> python3 tools/import_theme.py art_src/evening_spring/pack/png_masters
> ```
> If a re-render moves a horizon, the tool fails the file rather than installing it, and
> tells you which `index.html` constant no longer matches.
>
> The raw generations (`as1–3.png`) are **not** usable as layers — they are flattened
> scenes with a sun disc, a house, and a painted transparency checkerboard instead of real
> alpha. They live in `art_src/` as reference only.

Replaces the current midday `Countryside` parallax + terrain set with a warm low-sun
spring set. **7 files change. Nothing else in the game needs new art.**

| # | File to replace | Exact size (px) | Alpha |
|---|---|---|---|
| S1 | `assets/background/sky.webp` | **1774 × 887** | opaque |
| S2 | `assets/background/hills_far.webp` | **1774 × 887** | transparent above hills |
| S3 | `assets/background/hills_mid.webp` | **1774 × 887** | transparent above hills |
| S4 | `assets/background/trees_near.webp` | **1774 × 887** | transparent except trees |
| S5 | `assets/background/foreground_grass.webp` | **2172 × 724** | transparent above blades |
| S6 | `assets/terrain/grass_top.webp` | **2508 × 627** | opaque |
| S7 | `assets/terrain/dirt_body.webp` | **1254 × 1254** | opaque |

> Generate each at the largest the model allows (1536×1024 / 1024×1024), **one asset per
> image, never a sheet**, then downscale to the exact size above. PNG in, `cwebp -q 88` out.

---

## How to run each prompt

Every request = **three parts, in this order**:

1. **Two attachments** — (a) the current file you are replacing, (b) the evening-light
   reference photo/painting. Then paste the STYLE LOCK line below.
2. **BLOCK 0-E** (the evening-spring style bible) — verbatim, every time.
3. **One asset prompt** (S1…S7).

```
STYLE LOCK: Attachment 1 is the asset you are replacing — match its SHAPE LANGUAGE,
silhouette height, level of detail, canvas layout and tiling behaviour EXACTLY.
Attachment 2 is the LIGHTING reference — match only its time of day: low warm sun,
graded sky, long soft light, hazed violet distance. Do NOT copy attachment 2's season,
autumn colours, composition, trees or fence. The season is SPRING, not autumn.
```

---

## BLOCK 0-E — EVENING SPRING STYLE BIBLE (paste at the top of every prompt)

```
You are generating a 2D game asset for a mobile side-scrolling physics driving game in
the visual style of a polished casual mobile title (Hill Climb Racing / Angry Birds era:
hand-painted cartoon, NOT pixel art, NOT flat vector, NOT photorealistic, NOT 3D render).

TIME OF DAY — this is the whole point of the asset set:
Late spring, one hour before sunset ("golden hour"). The sun is LOW on the LEFT, about
20 degrees above the horizon, just out of frame. Everything reads warm-gold where the
light hits and cool violet-blue where it does not. Long, soft, low-angle light. Calm,
optimistic, warm — NOT dark, NOT night, NOT moody, NOT a storm. The scene must still be
bright enough to play a game on: a vehicle sprite sits in front of it and must stay
readable.

SEASON — SPRING, explicitly:
Fresh new foliage: yellow-greens and spring-greens, small young leaves, nothing dried.
Blossom is the signature: pink and white flowering trees, wildflower scatter, clover,
daisies, a mustard/canola field patch. NO autumn colours, NO orange or rust foliage, NO
bare branches, NO fallen leaves, NO snow, NO dead grass. Foliage is GREEN first; warmth
comes from the SUNLIGHT on it, not from the leaves being orange.

STYLE BIBLE — apply to every asset:
- Hand-painted cartoon illustration, soft airbrushed gradients, chunky readable shapes.
- Thick, slightly irregular dark outline (charcoal #2B2118, NOT pure black) on foreground
  objects only. Background and terrain layers have NO outline.
- Saturated and cheerful, high contrast, clean colour fields. Slight cel banding is fine.
- LIGHT: warm low sun from the LEFT. Warm gold #FFD48A rim/sun-catch on the upper LEFT of
  every form; cool violet-blue shade #5B5B8A on the lower RIGHT of every form. Never
  rim-light from the right. Shade is COLOUR-SHIFTED toward violet, never just darker grey.
- Atmospheric depth: the further back a layer is, the more it fades toward the warm-lilac
  haze colour #C9AECF and loses contrast. Nearest layers are fully saturated.
- Avoid noisy texture, grunge overlays, film grain, lens flare, bloom streaks, and any
  fine detail that disappears below 64px.

EVENING SPRING PALETTE (stay within it):
  sky zenith       #2F4A93
  sky upper        #4B63B8  -> #7E7BC4 (periwinkle)
  sky mid          #B98CC0 (mauve) -> #E8A39F (rose)
  sky horizon      #FBC58C (peach) -> #FFE2A6 (warm cream)
  cloud lit        #FFF3E0 top / #FFC9A0 warm underside / #B9A0CC violet shadow
  far hills        #8E9BD1 body / #B6B9E0 hazed crest  (pure silhouette, no detail)
  mid hills grass  #6FA04E body / #A8C86A sunlit crest / #47705A violet valley shade
  blossom          #F7C6D6 pink / #FFF1F4 white / #E8C64F canola-yellow field patch
  near foliage     #63A83C body / #8FC94F lit / #3C6B3A shade / #FFD48A sun-catch edge
  trunk/branch     #6D4C41 / #4A332C shade / #C89B6A lit edge
  terrain grass    #79C04A body / #A8DB63 lit tips / #D9E080 sun-kissed top edge
  terrain soil     #7A5744 body / #A1785C lit / #4A3328 violet-brown shade
  foreground silh. #2E4A33 -> #1C2E2A (near-silhouette, cool), warm #6E8A3A edge kiss
  outline          #2B2118

TECHNICAL OUTPUT — mandatory:
- Pure orthographic side elevation. NO perspective, NO 3/4 view, NO camera tilt, NO
  vanishing point, NO ground plane receding into the distance.
- The horizon is perfectly HORIZONTAL and dead level. No tilted horizon.
- NO sun disc and NO visible light source in frame (it repeats when the layer tiles).
  Glow only, as a horizontally even band.
- NO baked drop shadow, NO reflection, NO vignette, NO dark corners.
- NO text, NO numbers, NO logos, NO watermark, NO signature, NO border or frame.
- NO collage, NO multiple variations in one image, NO turnaround sheet, NO mockup card,
  NO labels, NO colour-swatch strip.
- NO birds, NO people, NO animals, NO buildings, NO fences, NO roads, NO power lines.
- NO vehicles of any kind — the car is a separate sprite drawn on top at runtime.
```

---

# S1 — `background/sky.webp` — 1774 × 887 — OPAQUE

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Sky layer, farthest parallax plane. 1774x887, seamlessly tileable LEFT TO RIGHT.
This one asset is FULLY OPAQUE — fill the frame edge to edge, no transparency anywhere.

A smooth vertical golden-hour gradient, spring evening, read from the TOP of the frame
down:
  0-8%    flat deep dusk blue #2F4A93 — this band must be a SINGLE FLAT UNIFORM COLOUR
          with no gradient and no cloud, because the engine extends it upward.
  8-28%   #2F4A93 easing into #4B63B8.
  28-45%  #4B63B8 into periwinkle #7E7BC4.
  45-58%  periwinkle into soft mauve #B98CC0.
  58-68%  mauve into warm rose #E8A39F.
  68-80%  rose into peach #FBC58C.
  80-100% peach into warm cream #FFE2A6, brightest and palest at the very bottom edge.
Perfectly horizontal bands, buttery smooth, NO visible banding steps, NO dithering noise.
The brightest, warmest part of the glow sits around 78-88% of the frame height — that is
where the horizon lands in game.

CLOUDS: 6-9 soft fluffy cartoon cumulus clouds, long and flattened (stretched wider than
tall, 2:1 or flatter — evening clouds), scattered across the upper two thirds only, in
varied sizes. Golden-hour lighting on them: bright warm cream #FFF3E0 along their TOP and
LEFT, warm peach #FFC9A0 underlit bellies, soft violet #B9A0CC shadow cores. Soft edges,
no outline. A few thin wispy horizontal streak clouds near the 60-70% line for depth.
CRITICAL: no cloud may touch or cross the left or right edge of the frame, and the left
and right edge columns must be identical so the layer loops invisibly.

NO sun disc, NO sun rays, NO god rays, NO lens flare, NO stars, NO moon, NO birds,
NO horizon line, NO ground, NO hills, NO mountains, NO trees, NO silhouettes of any kind.
Sky and clouds only.
```

---

# S2 — `background/hills_far.webp` — 1774 × 887 — transparent above the hills

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Far hill silhouette layer, farthest land plane. 1774x887, seamlessly tileable
LEFT TO RIGHT. FULLY TRANSPARENT above the hill line — true alpha, not white, not black.

GEOMETRY IS FIXED — match it exactly: the hills occupy ONLY the bottom 30% of the frame.
The top 70% of the image (about 618 of 887 rows) is 100% transparent, completely empty.
Do not raise the hills higher; do not add a second range further up the frame.

A gentle range of rolling hills, evening haze, seen from very far away. Almost flat
colour with minimal internal modelling: dusty violet-blue #8E9BD1 in the body fading to
lighter hazed #B6B9E0 along the crests, with a barely-there warm #E4C2C8 lift on the
left-facing slopes where the low sun grazes them. Soft rounded crests, low and wide, no
sharp or jagged peaks, no snow caps. Heavily atmospheric — this is the most desaturated
layer in the whole game, it should feel like it is dissolving into the evening air.

NO trees, NO buildings, NO detail, NO texture, NO outline, NO ground strip under the
hills, NO sky fill, NO gradient background — everything above the hill line is empty
transparent pixels.

CRITICAL TILING: the hill height at the extreme left edge column must exactly equal the
height at the extreme right edge column so the range loops continuously. Verify by
butting two copies side by side — no step, no seam, no repeated distinctive peak.
```

---

# S3 — `background/hills_mid.webp` — 1774 × 887 — transparent above the hills

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Mid-distance farmland hills layer. 1774x887, seamlessly tileable LEFT TO RIGHT.
FULLY TRANSPARENT above the hill line — true alpha.

GEOMETRY IS FIXED — match it exactly: the artwork occupies ONLY the bottom 43% of the
frame. The top 57% (about 508 of 887 rows) is 100% transparent and completely empty.
Build it in three overlapping depth bands, back to front, like the attached reference:
  - back band  : hazed blue-green ridge #7E9BB4 with soft round tree-clump bumps on the
                 skyline, very low contrast.
  - middle band: patchwork spring farmland — fresh green pasture #6FA04E, a young crop
                 field in pale yellow-green #B9CE72, and ONE warm mustard/canola field
                 #E8C64F for a spot of evening warmth. Soft curved field boundaries that
                 follow the hill contours. Gentle furrow striping inside one or two
                 fields only, never across the whole layer.
  - front band : the largest, most saturated rolling hill, spring green #6FA04E with
                 sunlit crest #A8C86A and violet-shifted valley shade #47705A.

Evening light: warm gold #E8D08A skims the LEFT-facing crest of every hill; the
right-facing slopes and every valley fall into cool violet-green shade. Scatter small
rounded tree clumps ON the hills — canopy blobs only, no trunks — and among them 4-6
BLOSSOM clumps in pale pink #F7C6D6 and white #FFF1F4 to read as spring orchards.
Moderately desaturated overall and slightly hazed: this layer must sit clearly BEHIND the
playfield and never compete with the vehicle.

NO outline, NO ground strip, NO sky fill, NO buildings, NO fences, NO roads, NO animals.

CRITICAL TILING: hill height at the far-left edge column must exactly match the far-right
edge column. Avoid any single landmark shape that will be obviously recognisable when it
repeats every screen width.
```

---

# S4 — `background/trees_near.webp` — 1774 × 887 — transparent except the trees

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Near tree-line parallax layer, closest background plane. 1774x887, seamlessly
tileable LEFT TO RIGHT. FULLY TRANSPARENT everywhere except the trees and bushes.

GEOMETRY IS FIXED — match it exactly: the tree row occupies the BOTTOM 65% of the frame.
The top 35% (about 312 of 887 rows) is 100% transparent. The trees stand on an invisible
flat baseline at the VERY BOTTOM EDGE of the frame, and their trunks and the bush band
run off the bottom edge — draw NO ground, NO soil, NO grass strip, NO horizon under them.

A dense row of full-colour cartoon broadleaf spring trees with a continuous low bush band
filling the gaps between the trunks. Chunky rounded canopies built from overlapping leaf
lobes, fresh spring green: #3C6B3A shade core, #63A83C body, #8FC94F lit lobes, and a
distinct warm gold #FFD48A sun-catch along the UPPER-LEFT rim of every canopy — the low
evening sun clipping the treetops is the single most important detail in this asset.
Short stubby brown #6D4C41 trunks with a #C89B6A lit left edge. Vary tree heights and
widths noticeably, some tall, some squat, so the skyline is irregular.

SPRING SIGNATURE: make 3-4 of the trees BLOSSOM trees — cloudy canopies of pale pink
#F7C6D6 and white #FFF1F4 with warm gold sun-catch — spaced apart, not adjacent. Add a
few tiny white and yellow wildflower dots in the bush band.

Full saturation and contrast, NO atmospheric haze on this layer — it is close to the
camera. Soft thin dark outline on the canopies only.

CRITICAL TILING: a tree must be split exactly across the seam — a canopy cut off at the
right edge resumes at the left edge at the same height and same shape, so the row loops
continuously. The bush band must also continue unbroken across the seam.

NO sky, NO sky fill, NO background colour, NO ground, NO shadow, NO birds, NO nests,
NO swings, NO fences.
```

---

# S5 — `background/foreground_grass.webp` — 2172 × 724 — transparent above the blades

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Foreground grass strip — this band passes IN FRONT of the camera. 2172x724,
seamlessly tileable LEFT TO RIGHT. FULLY TRANSPARENT above and between the blades.

GEOMETRY IS FIXED: the blades rise from the BOTTOM edge and reach up to about 68% of the
frame height at their tallest, irregularly. The top ~32% (about 232 of 724 rows) is
100% transparent.

A dense band of tall grass blades, weeds and a few wildflower silhouettes, drawn as a
near-silhouette because it is backlit by the low evening sun and out of focus: cool dark
green #2E4A33 falling to #1C2E2A at the base, low internal contrast, soft slightly
blurred edges. Backlight is the key: a thin warm #6E8A3A to #D9C173 rim runs along the
LEFT edge of the tallest blades only — a subtle glow, never a hard yellow outline, and
never on more than about a third of the blades.

SPRING DETAIL: a scatter of small backlit wildflowers among the blades — white daisies
with warm centres, a few pale pink and soft yellow buds, one or two dandelion seed puffs.
Keep them dim and few; this layer must never pull the eye off the vehicle.

Blades of varied height, uneven spacing, a few crossing and leaning blades, no outline,
no ground, no soil, no shadow, no background fill, no bokeh circles, no light streaks.
Left and right edge columns must match exactly for seamless looping.
```

---

# S6 — `terrain/grass_top.webp` — 2508 × 627 — OPAQUE

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Terrain surface cap texture — a cross-section slice through the ground, seen in
flat side elevation. 2508x627, seamlessly tileable LEFT TO RIGHT. Fully OPAQUE, fill the
frame edge to edge, no transparency, no rounded corners, no border.

TOP ~30% is the grass layer: lush spring turf, #79C04A body with #A8DB63 lit blades and a
warm sun-kissed #D9E080 catch along the very top edge from the low evening sun. Individual
blade tips break the top silhouette slightly and irregularly — a soft ragged edge, not a
straight line. Sprinkle a few tiny white clover and daisy heads, very small, widely spaced.
Below the blades the turf deepens into violet-shifted shade #3F6B4E where it meets soil.

BOTTOM ~70% is rich soil in cross-section: warm brown #7A5744 body with #A1785C lit
pebble tops and #4A3328 violet-brown shade pockets, embedded rounded stones and small
gravel of varied size, a few pale root threads. Warm evening cast overall — the soil
reads warm brown, never grey, never black.

A crisp organic wavy boundary between turf and soil, varying in height across the width.
NO outline border, NO text, NO vignette, NO grass growing downward, NO cut-out shape —
this is a full-bleed repeating texture. Left and right edge columns must match
pixel-perfectly so it tiles without a seam.
```

---

# S7 — `terrain/dirt_body.webp` — 1254 × 1254 — OPAQUE, 4-WAY seamless

```
[STYLE LOCK] [BLOCK 0-E]
ASSET: Subsoil fill texture. 1254x1254 SQUARE, seamlessly tileable in ALL FOUR
DIRECTIONS (left-right AND top-bottom). Fully OPAQUE, fills the whole frame.

Uniform packed earth in warm evening brown: #7A5744 base with #A1785C lit patches and
#4A3328 violet-brown shade, embedded rounded stones and gravel of varied sizes evenly
distributed, subtle clumped-soil modelling. Even overall value with NO large light or
dark region, NO directional gradient, NO hotspot — the tile is repeated hundreds of times
and any large feature will read as an obvious grid.

Keep the largest stone smaller than about 1/8 of the frame width. No grass, no roots at
the top edge, no surface layer, no horizon, no outline, no border, no text, no vignette.
Top edge must continue into the bottom edge and left edge into the right edge with no
visible seam.
```

---

## Optional S8 — new spring-only FX (needs a small code hook, not required for the swap)

```
[BLOCK 0-E]
ASSET: Blossom petal particle sprite sheet, 860x172, a SINGLE ROW of exactly 5 frames,
each frame exactly 172x172, transparent background, NO gaps, NO padding, NO grid lines,
NO frame numbers.
One drifting cherry-blossom petal cluster dissolving over the 5 frames: frame 1 is 3-4
crisp pale pink #F7C6D6 petals with white #FFF1F4 edges and warm gold sun-catch, each
later frame has the petals further apart, more transparent and slightly more rotated,
frame 5 is a faint scatter. Petals centred in each frame with an even margin. No outline,
no motion blur streaks, no background, no shadow.
```

---

## Geometry contract — the numbers the engine actually depends on

The renderer crops the empty top rows of each layer using measured constants. If the new
art's transparent-top fraction differs from the old by more than ~3%, update these or the
horizon will sit at the wrong height:

| Layer | Code constant (`index.html:988-990`, `:1042`) | Means |
|---|---|---|
| `hills_far` | `top: 618 / 887` | top **69.7%** of the image must be empty |
| `hills_mid` | `top: 508 / 887` | top **57.3%** must be empty |
| `trees_near` | `top: 312 / 887` | top **35.2%** must be empty |
| `foreground_grass` | `232 / 724` | top **32.0%** must be empty |

`hills_mid` is drawn **mirrored on alternate tiles** (`mirror: true`) to hide a seam. That
only works while the layer has no strongly directional lighting — so keep the evening
sun-skim on `hills_mid` **soft and symmetrical**, or fix the left/right edge match properly
and drop the mirror flag.

## Code changes after dropping the files in — **done, listed here for the next theme**

Three hard-coded midday blues have to become the new dusk blue — they must match the flat
top band of S1 exactly (sample it, don't eyeball it; `tools/import_theme.py` prints it):

- [index.html:1016](index.html#L1016) — `c.fillStyle = '#0288D1'` (frame clear)
- [index.html:1025](index.html#L1025) — `c.fillStyle = '#0288D1'` (gap above the sky art)
- [index.html:21](index.html#L21) — loading-screen `linear-gradient(#4FC3F7, #0288D1)` → e.g. `linear-gradient(#FBC58C, #2F4A93)`
- [index.html:7](index.html#L7) — `<meta name="theme-color" content="#4FC3F7">` → the new dusk blue

**Recommended, and cheaper than regenerating art:** the jeep, driver, props and pickups are
all lit for midday. Rather than re-render 30 sprites, draw a single warm evening grade over
the world after the terrain and sprites are drawn — a `screen`-blend warm wash (`#FFB35C`,
alpha ~0.10) plus a `multiply` violet (`#6B5E9B`, alpha ~0.08), clipped to the world layer
and skipped for the HUD. That alone sells the time of day on every existing sprite.

## QA checklist before committing

1. **Tiling** — butt two copies of each layer side by side at 100%: no step, no seam,
   no obviously repeating landmark.
2. **Alpha** — the transparent regions must be truly transparent, not white/black/magenta
   fill. Run `python3 tools/build_assets.py` so the alpha clamp + edge bleed are applied;
   otherwise stray colour creeps in at the edges when the layers are downscaled.
3. **Horizon** — `hills_far` and `hills_mid` crest heights land in the same band as the
   old assets; the warm part of the sky sits behind them, not above the screen top.
4. **Contrast** — drop the jeep sprite in front of `trees_near` at gameplay scale: the
   vehicle silhouette must still separate cleanly from the foliage.
5. **Season check** — zero orange/rust foliage anywhere. If a layer looks autumn, it is
   the one to re-roll.
