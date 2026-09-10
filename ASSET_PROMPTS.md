# Climb Game — Asset Generation Brief (for GPT / image models)

> **How to use this file:** Every request to the image model = **BLOCK 0 (style bible)** + **one asset prompt**.
> Do *not* ask for multiple assets in one image unless the prompt says "sprite sheet".
> Generate at 1024×1024 (or 1536×1024 for wide assets), then downscale to the target size listed.

---

## Engine constraints the art MUST respect

These are non-negotiable — they come from the physics engine, not taste.

| Rule | Why |
|---|---|
| **Pure orthographic side view.** Zero perspective, zero 3/4 angle, no vanishing point. | The world is 2D. Any perspective makes the car look like it's sliding sideways. |
| **Wheels, chassis, and driver are SEPARATE files.** | Wheels are independent rigid bodies that spin; the chassis pivots on suspension. A single glued car sprite is unusable. |
| **Every rotating sprite is centered in a SQUARE canvas, pivot = exact image center.** | Rotation is applied around the texture center. An off-center wheel wobbles like a broken shopping trolley. |
| **Transparent PNG (alpha).** If the model can't do alpha, use flat **`#FF00FF` magenta** background, no anti-aliased edge blending into it. | I chroma-key it out in a build step. |
| **No baked drop shadows, no ground plane, no reflection** under any object sprite. | Shadows are drawn at runtime so they land on the actual terrain slope. |
| **Light source: top-left, ~45°.** Consistent across every single asset. | Otherwise the scene reads as a collage. |
| **Backgrounds must tile seamlessly left↔right.** Left edge pixel column must continue into right edge column. | Parallax layers scroll infinitely. |
| **Terrain textures must tile seamlessly in all 4 directions.** | Terrain is generated procedurally and filled with the texture. |
| **No text, no logos, no watermarks, no UI chrome** inside gameplay art. | Localization + it looks cheap. |

**World scale:** logical canvas `1280×720`. `1 meter = 50 logical px`. All assets authored at **2×** for retina.

---

## BLOCK 0 — STYLE BIBLE (paste this at the top of *every* prompt)

```
You are generating a 2D game asset for a mobile side-scrolling physics driving game
in the visual style of a polished casual mobile title (Hill Climb Racing / Angry Birds
era: hand-painted cartoon, not pixel art, not flat vector, not photorealistic, not 3D render).

STYLE BIBLE — apply to every asset:
- Hand-painted cartoon illustration, soft airbrushed gradients, chunky readable shapes.
- Thick, slightly irregular dark outline (charcoal #2B2118, NOT pure black) on foreground
  objects only. Background layers have NO outlines.
- Saturated, cheerful, high-contrast palette. Warm midday sunlight.
- Light source: top-left at 45 degrees. Soft warm highlights top-left, cool desaturated
  shade bottom-right. Never rim-light from the right.
- Slight cel-shaded banding is fine; avoid noisy texture, avoid grunge overlays, avoid
  fine detail that vanishes below 64px.
- Rounded, friendly, exaggerated proportions. Nothing gritty or realistic.

CORE PALETTE (stay within it):
  grass        #7CB342 / #558B2F (shade) / #AED581 (highlight)
  dirt         #8D6E63 / #5D4037 (shade) / #A1887F (highlight)
  sky          #4FC3F7 (horizon) -> #0288D1 (zenith)
  cloud        #FFFFFF / #E1F5FE (shade)
  hero red     #E53935 / #B71C1C (shade) / #EF5350 (highlight)
  metal/chrome #CFD8DC / #78909C (shade)
  outline      #2B2118
  gold coin    #FFD54F / #FFA000 (shade)
  UI grey      #607D8B panel / #ECEFF1 face

TECHNICAL OUTPUT — mandatory:
- Pure orthographic side view. NO perspective, NO 3/4 view, NO camera tilt.
- Transparent background (PNG alpha). If transparency is impossible, use a flat
  #FF00FF magenta background with hard, non-blended edges.
- The subject fully inside frame with a small even margin. Nothing cropped.
- NO baked drop shadow, NO ground/floor plane, NO reflection, NO vignette.
- NO text, NO numbers, NO logos, NO watermark, NO signature, NO border frame.
- NO collage, NO multiple variations in one image, NO turnaround sheet
  (unless the asset spec explicitly asks for a sprite sheet).
```

---

# BATCH A — Parallax Background (theme: Countryside)

