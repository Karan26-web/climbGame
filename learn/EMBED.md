# The lesson, vendored

This folder is *Distance Formula — Swifty's Adventure*
(https://github.com/aniketchauhan-star/distance-formula), copied whole at upstream
commit `e992a18` (2026-09-30), minus its `.git` and `.attic`. Cliff Cross opens it in an
`<iframe>` as `learn/index.html?embed=1` the first time a player reaches a chasm (see
"The lesson in the road" in [../GAME_DESIGN.md](../GAME_DESIGN.md)). It also runs on its
own, unchanged, from `learn/index.html`.

## What differs from upstream

Three small edits, all about telling the page around it when the lesson is over. Carry
them across (or upstream them) on the next re-sync:

1. **`js/game.js` — `Game.ended()`.** A new method that fires `lesson:end` on the window
   once. Called from the two places the script runs out: `settle()` on the last screen
   (after the usual `afterLine` breath) and `skipScreen()` when Next is pressed on it.
   Both used to `return` with nothing following.
2. **`js/embed.js` — new.** Only active with `?embed=1` inside a frame: posts
   `{ type: 'distance-formula:ready' }` to the parent on load and
   `{ type: 'distance-formula:complete' }` on `lesson:end`. Adds `html.embedded` for any
   styling an embed might want. Target origin `*`, because the game may be opened from a
   file. It also takes every control out of the embed: the screen picker is switched off
   (`CFG.NAV.jump = false`, set before the game boots) and the nav bar (Back, Next), the
   corner Next and the picker's panel are hidden by an injected style. The screens hand
   over by themselves (`CFG.AUTO`), so inside the game the lesson simply plays through -
   a tap on the scene still moves on early. Standalone, everything stays.
3. **`index.html`** — loads `js/embed.js` after `js/game.js`.

Nothing else is touched: the start screen, Play, the picker beside Next and every screen
play as upstream. The child taps Play inside the frame — that tap is what lets her voice
and the music start, exactly as it does standalone.

## Re-syncing

```sh
git clone https://github.com/aniketchauhan-star/distance-formula.git /tmp/df
rsync -a --delete --exclude .git --exclude .attic --exclude docs --exclude tools \
      --exclude .githooks --exclude .gitignore --exclude .vercelignore \
      --exclude EMBED.md --exclude js/embed.js /tmp/df/ learn/
```

then re-apply edit 1 and edit 3 (edit 2 is excluded from the sync and survives), and run
the game's lesson check: drive to the first chasm with `?stage=1&lesson=1`, let the
lesson play through (or tap the scene to move on early), and see the question return.
