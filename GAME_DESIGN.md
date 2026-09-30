# Climb — objective and pathway design

What the game is now, why, and how to author more of it.

## The objective

**Before (v1):** an endless procedurally-noised hill climb. Drive until the fuel ran out.

**Before (v2):** eight authored stages with checkpoints, three stars, a par time and a coin
goal — a racer with something to finish.

**Now (2026-09-30):** one **mission** — a road cut by seven **chasms**, and the game is
about the **distance formula**. The mission is the plain gap and the six Pythagorean
triples in order (see "Endless gets chasms too"); three **hearts** are the only resource,
a wrong plank costs one, and the run ends at a chequered gate with *YOU DID IT!* — or,
out of hearts, with two ways on: back to the lesson, or play again. There is no fuel, no
clock, no coins, no pickups: nothing on the screen but the hearts, the road and the
question. The game does **not** teach the formula; it sits inside the lesson that does,
so there is no hint after a miss either.

At each chasm, one continuous sequence (`REVEAL` in the GAME module, each beat with its
own cue):

1. **The stop.** The moment the truck is within braking distance of its hold the driver
   stands on the brake and keeps it there: a planned hard stop (`STOP_DECEL`, ~12 m/s²)
   with the tyre screech and the tyres scrubbing on gravel under it, dust off both tyres
   the whole way, and as it stands, the air brakes hiss off, a thud through the springs,
   and dust bursting forward off the wheels. It stands exactly on its mark.
2. **The generator appears** — the plank machine rises out of the road ahead of the
   truck, hydraulics hissing, grass and dust off its feet, a clank as it seats.
3. **The points appear** — the two lips are plotted, one after the other, orange beads
   with a dashed span between them.
4. **The plane** is drawn in behind them — one unit is 72 world px, a frosted pane, a rule
   per unit — then its axes.
5. **The coordinates light up** — each point's label lands beside it with a pop and an
   orange glow that dies over a second: the thing to read is here.
