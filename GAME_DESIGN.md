# Climb — objective and pathway design

What the game is now, why, and how to author more of it.

## The objective

**Before (v1):** an endless procedurally-noised hill climb. Drive until the fuel ran out.

**Before (v2):** eight authored stages with checkpoints, three stars, a par time and a coin
goal — a racer with something to finish.

**Now:** the same stages, but the route is cut by **chasms**, and the game is about the
**distance formula**. At each chasm:

*(2026-09-21: the player's flow is endless-only — see "Endless gets chasms too" below —
but everything in this section still describes the mechanic itself, which endless now
runs as well.)*

1. The car is eased to a stop on the near lip (the player loses the pedals ~16 m out and
   the driver brakes; a fast arrival meets an invisible barrier in a cloud of dust).
2. A coordinate grid fades in behind the scenery — one unit is 72 world px, a frosted
   pane, white grid lines, an **orange x-axis and a blue y-axis** with arrowheads, ticks
   a number every two units on a white halo, arrowheads at both ends, x/y badges — and the
   two lips are plotted in purple and labelled in white pills sitting on the points, e.g.
   **(−5, −2)** and **(4, −2)**. The title floats in a frosted pill over the grid. The
   clock stops.
3. The question comes up: *How many units should the plank be?* Beside the jeep, at
   hood height, sit a **value box and an amber ▶ button**. The button stretches a cream
   **ruler** up out of the box, 1 to 14 units; tapping a mark lights it blue and shows it
   in the box; the button turns green and drops the plank. (Keyboard: Enter opens and
   confirms, ↑/↓ or typed digits move the mark.) Lengths already tried are crossed out.
4. The chosen plank pops into being vertically above the jeep, rotates level and slides
   down into the gap. The accelerator comes back. Then the plank decides:

| Answer | What the plank does | What the car does | Then |
|---|---|---|---|
| **exact** | its top edge runs lip to lip | drives across; `PERFECT FIT!`, +30 coins first try (+10 later) | the grid fades, the plank stays for good |
| **any other of the 14** | one of the two below, by geometry | | |
| **too short** | starts on the near lip, aims at the far one, sags, ends in the air | the front wheel runs off the end, the board gives way and pivots into the pit, the car goes with it: `TOO SHORT!` | fade to black, car reset on the lip, question back with that answer crossed out and a hint |
| **too long** | will not fit between the lips, so it wedges — near end on the lip, far end jammed against the far wall √(L²−dx²) below it: a chute | slides down, the nose meets the wall, the car pitches over onto its roof: `TOO LONG!` | same reset |

A wrong answer costs **time, never a life**. The lesson is the reset. A child who runs out
of lives on arithmetic stops playing; a child who watches the plank fall short works out
why.

Every one of the three outcomes is **geometry, not a verdict**: the plank is laid into the
physics surface and the same rigid-body car drives on it. The only scripted parts are the
two nudges that make the physics honest at this scale — a board that gives way kills the
car's upward momentum (`Gaps.boardGives`), and a nose that meets a wall pitches the car
over (`Gaps.wallFlip`) — and those live in the DOM-free GAPS module so the bot proves the
very behaviour the player meets.

### The question

The answer is **measured on the ruler**, one unit at a time, so every chasm's distance is
a whole number — a horizontal gap, or a Pythagorean triple laid on its side — and
`CG.Gaps.question` throws at load if a stage author plots a gap whose distance is not
whole (or is longer than the ruler). Every mark from 1 to 14 is a possible answer, so
there are no designed distractors: a child who thinks 4 + 3 = 7 lays a 7 and watches it
wedge. After a miss the hint pill shows the legs (`4 across and 3 up → √(4² + 3²)`) and
the right triangle is drawn dashed under the hypotenuse on the grid.

Surds (√58) were in an earlier draft with a four-answer panel; a ruler cannot offer them,
and the reference design asks "how *many* units", so they are out. If they come back it
will be as a second, √-graduated ruler on a later stage.

