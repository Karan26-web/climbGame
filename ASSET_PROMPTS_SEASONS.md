# Season packs + night sky — prompts for the image model

The game is one endless run that drives through the seasons, from day into night
and back, with rain, fog and snow along the way. Day/night and weather are done in
the engine (grading, headlamps, particles, stars, moon). **What the engine cannot do
is change the painting** — so each season is a pack of the same seven tiled scenery
files the game already uses, and the engine crossfades from one pack to the next
as you drive.

**What to generate: 3 season packs × 7 files, plus 1 night sky = 22 images.**
An optional 4th pack (spring in neutral daylight) is at the end.

Install each pack with the same tool that verifies the geometry; it refuses any file
that does not meet the contract and says which one:

```sh
python3 tools/import_theme.py <folder_of_pngs> --theme summer
python3 tools/import_theme.py <folder_of_pngs> --theme autumn
python3 tools/import_theme.py <folder_of_pngs> --theme winter
# night_sky.png in any of those folders is installed too, as the shared night sky
```

The engine cycles through whichever of `summer`, `autumn`, `winter` are installed —
one pack at a time is fine.

---

## The contract (identical for every pack)

Every file must match its spring original in **size, alpha and layout** — the
engine crops a fixed number of empty rows off the top of each layer and tiles each
one left-to-right, so a horizon that moves by more than 8px, or an edge that does
not meet its own other edge, is rejected on import.

| # | File name (PNG master) | Exact size | Alpha | Artwork begins at row |
|---|---|---|---|---|
| 1 | `sky.png` | **1774 × 887** | opaque | 0 — top row is one flat colour |
| 2 | `hills_far.png` | **1774 × 887** | transparent above | **618** |
| 3 | `hills_mid.png` | **1774 × 887** | transparent above | **508** |
| 4 | `trees_near.png` | **1774 × 887** | transparent above | **312** |
| 5 | `foreground_grass.png` | **2172 × 724** | transparent above | **232** |
| 6 | `grass_top.png` | **2508 × 627** | opaque | 0 — grass down to ~row 230, then roots/soil |
| 7 | `dirt_body.png` | **1254 × 1254** | opaque | tiles **all four ways** |

Plus, once only:

| | `night_sky.png` | **1774 × 887** | opaque | 0 — top row one flat, very dark colour |

Rules that apply to all of them:

- **One asset per image.** Never a sheet, never a composed scene.
- **Left edge meets right edge exactly** (the layer repeats sideways forever).
  `dirt_body` also meets top-to-bottom.
- **Real transparency**, not a painted checkerboard, not a flat colour to key out.
- No sun disc, no moon, no buildings, no vehicles, no people, no text.
- Generate at the largest the model allows, then downscale to the exact size.
  PNG masters; the import tool makes the `.webp`.

---

## How to run each prompt

Every request is **three parts in this order**:

1. **Attach the spring original** you are replacing (from `assets/background/` or
   `assets/terrain/`) and paste the STYLE LOCK.
2. Paste **BLOCK 0** (the style bible) — verbatim, every time.
3. Paste the **season block** for the pack you are making, then **one asset
   prompt** (A1–A7).

```
STYLE LOCK: The attachment is the asset you are replacing. Match its SHAPE
LANGUAGE, silhouette height, level of detail, line weight, canvas layout and
tiling behaviour EXACTLY — the artwork must begin at the same row from the top,
and the left and right edges must meet the same way. Change ONLY what the
season block says changes: colour, foliage, ground cover, sky. Same world,
different month.
```

### BLOCK 0 — style bible (paste every time)

```
Style: clean 2D mobile-game background art in the manner of a bright cartoon
hill-climb racer. Soft painted shapes with a thin dark outline on the nearest
layer only, no outline on distant layers. Smooth gradients, gentle atmospheric
haze on anything far away, no texture noise, no photo realism, no 3D render
look. Even, NEUTRAL DAYLIGHT — high soft sun, no long shadows, no golden hour,
no colour cast (the game adds sunrise, sunset and night on top of this art, so
bake in NO time of day). Colours clear and saturated but not neon. Nothing in
the image casts a shadow onto the ground. Empty of characters, vehicles,
buildings, signs, sun, moon, birds and text. Transparent background wherever
the table says transparent, saved as PNG with real alpha.
```

---

## Season blocks

### SUMMER

```
SEASON: high summer. Sky a deep clear blue fading to a paler blue-white at the
horizon, a few small flat-bottomed cumulus clouds. Grass and hills a warm,
slightly dried mid-green with faint yellow-gold in the far fields. Trees in
full heavy dark-green leaf, round and dense. Foreground grass tall and lush
with a few wildflowers (white, yellow). Soil a warm dry brown with small
stones. Bright, hot, still.
```

### AUTUMN

```
SEASON: mid autumn. Sky a soft pale blue-grey with thin high cloud, lower
contrast than summer. Far hills muted blue-violet. Fields tan, ochre and
straw. Trees in amber, orange, red and a little remaining olive green, some
branches showing through thinner canopies. Foreground grass going yellow-brown
with fallen leaves lying among the blades. Soil a darker, damper brown with
scattered orange leaves pressed into it. Cool, quiet, slightly hazy.
```

### WINTER

