/* =============================================================
   Swifty's voice.

   One recording of the whole script — every line the game says, read
   in the order it says them, with the maths said in words ("three,
   comma, two"; "x two minus x one") — cut into one file per line in
   sfx/voices. Each line was found in it by its words and cut in the
   silence either side. Each file is numbered in that order and named
   for the line it says. (The recording itself is in the repository's
   history: sfx/new voice.mp3, up to commit bcf997d.)

   The lines written since came in a second recording, read in the order
   the game says them and cut the same way, numbered on from 69 (in the
   history too: sfx/aniket new.mp3). It was set on its own level to match
   the first, so the two sound like one voice.

   The seven written after that came in a third, read in the same order
   and cut, slowed and levelled the same way, numbered on from 92 (in the
   history as well, under the first one's name: sfx/new voice.mp3 at
   commit 1849173).

   She speaks a little slower than she was recorded, for young
   listeners: the whole recording was slowed to nine-tenths of its speed
   (115/128 exactly, the nearest step Apple's time-pitch unit takes — the
   one Safari slows speech with) at the same pitch, before it was cut,
   and every clip encoded afresh. Each opens 50 ms before her first
   sound, and where she took a breath between two lines the breath is in
   neither.

   A line the game no longer says goes, and its clip with it — the
   clip is in the history, as the recordings are ("That’s right!" and
   "Exactly!" went when every right answer became "That’s correct!").

   MAP is the only thing to edit: the line on the left, then its file
   and how long that file runs. The length is written down rather than
   read off the clip because a browser reports no duration until the
   file's metadata has arrived — and the words are paced to it, so a
   line asked for early would otherwise be paced to nothing.

   A line with no entry simply plays no voice: the game falls back to
   the little per-word notes it used before, so a gap here is quiet
   rather than broken.
   ============================================================= */