### The curriculum

Stage plans carry chasms as `{ c: [x1, y1, x2, y2] }`. The one physical constraint is the
plank's slope: the car climbs a sustained 30° at most, so the only **uphill** triple is
5-12-13 (23°); 3-4-5 and 6-8-10 always run downhill. Most lips are plotted *below* the
x-axis so the orange number line floats above the gap, as in the reference art. The
eight stages run:

| Stage | Teaches | Example lips |
|---|---|---|
| 1 MEADOW START | distance along a line: same y, count across | (−2, −2) → (3, −2) = 5 |
| 2 BLOSSOM TRAIL | the first slope, downhill 3-4-5 | (−2, −1) → (2, −4) = 5 |
| 3 ORCHARD CLIMB | the long climb, 5-12-13 uphill; 6-8-10 down | (−6, −2) → (6, 3) = 13 |
| 4 SUNSET RIDGE | steeper drops, 3-4-5 on its short side | (−2, −1) → (1, −5) = 5 |
| 5 WIND GAP | triples both ways | (−4, −3) → (8, 2) = 13 |
| 6–8 | every quadrant, up to 6 chasms a stage | (−8, −4) → (4, 1) = 13 |

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

Tags are not decoration: the world builder reads them. An `air` part gets a coin arc
traced along its flight path, a `risk` part gets a gem on the far side, a `grind` part
gets a boost at its foot, and `rest` parts with a checkpoint get a fuel can. The reward
follows the design of the route rather than the dice.

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

Add an entry to `CG.Stages` in [index.html](index.html):

```js
{ id: 9, name: 'NEW CLIMB', sub: 'one line of intent', seed: 9901, d: 0.55,
  par: 60, coins: 300, fuel: 90,
  plan: ['start', { c: [-3, -1, 4, 2] }, 'rollers',
         'CP', 'shelf', { c: [-2, 2, 3, 2] }, 'crest',
         'FINISH', 'finish'] }
```

- A chasm is `{ c: [x1, y1, x2, y2] }`; `x2` must exceed `x1`; keep uphill slopes under
  0.6. Two to six per stage; the first one soon after `start`, so the stage opens on its
  reason to exist.

- `d` (0–1) scales every part's amplitude. It is the difficulty dial.
- `seed` fixes the stage forever: same track, same props, same coins, every replay.
- `'CP'` marks the **next** part as a checkpoint — it should be a `shelf`.
- `'FINISH'` puts the line at the start of the part after it, always the long `finish`.
- Shape the plan like a piece of music: teach → repeat harder → checkpoint → complicate →
  checkpoint → climax → finish. Never open with the hardest thing in the stage.

Then **run the bot** — do not guess `par` and `coins`:

```
node tools/stage_test.js        # all stages
node tools/stage_test.js 9      # just this one
```

It drives every stage with the real physics and the real game rules (three lives,
checkpoint respawns, fuel drain, cans) and reports whether the stage is finishable at
all, at what time, on what fuel margin, and what it collects. At every chasm the bot
answers right first time (it pays the 1.5 s plank animation, as a player who is right
does). It then **lays every mark on the ruler, 1 to 14, at every chasm**: the exact one
must carry the car to the far side on its wheels, and every other one must put it in the
pit or on its roof — run both with the game's nudges and (`note:` lines) without them, so it is always
clear how much of the lesson is geometry and how much is script. It then suggests `par`
and `coins`, calibrated so that:

> **the bot scores exactly one star.**

That is the whole calibration rule. The bot finishes, unhurried, driving the obvious
line with no racing line and no detours. Par is 5% quicker than it manages and the coin
goal is 5% more than it picks up, so the second and third stars cost the player something
the bot has not got. If the bot ever scores 3, the stage has stopped asking for anything
and the tool says so.

Current state — all eight stages completable, no retries, every chasm verified, bot
scores 1 star on each:

```
stage  name            len     time   par   coins/goal   chasms
1      MEADOW START    252m    25.8s   25    222/235      3
2      BLOSSOM TRAIL   287m    31.7s   30    226/235      4
3      ORCHARD CLIMB   370m    38.9s   35    208/220      4
4      SUNSET RIDGE    356m    36.9s   35    238/265      4
5      WIND GAP        414m    42.9s   40    214/225      4
6      THUNDER STEPS   430m    47.1s   45    312/330      5
7      HIGH MEADOW     450m    48.6s   45    418/440      5
8      GOLDEN SUMMIT   569m    61.4s   60    411/430      6
```

Coin totals include the +30 first-try bonus per chasm, so the third star is partly a
maths score: miss two questions on stage 1 and you are 40 coins down on the goal.

The fuel margin curve is the difficulty ramp nobody sees: 1.87× on stage 1 means fuel is
never a thought while you are learning; 1.28× on stage 8 means two failed attempts at a
section and you are driving on fumes.

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

The auto-brake now also plays a one-shot `'brake'` cue (`A.sfx`) the instant it takes
over, layered on the existing continuous tyre-skid audio.

`node tools/shoot_endless_gaps.js [seed]` is `shoot_gaps.js`'s endless counterpart: drives
two chasms back to back (the exact plank across the first, a deliberate wrong answer and
its reset on the second, then the right one), and checks the endless-specific risks — no
`G.track`, the run never mistakes a chasm for a stage finish, consecutive chasms land a
sane distance apart.

## What persists

`localStorage` key `cg_prog`: `{ "<stage id>": { s: stars, t: best time, c: best coins } }`,
plus the existing `cg_best`, `cg_coins`, `cg_muted`. Stars are a max, time a min, coins a
max — replaying badly never takes anything away.

## Seeing it

`node tools/shoot_gaps.js [stage]` opens the game in headless Chromium (Playwright) and
drives one whole chasm — the stop, the question, the ruler opening and a mark lit, a
short plank (D−2) and its fall, a long plank (D+2) and its flip, the exact plank and the
crossing, plus a portrait phone with the ruler open —
screenshotting each beat into [docs/shots/](docs/shots/). Run it after any change to the
chasm sequence or the renderer; the bot cannot see.

## Still open

- **Theme per stage.** All eight stages share one art set — now the evening-spring one
  (see [ASSET_PROMPTS_SPRING_EVENING.md](ASSET_PROMPTS_SPRING_EVENING.md), installed via
  `tools/import_theme.py`). A `theme` field on the stage, picking between installed sets,
  is the next step; the loader would need per-theme asset paths and the three sky colour
  constants moved out of the renderer into the theme.
- **Coin goals are uneven** (175 on stage 4, 675 on stage 8) because gem and star
  placement is still chunk-random. Moving the high-value pickups onto the pathway the way
  the coin arcs already are would make the goals legible.
- **Sampled audio.** The slots and the sources are in [docs/AUDIO.md](docs/AUDIO.md);
  nothing has been downloaded yet. Five new synthesised cues (`plank`, `slam`, `go`,
  `wrong`, `brake`) want samples too.
- **Mountain theme.** The reference art is an alpine canyon (pines, snow peaks, a river
  below). The chasm itself already renders as one — vector rock faces with strata on both
  walls, a river-blue valley floor fading up into haze, no visible pit floor — but the
  parallax and terrain textures are still the evening meadow.
  [ASSET_PROMPTS_MOUNTAIN_CANYON.md](ASSET_PROMPTS_MOUNTAIN_CANYON.md) is the prompt sheet
  for the seven files, in the format `tools/import_theme.py` installs.
- **A √ ruler.** Surds are gone with the ruler; a later stage could hand out a second
  ruler graduated in √n for the same gaps.
- **Explaining the exact answer.** After a correct plank, a one-line worked solution
  (`√(7² + 3²) = √58`) would close the loop for the child who guessed.