```
SEASON: deep winter, snow on the ground. Sky pale grey-white, almost no blue,
flat overcast light (no clouds needed — the whole sky is the cloud). Far hills
white with blue-grey shadow sides. Middle hills white fields with a few dark
hedgerow lines and bare trees. Near trees: bare black-brown branches, plus a
few dark evergreen firs holding snow on their boughs. Foreground: snow with
tufts of dead brown grass poking through. GRASS_TOP becomes a snow cap: white
snow surface with a soft blue underside, then frozen dark soil below the same
row where the spring grass turns to roots. DIRT_BODY: frozen dark earth,
cold-toned, with a few embedded stones — still clearly soil, not ice.
```

---

## Asset prompts (one per request, after the season block)

**A1 — `sky.png`** (1774 × 887, opaque)
```
The sky layer only. A vertical gradient sky for this season, tiling
left-to-right seamlessly (the right edge continues into the left edge with no
visible join). The very top row must be ONE flat colour across its full width
— the engine extends it upward. Clouds, if the season has them, sit in the
lower two thirds and none touch the top edge. No horizon, no ground, nothing
but sky. Nothing at all that would look wrong repeated side by side.
```

**A2 — `hills_far.png`** (1774 × 887, transparent above; art begins at row 618)
```
The farthest hills only, on a fully transparent background. A low rolling
ridge line whose highest point sits exactly as high as in the attachment and
no higher (the top 618 rows stay empty). Heavily hazed — pale, low contrast,
almost no detail, as if seen through kilometres of air. Colours for this
season per the season block, then pushed toward the sky colour by the haze.
Left and right edges meet exactly. Bottom edge is fully opaque, cut straight.
```

**A3 — `hills_mid.png`** (1774 × 887, transparent above; art begins at row 508)
```
The middle-distance hills and fields only, on a fully transparent background.
Rolling farmland: patchwork fields, hedgerows, a few distant tree clumps,
sitting exactly as high as in the attachment (the top 508 rows stay empty).
Medium haze — softer and lighter than the near layer, more detail than the far
hills. Season colours per the season block. Left and right edges meet exactly.
Bottom edge fully opaque, cut straight.
```

**A4 — `trees_near.png`** (1774 × 887, transparent above; art begins at row 312)
```
The near tree-and-bush row only, on a fully transparent background. A band of
round bushes and small trees of varied size, with a thin dark outline, tallest
ones reaching exactly as high as in the attachment (the top 312 rows stay
empty). Clear, saturated, sharp — this is the closest painted layer. Foliage
and colour for this season per the season block. The row must repeat
seamlessly left-to-right: any tree that crosses the right edge continues from
the left edge. Bottom edge fully opaque, cut straight.
```

**A5 — `foreground_grass.png`** (2172 × 724, transparent above; art begins at row 232)
```
A strip of foreground grass blades only, seen from the side, on a fully
transparent background, the tallest blades reaching exactly as high as in the
attachment (the top 232 rows stay empty). Blades slightly out of focus and a
little darker than the mid-ground, as a thing passing close to the camera.
Ground cover for this season per the season block (lush / dry with leaves /
snow with dead tufts). Left and right edges meet exactly. Bottom edge fully
opaque, cut straight.
```

**A6 — `grass_top.png`** (2508 × 627, opaque)
```
The ground cap strip: the top surface of the ground seen from the side. Grass
(or this season's cover, per the season block) from the top edge down to about
row 230, then a root/turf transition, then plain soil colour to the bottom.
Fully opaque, no transparency anywhere. Tiles left-to-right seamlessly. No
objects, no shadows.
```

**A7 — `dirt_body.png`** (1254 × 1254, opaque, tiles all four ways)
```
A square of underground soil texture for this season, seen in cross-section:
earth with a few small embedded stones and pebbles, soft low-contrast
variation, no big features that would be noticed repeating. Fully opaque.
Must tile SEAMLESSLY in all four directions — the left edge continues into the
right and the top continues into the bottom. Even lighting, no gradient across
the tile.
```

---

## Night sky (once, shared by every season)

**N1 — `night_sky.png`** (1774 × 887, opaque)
```
The sky layer only, at night. A vertical gradient from a very dark blue-black
at the top (the very top row ONE flat colour across its full width) to a
slightly lighter deep blue at the bottom, with a faint band of dusty Milky Way
and a scattering of small stars of varied brightness. NO moon (the engine
draws it). No clouds, no horizon, no ground. Tiles left-to-right seamlessly:
nothing that would look wrong repeated side by side. Same painted style as
the day sky, not a photograph.
```

---

## Optional 4th pack — SPRING in neutral daylight

The installed spring set is painted for golden-hour evening light. Now that the
engine grades time of day itself, that warmth is baked in twice at dusk and looks
wrong at noon. Re-rendering spring with the same BLOCK 0 (neutral daylight) and this
season block, then installing it **without** `--theme`, replaces the built-in set:

```
SEASON: late spring. Sky a fresh mid-blue with soft white clouds. Grass a
bright fresh green, far fields yellow-green. Trees in new light-green leaf,
plus pink blossom trees (cherry) in the near row. Foreground grass fresh green
with small white and pink flowers. Soil a rich mid-brown.
```

```sh
python3 tools/import_theme.py <folder_of_pngs>        # no --theme: replaces spring
```

The tool prints the new sky top-row colour; update the two `#2F4A93` constants in
`index.html` (`<meta name="theme-color">` and the `#boot` gradient) to match.