Five layers, each **2048×1024**, **seamlessly tileable horizontally**.
Ask for tiling explicitly *and* verify by butting two copies side by side.

### A1 — `background/sky.png`
```
[BLOCK 0]
ASSET: Sky layer, farthest parallax plane. 2048x1024, seamlessly tileable horizontally.
Smooth vertical gradient: light cyan #4FC3F7 at the bottom rising to deep azure #0288D1
at the top. Scatter 6-8 soft fluffy cartoon cumulus clouds, pure white with pale blue
#E1F5FE undersides, of varying size, placed in the upper two-thirds. Clouds must not
touch the left or right edge (so tiling is invisible). Opaque background is REQUIRED for
this one asset only — fill the whole frame, no transparency. No sun disc, no birds,
no horizon line, no ground, no mountains.
```

### A2 — `background/hills_far.png`
```
[BLOCK 0]
ASSET: Far hill silhouette layer. 2048x1024, seamlessly tileable horizontally,
TRANSPARENT above the hill line.
A gentle range of rolling hills occupying only the bottom 35% of the frame. Heavily
atmospheric-hazed: desaturated blue-green #8FBF9F fading toward #B4D4BC at the peaks,
almost flat with minimal internal detail. Soft rounded crests, no sharp peaks. No trees,
no buildings, no outlines, no detail. Everything above the hills is fully transparent.
The hill height at the extreme left edge must exactly match the height at the extreme
right edge so the layer loops.
```

### A3 — `background/hills_mid.png`
```
[BLOCK 0]
ASSET: Mid-distance hills layer. 2048x1024, seamlessly tileable horizontally,
TRANSPARENT above the hill line.
Rolling green farmland hills in the bottom 45% of the frame. Grass #7CB342 with
#558B2F shade in the valleys and #AED581 sun-catch on the crests. Add gentle patches
suggesting ploughed fields and a few small dark-green rounded tree clumps sitting ON the
hills (no trunks, just canopy blobs). Light haze, moderately desaturated — clearly
behind the playfield. No outlines. Fully transparent above the hill line. Hill height
at the far-left edge must exactly match the far-right edge for seamless looping.
```

### A4 — `background/trees_near.png`
```
[BLOCK 0]
ASSET: Near tree line layer. 2048x1024, seamlessly tileable horizontally, TRANSPARENT
everywhere except the trees.
A row of full-colour cartoon broadleaf trees and bushes along the bottom third: chunky
rounded canopies in #558B2F to #7CB342 with #AED581 top-left highlights, short stubby
brown #6D4C41 trunks. Vary the heights. Full saturation, thin soft outline only. The
trees sit on an invisible flat baseline at the bottom of the frame — no ground, no soil,
no grass strip underneath them. Transparent between and above the trees. A tree must be
split exactly across the left/right seam so the row loops continuously.
```

### A5 — `background/foreground_grass.png`
```
[BLOCK 0]
ASSET: Foreground blur strip, 2048x256, seamlessly tileable horizontally, transparent
on top.
A band of tall grass blades, wildflowers and weed silhouettes rising from the bottom
edge. Dark, cool, low-contrast (#33691E to #1B5E20) as if in shadow and slightly out of
focus — this passes in front of the camera. Blades reach up to about 70% of the frame
height, irregular spacing. Transparent above and between the blades. Loops seamlessly.
```

**Theme variants:** re-run A1–A5 swapping the palette line —
`DESERT`: sand #E0C068 / dune #C9A227 / sky #FFCC80→#FB8C00, cacti + mesas, no grass.
`SNOW`: snow #ECEFF1 / ice shade #B0BEC5 / sky #B3E5FC→#4FC3F7, pines, no leaves.
`MOON`: regolith #9E9E9E / crater shade #616161 / sky pure black #000000 + stars, no trees.
`CITY NIGHT`: asphalt #37474F / sky #1A237E→#000051, lit windows, streetlamps.

---

# BATCH B — Terrain Textures

These fill the procedurally generated ground. **4-way seamless tiling is critical.**

### B1 — `terrain/grass_top.png`
```
[BLOCK 0]
ASSET: Horizontal terrain cap texture, 512x128, seamlessly tileable LEFT-TO-RIGHT.
The top 40% is a lush grass surface layer: #7CB342 base, #AED581 lit blades along the very
top edge, a scatter of individual blade tips breaking the top silhouette slightly. The
bottom 60% transitions into rich dark soil #5D4037. A crisp organic wavy boundary between
grass and soil. Flat-on side-elevation cross-section view, like a slice through the ground.
Fill the entire frame edge to edge — opaque, no transparency, no rounded corners, no
outline border. Left and right edges must match pixel-perfectly.
```

