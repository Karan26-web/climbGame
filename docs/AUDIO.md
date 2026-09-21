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

- the game ships and runs today with **zero audio files** (that is the current state),
- dropping files in makes it better with no code change,
- `file://` (no server) always falls back to synth, which is fine and expected.

## The slots

| File (`assets/audio/…`) | Fires when | Wanted character |
|---|---|---|
| `coin.webm` | coin picked up | short, bright, ~80 ms, must survive firing 6× in a second |
| `gem.webm` | gem (+25) | same family as coin, a third up, a touch longer |
| `star.webm` | a star lands on the results screen | sparkle, ~250 ms |
| `fuel.webm` | fuel can | mechanical *clunk-glug*, not a chime — it is a different kind of reward |
| `boost.webm` | boost pickup | whoosh with low-end push, ~500 ms |
| `check.webm` | checkpoint crossed | two-note rise, **must cut through engine noise**, ~300 ms |
| `land.webm` | soft landing (impact > 320) | dirt thump, dry, ~150 ms |
| `thud.webm` | hard landing (impact > 760) | heavier, with suspension bottom-out |
| `crash.webm` | run-ending crash | metal + dirt, ~700 ms, no comedy |
| `flip.webm` | flip / big air banked | rising sweep, celebratory |
| `click.webm` | any button | 40 ms tick, quiet |
| `win.webm` | stage cleared | 1.5–2 s jingle, resolves upward |
| `over.webm` | stage failed / out of fuel | 1–1.5 s, falls, **not** a joke sound |
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
