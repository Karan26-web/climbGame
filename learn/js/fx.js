/* =============================================================
   Kid-friendly effects: sparkles, paper bursts, star bursts, dust
   puffs and drifting motes. All DOM based so they inherit the
   stage's scale transform for free.
   ============================================================= */
window.FX = (function () {
  'use strict';

  let layer = null;
  const CANDY = ['#FFD34E', '#FF8A3D', '#4ED6C8', '#7BD44B', '#FF6FA5', '#5AAEFF', '#FFFFFF'];

  function init(el) { layer = el; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function spawn(cls, styles, life) {
    const d = document.createElement('div');
    d.className = 'fx ' + cls;
    /* Custom properties have to go through setProperty: assigning them
       onto the style object does nothing, which silently left every
       effect that animates through a var() with no values to animate
       to — the pieces were created and then never moved. */
    Object.keys(styles).forEach(function (k) {
      if (k.indexOf('--') === 0) d.style.setProperty(k, styles[k]);
      else d.style[k] = styles[k];
    });
    layer.appendChild(d);
    setTimeout(function () { d.remove(); }, life);
    return d;
  }

  /* A ring of stars flying outward — used on the play button. */
  function starBurst(x, y, count, spread) {
    count = count || 14;
    spread = spread || 190;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + rnd(-0.18, 0.18);
      const dist = rnd(spread * 0.55, spread);
      const size = rnd(16, 30);
      const life = rnd(650, 1000);
      const s = spawn('fx-star', {
        left: x + 'px', top: y + 'px',
        width: size + 'px', height: size + 'px',
        background: pick(CANDY),
        '--dx': Math.cos(a) * dist + 'px',
        '--dy': Math.sin(a) * dist + 'px',
        '--spin': rnd(-320, 320) + 'deg',
        animationDuration: life + 'ms'
      }, life + 60);
      s.style.animationDelay = rnd(0, 90) + 'ms';
    }
  }

  /* An expanding ring, layered under a burst for punch. */
  function ring(x, y, size, color) {
    spawn('fx-ring', {
      left: x + 'px', top: y + 'px',
      width: size + 'px', height: size + 'px',
      borderColor: color || 'rgba(255,255,255,.9)'
    }, 720);
  }

  /* A small burst of paper out of one spot.

     It replaces a screen-wide shower. Rain from the ceiling celebrates
     the room; this celebrates the thing that was got right, because it
     comes out of it — the child's eye is already on that point, and the
     reward arrives where they are looking rather than everywhere else.

     Each piece is thrown outward on its own angle, biased upward so the
     burst opens like a popper, then carried past its peak and down. */
  function pop(x, y, count) {
    count = count || 16;
    for (let i = 0; i < count; i++) {
      /* Spread around the upward half, with enough slop that the ring
         does not read as a clock face. */
      const a = -Math.PI * 0.5 + rnd(-1.15, 1.15);
      const dist = rnd(58, 128);
      const life = rnd(850, 1250);
      const w = rnd(6, 12);
      spawn('fx-pop', {
        left: x + 'px', top: y + 'px',
        width: w + 'px', height: rnd(8, 15) + 'px',
        background: pick(CANDY),
        borderRadius: Math.random() < 0.4 ? '50%' : '2px',
        '--ox': Math.cos(a) * dist + 'px',
        '--oy': Math.sin(a) * dist + 'px',
        // where it ends up once gravity has had it
        '--fx': Math.cos(a) * dist * 1.25 + 'px',
        '--fy': (Math.sin(a) * dist * 0.45 + rnd(70, 135)) + 'px',
        '--spin': rnd(-520, 520) + 'deg',
        animationDuration: life + 'ms',
        animationDelay: rnd(0, 90) + 'ms'
      }, life + 260);
    }
  }

  /* Twinkles around a point — Swifty's landing and each new line. */
  function sparkles(x, y, count, radius) {
    count = count || 10;
    radius = radius || 150;
    for (let i = 0; i < count; i++) {
      const life = rnd(700, 1200);
      spawn('fx-twinkle', {
        left: x + rnd(-radius, radius) + 'px',
        top: y + rnd(-radius * 0.75, radius * 0.75) + 'px',
        width: rnd(12, 26) + 'px', height: rnd(12, 26) + 'px',
        background: pick(CANDY),
        animationDuration: life + 'ms',
        animationDelay: rnd(0, 350) + 'ms'
      }, life + 400);
    }
  }

  /* Dust kicked up where Swifty touches down. */
  /* Dust kicked out sideways from a pair of feet. `k` scales the whole
     thing: a hop in the game throws a little, coming down out of a
     flight onto a rock throws a lot. */
  function puff(x, y, k) {
    k = k || 1;
    const n = Math.round(12 * Math.min(2, k));
    for (let i = 0; i < n; i++) {
      const dir = i < n / 2 ? -1 : 1;
      const life = rnd(520, 820) * (k > 1 ? 1.25 : 1);
      spawn('fx-puff', {
        left: x + 'px', top: y + 'px',
        width: rnd(26, 54) * k + 'px', height: rnd(26, 54) * k + 'px',
        '--dx': dir * rnd(40, 165) * k + 'px',
        '--dy': rnd(-50, -8) * k + 'px',
        animationDuration: life + 'ms',
        animationDelay: rnd(0, 90) + 'ms'
      }, life + 120);
    }
  }

  /* Calm (html.calm, set from CFG.MOTION): the ambient weather is not
     started at all, rather than started and hidden — hidden, its wind
     was still heard with nothing moving. */
  const calm = function () { return document.documentElement.classList.contains('calm'); };
  /* A leaf rides its path with CSS motion paths, which Safari only has
     from 16: without them every leaf spun in the top-left corner. */
  const canRide = !!(window.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0")'));

  /* Slow ambient motes so the scene is never completely still. */
  function motes(count) {
    if (calm()) return;
    count = count || 18;
    for (let i = 0; i < count; i++) {
      const life = rnd(9000, 16000);
      const d = spawn('fx-mote', {
        left: rnd(0, 1920) + 'px', top: rnd(240, 1040) + 'px',
        width: rnd(7, 15) + 'px', height: rnd(7, 15) + 'px',
        '--dx': rnd(-90, 90) + 'px',
        '--rise': rnd(220, 460) + 'px',
        animationDuration: life + 'ms',
        animationDelay: rnd(0, 6000) + 'ms'
      }, life + 6200);
      d.dataset.loop = '1';
    }
  }

  /* Fills the sky with drifting copies of the single cloud sprite.
     Each cloud is a clipping window onto the cloud's ink box, so the
     transparent canvas around it never takes up space. */
  function clouds(sky) {
    const C = window.CFG.CLOUD;
    sky.innerHTML = '';
    C.instances.forEach(function (inst) {
      const sc = inst.scale;
      const w = C.ink.w * sc, h = C.ink.h * sc;
      /* The cloud drifts to one end of the open sky and back again,
         never leaving it: its far edge stops exactly where the band
         does, so no part of it ever reaches a tree. That means it
         needs no fading at the ends — it is simply always in the sky. */
      const B = C.band;
      const dist = (B.x1 - w) - B.x0;
      const dur = dist / inst.speed;

      const d = document.createElement('div');
      d.className = 'cloud';
      d.style.top = inst.top + 'px';
      d.style.width = w + 'px';
      d.style.height = h + 'px';
      d.style.opacity = inst.opacity;
      d.style.setProperty('--x0', B.x0 + 'px');
      d.style.setProperty('--x1', (B.x1 - w) + 'px');
      d.style.animationDuration = dur + 's';
      // a negative delay starts it already part-way along the drift
      d.style.animationDelay = -(inst.phase * dur) + 's';

      const im = document.createElement('img');
      // from the loader's copy (js/preload.js), never fetched twice
      if (window.Preload) window.Preload.adopt(im, C.src); else im.src = C.src;
      im.alt = '';
      im.style.width = C.srcW * sc + 'px';
      im.style.height = C.srcH * sc + 'px';
      im.style.left = -C.ink.x * sc + 'px';
      im.style.top = -C.ink.y * sc + 'px';
      d.appendChild(im);
      sky.appendChild(d);
    });
  }

  /* One leaf at a time lifts off the tree in the top left corner,
     loops once on the wind and drifts away to the right. A few speed
     lines follow it down the same path a beat behind — the wake is
     drawn as streaks, never as more leaves, so there is only ever the
     one leaf in the air.

     The path is an SVG one and the leaf rides it with offset-path, so
     the loop is a real curve rather than a stack of translations, and
     offset-rotate turns each piece to face the way it is going. */
  /* Defaults are the in-game weather: slow and rare on purpose. The
     board is what the child should be looking at, so a leaf takes its
     time crossing and a long while passes before the next — long
     enough that it registers as weather rather than as something
     happening. The title screen overrides these to something livelier;
     see CFG.START.wind. */
  const DRIFT = {
    dur: 15000,              // one leaf's whole journey
    /* `solo` holds the next leaf back until the last has gone, so there
       is never more than one on the wing. The game requires that; the
       title screen turns it off and lets them overlap. */
    solo: true,
    gapMin: 14000, gapMax: 28000,
    lines: 3,                // its wake — streaks only, never more leaves
    fromX: 270,              // inside the canopy, so it leaves the tree
    y0: [140, 250],          // up where the foliage is widest
    loopX: [720, 1000], loopY: [300, 440], loopR: [70, 125],
    endY: [360, 640],
    size: [54, 78]
  };

  /* Out of the canopy, once round a loop, then away east. The loop's
     place and size move each time so no two leaves take the same
     line. */
  function driftPath(fromX, y0, cx, cy, r, endY) {
    /* Starts inside the canopy, so the leaf reads as leaving the tree
       rather than appearing in clear sky. On the game background the
       foliage reaches x 390 at y 120 and narrows to x 234 by y 280, so
       270 is inside it at any height a leaf can start from; the title
       art has a wider tree and passes its own fromX. */
    return 'M ' + fromX + ',' + y0 +
      ' C 470,' + (y0 - 70) + ' ' + (cx - 170) + ',' + (cy - r - 110) + ' ' + cx + ',' + (cy - r) +
      ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (cy + r) +
      ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + 0.4) + ',' + (cy - r) +
      ' C ' + (cx + 230) + ',' + (cy - r + 50) + ' ' +
              (cx + 640) + ',' + (endY - 80) + ' 2140,' + endY;
  }

  function driftOnce(host, cfg) {
    if (calm() || !canRide) return;
    cfg = cfg || DRIFT;
    const y0 = rnd(cfg.y0[0], cfg.y0[1]);
    const cx = rnd(cfg.loopX[0], cfg.loopX[1]),
          cy = rnd(cfg.loopY[0], cfg.loopY[1]),
          r  = rnd(cfg.loopR[0], cfg.loopR[1]);
    const path = driftPath(cfg.fromX, y0, cx, cy, r, rnd(cfg.endY[0], cfg.endY[1]));
    const size = rnd(cfg.size[0], cfg.size[1]);
    const spin = (Math.random() < 0.5 ? -1 : 1) * rnd(300, 520);

    /* Everything rides the same path; what separates them is how far
       behind they start and how solid they are. */
    const ride = function (el, delay, op) {
      el.classList.add('fx-drift');
      el.style.setProperty('offset-path', 'path("' + path + '")');
      el.style.setProperty('--spin', spin + 'deg');
      el.style.setProperty('--op', op);
      el.style.animationDuration = cfg.dur + 'ms, ' + cfg.dur + 'ms';
      el.style.animationDelay = delay + 'ms, ' + delay + 'ms';
      host.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); },
                 cfg.dur + delay + 200);
    };

    // the speed lines go first, furthest back
    for (let i = 0; i < cfg.lines; i++) {
      const l = document.createElement('div');
      l.classList.add('fx-windline');
      l.style.width = rnd(70, 140) + 'px';
      l.style.marginTop = rnd(-26, 26) + 'px';
      ride(l, 430 + i * 200, rnd(0.14, 0.28));
    }
    // and the one leaf, solid, in front of its own wake
    const leaf = document.createElement('img');
    if (window.Preload) window.Preload.adopt(leaf, window.CFG.ART.leaf); else leaf.src = window.CFG.ART.leaf;
    leaf.alt = '';
    leaf.style.width = size + 'px';
    ride(leaf, 0, 1);

    /* The leaf leaving the canopy, then the air it rides on. The game
       keeps the breeze alone; the title screen adds the rustle, where
       a leaf coming off the tree is meant to be noticed. */
    const A = window.Audio8;
    if (A) {
      if (cfg.rustleOnLift && A.rustle) A.rustle();
      if (A.breeze) A.breeze();
    }
  }

  /* Kicks the cycle off and keeps it going: one leaf, a pause, the
     next. Started once at boot and left to run. */
  function leafDrift(sky, opts) {
    const cfg = Object.assign({}, DRIFT, opts || {});
    let host = sky.querySelector('.drift-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'drift-host';
      sky.appendChild(host);
    }
    let timer = null, stopped = false;
    const again = function () {
      if (stopped) return;
      driftOnce(host, cfg);
      /* solo waits out the whole journey before the next lifts off;
         otherwise the gap is from one departure to the next, so several
         are crossing at once. */
      timer = setTimeout(again, (cfg.solo ? cfg.dur : 0) + rnd(cfg.gapMin, cfg.gapMax));
    };
    timer = setTimeout(again, cfg.firstDelay || 1200);
    /* The title screen is taken out of the layout once the game starts;
       without this its weather would keep spawning into a hidden box. */
    return function () { stopped = true; clearTimeout(timer); host.innerHTML = ''; };
  }

  /* A gust: a handful of streaks sweeping the frame left to right,
     staggered so the air reads as moving rather than as a row of lines
     being dragged across. Nothing but the streaks — the leaves are the
     drift's job, and doubling them up here would crowd the frame. */
  function windGust(host, cfg) {
    if (calm()) return;
    const n = (rnd(cfg.gustLines[0], cfg.gustLines[1]) + 0.5) | 0;
    /* One sound for the gust, not one per streak — the streaks are the
       same gust seen, so several overlapping would read as several
       gusts. Silent until audio has been authorised. */
    const A = window.Audio8;
    if (A && A.wind) A.wind(rnd(cfg.gustMs[0], cfg.gustMs[1]) / 1000 * 0.85);
    for (let i = 0; i < n; i++) {
      const l = document.createElement('div');
      l.className = 'fx-windline fx-sweep';
      const dur = rnd(cfg.gustMs[0], cfg.gustMs[1]);
      l.style.width = rnd(90, 230) + 'px';
      l.style.left = '-260px';
      const band = pick(cfg.gustBands);
      l.style.top = rnd(band[0], band[1]) + 'px';
      l.style.setProperty('--travel', rnd(2180, 2360) + 'px');
      l.style.setProperty('--dy', rnd(-40, 40) + 'px');
      l.style.setProperty('--op', rnd(0.20, 0.42));
      l.style.animationDuration = dur + 'ms';
      l.style.animationDelay = (i * rnd(90, 260)) + 'ms';
      host.appendChild(l);
      setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); },
                 dur + i * 260 + 400);
    }
  }

  /* Keeps gusts coming. Separate from leafDrift so the wind can blow
     whether or not a leaf happens to be crossing. */
  function wind(sky, opts) {
    const cfg = Object.assign({
      gustLines: [4, 7], gustMs: [2100, 3400], gustBands: [[120, 620]],
      gapMin: 3200, gapMax: 7200, firstDelay: 700
    }, opts || {});
    let host = sky.querySelector('.gust-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'gust-host';
      sky.appendChild(host);
    }
    let timer = null, stopped = false;
    const again = function () {
      if (stopped) return;
      windGust(host, cfg);
      timer = setTimeout(again, rnd(cfg.gapMin, cfg.gapMax));
    };
    timer = setTimeout(again, cfg.firstDelay);
    return function () { stopped = true; clearTimeout(timer); host.innerHTML = ''; };
  }

  /* A gust of leaves sweeps the frame. They blow in from the left,
     fill it completely for a beat, then blow on out to the right —
     `onCover` fires during that beat, which is when the scene behind
     gets swapped, and `onDone` once the frame is clear again.

     One leaf image serves the whole sweep, at its own colours: each copy
     gets its own size, tilt and spin, which is enough that nothing
     reads as the same leaf twice without tinting any of them. */
  const LEAF_DUR = 2600;          // the whole sweep

  /* Four passes over the frame, each a grid whose cells are filled one
     leaf apiece and jittered inside themselves. Scattering at random
     leaves holes — with a leaf's own gaps between its lobes, thin spots
     show the scene straight through — so the resting places are dealt
     out rather than drawn, and the passes are offset from each other so
     one pass's seams fall in the middle of the next pass's cells. */
  /* 9 x 6 cells, four passes — 216 leaves. Simulated against the leaf's
     own alpha, that covers the frame completely: fewer passes or a
     coarser grid leaves pinholes the scene shows through, and this is
     the point of the sweep, since the whole screen is rebuilt behind
     it. */
  const LEAF_COLS = 9, LEAF_ROWS = 6, LEAF_PASSES = 4;
  const LEAF_AREA = { x: -240, y: -240, w: 2400, h: 1560 };

  function leaves(el, onCover, onDone) {
    el.innerHTML = '';
    el.classList.remove('hidden');

    const src = window.Preload ? window.Preload.url(window.CFG.ART.leaf) : window.CFG.ART.leaf;
    let maxDelay = 0, minDelay = Infinity;

    const cw = LEAF_AREA.w / LEAF_COLS, chh = LEAF_AREA.h / LEAF_ROWS;
    const spots = [];
    for (let pass = 0; pass < LEAF_PASSES; pass++) {
      // half a cell of stagger per pass, so seams never line up
      const ox = (pass % 2) * cw * 0.5, oy = (pass % 3) * chh * 0.34;
      for (let r = 0; r < LEAF_ROWS; r++) {
        for (let c = 0; c < LEAF_COLS; c++) {
          spots.push({
            x: LEAF_AREA.x + ox + c * cw + rnd(-cw * 0.12, cw * 0.12),
            y: LEAF_AREA.y + oy + r * chh + rnd(-chh * 0.12, chh * 0.12)
          });
        }
      }
    }

    for (let i = 0; i < spots.length; i++) {
      // big enough that a cell is covered even by the leaf's narrow axis
      const size = rnd(340, 540);
      const d = document.createElement('img');
      d.className = 'leaf';
      d.src = src;
      d.alt = '';
      d.style.width = size + 'px';

      // where it sits when the frame is full: its own cell, centred
      d.style.left = (spots[i].x - size / 2) + 'px';
      d.style.top  = (spots[i].y - size * 0.44) + 'px';

      // in on the wind from the left, out to the right and downward
      d.style.setProperty('--x0', -rnd(700, 2700) + 'px');
      d.style.setProperty('--y0', rnd(-520, 420) + 'px');
      d.style.setProperty('--x1', rnd(-24, 24) + 'px');
      d.style.setProperty('--y1', rnd(-18, 18) + 'px');
      d.style.setProperty('--x2', rnd(1000, 2900) + 'px');
      d.style.setProperty('--y2', rnd(240, 920) + 'px');
      d.style.setProperty('--r0', rnd(-300, 300) + 'deg');
      d.style.setProperty('--r1', rnd(-45, 45) + 'deg');
      d.style.setProperty('--r2', rnd(-560, 560) + 'deg');
      d.style.setProperty('--s0', rnd(0.72, 1.0));
      d.style.setProperty('--s2', rnd(0.8, 1.2));

      /* Staggered so the gust arrives in waves rather than as one
         wall, but every leaf is home before the frame goes solid. */
      const delay = rnd(0, 330);
      if (delay > maxDelay) maxDelay = delay;
      if (delay < minDelay) minDelay = delay;
      d.style.animationDuration = LEAF_DUR + 'ms';
      d.style.animationDelay = delay + 'ms';
      el.appendChild(d);
    }

    /* A sweep in flight has to be stoppable. Its two steps dress the
       screen and then build it, and they are plain timeouts — the
       game's own `later()` cannot reach them — so a child who presses
       Next while the leaves are crossing had the screen they were
       leaving dress and plot itself onto the board of the screen they
       had arrived at. Handing the caller a way to call it off is the
       whole fix; `Game.clearPending` uses it. */
    /* The swap lands while the frame is solid — measured on the
       leaves' own clock. Each leaf is home at 44% of its run and holds
       until 60%; with the delays above the frame is only solid from the
       LAST arrival to the FIRST departure, so that is where it goes. And
       the leaves' clock starts on the first frame they are painted, not
       when they were put in the page: on a slow laptop, 216 large images
       take a moment to reach the screen, and a timer started at
       insertion swapped the board in plain sight through the gaps. */
    const coverAt = Math.min(LEAF_DUR * 0.44 + maxDelay + 24,
                             LEAF_DUR * 0.60 + minDelay - 24);
    const doneAt = LEAF_DUR + maxDelay + 160;
    let t1 = null, t2 = null, stopped = false;
    const run = function () {
      if (stopped) return;
      t1 = setTimeout(function () { if (onCover) onCover(); }, coverAt);
      t2 = setTimeout(function () {
        leaves.cancel = null;
        el.classList.add('hidden');
        el.innerHTML = '';
        if (onDone) onDone();
      }, doneAt);
    };
    const first = el.firstChild && el.firstChild.getAnimations && el.firstChild.getAnimations()[0];
    if (first && first.ready && first.ready.then) first.ready.then(run, run);
    else run();

    leaves.cancel = function () {
      stopped = true;
      clearTimeout(t1); clearTimeout(t2);
      leaves.cancel = null;
      el.classList.add('hidden');
      el.innerHTML = '';
    };
  }
  leaves.cancel = null;

  // how long a sweep runs, in seconds, so the gust can be scored to it
  leaves.seconds = LEAF_DUR / 1000;


  /* A number leaving the board and landing in a working.

     The board's own flight (`Board.tweenText`) moves SVG text inside
     the board's own coordinates, which is right when a digit travels
     from a label to a sum drawn on the same board. It cannot reach the
     working panel: that is HTML, on the stage, in different units
     entirely. So this one lives on the stage and is given both ends in
     stage coordinates.

     rAF rather than a CSS transition, for the reason section 0 of the
     horizontal prompt records: a transition given its start and its end
     in the same tick never runs, and this has to tween a font-size as
     well as a position. */
  const flights = [];
  function flyGlyph(text, from, to, ms, done) {
    if (!layer) { if (done) done(); return function () {}; }
    const d = document.createElement('div');
    d.className = 'fx fx-glyph';
    d.textContent = text;
    layer.appendChild(d);
    let live = true;
    const put = function (x, y, size) {
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.fontSize = size + 'px';
    };
    put(from.x, from.y, from.size);
    const t0 = performance.now();
    /* cubic-bezier(.22, .61, .36, 1) — the camera's own curve, solved
       the way `viewTo` solves it, so a glyph crossing the board moves
       the way the board itself moves. It was a plain ease-out cubic,
       which leaves faster than the board ever does: a number lifted
       off a side should be carried, not flicked. */
    const ease = function (t) {
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 14; i++) {
        u = (lo + hi) / 2;
        const x = 3 * (1-u) * (1-u) * u * 0.22 +
                  3 * (1-u) * u * u * 0.36 + u*u*u;
        if (x < t) lo = u; else hi = u;
      }
      return 3 * (1-u) * (1-u) * u * 0.61 + 3 * (1-u) * u * u + u*u*u;
    };
    const stop = function () {
      if (!live) return;
      live = false;
      const i = flights.indexOf(stop);
      if (i >= 0) flights.splice(i, 1);
      if (d.parentNode) d.parentNode.removeChild(d);
    };
    flights.push(stop);
    const step = function () {
      if (!live) return;
      const p = Math.min(1, (performance.now() - t0) / (ms || 700));
      const e = ease(p);
      put(from.x + (to.x - from.x) * e,
          from.y + (to.y - from.y) * e,
          from.size + (to.size - from.size) * e);
      if (p < 1) requestAnimationFrame(step);
      else { stop(); if (done) done(); }
    };
    requestAnimationFrame(step);
    return stop;
  }
  /* A COPY of a symbol, taken off the board and carried to where it is
     needed — the original never moves.

       appear   exactly on top of the original: same text, same colour,
                same size and the same slant, so for a moment it cannot
                be told from it
       pulse    lifts a little above it and swells twice there,
                straightening as it rises if the original is written
                along a slanted side
       travel   across to its place, on the camera's own curve, growing
                or shrinking to the size it will be read at there

     Kept on the flight list, so a screen change lands it with every
     other flight rather than leaving it in the air. */
  /* A colour as [r, g, b], from #rgb, #rrggbb or rgb()/rgba() — what a
     stylesheet or an SVG attribute hands back. Null if it is none of
     those. */
  function rgbOf(c) {
    c = String(c || '').trim();
    let m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return m[1].split('').map(function (h) { return parseInt(h + h, 16); });
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16); });
    m = c.match(/^rgba?\(([^)]+)\)$/i);
    if (m) return m[1].split(',').slice(0, 3).map(function (v) { return parseFloat(v); });
    return null;
  }

  /* `to.rot` lands the copy turned — a length written along a slanted
     side — and `o.toColor` carries it from the colour it left in to the
     colour of the label it becomes, both over the travel. */
  function liftAndFly(text, from, to, o, done) {
    o = o || {};
    if (!layer) { if (done) done(); return function () {}; }
    const d = document.createElement('div');
    d.className = 'fx fx-glyph fx-copy';
    d.textContent = text;
    if (o.color) d.style.color = o.color;
    layer.appendChild(d);
    const A = o.appearMs || 200, T = o.travelMs || 1400;
    /* No pulse is a real choice (0), not a missing one. */
    const P = o.pulseMs != null ? o.pulseMs : 1000;
    const lift = (o.lift == null ? 0.6 : o.lift) * from.size;
    const rot0 = from.rot || 0, rot1 = to.rot || 0;
    const c0 = o.toColor ? rgbOf(o.color || getComputedStyle(d).color) : null;
    const c1 = c0 ? rgbOf(o.toColor) : null;
    const out = function (t) { return 1 - Math.pow(1 - t, 3); };
    /* cubic-bezier(.22, .61, .36, 1), as `flyGlyph` and the camera
       solve it, so the copy is carried the way the board moves. */
    const ease = function (t) {
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 14; i++) {
        u = (lo + hi) / 2;
        const x = 3 * (1-u) * (1-u) * u * 0.22 + 3 * (1-u) * u * u * 0.36 + u*u*u;
        if (x < t) lo = u; else hi = u;
      }
      return 3 * (1-u) * (1-u) * u * 0.61 + 3 * (1-u) * u * u + u*u*u;
    };
    const put = function (x, y, size, rot, sc, op) {
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.fontSize = size + 'px';
      d.style.transform = 'translate(-50%, -50%) rotate(' + rot.toFixed(2) +
                          'deg) scale(' + sc.toFixed(3) + ')';
      d.style.opacity = op;
    };
    let live = true;
    const stop = function () {
      if (!live) return;
      live = false;
      const i = flights.indexOf(stop);
      if (i >= 0) flights.splice(i, 1);
      if (d.parentNode) d.parentNode.removeChild(d);
    };
    flights.push(stop);
    put(from.x, from.y, from.size, rot0, 1, 0);
    const t0 = performance.now();
    const step = function () {
      if (!live) return;
      const t = performance.now() - t0;
      if (t < A) {
        put(from.x, from.y, from.size, rot0, 1, t / A);
      } else if (t < A + P) {
        const u = (t - A) / P, up = out(Math.min(1, u / 0.35));
        /* sin² over one turn: two swells, at a quarter and three
           quarters of the way through. */
        const sc = 1 + 0.3 * Math.pow(Math.sin(u * Math.PI * 2), 2);
        put(from.x, from.y - lift * up, from.size, rot0 * (1 - up), sc, 1);
      } else if (t < A + P + T) {
        const e = ease((t - A - P) / T), y0 = from.y - lift;
        /* Written on its side (a vertical length), a copy with no pulse
           to straighten it in leaves the board as it is written and turns
           level on the way — most of the turn in the middle of the flight,
           none of it at either end. */
        const s = e * e * (3 - 2 * e), r0 = P > 0 ? 0 : rot0;
        const turn = r0 + (rot1 - r0) * s;
        if (c1) d.style.color = 'rgb(' + c0.map(function (v, i) {
          return Math.round(v + (c1[i] - v) * e);
        }).join(',') + ')';
        put(from.x + (to.x - from.x) * e, y0 + (to.y - y0) * e,
            from.size + (to.size - from.size) * e, turn, 1, 1);
      } else {
        stop();
        if (done) done();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return stop;
  }

  /* Nothing may be left in the air when a screen changes. */
  function landAll() { flights.slice().forEach(function (s) { s(); }); }

  /* The frame glows red at its corners, twice, and settles. Restarted
     rather than stacked: a second miss inside the first one's glow
     begins it again instead of layering another on top. */
  function missGlow() {
    const g = document.getElementById('missGlow');
    if (!g) return;
    g.classList.remove('on');
    void g.offsetWidth;              // so removing and re-adding replays it
    g.classList.add('on');
    shake();
  }
  /* And the frame shakes with it — a quick shake of the head, side to
     side and dying away, the way "no, not that" looks. The whole scene
     moves, grown by 1.5% while it does so the frame's own edges never
     show past it. Run through the Web Animations API, not a CSS class,
     because the scene already carries its fade-in animation, and a
     second animation on the same element would replace that one. Not
     at all for a child who has asked for a calm screen, or whose laptop
     asks for less motion. */
  let shaking = null;
  function shake() {
    const s = document.getElementById('scene');
    if (!s || !s.animate || document.documentElement.classList.contains('calm')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (shaking) shaking.cancel();
    // each swing eased on its own, so every one reaches its full width
    const k = function (x, sc, at) {
      const f = { translate: x + 'px 0', easing: 'ease-in-out' };
      if (sc) f.scale = sc;
      if (at != null) f.offset = at;
      return f;
    };
    shaking = s.animate([
      k(0, '1'), k(-12, '1.015', 0.1), k(11, null, 0.24), k(-8, null, 0.38),
      k(6, null, 0.52), k(-3.5, null, 0.66), k(1.5, '1.015', 0.8), k(0, '1')
    ], { duration: 480 });
    shaking.onfinish = function () { shaking = null; };
  }
  return { init, starBurst, ring, pop, sparkles, puff, motes, clouds,
           flyGlyph, liftAndFly, landAll, missGlow,
           leafDrift, wind, leaves };
})();