### B2 — `terrain/dirt_body.png`
```
[BLOCK 0]
ASSET: Soil fill texture, 512x512, seamlessly tileable in ALL FOUR directions.
Rich cartoon-painted earth: #8D6E63 base with #5D4037 mottling and a few #A1887F lighter
patches, plus a handful of small embedded rounded pebbles and short root fragments.
Even, non-directional distribution with no obvious focal point, no hotspot, no gradient
across the frame, no visible seam. Fill the entire frame, opaque, edge to edge.
No outline, no border, no vignette.
```

### B3 — `terrain/rock_deep.png`
```
[BLOCK 0]
ASSET: Deep bedrock texture, 512x512, seamlessly tileable in ALL FOUR directions.
Cool grey cartoon stone: #616161 base, #424242 crevices, #9E9E9E lit facets, chunky
angular faceted rock blocks with soft rounded edges. Even non-directional distribution,
no focal point, no gradient, no seam. Opaque, fills the frame edge to edge.
```

---

# BATCH C — Vehicle: the Jeep (hero vehicle)

**The most important batch. Read the pivot notes.**

### C1 — `vehicle/jeep_body.png` — 640×320
```
[BLOCK 0]
ASSET: Vehicle chassis sprite, 640x320, transparent background.
A cartoon off-road jeep / open-top buggy body in hero red #E53935, seen in PURE flat side
elevation from the LEFT side, facing RIGHT. Stubby, exaggerated, top-heavy toy
proportions — short wheelbase, tall open cabin, big rounded fenders, chrome #CFD8DC bumper
and grille, a small roll bar, one visible dark #37474F bucket seat, and a black exhaust
pipe stub at the lower rear.
CRITICAL: NO WHEELS. Leave the two wheel wells completely empty and transparent — the
wheels are separate sprites composited at runtime. Do not draw tyres, rims, hubs, axles
or wheel shadows.
CRITICAL: NO DRIVER, NO CHARACTER, NO HEAD. The seat is empty.
The body fills the frame horizontally with a small even margin. Wheel arches centred at
roughly 20% and 80% of the width. Thick #2B2118 outline. No shadow, no ground, no motion
lines, no background.
```

### C2 — `vehicle/jeep_wheel.png` — 256×256
```
[BLOCK 0]
ASSET: Single wheel sprite, 256x256 SQUARE, transparent background.
One chunky cartoon off-road tyre viewed perfectly flat from the side. Black rubber
#212121 with #424242 lit top-left arc, deep blocky chevron tread cut into the outer edge,
and a bright silver #CFD8DC five-spoke rim with a small chrome centre cap.
CRITICAL GEOMETRY: The tyre is a PERFECT CIRCLE, PERFECTLY CENTRED in the square frame,
with its diameter spanning about 94% of the frame width. The exact image centre pixel must
be the exact centre of the wheel — this sprite is rotated around its centre at runtime, so
any offset makes it wobble. The rim spokes must be rotationally symmetric.
Nothing else in frame: no fender, no axle, no car body, no shadow, no highlight streak
implying a fixed light on the rim, no background.
```

### C3 — `vehicle/driver_body.png` — 256×256
```
[BLOCK 0]
ASSET: Driver torso sprite, 256x256, transparent background.
A cartoon driver's SEATED BODY ONLY — NO HEAD, NO NECK ABOVE THE COLLAR. Flat side view
facing right. Red-and-white striped shirt or plain #E53935 tee, blue #1976D2 trousers,
one arm forward gripping an invisible steering wheel, the far arm hidden. Chunky
simplified cartoon anatomy, thick #2B2118 outline. Torso vertical, hips at the bottom
edge. The neck ends in a clean flat horizontal cut at the collar so a separate head
sprite can attach there. No head, no face, no hat, no seat, no vehicle, no shadow,
no background.
```

