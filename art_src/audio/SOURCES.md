# Recorded sound effects — sources

Every file here is **CC0 (public domain)**: no attribution required, safe in a paid or
store build. Each licence was read on the sound's own page before download, not just
trusted from a search filter. These are source recordings, not shipped: `tools/import_sfx.py`
trims, loops and levels them into `assets/audio/sfx.js`, which is what the game loads.

| Cue | File | Source | Author | Licence |
|---|---|---|---|---|
| `saw_run`, `saw_cut` | `fs411222_iternetcone_makita_table_saw.mp3` | [Freesound 411222](https://freesound.org/people/iternetcone/sounds/411222/) "Small Vintage Makita Jobsite Table Saw" | iternetcone | [CC0](http://creativecommons.org/publicdomain/zero/1.0/) |
| `poof` | `fs208111_planman_poof_of_smoke.mp3` | [Freesound 208111](https://freesound.org/people/Planman/sounds/208111/) "Poof of Smoke" | Planman | [CC0](http://creativecommons.org/publicdomain/zero/1.0/) |
| `sink` | `fs90143_pengo_au_steam_burst.mp3` | [Freesound 90143](https://freesound.org/people/pengo_au/sounds/90143/) "steam_burst.wav" | pengo_au | [CC0](http://creativecommons.org/publicdomain/zero/1.0/) |
| `slam` | `kenney_impactPlank_medium_001.ogg` | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 (`kenney_LICENSE.txt`) |
| `tick` | `kenney_impactMetal_light_001.ogg` | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| `plank` | `kenney_impactWood_light_002.ogg` | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| `bump` | `kenney_impactMetal_medium_001.ogg` | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| `chop` | `kenney_rpg_chop.ogg` | [Kenney — RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |
| `lever` | `kenney_rpg_metalLatch.ogg` | [Kenney — RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |

The Freesound files are the site's HQ previews (128 kbps MP3) — ample for cues that are
resampled to 24 kHz mono, and a copy of a CC0 work is as free as the original.

## How each was chosen

Candidates were found by searching Freesound with the licence filter set to Creative
Commons 0 (sorted by downloads) and by going through Kenney's CC0 packs, then compared
on spectrograms and measured pitch, loudness and decay:

- **Saw** — of 29 CC0 saw recordings, 411222 has a steady no-load motor (5.0–6.0 s,
  ~340 Hz fundamental) *and* a clean cut through wood (3.2–4.2 s, a ~2.35 kHz screech,
  6–9 dB louder and much brighter) from the same machine, so the two loops match. The
  spin-up and spin-down are made at runtime by ramping the motor loop's playback rate,
  which fits any timing the game asks for.
- **Poof** — 208111 is the most-downloaded CC0 poof (30k+), a two-stage low whump
  that sits under the wood slam instead of fighting it.
- **Sink** — 90143 is a hydraulic-sounding burst of air that dies away over ~0.7 s,
  the length of the machine going down.
- **Kenney impacts** — the plank variant with the most low-end body; the metal tick
  with the clearest pitch (2.34 kHz), short enough (0.10 s decay) to fire every 0.17 s
  as a counter; the latch for the lever because it is the crispest (it has to read over
  the motor winding up).
