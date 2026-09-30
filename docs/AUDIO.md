# Sound — what is synthesised, what should be sampled, and where to get it

## The rule this follows

**Anything driven by a live value stays synthesised. Anything that fires once gets a file.**

The engine note and the tyre scrub are not sound effects, they are instruments: their
pitch, filter cutoff and gain are written every frame from `rpm`, `engineLoad` and wheel
`skid` ([index.html](../index.html) → `A.drive`). No recording can do that, and every
driving game that tries ends up with a loop that lies about what the car is doing. They
stay in WebAudio, permanently.

The thirteen one-shots are the opposite: they fire once, they always sound the same, and
sampled versions are simply better than three oscillators pretending. They are now
**optional overrides**. `A.loadPack()` reads one manifest, `assets/audio/pack.json`,
which lists the cues that exist:

```json
["click", "coin", "crash", "check", "win", "music"]
```

Only the listed names are fetched (`assets/audio/<name>.webm`), and anything that 404s or
fails to decode silently keeps the synthesised cue. The manifest exists so that a project
with no audio files costs **one** request instead of fourteen 404s in the console — add a
name to it the moment you add the file. So:

- dropping files in makes it better with no code change,
- `file://` (no server) always falls back to synth for these slots, which is fine and expected.

## Recorded cues that ship (`assets/audio/sfx.js`)

A handful of cues are recordings that **do** work over `file://`. `fetch()` is refused
there, but a `<script src>` is not, so `tools/import_sfx.py` trims, loops and levels them
into one generated script, `assets/audio/sfx.js` (`window.CG_SFX = { name: base64 Ogg
Opus }`, mono, 48 kbps — libopus through PyAV), which `index.html` loads ahead of the
game. `A.loadEmbedded()` decodes them
when audio starts. A cue missing from it, or the whole file, keeps its synthesised version.

| Cue | Plays when | Source (all CC0 — see `art_src/audio/SOURCES.md`) |
|---|---|---|
| `brake` | the auto-brake grabs at a chasm: the tyre screech, one held voice (`A.screech`) | `art_src/audio/break.mp3` |
| `skid` | under the screech, from the same instant: the tyres scrubbing to a halt on gravel, a second held voice let go the moment the truck stands (`A.brakeGrab` / `A.skidRelease`) | Freesound 637161, van stopping on gravel |
| `airbrake` | the instant the truck stands: the air brakes hissing off, with a synthesised thud through the springs (`A.brakeStop`) | Freesound 705390, air brake applied |
| `saw_run` + `saw_cut` | the plank machine cuts (`A.saw`) — two loops, the motor pitched up/down for spin-up and spin-down, the cut layered on only while wood is in the blade | Freesound 411222, table saw |
| `lever` | an answer is confirmed: the machine's lever latches | Kenney RPG Audio |
| `tick` | each unit of plank passes the blade — one tick per unit, a semitone higher each time, so the count can be heard | Kenney Impact Sounds |
| `chop` | the cut finishes | Kenney RPG Audio |
| `plank` | the cut board is kicked off the belt | Kenney Impact Sounds |
| `slam` + `poof` | the plank lands across the hole, with the comic dust | Kenney plank impact + Freesound 208111 |
| `sink` | the machine sinks out of the road | Freesound 90143, steam burst |
| `bump` | a fast truck bumps into the machine | Kenney Impact Sounds |

Playback levels live in one table, `SAMPLED` in `index.html`, beside `A.sfx`. To add or
replace one: put the CC0 source in `art_src/audio/`, add a line to `CLIPS` in
`tools/import_sfx.py` (`{'loop': (a, b)}` for a loop, `{'max': s}` to cap a long tail),
run the tool, and record the source in `SOURCES.md`.

## The slots