### C4 — `vehicle/driver_head.png` — 192×192
```
[BLOCK 0]
ASSET: Driver head sprite, 192x192 SQUARE, transparent background.
A cartoon man's HEAD AND NECK ONLY, flat side profile facing RIGHT. Cheerful grinning
expression, one visible eye, big nose, stubble-free, wearing a red #E53935 baseball cap
with the peak pointing right. Light skin #FFCC80 with #E0A060 shade. Thick #2B2118
outline.
CRITICAL GEOMETRY: Position the head so the BASE OF THE NECK sits at the exact CENTRE of
the square frame, with the skull filling the upper half. The head is rotated around the
frame centre at runtime to simulate the head bobbing and whipping on impact, so the neck
joint must be the frame centre.
No body, no shoulders below the neck stub, no helmet, no shadow, no background.
```

### C5 — `vehicle/jeep_suspension.png` — 128×64
```
[BLOCK 0]
ASSET: Suspension arm sprite, 128x64, transparent background.
A single short cartoon shock absorber / trailing arm: dark grey #37474F metal cylinder
with a chrome #CFD8DC piston shaft, a coil spring wound around it, and a round mounting
bolt eye at each end. Perfectly horizontal, drawn side-on, spanning the full width of the
frame with the two bolt eyes centred on the left and right edges. Thick #2B2118 outline.
No car, no wheel, no shadow, no background.
```

**Additional vehicles** — re-run C1 with these body descriptions, keeping C2–C5 (or a
matched wheel):
`MONSTER TRUCK`: tall boxy blue #1976D2 cab, huge arches, roof lightbar. Wheel at 384×384.
`MOTORBIKE`: minimal orange frame, forks, tiny seat, no cabin. Two 192×192 wheels.
`SCHOOL BUS`: long yellow #FDD835 box, window row, stop sign. Body 960×360.
`TANK`: olive #558B2F hull + turret; wheels replaced by a tileable track texture.

---

# BATCH D — Pickups & Collectibles

### D1 — `pickups/coin_sheet.png` — sprite sheet, 8 frames
```
[BLOCK 0]
ASSET: Sprite sheet, 1024x128, containing exactly 8 frames in ONE HORIZONTAL ROW, each
frame exactly 128x128, transparent background, NO gaps, NO padding, NO grid lines, NO
frame numbers, NO borders between frames.
Animation: a gold coin spinning a full 360 degrees around its vertical axis, one frame
every 45 degrees. Frame 1 is the full circular face (gold #FFD54F with #FFA000 rim and a
raised star emboss). Frames 2-3 progressively narrow into an ellipse. Frame 4 is an
almost edge-on thin vertical sliver showing the coin's #FFA000 thickness. Frames 5-8
mirror back out to the full face. Each coin is centred in its own frame and the same size.
Thick #2B2118 outline. No shadow, no sparkle particles, no background.
```

### D2 — `pickups/fuel_can.png` — 192×192
```
[BLOCK 0]
ASSET: Fuel can pickup, 192x192, transparent background.
A classic cartoon jerry can in bright red #E53935, flat side view, upright: rounded
rectangular body, an X-shaped embossed rib on the face, a chunky black #212121 carry
handle on top and a short angled spout. Thick #2B2118 outline, glossy top-left highlight.
Centred with an even margin. No fuel symbol text, no letters, no shadow, no background.
```

### D3 — `pickups/gem.png` — 192×192
```
[BLOCK 0]
ASSET: Gem currency pickup, 192x192, transparent background.
A single cartoon cut diamond in vivid cyan #00E5FF, flat front-facing view: hexagonal
brilliant cut with a flat top table, angled crown facets and a pointed pavilion below.
Facets shaded in bands from #B2EBF2 highlight to #0097A7 shade, one bright white specular
star on the top-left facet. Thick #2B2118 outline. Centred, even margin. No sparkle
particles, no shadow, no background.
```

### D4 — `pickups/boost.png` — 192×192
```
[BLOCK 0]
ASSET: Nitro boost pickup, 192x192, transparent background.
A cartoon nitrous bottle lying horizontally: glossy #1976D2 blue cylinder with chrome
#CFD8DC end caps and a brass valve, plus a bold stylised lightning bolt shape in yellow
#FFD54F embossed on the side. Thick #2B2118 outline. Centred, even margin. No text,
no shadow, no background.
```

---

# BATCH E — UI

