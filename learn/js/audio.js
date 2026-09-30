/* =============================================================
   Audio engine
   - background music from sfx/bg music.ogg (Ogg Opus), held at 20%
   - every other sound is synthesised with the Web Audio API,
     because only the music track was supplied
   - music ducks automatically while Swifty is speaking
   ============================================================= */
window.Audio8 = (function () {
  'use strict';
  const A = window.CFG.AUDIO;

  let ctx = null, master = null, sfxGain = null;
  /* Whether playback has actually been authorised. Scheduling into a
     suspended context is worse than silence: currentTime is frozen, so
     everything queued lands in one burst the moment it resumes. */
  let armed = false;
  let musicEl = null, noiseBuf = null, musicRamp = null;
  let started = false, duckDepth = 0, musicWant = 0;

  function now() { return ctx ? ctx.currentTime : 0; }

  function build() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = A.sfxVolume;
    // A gentle limiter keeps stacked chirps from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    sfxGain.connect(comp);
    comp.connect(master);

    // Two seconds of white noise, reused by every noise-based sound.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    /* The music is played by a plain <audio> element and its level is
       driven on the element itself, NOT through a MediaElementSource.
       Routing it into the Web Audio graph silences the track whenever
       the page is opened straight from disk, because file:// counts as
       an opaque origin and taints the node — and nothing here needs to
       process the music anyway. */
    /* From the loader's copy (js/preload.js): nothing of its own to
       fetch, so `preload` is none — the loader has it, or will. */
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = 'none';
    musicEl.volume = 0;
    if (window.Preload) window.Preload.adopt(musicEl, A.musicSrc);
    else musicEl.src = A.musicSrc;
  }

  /* Smooth fade on the element, used for start-up and for ducking. */
  function rampMusic(secs) {
    if (!musicEl) return;
    clearInterval(musicRamp);
    const from = musicEl.volume;
    const to = musicWant;
    const steps = Math.max(1, Math.round((secs || 0.3) * 30));
    let i = 0;
    musicRamp = setInterval(function () {
      i++;
      const v = from + (to - from) * (i / steps);
      musicEl.volume = Math.min(1, Math.max(0, v));
      if (i >= steps) clearInterval(musicRamp);
    }, 1000 / 30);
  }

  /* Brings the engine up without starting the music — for the title
     screen, whose wind and leaves should be heard but which should not
     begin the soundtrack. Browsers refuse to resume before a gesture,
     so `armed` only turns on if the resume actually succeeds, and every
     sound stays a no-op until it does. Calling this on load costs
     nothing and works for a visitor the browser already trusts. */
  function prime(fromGesture) {
    build();
    if (ctx.state === 'running') { armed = true; return; }
    /* resume() resolves a tick or two later, which is too late for a
       sound fired by the very gesture that authorised it — the tap that
       lands her early is both at once. A gesture is permission enough,
       so arm now and let the resume catch up. */
    if (fromGesture) armed = true;
    const p = ctx.resume();
    if (p && p.then) p.then(function () { armed = true; },
                            function () { if (!fromGesture) armed = false; });
    else if (!fromGesture) armed = ctx.state === 'running';
  }

  /* Called from the first real user gesture — browsers block audio
     until then. Safe to call repeatedly. */
  function unlock() {
    build();
    armed = true;              // a gesture authorises playback outright
    if (ctx.state === 'suspended') ctx.resume();
    if (!started) {
      started = true;
      const p = musicEl.play();
      if (p && p.catch) p.catch(function () { started = false; });
      musicTarget(A.musicVolume, 1.6);
    }
  }

  function musicTarget(v, secs) {
    musicWant = v;
    rampMusic(secs);
  }

  /* Duck is reference counted so overlapping speech can't strand the
     music at a low volume. */
  function duck(on) {
    duckDepth = Math.max(0, duckDepth + (on ? 1 : -1));
    if (duckDepth > 0) musicTarget(A.musicDucked, A.duckDown);
    else musicTarget(A.musicVolume, A.duckUp);
  }

  /* Every dip lifted at once — for a screen change, where the step that
     would have lifted one may have been cancelled with the screen it
     belonged to. A count left above zero kept the music quiet for the
     rest of the game. */
  function duckReset() {
    if (duckDepth === 0) return;
    duckDepth = 0;
    musicTarget(A.musicVolume, A.duckUp);
  }


  /* ---------- synthesis helpers ---------- */

  function env(node, t0, peak, attack, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    node.connect(g);
    g.connect(sfxGain);
    return g;
  }

  function tone(opts) {
    if (!ctx || !armed) return;
    const t0 = now() + (opts.delay || 0);
    const o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1) o.frequency.exponentialRampToValueAtTime(opts.f1, t0 + opts.dur);
    if (opts.f2) o.frequency.exponentialRampToValueAtTime(opts.f2, t0 + opts.dur * 1.7);
    env(o, t0, opts.gain || 0.25, opts.attack || 0.008, opts.dur);
    o.start(t0);
    o.stop(t0 + opts.dur * 2.2 + 0.05);
  }

  function noise(opts) {
    if (!ctx || !armed) return;
    const t0 = now() + (opts.delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = opts.filter || 'bandpass';
    bp.Q.value = opts.q || 1.1;
    bp.frequency.setValueAtTime(opts.f0, t0);
    bp.frequency.exponentialRampToValueAtTime(opts.f1, t0 + opts.dur);
    s.connect(bp);
    env(bp, t0, opts.gain || 0.2, opts.attack || 0.02, opts.dur);
    s.start(t0);
    s.stop(t0 + opts.dur * 2.4 + 0.05);
  }

  /* ---------- the sound set ---------- */

  // One syllable of bird speech. Pitch wanders so a run of them
  // reads as chatter rather than a repeated beep.
  let chirpStep = 0;
  function chirp(strength) {
    if (!ctx) return;
    const scale = [0, 2, 4, 7, 9, 12, 9, 7, 4, 2];
    const semi = scale[chirpStep++ % scale.length] + (Math.random() * 2 - 1);
    const base = 880 * Math.pow(2, semi / 12);
    const g = 0.16 * (strength || 1);
    tone({ type: 'triangle', f0: base * 0.72, f1: base * 1.5, f2: base * 1.05, dur: 0.055, gain: g });
    tone({ type: 'sine', f0: base * 1.9, f1: base * 2.7, dur: 0.04, gain: g * 0.35, delay: 0.008 });
  }

  // A single wing beat: airy noise sweep plus a soft body thump.
  /* A proper two- or three-note tweet. chirp() is a single blip used as
     a typing tick, and one of those on its own does not read as a bird;
     this gives the note a contour and puts a couple in sequence, which
     is what the ear hears as a call. */
  function birdCall(strength) {
    if (!ctx) return;
    const g = 0.18 * (strength || 1);
    const base = 1480 + Math.random() * 460;
    const notes = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < notes; i++) {
      const rise = i % 2 === 0;           // alternates up-slur, down-slur
      const f = base * Math.pow(1.15, i);
      const at = i * (0.085 + Math.random() * 0.05);
      tone({ type: 'triangle',
             f0: rise ? f * 0.80 : f * 1.26,
             f1: rise ? f * 1.46 : f * 0.82,
             f2: rise ? f * 1.14 : f * 0.96,
             dur: 0.07 + Math.random() * 0.04,
             gain: g * (1 - i * 0.17), delay: at });
      // a thin harmonic on top, which is what makes it whistle
      tone({ type: 'sine', f0: f * 1.95, f1: f * 2.5, dur: 0.035,
             gain: g * 0.3, delay: at + 0.012 });
    }
  }

  function flap() {
    noise({ f0: 1700, f1: 380, dur: 0.13, gain: 0.16, q: 0.8 });
    tone({ type: 'sine', f0: 190, f1: 90, dur: 0.1, gain: 0.09 });
  }

  // Landing on the grass.
  function land() {
    noise({ f0: 900, f1: 160, dur: 0.22, gain: 0.2, q: 0.7 });
    tone({ type: 'sine', f0: 150, f1: 60, dur: 0.18, gain: 0.16 });
  }

  // Button press — a fat, friendly pop.
  function pop() {
    tone({ type: 'sine', f0: 320, f1: 1000, dur: 0.07, gain: 0.32 });
    tone({ type: 'triangle', f0: 640, f1: 1600, dur: 0.09, gain: 0.14, delay: 0.02 });
  }

  // Rollover blip.
  function blip() {
    tone({ type: 'sine', f0: 660, f1: 990, dur: 0.05, gain: 0.1 });
  }

  // Rising bell arpeggio for stars and confetti.
  function sparkle() {
    const notes = [1046, 1318, 1568, 2093];
    notes.forEach(function (f, i) {
      tone({ type: 'sine', f0: f, f1: f * 1.01, dur: 0.16, gain: 0.13, delay: i * 0.055 });
    });
  }

  // Screen transition.
  function whoosh() {
    noise({ f0: 300, f1: 2600, dur: 0.26, gain: 0.16, q: 0.6 });
    noise({ f0: 2400, f1: 260, dur: 0.34, gain: 0.13, q: 0.6, delay: 0.24 });
  }

  /* The board materialising: a shimmering upward sweep with a bell
     stack on top. */
  function magic() {
    if (!ctx) return;
    noise({ f0: 400, f1: 7000, dur: 0.5, gain: 0.10, q: 0.5, filter: 'bandpass' });
    [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) {
      tone({ type: 'sine', f0: f, f1: f * 1.005, dur: 0.5 - i * 0.05,
             gain: 0.10, delay: i * 0.06 });
    });
    tone({ type: 'triangle', f0: 110, f1: 330, dur: 0.34, gain: 0.12 });
  }

  // An axis drawing itself outward.
  function draw() {
    noise({ f0: 700, f1: 3400, dur: 0.3, gain: 0.10, q: 1.4 });
    tone({ type: 'sine', f0: 300, f1: 720, dur: 0.26, gain: 0.08 });
  }

  // One number popping in. `step` walks the pitch up the run.
  function tick(step) {
    const semis = [0, 2, 4, 5, 7, 9, 11, 12];
    const f = 660 * Math.pow(2, semis[(step || 0) % semis.length] / 12);
    tone({ type: 'triangle', f0: f * 0.8, f1: f, dur: 0.06, gain: 0.13 });
    tone({ type: 'sine', f0: f * 2, f1: f * 2.02, dur: 0.09, gain: 0.05, delay: 0.01 });
  }

  // A right answer: bright major arpeggio with a sparkle on top.
  function correct() {
    if (!ctx) return;
    [523, 659, 784, 1047].forEach(function (f, i) {
      tone({ type: 'triangle', f0: f, f1: f, dur: 0.22, gain: 0.17, delay: i * 0.075 });
      tone({ type: 'sine', f0: f * 2, f1: f * 2, dur: 0.16, gain: 0.06, delay: i * 0.075 });
    });
  }

  /* A wrong answer. Deliberately soft and low — a nudge, not a buzzer,
     since this is a young player's first go. */
  function wrong() {
    tone({ type: 'triangle', f0: 392, f1: 370, dur: 0.14, gain: 0.13 });
    tone({ type: 'triangle', f0: 311, f1: 294, dur: 0.20, gain: 0.13, delay: 0.13 });
  }

  // The celebration that rides with the confetti.
  /* A party popper: the crack of the burst, then the paper coming
     down after it. It plays alongside cheer() on a right answer, so it
     is the confetti you hear rather than a second tune — short, dry,
     and out of the way before the cheer has finished. */
  function confettiPop() {
    if (!ctx) return;

    // the crack: a hard, very short noise transient with body under it
    noise({ f0: 1800, f1: 320, dur: 0.09, gain: 0.22, q: 0.5, attack: 0.001 });
    tone({ type: 'square', f0: 240, f1: 70, dur: 0.07, gain: 0.10, attack: 0.001 });

    // the pop's ring, bright and immediately gone
    noise({ f0: 5200, f1: 2600, dur: 0.13, gain: 0.10, q: 1.4, attack: 0.002, delay: 0.01 });

    /* Then the paper: a scatter of short, dry ticks spread over the
       next second, thickest just after the burst and thinning out as
       the pieces fall. */
    for (let i = 0; i < 22; i++) {
      const at = 0.07 + Math.pow(Math.random(), 1.7) * 0.95;
      noise({ f0: 2600 + Math.random() * 4200, f1: 1200 + Math.random() * 1600,
              dur: 0.035 + Math.random() * 0.05,
              gain: 0.030 + Math.random() * 0.022,
              q: 3.2, attack: 0.002, delay: at });
    }
  }

  function cheer() {
    if (!ctx) return;
    const tune = [523, 659, 784, 1047, 1319];
    tune.forEach(function (f, i) {
      tone({ type: 'triangle', f0: f, f1: f, dur: 0.3, gain: 0.14, delay: 0.18 + i * 0.085 });
    });
    // a shimmer wash under the tune
    noise({ f0: 900, f1: 6500, dur: 0.55, gain: 0.07, q: 0.6, delay: 0.18 });
    [1568, 2093, 2637].forEach(function (f, i) {
      tone({ type: 'sine', f0: f, f1: f * 1.01, dur: 0.5, gain: 0.05, delay: 0.5 + i * 0.1 });
    });
  }

  /* Leaves sweeping the screen: layered rustles rather than one
     whoosh, so it reads as foliage instead of wind. */
  /* A long gust for the leaf transition. Broadband noise pushed through
     a band-pass that sweeps up and then back down, so it swells and
     dies away like wind rather than hissing at one pitch, with a
     whistle over the top and single leaves tumbling through it. */
  function wind(dur) {
    if (!ctx) return;
    dur = dur || 2.4;

    // the body of the gust: rising, then falling away
    noise({ f0: 360, f1: 1500, dur: dur * 0.56, gain: 0.105, q: 0.55, attack: dur * 0.22 });
    noise({ f0: 1500, f1: 280, dur: dur * 0.52, gain: 0.09,  q: 0.55,
            attack: 0.04, delay: dur * 0.46 });

    // a thinner whistle riding on it
    noise({ f0: 900,  f1: 2700, dur: dur * 0.42, gain: 0.042, q: 2.4,
            attack: dur * 0.18, delay: dur * 0.10 });
    noise({ f0: 2500, f1: 820,  dur: dur * 0.44, gain: 0.038, q: 2.4,
            attack: 0.05, delay: dur * 0.50 });

    // leaves going past, thickest through the middle of the sweep
    for (let i = 0; i < 16; i++) {
      const at = 0.08 + Math.pow(Math.random(), 0.8) * 0.78;
      noise({ f0: 1500 + Math.random() * 3000, f1: 600 + Math.random() * 1100,
              dur: 0.16 + Math.random() * 0.24,
              gain: 0.028 + Math.random() * 0.03, q: 2.2,
              delay: dur * at });
    }

    // and a low body underneath, so it has some weight
    tone({ type: 'sine', f0: 125, f1: 68, dur: dur * 0.72, gain: 0.032 });
  }

  /* One soft breath of wind, for a single leaf lifting off the tree.
     Far quieter than the transition gust — this has to sit under
     whatever else is happening without competing with it. */
  function breeze() {
    if (!ctx) return;
    noise({ f0: 520, f1: 1650, dur: 1.15, gain: 0.030, q: 0.8, attack: 0.5 });
    noise({ f0: 1650, f1: 430, dur: 1.0,  gain: 0.024, q: 0.8, attack: 0.12, delay: 0.95 });
    noise({ f0: 2300, f1: 1150, dur: 0.45, gain: 0.013, q: 2.8, delay: 0.38 });
  }

  function rustle() {
    if (!ctx) return;
    for (let i = 0; i < 5; i++) {
      noise({ f0: 1200 + Math.random() * 2600, f1: 500 + Math.random() * 900,
              dur: 0.22 + Math.random() * 0.2, gain: 0.075, q: 1.8,
              delay: i * 0.11 + Math.random() * 0.05 });
    }
    noise({ f0: 300, f1: 1800, dur: 0.4, gain: 0.05, q: 0.7 });
    tone({ type: 'sine', f0: 150, f1: 90, dur: 0.3, gain: 0.05 });
  }

  /* A fire engine on its way: its two notes — soft, a lesson and not a
     street — over the low rumble of its engine. */
  function siren(dur) {
    if (!ctx) return;
    dur = dur || 2.4;
    const n = Math.max(2, Math.round(dur / 0.42));
    for (let i = 0; i < n; i++) {
      const f = i % 2 ? 740 : 988;
      tone({ type: 'triangle', f0: f, f1: f * 1.01, dur: 0.34, gain: 0.05, attack: 0.05, delay: i * 0.42 });
      tone({ type: 'sine', f0: f * 2, f1: f * 2.02, dur: 0.28, gain: 0.012, attack: 0.05, delay: i * 0.42 });
    }
    noise({ filter: 'lowpass', f0: 230, f1: 140, dur: dur, gain: 0.05, q: 0.7, attack: 0.3 });
  }

  /* Water on a fire: a hiss that holds, and drops pattering down. */
  function spray(dur) {
    if (!ctx) return;
    dur = dur || 2;
    const n = Math.max(1, Math.round(dur / 0.3));
    for (let i = 0; i < n; i++) {
      noise({ f0: 2300 + Math.random() * 600, f1: 3000, dur: 0.5, gain: 0.05, q: 0.6,
              attack: 0.12, delay: i * 0.3 });
    }
    for (let i = 0; i < n * 2; i++) {
      noise({ f0: 4200 + Math.random() * 1800, f1: 2600, dur: 0.06, gain: 0.028, q: 3,
              delay: 0.3 + Math.random() * Math.max(0.1, dur - 0.3) });
    }
  }

  /* And the fire going out: steam, falling away. */
  function hiss() {
    if (!ctx) return;
    noise({ filter: 'highpass', f0: 5200, f1: 2600, dur: 1.4, gain: 0.05, q: 0.7, attack: 0.08 });
  }

  // Cheerful three-note flourish when a line finishes.
  function chime() {
    [784, 988, 1319].forEach(function (f, i) {
      tone({ type: 'triangle', f0: f, f1: f, dur: 0.24, gain: 0.12, delay: i * 0.09 });
    });
  }

  return {
    unlock, prime, duck, duckReset, wind, breeze, confettiPop,
    chirp, birdCall, flap, land, pop, blip, sparkle, whoosh, chime, magic, draw, tick,
    correct, wrong, cheer, rustle, siren, spray, hiss,
    // whether playback is actually authorised, not merely built
    get armed() { return armed; }
  };
})();