6. **The question**, said the way a friend would: *Let's pick the right length for the
   plank!* (after a miss: *Let's try another length for the plank.*) Then the console
   and ruler arrive — the first thing that can be touched.

The ruler: a **value box and a red button** on a little console. The button stretches a
cream **ruler** out of the box (14 marks, or 21 once the big triples arrive); tapping a
mark lights it and shows it in the box; the button becomes GO and cuts the plank.
(Keyboard: Enter opens and confirms, ↑/↓ or typed digits move the mark.) Lengths already
tried are crossed out. At the **first gap of a run** each step is nudged: a breathing glow
on the very control (the red button, the ruler, GO) and one line —
*Tap the red button to open the ruler / Tap the number of units the plank needs / Tap GO
to cut the plank*. It speaks to the interaction, never to the maths, and it is gone by
the second gap (`G.learned`, per run).

**GO hides the plane.** The moment the plank is ordered the sheet, rules, axes and the
dashed span fade, and only the two points and their coordinates stay — so the board
being cut, swung across and fitted between them is the whole picture. The plane comes
back with the question after a miss.

Then the plank decides:

| Answer | What the plank does | What the car does | Then |
|---|---|---|---|
| **exact** | its top edge runs lip to lip | drives across; `PERFECT FIT!`, `FIRST TRY!` | the points fade, the plank stays for good |
| **any other mark** | one of the two below, by geometry | | |
| **too short** | starts on the near lip, aims at the far one, sags, ends in the air | the front wheel runs off the end, the board gives way and pivots into the pit, the car goes with it | a heart breaks; fade to black, car reset on the lip, the question back with **new coordinates** for the same hole |
| **too long** | will not fit between the lips, so it wedges — near end on the lip, far end jammed against the far wall √(L²−dx²) below it: a chute | slides down, the nose meets the wall, the car pitches over onto its roof | same |

A wrong answer costs **a heart**, and nothing else does — not a roll on the road, not a
crash (a crash puts the truck back on the last safe ground, `TRY AGAIN!`). Three hearts
gone ends the run: *OUT OF HEARTS!*, with **BACK TO THE LESSON** and **PLAY AGAIN**. The
lesson button goes to `G.LEARN_URL` / `?learn=<url>`; with neither set it tells an
embedding page (`postMessage { type: 'climbgame:learn' }`) and goes back a page.

Every one of the three outcomes is **geometry, not a verdict**: the plank is laid into the
physics surface and the same rigid-body car drives on it. The only scripted parts are the
two nudges that make the physics honest at this scale — a board that gives way kills the
car's upward momentum (`Gaps.boardGives`), and a nose that meets a wall pitches the car
over (`Gaps.wallFlip`) — and those live in the DOM-free GAPS module so the bot proves the
very behaviour the player meets.

### The lesson in the road

The teaching lives in [learn/](learn/) — *Distance Formula — Swifty's Adventure*, the
sister project (github.com/aniketchauhan-star/distance-formula), vendored whole and
opened **inside** the game. The first time a player ever reaches a chasm, the truck
stops as always and then, before the machine rises, the game says why the road needs the
maths — three lines on the **instruction plate** (`assets/ui/instruction_panel.webp`,
drawn as a 9-slice by `R.plate`: cream board, navy rim, two screws, hazard tabs — the
machine's own livery), each with the thing it names lit (`INTRO` in the GAME module; a
tap, Enter or the line's own time moves it on):

1. *Oops, the road is broken!* — the hole outlined in marching hazard dashes, a warning
   badge bobbing over it.
2. *To cross this gap, we need to know the distance between its two ends.* — the two lips
   land as points, ringed in light, the dashed span between them.
3. *Let's explore how to find that on a coordinate plane!* — the plane comes up behind
   them.

Then the lesson fades up over the whole screen (an `<iframe>` on `learn/index.html?embed=1`,
fetched unseen under the three lines so it is ready when they end; the game's sound
ducks under it). Swifty's 62 screens end on *Let's head back and bridge that gap!*, the
lesson tells the page it is over (`learn/js/embed.js`, a `postMessage`), the overlay
fades, and the question is asked exactly as it always is — machine, points, plane,
coordinates, ruler — the reveal starting under the fade so the machine rises as the road
comes back.

It happens once per **visit**: every load of the page has the lesson at its first chasm
(these are shared classroom devices, so nothing about it is remembered between visits),
and PLAY AGAIN within the visit goes straight to the question. `?lesson=0` never opens it
(the screenshot tools pass this). **BACK TO THE LESSON** on
the end screens opens the same overlay, and a lesson finished from there starts a fresh
run. A lesson that never reports itself up (the `learn/` folder missing beside the game)
is put away after twelve seconds and a *CONTINUE* is offered instead — the road never
waits on it. [learn/EMBED.md](learn/EMBED.md) lists the three small edits the vendored
copy carries over upstream, for the next re-sync.

### The question

The answer is **measured on the ruler**, one unit at a time, so every chasm's distance is
a whole number — a horizontal gap, or a Pythagorean triple laid on its side — and
`CG.Gaps.question` throws at load if a stage author plots a gap whose distance is not
whole (or is longer than the ruler). Every mark on the ruler is a possible answer, so
there are no designed distractors: a child who thinks 4 + 3 = 7 lays a 7 and watches it
wedge.

The ruler comes in two lengths: 14 marks (`CG.Gaps.RULER`) for stages 1–4, where the
longest gap is 13, and for endless's plain first gap; 21 (`CG.Gaps.RULER_MAX`) from
stage 5 on and for every endless gap after the first, where the big triples reach 20. Each runs one past the
longest gap it serves, so even that gap has a too-long plank. The length belongs to the
stage (`ruler: 21` in its entry), never to the gap — a ruler that ended just past the
answer would give it away. After a miss there is no hint: the question comes back with
new coordinates for the same hole, and a heart fewer.

Surds (√58) were in an earlier draft with a four-answer panel; a ruler cannot offer them,
and the reference design asks "how *many* units", so they are out. If they come back it
will be as a second, √-graduated ruler on a later stage.

### The curriculum

Stage plans carry chasms as `{ c: [x1, y1, x2, y2] }`. The game uses the six Pythagorean
triples with a hypotenuse of 20 or less:

| Triple | Slope laid long side down | Runs |
|---|---|---|
| 3-4-5, 6-8-10, 9-12-15, 12-16-20 | 37° (one shape, ×1 ×2 ×3 ×4) | downhill only |
| 5-12-13 | 23° | both ways |
| 8-15-17 | 28° | both ways |

The one physical constraint is the plank's slope: the car climbs a sustained 30° at most,
so the only **uphill** triples are 5-12-13 and 8-15-17. The 3-4-5 family always runs
downhill, and its two big members only on the long side: 12-16-20 laid on its short side
(53°) is a drop the truck noses into (3-4-5 at 53° is short enough to survive). The
tallest plane, 12-16-20's twelve rows of drop, is what sets the question camera's zoom
floor (`CG.Gaps.MIN_ZOOM`, 0.34) — it has to fit a 16:9 screen whole with two lines under
the question. Most lips are plotted *below* the x-axis so the orange number line floats
above the gap, as in the reference art; the tall ones put the origin between the lips,
where it costs the plane no rows.

Stage 1 is plain. Each stage after it brings in one new triple, smallest hypotenuse
first, and reviews the ones before it:

| Stage | Teaches | Example lips |
|---|---|---|
| 1 MEADOW START | distance along a line: same y, count across | (−2, −2) → (3, −2) = 5 |
| 2 BLOSSOM TRAIL | the first slope, downhill 3-4-5 | (−2, −1) → (2, −4) = 5 |
| 3 ORCHARD CLIMB | twice the size: 6-8-10 | (−5, 2) → (3, −4) = 10 |
| 4 SUNSET RIDGE | the long climb, 5-12-13 uphill; 3-4-5 on its short side | (−6, −2) → (6, 3) = 13 |
| 5 WIND GAP | 3-4-5 scaled up: 9-12-15 (the long ruler arrives) | (−6, 2) → (6, −7) = 15 |
| 6 THUNDER STEPS | the steeper climb: 8-15-17, both ways | (−7, −1) → (8, 7) = 17 |
| 7 HIGH MEADOW | the big drop: 12-16-20, after 5 and 10 | (−8, 3) → (8, −9) = 20 |
| 8 GOLDEN SUMMIT | all six triples in one run | (−8, 4) → (8, −8) = 20 |

## The pathway system

The terrain used to be five octaves of value noise. Difficulty came from turning the
amplitude up with distance, which produces *rougher* ground but never a *designed*
moment — you cannot build a jump out of noise, and you certainly cannot build the same
jump twice.

It is now a **sequence of authored parts**. A part is a height curve `h(t)` measured
relative to wherever the previous part ended, and the contract that makes them
interchangeable is:

```
h(0) = 0        h'(0) = h'(1) = 0
```

Every part enters and leaves level, so any two parts join without a kink the wheels can
catch on. *Inside* a part anything goes — a kicker wants a sharp lip, a drop-off wants a
cliff — and those discontinuities always land away from a join.

The thirteen parts, and what each one is actually for:

| Part | Asks the player to | Tags |
|---|---|---|
| `start` / `flat` / `finish` | settle, breathe, stop | rest |
| `rollers` | modulate the throttle — flooring it bounces the nose and loses drive | flow |
| `washboard` | hold a line while the suspension chatters | flow |
| `climb` | carry momentum into a long ascent | grind |
| `descent` | not over-commit to free speed | flow |
| `crest` | commit over a blind brow | flow |
| `basin` | survive the compression at the bottom | flow |
| `kicker` | get air — the ground falls away at the lip | air |
| `gap` | clear a hole, or pay for missing it in time | air, risk |
| `stairs` | climb steps with momentum, not throttle | grind, risk |
| `dropoff` | land a cliff nose-up | air, risk |
| `shelf` | breathe — this is where checkpoints live | rest |
| `chasm` | **stop, plot, answer** — the distance-formula gap (see above) | rest, math |

`kicker`, `gap`, `stairs` and `dropoff` still exist and still pass the slope budget, but no
current plan uses them: the airtime and the crashes they produce pull attention away from
the question, which is the point of the game now. `chasm` is in `NO_LAND`, so a plan that
puts one straight after an air part gets a flat run-out inserted.

Tags are how parts are classified (`air`, `risk`, `grind`, `rest`, `math`); the world
builder used to hang pickups off them, and now places nothing but the checkpoint flags.

## The slope budget

These numbers come from `tools/sim_test.js`, not from taste. The car:

- climbs a sustained **30°**, stalls into wheelspin past **35°**
- tops out at **76 km/h**, brakes from that in **23 m**
- flips if it lands nose-down from height

So every part keeps its sustained slope under 30°. The only ground steeper than that is a
**take-off lip** (short, arrived at with speed, exits downhill) or a **cliff face** (which
the car flies off, never up). Each builder computes its own length from its height with
`fit(H, k, tan)` rather than carrying a hand-tuned constant, so a part cannot be made
unclimbable by turning its difficulty up.

Two rules exist because the bot found the bug, not because anyone predicted it:

1. **No pit is a trap.** `gap` used to have a 57° far wall: clear the jump and it was
   fine, miss it and the run was simply over, with no way out and no way to tell why. It
   now has a ≤29° escape ramp. Missing a jump costs time, never the run.
2. **Landing insurance.** A part that rises hard immediately after an air part flips a
   car that is coming down fast — a crash the player could not have avoided. `Track.build`
   now inserts a flat run-out between them automatically, so a careless plan cannot
   create that trap.

## Authoring a stage

The stages are a dev flow now (`?stage=N`; PLAY starts the mission), kept for the bot
and for authoring. Add an entry to `CG.Stages` in [index.html](index.html):

```js
{ id: 9, name: 'NEW CLIMB', sub: 'one line of intent', seed: 9901, d: 0.55,
  ruler: 21,                       // only if a gap is longer than 13
  plan: ['start', { c: [-3, -1, 4, 2] }, 'rollers',
         'CP', 'shelf', { c: [-2, 2, 3, 2] }, 'crest',
         'FINISH', 'finish'] }
```

- A chasm is `{ c: [x1, y1, x2, y2] }`; `x2` must exceed `x1`; keep uphill slopes under
  0.6. Two to six per stage; the first one soon after `start`, so the stage opens on its
  reason to exist.

- `d` (0–1) scales every part's amplitude. It is the difficulty dial.
- `seed` fixes the stage forever: same track, same props, every replay.
- `'CP'` marks the **next** part as a checkpoint flag — it should be a `shelf`.
- `'FINISH'` puts the line at the start of the part after it, always the long `finish`.
- Shape the plan like a piece of music: teach → repeat harder → checkpoint → complicate →
  checkpoint → climax → finish. Never open with the hardest thing in the stage.

Then **run the bot**:

```
node tools/stage_test.js        # all stages
node tools/stage_test.js 9      # just this one
```

It drives every stage with the real physics and the real game rules (a crash puts the
truck back on the last safe ground at no cost) and reports whether the stage is
finishable at all, at what time, and how often it had to be put back on its wheels. At
every chasm the bot answers right first time (it pays the 1.5 s plank animation, as a
player who is right does). It then **lays every mark on the ruler at every chasm**: the
exact one must carry the car to the far side on its wheels, and every other one must put
it in the pit or on its roof — run both with the game's nudges and (`note:` lines)
without them, so it is always clear how much of the lesson is geometry and how much is
script.

Stars are the hearts still held at the line (a clean run is three), so there is nothing
to calibrate. Current state — all eight stages completable, no respawns, every chasm
verified:

```
stage  name            len    time   gaps  respawns
1      MEADOW START    264m   30.8s    3       0
2      BLOSSOM TRAIL   303m   37.8s    4       0
3      ORCHARD CLIMB   380m   44.3s    4       0
4      SUNSET RIDGE    372m   45.8s    4       0
5      WIND GAP        430m   50.1s    4       0
6      THUNDER STEPS   476m   58.9s    5       0
7      HIGH MEADOW     475m   58.6s    5       0
8      GOLDEN SUMMIT   609m   74.9s    6       0
```

## Endless gets chasms too

Endless is a `G.track`-free noise run, so it never reaches `CG.Stages`' authored chasms.
It now gets the same mechanic on its own terms, via `CG.Endless` (index.html, right after
the GAPS module): chasms sit at deterministic, seeded, jittered x-slots — the same
technique `World.features` uses for its ramps — spaced to take roughly 10-20s at a typical
cruising speed, so placement stays a pure function of x rather than a stateful clock, same
as everything else in the file.

Every endless gap is **horizontal** (`[0, 0, dx, 0]`): both lips sit at the same height,
so the spliced part enters and leaves the noise at the height it found, by construction —
no elevation-trend bookkeeping needed, and the distance is automatically a whole number,
same as curriculum stage 1. `dx` is drawn from a small pool early (`[3,4,5]`), widening
after the first few chasms (`[3..10]`), never repeating the previous gap's distance.

The run opens **plain**: the first gap is level, count across, on the short ruler, as it
always was. The next six introduce the triples one per gap, smallest hypotenuse first —
3-4-5, 6-8-10, 5-12-13 (up), 9-12-15, 8-15-17 (up), 12-16-20 — the same order the stages
teach them in, on a fixed unjittered beat so even 12-16-20's 864 px step gets a full slot
to climb back out.

**That is the mission** (`CG.Endless.MISSION`, seven questions). Past the last far lip
the road runs on plain for `FINISH_RUN` px (2600, a few seconds' drive, so the last
crossing is savoured), and there stands the chequered gate: crossing it is the win —
*YOU DID IT!* comes down over a second while the truck rolls to a stop, the hearts still
held come up as stars, and the two ways on are PLAY AGAIN and BACK TO THE LESSON. No
chasm is laid past the gate. The repeating order below (level, level, uphill, uphill,
downhill, downhill, drawn from every triple: 5-12-13 or 8-15-17 up, the 3-4-5 family or
8-15-17 down) is what a longer run would draw from, and is what `ORDER` still describes. A sloped gap leaves the road above or below the noise,
and the exit blend back to it is stretched to `EXIT_RUN` px per px of that step. A big
triple is only picked where the road left before the next slot can stretch it to at
least `EXIT_MIN` (5.5), so a 12-16-20 never lands where the climb back out would be a
wall. The first entry of each pool, the gentlest, is always allowed.

The auto-brake now also plays a one-shot `'brake'` cue (`A.sfx`) the instant it takes
over, layered on the existing continuous tyre-skid audio.

`node tools/shoot_endless_gaps.js [seed]` is `shoot_gaps.js`'s endless counterpart: drives
two chasms back to back (the exact plank across the first, a deliberate wrong answer and
its reset on the second, then the right one), and checks the endless-specific risks — no
`G.track`, the run never mistakes a chasm for a stage finish, consecutive chasms land a
sane distance apart.

## What persists

`localStorage` key `cg_prog`: `{ "<stage id>": { s: stars, t: best time } }` (stages
only), plus `cg_muted`. Stars are a max, time a min — replaying badly never takes
anything away. The mission keeps nothing between runs: the first gap's nudge shows on
every run's first gap, and the lesson on every visit's first chasm.

## Seeing it

`node tools/shoot_gaps.js [stage]` opens the game in headless Chromium (Playwright) and
drives one whole chasm — the stop, the question, the ruler opening and a mark lit, a
short plank (D−2) and its fall, a long plank (D+2) and its flip, the exact plank and the
crossing, plus a portrait phone with the ruler open —
screenshotting each beat into [docs/shots/](docs/shots/). Run it after any change to the
chasm sequence or the renderer; the bot cannot see. Both shot tools open the game with
`&lesson=0`, so the first chasm asks its question instead of opening the lesson — any
script that drives a fresh browser to the first chasm needs the same.

## Languages

Every word on screen — the splash, the title, the stage map, the three intro lines, the
question and its nudges, the floating shouts, the win and out-of-hearts signs, the endless
road markers — is looked up through `T(key)` from [i18n/strings.json](i18n/strings.json),
which holds English (`en`) and Hindi (`hi`). `?lan=hi` (or `?lang=hi`) picks the language;
a code the file lacks, or none, is English, and a key one language lacks falls back to the
English line. Counts go in as `{n}`, and an entry written as `{ one, other }` picks by the
count, so "1 unit" and "3 units" each read right.

The JSON is the file to edit. Because the game ships over `file://`, where `fetch()` is
refused, the table is loaded as a plain script — run `node tools/build_i18n.js` after an
edit to regenerate [i18n/strings.js](i18n/strings.js); it also lists any key a language is
missing. Served over http the game fetches the JSON itself at boot, so there an edit shows
without the build. To add a language, copy the `en` block under its code, translate, and
rebuild. Devanagari (and any script the embedded Latin fonts lack) is drawn in the system's
face; the bouncing title draws such a script a word at a time rather than a letter at a
time, so its vowel signs stay on their consonants, and buttons, signs and straps size
their text by measuring it. The lesson in `learn/` is vendored and still speaks English;
the game passes it `&lan=` in the frame URL for when it learns to.

## Still open

- **Theme per stage.** All eight stages share one art set — now the evening-spring one
  (see [ASSET_PROMPTS_SPRING_EVENING.md](ASSET_PROMPTS_SPRING_EVENING.md), installed via
  `tools/import_theme.py`). A `theme` field on the stage, picking between installed sets,
  is the next step; the loader would need per-theme asset paths and the three sky colour
  constants moved out of the renderer into the theme.
- **Sampled audio.** The slots and the sources are in [docs/AUDIO.md](docs/AUDIO.md).
  The stop and the machine are recordings now; `go`, `wrong`, `heart`, `win`, `over` and
  the pings are still synthesised.
- **Mountain theme.** The reference art is an alpine canyon (pines, snow peaks, a river
  below). The chasm itself already renders as one — vector rock faces with strata on both
  walls, a river-blue valley floor fading up into haze, no visible pit floor — but the
  parallax and terrain textures are still the evening meadow.
  [ASSET_PROMPTS_MOUNTAIN_CANYON.md](ASSET_PROMPTS_MOUNTAIN_CANYON.md) is the prompt sheet
  for the seven files, in the format `tools/import_theme.py` installs.
- **A √ ruler.** Surds are gone with the ruler; a later stage could hand out a second
  ruler graduated in √n for the same gaps.
- **The way back to the lesson.** `G.LEARN_URL` is empty: set it (or pass `?learn=`)
  wherever the game is embedded, or listen for the `climbgame:learn` message.