| File (`assets/audio/…`) | Fires when | Wanted character |
|---|---|---|
| `coin.webm` | *(no longer fired: pickups are gone)* | short, bright, ~80 ms |
| `gem.webm` | a plank fitted (`solveGap`) | same family as coin, a third up, a touch longer |
| `star.webm` | a star lands on the results screen | sparkle, ~250 ms |
| `fuel.webm` | *(no longer fired: there is no fuel)* | — |
| `boost.webm` | boost pickup | whoosh with low-end push, ~500 ms |
| `check.webm` | the question arrives (the reveal's `ask` beat); the end of free play | two-note rise, ~300 ms |
| `land.webm` | soft landing (impact > 320) | dirt thump, dry, ~150 ms |
| `thud.webm` | hard landing (impact > 760) | heavier, with suspension bottom-out |
| `crash.webm` | run-ending crash | metal + dirt, ~700 ms, no comedy |
| `flip.webm` | flip / big air banked | rising sweep, celebratory |
| `click.webm` | any button | 40 ms tick, quiet |
| `win.webm` | stage cleared | 1.5–2 s jingle, resolves upward |
| `over.webm` | out of hearts | 1–1.5 s, falls, **not** a joke sound |
| `music.webm` | first stage start, loops | see below |

`music` goes in the manifest too, and is only fetched if listed.

Music is separate: `A.music(true)` is called once when a stage starts and deliberately
**does not restart between retries** — a loop that reboots on every death is the fastest
way to make a player mute a game. It loads `assets/audio/music.webm`, and if that file is
absent nothing happens at all.

## Where to get them (licence-cleared)

Everything below is **CC0** — public domain, no attribution required, safe in a paid app.
That is the only category I shortlisted; nothing here needs a credit line or a licence
file shipped with the build.

| Pack | Files | Use it for | Link |
|---|---|---|---|
| Kenney — **Impact Sounds** | 130 | `land`, `thud`, `crash` | https://kenney.nl/assets/impact-sounds |
| Kenney — **Interface Sounds** | 100 | `click`, `check` | https://kenney.nl/assets/interface-sounds |
| Kenney — **UI Audio** | 50 | `click` alternates | https://kenney.nl/assets/ui-audio |
| Kenney — **Digital Audio** | — | `coin`, `gem`, `star`, `boost` | https://kenney.nl/assets/digital-audio |
| Kenney — **Music Jingles** | 85 | `win`, `over` | https://kenney.nl/assets/music-jingles |
| OpenGameArt, CC0 filter | — | anything missing, `music` | https://opengameart.org/content/cc0-music-0 |
| Freesound, CC0 filter | — | `fuel` (real jerry-can foley) | https://freesound.org (filter: License = CC0) |

Two sources deliberately **not** on the list: Pixabay and Mixkit. Both are free and both
are fine in practice, but their licences are bespoke ("Pixabay Content License",
"Mixkit Free License") rather than CC0 — they carry redistribution restrictions that
matter the day this is packaged into a store build. Not worth the ambiguity when Kenney
covers the same ground under CC0.

`fuel` is the one slot no CC0 pack covers well. Freesound CC0 "jerry can", "fuel cap" or
"petrol pump" foley is the closest; failing that the synthesised triple-beep it has now is
honestly fine.

## Fetching and converting them

I have **not** downloaded anything — you asked to approve that first. When you want it,
this is the whole job:

```sh
mkdir -p /tmp/cg-audio && cd /tmp/cg-audio
curl -LO https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
curl -LO https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
curl -LO https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip
for z in *.zip; do unzip -qo "$z" -d "${z%.zip}"; done
```

Then audition, pick one file per slot, and convert each to the name the loader expects:

```sh
# mono, 48 kHz, Opus in WebM — small, and decodes everywhere the game runs
ffmpeg -i picked.ogg -ac 1 -ar 48000 -c:a libopus -b:a 64k \
       -af "loudnorm=I=-16:TP=-1.5:LRA=11" assets/audio/coin.webm
```

Conventions worth keeping: one-shots normalised to about **−16 LUFS** so nothing jumps
out over the engine, music to **−20 LUFS** so it sits under everything, and every file
trimmed to start on the transient — a 30 ms lead-in on `coin` is audible as lag when six
of them fire in a row.

Safari still needs a fallback for Opus in some versions. If you care about it, export
`.webm` **and** `.m4a` and add the second extension to the fetch chain in `A.loadPack()` —
it is a two-line change, and the synth fallback already covers the case until then.

## Testing

The loader is deliberately silent about failures, which makes a typo in a filename
invisible. Check what actually loaded from the console:

```js
Object.keys(CG.Audio.files)    // sampled and in use
Object.keys(CG.Audio.missing)  // fell back to the synth
```