window.Voice = (function () {
  'use strict';

  const DIR = 'sfx/voices/';

  const MAP = {
    /* Every line the game says, in the order it says them — cut from
       the one recording (see the header). */
    'Hey there!':
      ['01-hey-there', 0.71],
    'Let’s do a quick warm-up.':
      ['02-lets-do-a-quick-warm-up', 1.93],
    'Locate the point (3, 2).':
      ['03-locate-the-point-3-2', 3.21],
    'Now try (6, 2).':
      ['04-now-try-6-2', 2.69],
    'What is the distance between the two points?':
      ['05-what-is-the-distance-between-the-two-points', 2.85],
    'Count carefully!':
      ['06-count-carefully', 1.36],
    'Did you notice?':
      ['07-did-you-notice', 1.23],
    'The y-coordinates are the same.':
      ['08-the-y-coordinates-are-the-same', 2.38],
    'So, the distance is the difference between the x-coordinates.':
      ['09-so-the-distance-is-the-difference-between-th', 4.39],
    'The x-coordinates are the same.':
      ['10-the-x-coordinates-are-the-same', 2.22],
    'So, the distance is the difference between the y-coordinates.':
      ['11-so-the-distance-is-the-difference-between-th', 4.41],
    'So far, the points were lined up horizontally or vertically.':
      ['12-so-far-the-points-were-lined-up-horizontally', 3.94],
    'But these two aren’t.':
      ['13-but-these-two-arent', 2.04],
    'How can we find the distance between these two?':
      ['14-how-can-we-find-the-distance-between-these-t', 3.00],
    'Let’s explore.':
      ['15-lets-explore', 1.20],
    'Hmm… what about A and C?':
      ['16-hmm-what-about-a-and-c', 2.80],
    'What is the distance between C and B?':
      ['18-what-is-the-distance-between-c-and-b', 2.85],
    /* Two of her takes joined at the pause between them: "Look! We made
       a" from "Look! We made a triangle." and "right-angled triangle!"
       from "A right-angled triangle!". */
    'Look! We made a right-angled triangle!':
      ['19-look-we-made-a-right-angled-triangle', 3.45],
    'We know AC and CB.':
      ['24-we-know-ac-and-cb', 2.56],
    'But we still need AB.':
      ['25-but-we-still-need-ab', 2.27],
    'Since it’s a right triangle, Pythagoras theorem can help!':
      ['26-since-its-a-right-triangle-pythagoras-theore', 4.41],
    'Now, let’s find the distance between A and B.':
      ['27-now-lets-find-the-distance-between-a-and-b', 3.81],
    'What is the distance between these two points?':
      ['28-what-is-the-distance-between-these-two-point', 2.93],
    'Look, we made a right triangle.':
      ['29-look-we-made-a-right-triangle', 2.38],
    'Let’s use Pythagoras to find AB.':
      ['30-lets-use-pythagoras-to-find-ab', 2.90],
    'Now find AB.':
      ['32-now-find-ab', 1.46],
    'What is the distance between A and B?':
      ['33-what-is-the-distance-between-a-and-b', 2.98],
    'Oops! Let’s find it together.':
      ['34-oops-lets-find-it-together', 2.25],
    'What is the distance between A and C?':
      ['35-what-is-the-distance-between-a-and-c', 2.98],
    'The same idea works for any two points.':
      ['36-the-same-idea-works-for-any-two-points', 3.34],
    'AC = x₂ − x₁':
      ['37-ac-x2-x1', 3.60],
    'CB = y₂ − y₁':
      ['38-cb-y2-y1', 3.08],
    'Now, let’s find AB.':
      ['39-now-lets-find-ab', 2.14],
    'What if both points are on the x-axis?':
      ['41-what-if-both-points-are-on-the-x-axis', 3.11],
    /* The front of her "Exactly! There's no vertical distance.", cut at
       her pause after it: praise for a warm-up distance. */
    'And what if they’re on the y-axis?':
      ['43-and-what-if-theyre-on-the-y-axis', 2.51],
    /* The end of her "Now, let's find the distance between A and B.",
       cut in the "f" of "find", after the "s" before it. */
    'Find the distance between A and B.':
      ['41b-find-the-distance-between-a-and-b', 2.74],
    'Maya wants to walk to the closer café. Which café is closer to her house?':
      ['45-maya-wants-to-walk-to-the-closer-cafe-which', 5.93],
    'Which distance is shorter?':
      ['48-which-distance-is-shorter', 2.27],

    /* The lines written after that recording, from a second one read in
       the order the game says them (see the header): 69 onward. */
    'So, the distance is 2\u00A0units.':
      ['69-so-the-distance-is-2-units', 2.67],
    'The distance between any two points is:':
      ['70-the-distance-between-any-two-points-is', 3.76],
    'That’s correct!':
      ['71-thats-correct', 1.14],
    'Now we know how to find the distance between any two points.':
      ['72-now-we-know-how-to-find-the-distance-between', 4.34],
    'Let’s apply this to solve some real-life problems!':
      ['73-lets-apply-this-to-solve-some-real-life-prob', 3.56],
    'There’s a fire at A!':
      ['74-theres-a-fire-at-a', 1.68],
    'How far is it from the fire engine at B?':
      ['75-how-far-is-it-from-the-fire-engine-at-b', 2.98],
    'So, the fire engine needs to travel 13\u00A0units.':
      ['76-so-the-fire-engine-needs-to-travel-13-units', 3.84],
    'There are two towers at A and B.':
      ['77-there-are-two-towers-at-a-and-b', 2.99],
    'How long must a cable be to connect them directly?':
      ['78-how-long-must-a-cable-be-to-connect-them-dir', 3.25],
    'So, the cable needs to be 10\u00A0units long to connect the towers.':
      ['79-so-the-cable-needs-to-be-10-units-long-to-co', 4.07],
    'First, find the distance from Maya’s house to Café A.':
      ['80-first-find-the-distance-from-mayas-house-to', 4.20],
    'Now, find the distance from Maya’s house to Café B.':
      ['81-now-find-the-distance-from-mayas-house-to-ca', 3.90],
    'The park forms triangle ABC.':
      ['82-the-park-forms-triangle-abc', 3.43],
    'What type of triangle is it?':
      ['83-what-type-of-triangle-is-it', 1.73],
    'What is the length of AB?':
      ['84-what-is-the-length-of-ab', 1.90],
    'Now, what is the length of BC?':
      ['85-now-what-is-the-length-of-bc', 2.74],
    'One side left! What is the length of CA?':
      ['86-one-side-left-what-is-the-length-of-ca', 3.86],
    'So, what type of triangle is it?':
      ['87-so-what-type-of-triangle-is-it', 2.65],
    'All three sides have different lengths. So, it’s a scalene triangle!':
      ['88-all-three-sides-have-different-lengths-so-it', 5.46],
    'You’re all set!':
      ['89-youre-all-set', 1.33],
    'Now you know how to find the distance between any two points.':
      ['90-now-you-know-how-to-find-the-distance-betwee', 3.98],
    'Let’s head back and bridge that gap!':
      ['91-lets-head-back-and-bridge-that-gap', 2.10],

    /* And the seven written after that, from a third recording (see the
       header): 92 onward. The distance said once a miss has been counted
       out, then what the formula gives on 37, 39 and 41. */
    'So, the distance is 3\u00A0units.':
      ['92-so-the-distance-is-3-units', 2.47],
    'So, the distance is 7\u00A0units.':
      ['93-so-the-distance-is-7-units', 2.72],
    'So, the distance is 5\u00A0units.':
      ['94-so-the-distance-is-5-units', 2.63],
    'And that gives the distance between any two points.':
      ['95-and-that-gives-the-distance-between-any-two', 3.42],
    'And that gives the distance when the points are on the x-axis.':
      ['96-and-that-gives-the-distance-when-the-points', 4.78],
    'And that gives the distance when the points are on the y-axis.':
      ['97-and-that-gives-the-distance-when-the-points', 4.30],
    'So, the distance is 14\u00A0units.':
      ['98-so-the-distance-is-14-units', 2.70]
  };

  /* Lines are looked up on a tidied form of themselves. A coordinate
     said aloud carries a non-breaking space so "(3, 2)" can never wrap
     across two rows, and a line typed here with an ordinary space or a
     straight apostrophe should still find its clip. */
  function key(t) {
    return String(t).replace(/\u00A0/g, ' ').replace(/[\u2018\u2019]/g, "'")
                    .replace(/\s+/g, ' ').trim();
  }
  const BY_KEY = {};
  Object.keys(MAP).forEach(function (k) { BY_KEY[key(k)] = MAP[k]; });
  function entryFor(t) { return BY_KEY[key(t)] || null; }

  let playing = null;

  /* ONE player for every line she says. Safari lets a page make sound
     only from a tap, and it counts that per player: a player started
     inside the tap on Play may play again later, a player that was not
     may not. With a player per clip every line after the first was
     started long after any tap, and Safari played none of them — her
     words appeared, paced to a voice nobody heard. So the lines share
     this one, it is started (silently) inside the Play tap by prime(),
     and each line only swaps what it plays. Every clip is fetched ahead
     of time by the loader (js/preload.js), before Play, and played from
     the copy it holds. */
  const player = new Audio();
  player.preload = 'auto';
  /* 0.1s of silence (8kHz, 8-bit), all the Play tap needs to start. */
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  let refused = false;           // the last line was not allowed to sound

  /* Each clip is Ogg Opus in sfx/voices (CFG.AUDIO_EXT); the map names
     them without it. */
  function src(file) {
    const v = window.CFG && window.CFG.VERSION;
    return DIR + file + ((window.CFG && window.CFG.AUDIO_EXT) || '.ogg') + (v ? '?v=' + v : '');
  }

  /* A line's clip, from the loader's copy when it has one. If that copy
     will not play, the player goes back once to the file itself and
     carries on — a blob is only ever a faster way to the same sound. */
  function address(file) {
    const u = src(file);
    return window.Preload ? window.Preload.url(u) : u;
  }
  player.addEventListener('error', function () {
    const was = player.src;
    if (!/^blob:/.test(was) || !player.dataset.file) return;
    player.src = src(player.dataset.file);
    if (playing === player) { const p = player.play(); if (p && p.catch) p.catch(function () {}); }
  });

  return {
    /* Every clip the script can ask for, as the loader must fetch it —
       the exact address a line will ask for, stamp and all. */
    urls: function () {
      const seen = {};
      return Object.keys(MAP).map(function (k) { return src(MAP[k][0]); })
        .filter(function (u) { return seen[u] ? false : (seen[u] = true); });
    },

    /* From inside the tap on Play: the shared player plays a moment of
       silence and stops, which is what Safari needs to see to let it
       speak later. Harmless everywhere else. */
    /* It plays a tenth of a second of silence — never one of her lines.
       It used to prime with her first recording, muted, and unmute it as
       it stopped; the sound already on its way out came through, and
       tapping Play said "Hey…" before she had even flown in. It stays
       muted until her first real line (say() unmutes it). */
    prime: function () {
      if (player.dataset.primed) return;
      player.dataset.primed = '1';
      player.muted = true;
      player.src = SILENCE;
      const p = player.play();
      const done = function () {
        if (playing === player) return;   // a line has already started on it
        player.pause();
      };
      if (p && p.then) p.then(done, done); else done();
    },

    /* Whether the line being said is sounding at all. A browser that
       refused it leaves the words to the little notes instead of to
       silence. */
    silent: function () { return refused; },

    /* Speak a line. Returns how long it will take, so the words can be
       revealed at the pace she actually says them; 0 when there is no
       recording for it and the caller should fall back to its own
       timing. */
    say: function (text) {
      this.stop();
      const e = entryFor(text);
      if (!e) return 0;
      refused = false;
      playing = player;
      player.muted = false;
      player.dataset.file = e[0];
      player.src = address(e[0]);
      player.currentTime = 0;
      const p = player.play();
      /* Refused (Safari, a browser that has not seen a tap) is silence
         to cover; interrupted by the next line is not. */
      if (p && p.catch) p.catch(function (err) {
        if (err && err.name === 'NotAllowedError') refused = true;
      });
      return e[1] * 1000;
    },

    stop: function () {
      if (playing) { playing.pause(); try { playing.currentTime = 0; } catch (e) {} playing = null; }
    },

    /* How long a line takes, without playing it — the metadata is there
       once the clip has loaded. */
    lengthOf: function (text) {
      const e = entryFor(text);
      return e ? e[1] * 1000 : 0;
    }
  };
})();