### E1 — `ui/pedal_gas.png` — 320×320
```
[BLOCK 0]
ASSET: On-screen gas pedal button, 320x320, transparent background.
A chunky rectangular metal foot pedal seen at a slight top-down tilt: brushed silver
#CFD8DC face with a 2x3 grid of round grip holes, a thick dark #607D8B bevelled edge and
a soft top-left highlight. Rounded corners, tactile and pressable-looking, filling the
frame with a small margin. Absolutely NO text, NO letters, NO word "GAS", NO arrow, NO
icon on the face. No shadow, no background.
```

### E2 — `ui/pedal_brake.png` — 320×320
```
[BLOCK 0]
ASSET: On-screen brake pedal button, 320x320, transparent background.
Identical construction to a metal foot pedal — chunky rectangle, slight top-down tilt,
2x3 grid of round grip holes, thick bevelled edge, rounded corners — but tinted warm
red-grey: face #EF9A9A over a #B71C1C bevel. Fills the frame with a small margin.
Absolutely NO text, NO letters, NO word "BRAKE", NO icon on the face. No shadow,
no background.
```

### E3 — `ui/gauge_face.png` — 256×256
```
[BLOCK 0]
ASSET: Analogue gauge dial face, 256x256 SQUARE, transparent background.
A circular cartoon instrument dial: cream #ECEFF1 face inside a chrome #CFD8DC bezel
ring. Around the lower 270 degrees, a ring of small tick marks with slightly longer major
ticks; the final quarter of the arc is a red #E53935 danger zone band. A small dark
#37474F hub dot at the exact centre. The dial is a PERFECT CIRCLE PERFECTLY CENTRED in the
square frame at ~96% of the frame width. Absolutely NO needle, NO pointer (added
separately), NO numbers, NO text, NO labels. No shadow, no background.
```

### E4 — `ui/gauge_needle.png` — 256×256
```
[BLOCK 0]
ASSET: Gauge needle, 256x256 SQUARE, transparent background.
A single slim tapered pointer in red #E53935 with a #B71C1C edge and a small dark grey
#37474F round pivot boss.
CRITICAL GEOMETRY: the pivot boss centre must be the EXACT CENTRE of the square frame,
and the needle must point straight UP (12 o'clock) from that centre, its tip reaching
about 90% of the way to the top edge. The tail stub extends only a few pixels below the
pivot. This sprite is rotated about the frame centre at runtime.
Nothing else in frame: no dial, no ticks, no numbers, no text, no shadow, no background.
```

### E5 — `ui/fuel_bar_frame.png` — 512×128
```
[BLOCK 0]
ASSET: Fuel bar container, 512x128, transparent background.
An empty horizontal progress-bar shell: a rounded-rectangle chrome #CFD8DC frame with a
#78909C bevel and a hollow, fully TRANSPARENT interior well (the fill is drawn behind it
at runtime). Frame border thickness about 12px. Spans the full frame width with a small
margin. Absolutely NO fill inside, NO gradient inside, NO tick marks, NO text, NO fuel
icon, NO needle. No shadow, no background.
```

### E6 — `ui/fuel_bar_fill.png` — 512×128
```
[BLOCK 0]
ASSET: Fuel bar fill texture, 512x128, transparent background.
A solid horizontal rounded-rectangle bar filled with a vertical gradient from bright
yellow-green #CDDC39 at the top through #AFB42B to #827717 at the bottom, with a soft
white glossy highlight streak along the upper third. Uniform left to right so it can be
horizontally clipped to any percentage with no visible seam or shape change. No frame,
no border, no bevel, no text, no shadow, no background.
```

### E7 — `ui/icon_sheet_*.png` — one 256×256 file each
Run this template once per icon, substituting `ICON`:
```
[BLOCK 0]
ASSET: UI icon, 256x256, transparent background.
A single chunky cartoon glyph: ICON. Rendered as a solid, high-contrast, instantly
readable shape with a thick #2B2118 outline and a subtle top-left highlight. Centred in
the frame with a generous even margin, occupying ~70% of the frame. No circular button
plate behind it, no panel, no text, no letters, no shadow, no background.
```
`ICON` values: `a right-pointing play triangle in white`
· `two vertical pause bars in white`
· `a cogwheel settings gear in silver #CFD8DC`
· `a house home shape in #FFD54F`
· `a circular restart arrow in white`
· `a left-pointing back chevron in white`
· `a speaker with sound waves in white`
· `a speaker with a diagonal slash through it in white`
· `a five-pointed star in gold #FFD54F`
· `a chequered black-and-white racing flag on a short pole`
· `a red map-pin checkpoint marker`
· `a trophy cup in gold #FFD54F`
· `a shopping cart in #CFD8DC`
· `a spanner and screwdriver crossed, in #CFD8DC`

### E8 — `ui/panel.png` — 512×512
```
[BLOCK 0]
ASSET: 9-slice UI panel, 512x512, transparent background.
A rounded-rectangle dialog panel: warm wood-brown #6D4C41 outer border about 40px thick
with a #4E342E bevel, and a flat cream #FFF8E1 interior. Corners are identical and
rotationally symmetric, and the four edges are perfectly uniform along their length so
the panel can be 9-slice stretched to any size without distortion. Fills the whole frame.
No text, no icons, no buttons, no ornament, no shadow, no background.
```

---

# BATCH F — Particle FX

### F1 — `fx/dust_sheet.png` — sprite sheet, 6 frames
```
[BLOCK 0]
ASSET: Sprite sheet, 768x128, exactly 6 frames in ONE HORIZONTAL ROW, each frame exactly
128x128, transparent background, NO gaps, NO padding, NO grid lines, NO borders,
NO numbers.
Animation: a puff of dirt dust expanding and dissipating. Frame 1 is a small dense
opaque cluster of tan #A1887F cloud lobes. Each subsequent frame is larger, softer, more
ragged and more transparent, until frame 6 is a large faint wisp at roughly 15% opacity.
Every puff is centred in its own frame and grows about the centre point. Soft cartoon
cloud lobes, no outline. No ground, no shadow, no background.
```

### F2 — `fx/smoke_sheet.png` — sprite sheet, 6 frames
```
[BLOCK 0]
ASSET: Sprite sheet, 768x128, exactly 6 frames in ONE HORIZONTAL ROW, each frame exactly
128x128, transparent background, NO gaps, NO padding, NO grid lines, NO borders,
NO numbers.
Animation: an exhaust smoke puff rising and thinning. Frame 1 is a small tight dark grey
#616161 cloud ball. Successive frames expand, drift slightly upward within the frame,
lighten toward #BDBDBD and fade, ending frame 6 as a large faint wisp at ~15% opacity.
Soft rounded cartoon cloud lobes, no outline. No background.
```

### F3 — `fx/spark.png` — 64×64
```
[BLOCK 0]
ASSET: Single spark particle, 64x64, transparent background.
One small four-pointed star flare with a bright white-hot #FFFFFF core fading through
#FFD54F to a transparent #FF6F00 outer glow. Perfectly centred, radially symmetric,
soft additive-glow look with no outline. Nothing else in frame, no background.
```

### F4 — `fx/mud_splat.png` — 256×256
```
[BLOCK 0]
ASSET: Mud splatter decal, 256x256, transparent background.
An irregular organic splat of wet dark brown mud #5D4037 with #8D6E63 highlights: a
blobby central mass with radiating tendrils and a scatter of small satellite droplets.
Centred, filling ~80% of the frame. Glossy wet cartoon look, no outline. No shadow,
no background.
```

### F5 — `fx/water_splash.png` — 256×256
```
[BLOCK 0]
ASSET: Water splash sprite, 256x256, transparent background.
A cartoon crown-shaped water splash rising upward from the bottom edge: translucent
#4FC3F7 to #B3E5FC body with white #FFFFFF foam caps and a scatter of round droplets
flung above it. Symmetric, centred horizontally, no outline. No water surface line,
no shadow, no background.
```

---

# BATCH G — Track Props

Each **transparent PNG**, drawn standing on an invisible baseline at the **bottom edge**
of the frame (so I can plant them on the terrain).

```
[BLOCK 0]
ASSET: Track prop, SIZE, transparent background.
DESCRIPTION
Pure flat side elevation. Thick #2B2118 outline, full saturation, top-left lighting.
The object rests on an invisible flat baseline exactly at the BOTTOM EDGE of the frame —
draw NO ground, NO grass, NO soil, NO shadow beneath it. Centred horizontally with a
small margin. No background.
```
| File | SIZE | DESCRIPTION |
|---|---|---|
| `props/cone.png` | 128×192 | An orange #FF6F00 traffic cone with two white reflective bands and a black square base. |
| `props/tyre_stack.png` | 192×192 | A stack of three worn black #212121 tyres lying flat on top of each other. |
| `props/crate.png` | 192×192 | A square wooden #A1887F crate with darker #6D4C41 plank lines and corner braces. |
| `props/barrel.png` | 160×224 | An upright rusty red-brown metal barrel with three horizontal ribs. |
| `props/rock_small.png` | 192×160 | A single rounded grey #757575 boulder with faceted lit top-left planes. |
| `props/bush.png` | 224×160 | A low rounded leafy green #558B2F bush with a few small red berries. |
| `props/flag_checkpoint.png` | 128×384 | A tall thin grey pole with a triangular red #E53935 pennant flying to the right at the top. |
| `props/flag_finish.png` | 160×384 | A tall thin grey pole with a rectangular black-and-white chequered flag at the top. |
| `props/signpost.png` | 224×256 | A wooden post with a blank arrow-shaped sign board pointing right. Absolutely no text or letters on the board. |
| `props/ramp.png` | 384×192 | A wooden take-off ramp: a right-angled triangular wedge rising to the right, plank-textured deck, side support struts. |
| `props/bridge_plank.png` | 256×64 | A single horizontal weathered wooden plank with visible grain and a bolt at each end, for building rope bridges. |
| `props/log.png` | 320×128 | A horizontal fallen tree log, brown bark with concentric ring end grain visible on the right end. |

---

# BATCH H — Meta / Store screens (do these last)

### H1 — `ui/logo.png` — 1024×512
```
[BLOCK 0]
ASSET: Game logo, 1024x512, transparent background.
A bold chunky cartoon game-logo lockup reading exactly the two words "HILL CLIMB" on the
first line and "RACER" on the second, in a heavy rounded extra-bold sans-serif with a
strong upward arc, thick cream #FFF8E1 letter faces, a chunky #2B2118 outline, and a
warm orange #FF6F00 extruded 3D bottom edge. Slight perspective tilt on the type is fine.
Spell the words exactly as given, with no extra words, no tagline and no subtitle.
Centred, transparent background, no panel, no shadow.
```
> ⚠️ Image models mangle text. Expect to redo this or set the title in HTML/CSS instead.
> **Recommendation: skip H1 and let me render the title with web fonts.**

### H2 — `ui/garage_bg.png` — 2048×1024
```
[BLOCK 0]
ASSET: Garage / upgrade screen background, 2048x1024, opaque, fills the frame.
The interior of a cheerful cartoon workshop seen in flat side elevation: corrugated
#78909C metal walls, a concrete #90A4AE floor, a pegboard of hanging tools, a red
toolbox, stacked tyres in the corners, a hanging work lamp casting a warm pool of light
in the centre. Composition is deliberately EMPTY and uncluttered across the middle 60% of
the frame — that space is reserved for the vehicle and UI. Slightly desaturated and
low-contrast so foreground UI reads clearly. No vehicle, no characters, no text,
no signage, no letters.
```

---

## File tree the code expects

```
assets/
  background/  sky.png  hills_far.png  hills_mid.png  trees_near.png  foreground_grass.png
  terrain/     grass_top.png  dirt_body.png  rock_deep.png
  vehicle/     jeep_body.png  jeep_wheel.png  jeep_suspension.png
               driver_body.png  driver_head.png
  pickups/     coin_sheet.png  fuel_can.png  gem.png  boost.png
  ui/          pedal_gas.png  pedal_brake.png  gauge_face.png  gauge_needle.png
               fuel_bar_frame.png  fuel_bar_fill.png  panel.png
               icon_play.png  icon_pause.png  icon_gear.png  ...
  fx/          dust_sheet.png  smoke_sheet.png  spark.png  mud_splat.png  water_splash.png
  props/       cone.png  tyre_stack.png  crate.png  ...
```

## QA checklist before you hand an asset to the engine

1. **Alpha present?** Open it — no white or magenta box behind the subject.
2. **Wheel/needle/head centred?** Overlay a centre crosshair. Off by >2px = re-do.
3. **Background tiles?** Duplicate, flip one copy beside the other — no visible seam.
4. **Terrain tiles 4-way?** Same test vertically.
5. **Sprite sheet frames evenly spaced?** Slice at exactly `width/8` and check drift.
6. **No baked shadow** under any object sprite.
7. **Readable at 25% zoom?** If detail mushes into noise, simplify and re-run.
8. **Light from top-left** on every asset in the batch.

## Priority order

Ship a playable build with **A1–A3, B1–B2, C1–C2** (7 assets) — that's sky, hills,
terrain, chassis, wheel. Everything else layers on afterwards without code changes.
