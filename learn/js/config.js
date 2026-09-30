/* =============================================================
   Distance Formula — configuration & measured sprite geometry
   Stage is a fixed 1920 x 1080 (16:9) design space; everything
   below is expressed in those design pixels.
   ============================================================= */
window.CFG = (function () {
  'use strict';

  /* ---------- Stage ---------- */
  const STAGE_W = 1920;
  const STAGE_H = 1080;

  /* ---------- Version ----------
     The stamp index.html gives this file's own address, written on
     every commit by tools/stamp.js. Everything the scripts fetch —
     pictures, music, voices — carries it too, so a browser holding an
     earlier copy of any of them asks for the new one instead of
     showing yesterday's picture with today's code. Empty when the page
     is opened without one, and then nothing is stamped. */
  const VERSION = (function () {
    const s = document.currentScript && document.currentScript.src;
    const m = s && /[?&]v=(\d+)/.exec(s);
    return m ? m[1] : '';
  })();
  const stamped = function (url) { return VERSION ? url + '?v=' + VERSION : url; };

  /* ---------- Asset paths ---------- */
  /* Pictures are WebP (every current browser; Safari since 14), each
     smaller than the PNG it was made from. The PNGs are in the
     repository's history (assets/*.png, up to commit bcf997d). */
  const ART = {
    startScreen: stamped('assets/start screen.webp'),
    background:  stamped('assets/game Background .webp'),
    clouds:      stamped('assets/clouds.webp'),
    playButton:  stamped('assets/play button .webp'),
    swiftyFly:   stamped('assets/swifty fly.webp'),
    swiftyTalk:  stamped('assets/swifty talk.webp'),
    swiftyStand: stamped('assets/normal stand swifty.webp'),
    townSheet:   stamped('assets/sheet.webp'),
    /* Maya walking: eight frames in a row, each in a cell of its own
       (160 x 295) — cut from the drawing supplied for her, halved, each
       figure kept where that drawing's even grid put it so the walk
       does not jitter. She faces left. */
    mayaWalk:    stamped('assets/maya-walk.webp'),
    // the fire engine's strip (tools/fire-engine-sprite.py): 54's rescue
    fireEngine:  stamped('assets/fire-engine.webp'),
    /* Swifty over the top edge of the formula panel, six frames in a
       row (tools/swifty-peek-sprite.py): 37, 39 and 41 (PEEK). */
    swiftyPeek:  stamped('assets/swifty-peek.webp'),
    /* The number selector, drawn. Every piece of the control is a crop
       of this one sheet, so `preload` waiting for it is the whole of
       the loading story: it is about 940KB, and a control that rises
       un-skinned and then dresses itself is worse than the CSS it
       replaced. */
    buttons:     stamped('assets/buttons.webp'),
    /* One tile of that sheet cut out on its own — region (184, 646,
       215, 213) — for the table's scrollers, which lay it in nine
       pieces so a tile can widen to its number (formula-table.css).
       Listed so `preload` has it before the first scroller drops. */
    tile:        stamped('assets/tile.webp'),
    leaf:        stamped('assets/leaf.webp'),
    handNudge:   stamped('assets/hand nudge.webp')
  };
  /* Sound is Ogg Opus, and only Ogg Opus: Chrome, Edge, Firefox and
     recent Safari (tested in WebKit 26), at half the size of the MP3s
     it was made from or less. An older iPad that cannot play Opus plays
     no sound — the game goes on without it, paced by its own timings. */
  const AUDIO_EXT = '.ogg';
  const MUSIC = stamped('sfx/bg music.ogg');

  /* -------------------------------------------------------------
     SPRITE SHEETS
     Both sheets are 1448 x 1086 holding 8 poses in a 4 x 2 grid.
     The nominal 362 x 543 cells are NOT usable directly: several
     flying poses bleed past their cell edge, and the two rows sit
     at different heights, so naive cell slicing clips wings and
     makes the bird jump vertically at the row change.

     `rect`   = exact opaque bounds of each pose, measured from the
                alpha channel.
     `anchor` = centroid of the yellow belly, in sheet coordinates.
                The belly is rigidly attached to the body and barely
                moves while the wings flap, so pinning it to a fixed
                point keeps every pose registered to the same spot.
     ------------------------------------------------------------- */
  const SHEETS = {
    fly: {
      fps: 14,
      frames: [
        { x:   27, y: 156, w: 334, h: 314, ax:  198.5, ay: 398.0 },
        { x:  392, y: 155, w: 338, h: 315, ax:  570.6, ay: 396.9 },
        { x:  746, y: 169, w: 358, h: 306, ax:  933.5, ay: 406.9 },
        { x: 1119, y: 169, w: 310, h: 309, ax: 1294.0, ay: 406.7 },
        { x:   24, y: 627, w: 351, h: 313, ax:  208.5, ay: 868.0 },
        { x:  396, y: 631, w: 335, h: 300, ax:  574.2, ay: 864.3 },
        { x:  751, y: 619, w: 332, h: 311, ax:  924.4, ay: 858.9 },
        { x: 1109, y: 627, w: 323, h: 306, ax: 1283.7, ay: 864.7 }
      ]
    },
    talk: {
      fps: 10,
      frames: [
        { x:   25, y: 131, w: 329, h: 355, ax:  195.1, ay: 398.6 },
        { x:  378, y: 126, w: 334, h: 360, ax:  548.6, ay: 397.5 },
        { x:  737, y: 130, w: 334, h: 356, ax:  908.1, ay: 398.2 },
        { x: 1096, y: 127, w: 330, h: 359, ax: 1267.7, ay: 397.8 },
        { x:   20, y: 623, w: 336, h: 353, ax:  196.3, ay: 888.7 },
        { x:  379, y: 617, w: 334, h: 360, ax:  547.5, ay: 886.4 },
        { x:  738, y: 623, w: 335, h: 353, ax:  909.8, ay: 888.1 },
        { x: 1097, y: 620, w: 335, h: 357, ax: 1269.4, ay: 888.6 }
      ]
    }
  };
  const SHEET_W = 1448, SHEET_H = 1086;

  /* Each sheet says its own pixel size and its own scale, so the
     sprite asks a sheet rather than assuming one size for all of
     them. Both of these are the one size; the machinery that let them
     differ is kept because it costs nothing and is already proven. */
  SHEETS.fly.sw = SHEET_W;  SHEETS.fly.sh = SHEET_H;  SHEETS.fly.k = 1;
  SHEETS.talk.sw = SHEET_W; SHEETS.talk.sh = SHEET_H; SHEETS.talk.k = 1;

  /* -------------------------------------------------------------
     SWIFTY PLACEMENT
     ------------------------------------------------------------- */

  // Reference pose the placement is measured against: the standing /
  // talking pose, 329 x 355 of opaque pixels.
  const REF = SHEETS.talk.frames[0];
  // Belly anchor relative to that pose's top-left corner.
  const REF_AX = REF.ax - REF.x;   // 170.1
  const REF_AY = REF.ay - REF.y;   // 267.6

  /* Swifty's placement on the 1920 x 1080 background.

     The artwork's aspect ratio is fixed (the standing pose is 329 x 355
     opaque pixels), so ONE number drives her whole size: `height`. The
     width follows from it, and she is never squashed. The brief's
     398 x 307 box could not be met on both axes for that reason; this
     is that box tuned down to the size asked for.

     Everything else — the belly anchor, the head the bubble tail lands
     on, where landing dust falls — is derived from these three values,
     so changing `height` or the centre moves the whole rig together. */
  const SWIFTY = {
    cx: 960,       // centred horizontally on the background
    /* Her feet come out at cy + height/2, so this number is really
       "where she stands". The new painting puts the shoreline at
       y 956 under her — measured off the art, not guessed — and 600
       left her feet at 720, which is two hundred pixels out over the
       water. 820 puts them at 990, well into the grass and just above
       the board screens' own 1000.

       340 tall, not 240: alone in the middle of the open field (1, 3)
       she is the whole picture, and at 240 she read as a figure in the
       distance. */
    cy: 820,
    height: 340    // rendered height in stage px (width follows at 315)
  };

  const CHAR_SCALE = SWIFTY.height / REF.h;

  // Stage position the belly anchor is pinned to.
  const ANCHOR = {
    x: SWIFTY.cx - (REF.w * CHAR_SCALE) / 2 + REF_AX * CHAR_SCALE,
    y: SWIFTY.cy - (REF.h * CHAR_SCALE) / 2 + REF_AY * CHAR_SCALE
  };

  /* Anchor -> ground contact, so landing dust lands under her feet
     whatever scale she is drawn at. */
  const FEET_DY = (REF.h - REF_AY) * CHAR_SCALE;

  /* Ground shadow under her feet. Sized as a fraction of her rendered
     width, so it tracks `SWIFTY.height` automatically. */
  const SHADOW = {
    widthRatio: 0.88,   // of her rendered width
    heightRatio: 0.23,  // of the shadow's own width
    dy: -5              // nudge up so her feet sit ON it, not above it
  };

  /* Top of Swifty's head (the crest tuft), measured as an offset
     from the belly anchor, averaged over the eight talking poses.
     This is what the speech-bubble tail has to reach. */
  const HEAD_TOP = {
    dx: -28.9 * CHAR_SCALE,
    dy: -268.4 * CHAR_SCALE
  };

  /* -------------------------------------------------------------
     SPEECH BUBBLE
     Her balloon is css/speech-bubble.css — HTML and CSS only: a pale
     pink rounded box with a soft pink edge, a tail curving down to the
     lower left, one small shine. Everything about how it LOOKS is in
     that file. These are the numbers the game needs to seat it: how big
     it is, how far the tail's point hangs below it and where along the
     underside the point sits, and how close it may come to her.
     ------------------------------------------------------------- */
  const BUBBLE = {
    /* Cut to its line: as wide as the line and as tall as its rows, with
       nothing round it but the padding — up to 560 wide (the widest the
       column beside the board can hold), where a longer line takes
       another row, and never narrower than 200, which the tail needs.
       The edge is the CSS's border. */
    maxW: 560,
    minW: 200,
    edge: 5,
    /* The words (34px on every screen, css/speech-bubble.css): Poppins
       700 at 1.25 lines, and this much mint between them and the edge. */
    lineH: 42.5,
    pad: { x: 26, y: 16 },
    /* The tail's point hangs this far below the balloon, and sits this
       far in from its left edge, where the CSS draws it. Where the room
       she stands in would push the balloon past its edge (her column,
       beside the board), the balloon moves back inside and the point
       slides along the underside to stay on her — never nearer the
       left than tailMin, nor the right than tailRight (its base and the
       corner after it). */
    tailLen: 46,
    tip: { x: 30 },
    tailMin: 30, tailRight: 146,
    biteIntoHead: 10,             // how far the point sinks into her
    /* Where a corner tail points: her head's right cheek. Measured off
       her artwork's own alpha, over all eight talking poses — at 0.38
       of the way from her crown to her feet (plus the bite below) her
       outline sits between 0.353 and 0.367 of the frame's width out
       from the belly anchor. 0.330 is therefore 5px inside the
       narrowest of the eight and 8px inside the widest, so the point
       touches her on every frame of the talk cycle instead of landing
       on the outline and flickering off it as she talks. Kept as
       fractions so it holds wherever she is drawn at. */
    aimSide: { dx: 0.330, dy: 0.38 },
    /* Out of the balloon's lower left, so on the open field the box
       sits up and to the right of her face. */
    tailSide: 'left',
    autoWidth: true               // cut to its line (Bubble.fitBox)
  };

  /* -------------------------------------------------------------
     SWIFTY OVER THE PANEL — 37, 39 and 41
     The formula done, she comes up from behind the panel it is written
     on, her hands on its top edge, says what it gives, and a Next comes
     up in the corner (the peek in game.js).

     Six frames in a row, each w x h (tools/swifty-peek-sprite.py): her
     beak shut in the first, then a little open, open, wide, open, and
     shut again. The rest are measured in a frame's own pixels.
     ------------------------------------------------------------- */
  const PEEK = {
    frames: 6, w: 356, h: 304,
    /* The flat foot of her body, between her hands: it sits on the
       panel's edge, the rest of her behind the panel. Her fingers reach
       on below it to `hands`, over the edge. */
    body: 280, hands: 299,
    /* The top of her head right of her crest, where a balloon's point
       lands on her. */
    crown: { x: 220, y: 51 },
    /* How wide she is drawn, in stage pixels: a head and two hands,
       so smaller than her whole self standing (300 was too big). */
    size: 220,
    riseMs: 640,                  // up from behind the panel
    gripMs: 180,                  // and her hands over its edge
    /* Her beak as she talks: the open frames in an order that does not
       repeat for a while, at the talking sheet's own pace. */
    fps: 9,
    talk: [1, 2, 3, 2, 4, 1, 5, 2, 3, 4, 1, 0],
    /* Her balloon over her head, a little wider than the column's, so
       what she says there takes two rows rather than three. */
    bubble: Object.assign({}, BUBBLE, { tailSide: null, maxW: 660 }),
    /* The Next in the corner, this long after her last word. */
    nextMs: 450
  };

  /* A right answer, everywhere: said, not written. The board has shown
     it already — the line lit, the confetti — so a balloon over it only
     repeated it. (It was "That's right!" in some places, "Exactly!" in
     others, and a few lines of their own.) */
  const PRAISE = 'That\u2019s correct!';
  /* …and said only where it frames the lesson: on the first answers —
     the two points located (6, 7) and the four warm-up distances, two
     across and two up (8, 13, 14, 19) — and on the last question, the
     park's "What type of triangle is it?" (55, and 61 for a child who
     measured it first). Every right answer between is marked by its
     chime and its confetti alone: said at every one of them, it was
     heard so often it stopped meaning anything. */
  const PRAISE_AT = [6, 7, 8, 13, 14, 19, 55, 61];
  /* A wrong one, from 41b on: said, and then the working it promises. */
  const OOPS = 'Oops! Let\u2019s find it together.';

;
;

  /* -------------------------------------------------------------
     START SCREEN
     She flies in and perches on the rock at the lower left before the
     Play button is offered — the title shot, so she is the subject of
     it rather than a presenter, and is drawn well above her in-game
     size.

     feetY is where the bottom of her toes lands, and it is 12px below
     the rock's painted top edge (which runs y 873..888 under her, the
     crown being domed rather than flat). Sitting her exactly on that
     edge left both feet hovering 7-10px clear, because only her very
     toe tips reach the bottom of the sprite box — the sole reads about
     14px higher. Sinking her instead puts weight on the rock. */
  const START = {
    /* On the grass, not on the stone. She stands in the open between
       the two boulders — the big one falls away to her left and the
       small one sits below her right, so both read as in front of her
       and she is planted on the slope rather than balanced on a rock. */
    height: 380,                    // against SWIFTY.height of 340 in game
    perch: { cx: 470, feetY: 955 },
    flyMs: 2600,                    // a title screen can afford a long arc
    buttonDelay: 420                // beat between her settling and Play
  };
  /* Derived exactly the way ANCHOR is, so the same belly-anchor rule
     seats her here: the rig origin is the anchor, and her feet fall
     FEET_DY below it at this scale. */
  START.scale = START.height / REF.h;
  START.anchor = {
    x: START.perch.cx - (REF.w * START.scale) / 2 + REF_AX * START.scale,
    y: START.perch.feetY - (REF.h - REF_AY) * START.scale
  };
  // A contact shadow on open ground, so it spreads the way the game's
  // grass one does rather than being pinched to a rock's width.
  START.shadow = { w: 186, h: 40 };

  /* The title screen's weather, livelier than the game's: there is
     nothing here anyone has to read, so leaves overlap instead of
     queueing and the wind itself is visible.

     This art's tree is wider than the game's — its foliage reaches
     x 648 at y 120 and x 516 at y 160 — so leaves lift off further
     right and still read as leaving the canopy. */
  START.drift = {
    solo: false,                  // several on the wing at once
    rustleOnLift: true,           // heard leaving the tree, not just drifting
    dur: 11000,
    gapMin: 2800, gapMax: 5400,
    firstDelay: 500,
    lines: 4,
    fromX: 340,
    y0: [110, 250],
    /* The loop is held left of and below the wordmark (x 796..1667,
       y 211..643) so no leaf ever circles over the type, and they
       leave the frame beneath it rather than across it. */
    loopX: [520, 780], loopY: [450, 600], loopR: [60, 120],
    endY: [680, 860],
    size: [46, 88]
  };
  START.wind = {
    gustLines: [4, 7], gustMs: [2000, 3300],
    /* Two bands, high sky and low over the lake, chosen so no streak
       ever crosses the wordmark (y 211..643). A leaf blowing past the
       type reads as a leaf; a straight 3px line reads as a scratch on
       it. The leaves carry the wind through the middle instead. */
    gustBands: [[110, 200], [655, 800]],
    gapMin: 2600, gapMax: 5600, firstDelay: 600
  };

  /* -------------------------------------------------------------
     PLAY BUTTON
     Brief: Position X = 1010, Y = 659 / Dimensions W = 281, H = 267.
     Read as the centre of a 281 x 267 box — which lands the button
     in the clear grass between Swifty and the chalkboard on the
     start screen. Source is 1285 x 1224 with the glowing disc
     occupying x[70..1204] y[58..1175]; the disc is fitted to the box.
     ------------------------------------------------------------- */
  const PLAY = {
    srcW: 1285, srcH: 1224,
    ink: { x: 70, y: 58, w: 1135, h: 1118 },
    /* Centred under the title on the start art, which sits at
       x 796..1667, y 211..643 on the stage.

       cx is the centre of the lettering, not of that box: the logo
       carries decorative leaves off its top and bottom right, and
       centring on the full outline hangs the button 10px right of the
       words. Measured off each word's own fill instead — "Formula"'s
       white gives 1219, "Distance"'s yellow 1223.

       At sizeScale the disc renders 197 x 187. It hung too low for the
       lockup — 110px of sky under the plate put it adrift in the middle
       of the lake — so it sits 30px higher, spanning y 667..853, which
       lands it on the far shore and reads as part of the title rather
       than as something floating below it. Still 80px under the plate,
       well clear of the leaves hanging off its corners. */
    /* Under the wordmark, centred on the WHOLE lockup — which is not
       the same as centred on the plate it hangs under, and that is
       what two goes at this kept missing.

       Measured off the rendered page (the art is 1672 wide against a
       1920 stage, so a number read straight off the picture is out by
       a seventh): the "Formula" plate's middle is stage 1273, but the
       "Distance" plank above it is 90px wider and reaches further
       left, and the two together span x 615..1855 with their middle
       at 1234. The eye centres the button under the pair, not under
       the lower one, so 1273 read as 39px right of where it belongs
       and 1336 before that as 100px. */
    box: { cx: 1234, cy: 760, w: 281, h: 267 },
    // Shrinks the briefed box about its centre — the button stays put,
    // it just gets smaller. 1 = the full 281 x 267 from the brief.
    sizeScale: 0.70
  };

  /* -------------------------------------------------------------
     CLOUDS
     clouds.webp is not a sky layer — it is one cloud drawn inside a
     1920 x 1080 transparent canvas, its ink sitting at
     x[545..1396] y[257..737]. Tiling the whole file parks that cloud
     on the grass, so the sprite is cropped out and re-used instead.
     ------------------------------------------------------------- */
  const CLOUD = {
    src: ART.clouds,
    srcW: 2048, srcH: 768,
    /* The opaque part of the artwork, measured off its alpha: the file
       carries a wide transparent margin, and the drift is positioned
       by the cloud itself rather than by the picture around it. */
    ink: { x: 68, y: 64, w: 1881, h: 621 },
    /* Two small clouds only, at full opacity, looping across the sky.
       `top` is the cloud's top edge and `phase` is how far through its
       loop it starts, so the pair never travels in lockstep. Both sit
       well above the horizon (~640) so nothing drifts behind Swifty. */
    /* Measured off the background across the rows the clouds occupy:
       between the tree that fills the top left corner and the one on
       the right, the sky is unbroken from x 424 to x 1771. A cloud
       stays wholly inside that, drifting to one end and back again
       rather than crossing the frame, so it never touches a tree at
       any opacity — the sky is the only place it is ever seen. */
    band: { x0: 440, x1: 1760 },

    /* Deliberately barely-moving. This is scenery behind a lesson, so
       it has to read as alive without ever pulling the eye off the
       board: at these speeds a cloud shifts about a finger's width in
       half a minute, which is under the threshold that catches
       attention. */
    instances: [
      /* Faint on purpose. They sit behind the board, so the only part
         ever seen is the strip of sky above it — and even there they
         should read as distant weather, not as something on the same
         plane as the lesson. */
      { scale: 0.154, top: 96,  speed: 7,   opacity: 0.5,  phase: 0.30 },
      { scale: 0.118, top: 212, speed: 4.5, opacity: 0.38, phase: 0.65 }
    ]
  };

  /* What a plotted point looks like — one description, used by every
     one of them. A point the child locates and the same point drawn as
     the end of a segment are the same point, so they are drawn the same
     way: finding one used to turn it green and plotting it turned it
     back to blue, which read as the board swapping it for a different
     one rather than carrying on with it. Being right is said by the
     ring, the burst and the cheer, not by recolouring the answer. */
  /* One definition for every point the child ever sees — the one they
     tap out and the one a segment joins are the same object, so they
     cannot drift apart in colour or size. */
  const POINT = { r: 10, fill: '#2E9E6B', stroke: '#FFFFFF', strokeW: 3 };

  const GRID = {
    /* The space the board is drawn in, and the SVG viewBox. It used to
       be the old artwork's 1507 x 1044, which showed x -12.8..12.7 and
       y -8.8..8.8 while only ever labelling x -9..9 and y -6..6 — close
       to four unlabelled columns of padding on each side.

       Trimmed to just what the labels need plus the axis overshoot,
       the arrowhead and the x/y glyph. Nothing measured below moves:
       every offset is relative to the origin, so trimming the frame
       only stops the panel drawing cells nobody names, and the same
       range is then drawn at 56px a cell instead of 51px. */
    /* The viewBox is the ruling and nothing else: 14 cells across by 12
       down, exactly. There is no spare band round the outside, so the
       first and last lines of the grid land on the panel's own edges
       and every square on the board is whole.

       That also settles the gaps for good. Air round the ruling could
       only ever be even if panel.w - panel.h came to exactly two cells;
       with none at all, there is nothing to be uneven. The axes still
       stop short of the edge — they run to the last number plus an
       overshoot for the arrowhead, not to the frame. */
    w: 14 * 77.372458, h: 12 * 78,

    /* Centred, and filling everything below the band that carries
       Swifty and her line. Square cells tie the panel's aspect to the
       frame's, so height is what limits it: the band costs 178px and
       the rest is grid. */
    /* Floor to ceiling, and reaching left as far as her bubble allows.
       The frame was widened symmetrically to do it, so the board grew
       into the dead space without the axes leaving its centre — the
       extra columns either side of 6 are unnumbered grid. */
    /* As far left as her column allows. The slider used to set that
       limit at 660 — it was 610 wide and had to live in whatever the
       board left; narrowing it to 520, the width the answer pad and the
       options panel already use, bought the board another 60px. The
       frame was widened to suit, so the board grew without the axes
       leaving its centre. */
    /* 14 by 12 cells, so the panel is 7:6 and the cells stay square.
       88px a cell — bigger than it has ever been, because the band that
       used to sit outside the ruling is now grid. */
    box: { x: 644, y: 12, w: 1232, h: 1056 },

    /* Where the board builds itself before anyone is on screen: the
       middle of an empty frame, since it is the whole picture until
       there is someone to share it with. It moves to `box` as she
       flies in. Same size either end, so the slide moves two offsets
       and the grid art never rescales mid-flight. */
    centre: { x: (STAGE_W - 1308) / 2, y: 12, w: 1308, h: 1056 },

    /* A wide, shallow bubble for these screens instead of the tall one
       she uses elsewhere. Two reasons: the band above the panel is only
       130px, and at 910px the text plate puts every line these screens
       speak on a single line, which is what keeps the band shallow.

       Only the balloon has to clear the panel — the tail is meant to
       cross into it, since that is where her head is. */
    /* On the grid screens she stands below her line, so the tail points
       down at her head the ordinary way. Same shallow shape and single
       stroke as the rail version — only the tail differs. */
    /* The same balloon over her head, where she stands in her own
       column with the board filling everything to her right: the point
       on her crown rather than her cheek. The room it has is the
       column's (STAND.room), so it never reaches the board. */
    bubbleDown: Object.assign({}, BUBBLE, { tailSide: null }),


    /* Axis geometry in panel-local pixels, measured off the drawn
       grid. The artwork is 22 x 14 cells at ~61px: 23 vertical lines
       (67..1413) and 15 horizontal (64..924). Both axes carry the
       same range and each line spans exactly that range, so neither
       reaches past the grid. */
    /* The origin sits at the centre of the cream, so the axes are
       centred in the grid rather than merely centred on their own
       extents. */
    originX: 7 * 77.372458, originY: 6 * 78,
    /* Sized so the numbered plane fills the board. The board is 1.24:1
       and cells have to stay square, so the two ranges cannot both be
       the same: 6 columns each way and 5 rows each way is what a square
       cell divides this frame into. Asking for 6 rows as well is what
       held the cells down to 59px with a band of unnamed ruling top and
       bottom — the same plane now draws at 78px a cell.

       Both steps scale together, so their ratio is untouched and cells
       stay square against the panel's own aspect. */
    stepX: 77.372458, stepY: 78,

    /* The board is far wider than it is tall, so x reaches further
       than y — which is the whole point: a square cell divides this
       frame into 6 columns each way and 5 rows each way, and asking
       for 6 rows as well is what used to squeeze the cells down.
       Cells are square (83.2 x 83.2 on the full board), so a unit is
       the same length on both axes. */
    /* y stops at 5 where x stops at 6. Every point the game plots fits
       (x runs -5..6, y runs -3..5) and it is what lets a square cell
       fill a frame that is wider than it is tall. */
    xFrom: -6, xTo: 6,
    yFrom: -5, yTo: 5,
    /* Numbered every unit. The wide board cannot be — see `ranges`. */
    labelEvery: 1,

    /* Two boards, and a screen picks one.

       A rescue twelve units below the origin does not fit on a plane
       that stops at five, and the tempting fix — worth more than one
       unit a cell — is the wrong one: a point that lands between
       gridlines cannot be counted to, and counting off the board is
       this whole lesson's method. So a unit is always a cell; only the
       cell gets smaller.

       `wide` is `close` at two fifths, which keeps the cells square
       (both steps scale by the same factor, so their ratio is
       untouched) and leaves the origin exactly where it was, at the
       middle of the viewBox — so nothing that measures from the panel
       moves. Numbered every five, because thirty-one numbers along an
       axis is a wall of digits rather than a scale.

       y stops short of x for the same reason it does on `close`: the
       board is wider than it is tall and the cells are square, so a
       symmetric range is height-limited. The overshoot and arrowhead
       come down with the cells, or the head alone would be most of a
       numbered interval. */
    ranges: {
      /* 34, down from 36. The numbering is what the board is read
         against and it was the loudest type on the paper — louder than
         the working being taught at 30, and a shade louder than it
         needs to be to be counted along. Two points quieter leaves the
         drawing the loud thing, which is the right way round, and
         hands every negative a little more air besides. */
      close: { k: 1,   xFrom: -6,  xTo: 6,  yFrom: -5,  yTo: 5,
               every: 1, labelSize: 34, overshoot: 58,
               arrow: { len: 34, halfW: 20 },
               gxFrom: -7, gxTo: 7, gyFrom: -6, gyTo: 6 },
      /* Between the two, for a shape that is too big for the lesson's
         own plane and too small to be lost on the rescue's.

         Numbered every SECOND unit. It was every unit, and the note
         here said there was room at 53px a cell for all twenty-one
         numbers — which was true while a negative was written with a
         hyphen. It is not any more: the board writes a real minus sign
         now, and U+2212 is a tabular glyph the width of a digit, so
         "−10" is three digit-widths where "10" is two. Measured on
         this board that is 62px of number in a 53px cell, and the run
         came out as "−10−9−8…" with 1.6px between one number and the
         next, and the 0 overlapping the −1 beside it.

         Every second unit gives each label two cells of its own and a
         44px gap at the worst pair. The gridline is still drawn for
         the ones between — a point between two labels is still a point
         a child can count to, which is the same reasoning the wide
         board has always used. */
      mid:   { k: 0.6, xFrom: -10, xTo: 10, yFrom: -8,  yTo: 8,
               every: 2, labelSize: 30, overshoot: 40,
               arrow: { len: 26, halfW: 15 },
               gxFrom: -11, gxTo: 11, gyFrom: -10, gyTo: 10 },
      wide:  { k: 0.4, xFrom: -15, xTo: 15, yFrom: -13, yTo: 13,
               every: 5, labelSize: 26, overshoot: 30,
               arrow: { len: 22, halfW: 13 },
               gxFrom: -17, gxTo: 17, gyFrom: -15, gyTo: 15 }
    },

    ink: '#213258',                 // axes, arrowheads and numbers
    axisWidth: 7,
    /* How long a half-axis takes to draw itself outward from the
       origin. The stylesheet reads it from a custom property set in
       Board.build(), so the numbers riding the sweep and the sweep
       itself can never drift apart. */
    axisDrawMs: 900,
    /* The colour a number is struck in as the sweep uncovers it, before
       it cools to the board's ink. Scale alone was too quiet to notice
       on a bright board; a number that lights up is not missable. */
    numLit: '#F0A310',

    /* How far each axis runs past its last number before the
       arrowhead. Sized to the tighter axis, which is y: past the
       arrow there is only the `y` above it and then the frame, where
       x has room to spare on both sides. The same length on all four
       arms, so the cross reads as one shape. */
    /* Long enough that the arrowhead clears the last number: at 40 the
       head's base sat right on the 9 and the 6, because the arrow is
       34 of it. */
    overshoot: 58,
    arrow: { len: 34, halfW: 20 },
    /* The board itself: a golden frame, a cream surface and a grid of
       even squares, all drawn in CSS rather than dropped in as a
       picture. Sizes are in the same 1507x1044 space the axes are
       measured in and scale with the panel.

       The grid is laid out from the origin outwards, one line every
       stepX / stepY, so a line falls on every whole coordinate and the
       numbers sit exactly where they always did.

       Its extent is chosen to leave an even margin of cream inside the
       frame. The origin sits above the panel's middle, so a grid
       centred on it would leave a thin strip of cream at the top and a
       wide empty band at the bottom; carrying it two rows below the
       numbers instead of one fills that band and evens the margins to
       31px top and 25px bottom. Sideways there is no whole cell to
       gain — one more would run right up against the frame. */
    paper: {
      inner:     '#FFF9E8',
      /* A dark slate, not gold. Gold scored worst 1.38 against this
         scene — the same value as the sunset it sits in front of —
         where the slate scores 2.45. It also leaves gold to mean one
         thing: gold is what you can touch (the dials, GO, Back and
         Next). This is a surface to read. */
      frame:     '#252C47',
      edge:      '#141930',
      highlight: 'rgba(255, 255, 255, .65)',
      line:      'rgba(120, 135, 135, .55)',
      lineW: 2,             // stage px, the same weight at every size
      radius: 40,
      /* Slimmed: the frame used to be 34px of stacked rings, which at
         this board size read as a heavy border around the work rather
         than a edge to it. */
      edgeW:     1.5,
      /* The band round the board, thinner than it was. 13 plus its own
         2px edge put 15px of dark border round a cream sheet — heavy
         enough to read as a picture frame rather than as the edge of a
         page. Seven is a rule, not a moulding.

         This does NOT follow the camera: `place` scales the frame by
         the panel's own scale rather than the view's, so a board that
         pushes in does not thicken its border. */
      frameW:    7,
      hiW:       2,               // the pale ring just inside the frame
      /* Whole cells only. Running the ruling past the frame and
         trimming it to the cream left a sliver of a cell down every
         side and a curved scrap in each rounded corner — the grid read
         as cut out rather than drawn on. These are the most cells that
         fit inside the cream while still landing on whole coordinates,
         so every square on the board is a square.

         The cream is 1184 x 958 and a cell is 77.4 x 78, so it holds
         15.3 across and 12.3 down: the leftover is 50px a side and
         11px top and bottom. That is arithmetic, not a choice — square
         cells on a board wider than it is tall cannot come out even on
         both axes. */
      gxFrom: -7, gxTo: 7,
      gyFrom: -6, gyTo: 6
    },

    /* 34, down from 36 — and this is the one that governs the close
       board, not `ranges.close.labelSize` beside it. `setRange` bails
       when the range asked for is the one already in force, and close
       is in force from the start, so the range's own figure is never
       applied to it; the two are kept the same number so reading
       either tells the truth. */
    labelSize: 34,                  // scaled with the cell
    /* How far every axis number stands off its own axis, measured from
       the stroke's outer edge to the number's INK.

       One value for both runs, because the two were placed by different
       rules and neither of them was a gap: the x row by a constant plus
       a fraction of its type, the y column by its own CENTRE — so a
       two-character "-5" reached closer to the axis than a one-character
       "5", and the column's clearance ran from 6.3px to 16.5px while
       the row sat tucked against the line. */
    numGap: 16,
    /* 0 keeps the x numbers' row and shares the y numbers' column, so
       the left-hand numbers read as one column with the 0 at its
       corner. It is the only one of them in that row, so the -1 to its
       left and the -1 below it are what it has to clear, not the
       column it sits in. */
    zeroGap: 30,

    /* Axis names. `x` sits beyond the positive x arrow; `y` sits
       beside its arrow rather than above it — there are only 21px
       between that tip and the top of the grid. */
    /* x and y sit just outside their own arrowhead, diagonally off the
       tip — the same relationship on both axes rather than floating
       away from them. */
    axisName: { size: 40, gap: 24, rise: 28, yGap: 34, yDrop: 10 },

    /* Screen 6: a marker on every gridline intersection across the
       numbered range — 13 x 13 = 169 of them. Faint light blue so
       they read as places you could tap rather than as answers, with
       a white ring keeping each legible where it crosses a navy axis.
       They brighten and grow under the cursor. */
    dot: {
      // small enough to read as a place you could tap, not as a plotted point
      r: 5,
      fill: '#6FC0E8',      // soft light blue, held faint by the pulse opacity
      stroke: '#FFFFFF',
      strokeWidth: 2,
      rippleMs: 60,         // per-ring delay, so the pulse travels outward
      skipOnAxes: true,     // no marker where a point would sit on an axis
      /* How long a child is left to look before anything helps them.
         Ten seconds is long enough that someone reading the board is
         never interrupted, and short enough that someone stuck is not
         left there. Until then nothing on the board moves at all. */
      hintAfter: 10000,
      /* When it does come, a hand taps the place as well — but only for
         a moment. The glow stays until the point is found; the hand
         says "here" once and gets out of the way. */
      nudgeMs: 3000,
      /* The art is a 1234 square that is mostly empty: the drawn hand
         occupies only x 488..770, y 484..840 of it, so a box sized to
         look right draws a hand under a quarter that wide. 290 puts
         about 66x84px of hand on a board whose cells are 88 — plainly a
         pointing finger, and small enough not to sit on top of the
         point it is pointing at.

         The fingertip is at 0.4627 across and 0.3922 down. That is
         measured off the yellow of the hand specifically, not off the
         file's alpha: the art also carries a pale tap-ripple ring that
         reaches higher than the finger does, and taking the alpha
         bounding box read the top of that ring instead, which hung the
         whole hand a tenth of an image too low and left the fingertip
         floating below the point. */
      nudgeSize: 290,
      nudgeTip: { x: 0.4627, y: 0.3922 },
      // markers cover every numbered intersection on both axes
      xFrom: -6, xTo: 6,
      yFrom: -5, yTo: 5
    },

    /* A plotted segment: two named points joined by a line, each
       labelled with its coordinates above and its letter below. */
    segment: {
      /* About a third of a cell across. At half a cell the two points
         were the loudest thing on the board — bigger than the numbers
         beside them and nearly touching the ruling on either side. */
      dotR: POINT.r,
      dotFill: POINT.fill,
      dotStroke: POINT.stroke,
      dotStrokeW: POINT.strokeW,
      lineColor: '#213258',
      lineWidth: 6,
      // the guide drawn between the two points before the question
      dashColor: '#5B7AA8',
      dashWidth: 5,
      dashArray: '2 15',
      coordSize: 26,
      /* "N units", written on a pair.

         It had no figure at all. Four places in the code asked for
         `SG.resSize || SG.coordSize` and got 26, while the stylesheet
         was handed a hardcoded 34 — so every one of these was MEASURED
         at 26 and DRAWN at 34, and each one was a third bigger than
         the code placing it believed. It was also the loudest type on
         the paper: larger than the coordinates it sits among, larger
         than the working being taught at 30, and level with the axis
         numbering the whole board is read against.

         28 — a shade over a coordinate, because it is the answer and
         they are the address, and under everything else. One number
         now, read by the placing and by the painting alike. */
      resSize: 28,
    /* Down from 40 and 34. A point's letter was the loudest type on
       the paper — larger than the axis NUMBERS the board is read
       against (36) and a third larger than the working that is being
       taught (30). Nothing about a label earns that. The working's 30
       is the ceiling; the letter keeps a little over its coordinate so
       the two still read as a name above an address. */
      nameSize: 30,
      /* How far a length written on a pair keeps off the line it
         measures — the same air a coordinate keeps off its dot, so the
         three things written on a segment all sit the same distance
         from it — and how much of the span it must leave at each end
         when it has to step along the line to clear an axis. */
      resGap: 5,
      resInset: 10,
      /* The paper halo every label on the board is painted with
         (`stroke-width` in the stylesheet). Stroked outside the
         glyphs, so it is half of this again on each side — and
         it is part of what the child sees, so it is part of what
         is measured when a label is placed. */
      haloW: 6,
      /* How much clear air there is between the edge of a plotted point
         and the near edge of its coordinates — the one number for it,
         whichever way the label is pushed. Two separate offsets used to
         say this, one measured to the text's edge and one to its
         middle, and they had drifted to 12px one way and 19px the
         other. Close enough to read as belonging to the point, never
         close enough to touch it. */
      /* The air between a point as it is painted — dot plus its
         white ring — and the ink of its own coordinates. Small on
         purpose: the numbers are part of the point, not a remark
         near it, and the label carries its own paper halo, so a
         few pixels read as touching rather than as crowding.
         `coordFit` is the older, looser figure, kept for the one
         question it still answers: whether a row's labels have
         room beside their points at all. Deciding that on the new
         air would move pairs that read properly today.

         Nine, not three. Three was chosen while the offset was
         applied on each axis at once, so a DIAGONAL label — which is
         the direction a label reaches for first, because it is the
         one that keeps clear of the drawing — actually landed at
         `gap × √2`, about nine past the painted edge. The cardinals
         got the literal three and were rarely chosen, so nobody saw
         it. Measuring to the ink made all eight honest and the
         diagonals lost six pixels overnight, which is A sitting on
         its own dot. This is the number they were really getting. */
      coordGap: 9,
      /* The air between a point's letter and the coordinate under it.
         They are one block, so this is leading rather than a gap
         between two labels — tight enough that the two read as one
         thing and loose enough that the descenders clear. */
      stackGap: 2,
      coordFit: 8
    },

    /* A leg dropped from the segment: the extra corner point and the
       coloured line joining it, used to break a diagonal into a
       horizontal and a vertical step. */
    leg: {
      /* A deep teal rather than red: red read as a mistake next to the
         green "found" markers and the navy hypotenuse, and it is the
         one colour in the game that means something is wrong. */
      color: '#2F8F6F',
      /* One colour per side, so a length and the line it measures are
         plainly the same thing — and so the working can say "4\u00B2" in
         the horizontal's colour. Set by which way the leg runs, not by
         which slot it lands in. */
      hColor: '#E07B12',
      vColor: '#2F8F6F',
      /* A side about to be measured is laid down dotted, not solid: the
         count draws a solid stroke along it, and two solid lines on the
         same span read as one thick line rather than as a measurement
         being taken of something.

         Round caps extend every dash by half the stroke width at each
         end, so the dash and gap written here are not what is drawn: at
         7px wide, "2 14" comes out as a 9px dot with a 7px gap, which
         is a chain, not a dotted line. These render as an 8px dot with
         15px of air — 1+7 long, 22-7 apart. */
      dashWidth: 7,
      dashArray: '1 22',
      width: 7,
      dotR: 8,            // the corner, a shade under a plotted point
      /* The square drawn in the corner once the triangle has been
         named — a third of a cell, inside the angle, in the corner's
         own colour. */
      rightAngle: 0.28,
      rightAngleW: 4,
      /* The corner's coordinates sit beside it at the same measured air
         a plotted point keeps from its own — `GRID.segment.coordGap`
         off the dot as painted, whatever the label is and whatever
         size the camera is setting it. */
      slots: 2,           // a right-angled path needs two
      lenSize: 32,        // "4 units" written along a leg
      /* No plate behind these any more, so they need far less room —
         and where they sit matters more, since nothing boxes them off
         from what they are near.

         Above a horizontal leg, which is inside the right angle and
         the one clear space on the board: below it are the x-axis
         numbering and the start point's own coordinates. */
      lenGap: -34,
      /* Beside a vertical leg, on the outside. Both ends of that side
         are taken — the far point's coordinates above, the corner's
         below — so it is pushed along the leg towards the corner, into
         the gap between the two. */
      lenGapV: 78,
      /* Along a vertical leg, off its middle towards the corner it
         starts from — the far end of that side carries the other
         point's coordinates. Kept small: the leg's length now sits
         INSIDE the shape, where the hypotenuse closes in on it, so a
         big bias either walks it into that line or down onto the
         corner's own coordinates. */
      lenBiasV: 16
    },

    /* Unit squares that count out a segment's length when a child
       gets the distance wrong. Filled strongly enough to be obvious
       against the cream board, with a brighter flash as each lands. */

    /* ---- the subtraction, worked on the board ----

       One beat shows where a horizontal distance actually comes from.
       The two numbers are lifted out of the coordinate labels they live
       in, carried above the line, and the subtraction is assembled from
       them a piece at a time — and then its answer comes back down to
       sit between the points as the length. A child who watches the 3
       and the 6 leave their coordinates and the answer arrive on the
       line has been shown why it is a subtraction; a balloon reading
       "6 - 3 = 3" has told them the answer and nothing else.

       Every duration is slower than the game's usual beat. This is the
       one screen where the arithmetic is the content. */
    /* The board's camera. It pushes in on the triangle while the
       triangle is what is being worked on, so the squares the child is
       counting are big enough to count. */
    /* A number leaving the board for a working. The board's own sum
       (`xeq` below) has flown its digits since it was built; these are
       the same two beats, for the flights that have to cross from the
       board into the panel. */
    fly: {
      /* Slower on purpose. `pickMs` is the pause in which the side
         lights WHERE IT IS, before anything moves — without it the
         flight is a thing arriving rather than a thing being taken off
         the board, and the whole point of the beat is that the symbol
         was already there. */
      pickMs: 460,       // it lights where it is, before it is lifted
      ms: 980            // and travels
    },

    /* The formula table (screen 28): the board slides left and the table
       opens out of its right edge; every name and number in it is a copy
       lifted off the triangle. Slow on purpose — about three seconds a
       symbol — so a child can follow each one from where it was to
       where it goes. Only that screen uses these; `fly` above is
       untouched for every other working. */
    table: {
      board:    { x: 44, y: 12, w: 1232, h: 1056 },   // where the board slides to
      tuck:     60,       // how far the table's edge sits behind the board's
      margin:   44,       // from the table's right edge to the frame's
      size:     40,       // its type, in stage pixels
      openMs:   900,      // the drawer opening, and a breath after
      rowMs:    450,      // a row's skeleton coming in
      appearMs: 200,      // a copy appears on its original
      /* and goes: no lifting above it, no swelling — the copy comes out
         of the drawing and flies straight to its slot. (It used to lift
         and pulse twice first.) */
      pulseMs:  0,
      travelMs: 1400,     // travels to its slot, turning level on the way
      restMs:   300,      // lands; a breath before the next
      writeMs:  600,      // a worked-out value written in place
      lift:     0,        // how far above the original it lifts first (none)
      /* 29c's table sits higher: she comes back under it — and higher
         again (320, not 400) since her words became 34px: the line she
         comes back to say can take two rows ("So, the fire engine needs
         to travel 13 units."), and the balloon over her head has to
         clear the table's foot. */
      pickCy:   320
    },

    zoom: {
      ms: 900,           // one push, about a second
      delayMs: 260,      // after the beat opens, so it comes with her line
      margin: 0.6        // cells of air round what is being framed
    },

    /* A pair the child finished with, brought back on a later screen
       beside the one that screen is about. The timings are the
       segment's own, tightened: the pair being recalled is not news, so
       it arrives at a glance rather than being introduced. */
    example: {
      slots: 2,          // the most any one screen recalls
      dotAMs: 100,       // its two points
      dotBMs: 240,
      lineMs: 420,       // the line that joins them
      coordMs: 760,      // their coordinates
      coordStep: 120,
      resultMs: 1040,    // and what the child measured
      stagger: 760,      // between one recalled pair and the next
      /* Held after her line. Long enough that both lengths on the board
         are up for the three seconds a recall has always given its own
         — and longer than the whole arrival, so even a beat with
         nothing recorded to say cannot be carried off with a pair still
         coming up. */
      readMs: 2200
    },

    xeq: {
      size: 40,          // the sum, big enough to read across the board
      gap: 11,           // air between its parts
      /* Cells of air above whatever is topmost — the higher point, or
         its coordinates where they are written over it. Closer than it
         was: with the row's coordinates moved under its points, the sum
         was left hanging a cell and a half over an empty space. Not
         closer still, though — the answer has to be seen coming DOWN
         from it to the line afterwards. */
      stageUp: 0.85,
      /* A column works its sum below the x-axis rather than over its top
         point: how far under the axis numbering it sits, and how far off
         the column itself. */
      underDown: 0.55,
      underGap: 0.35,
      pickMs: 320,       // a number lighting before it is lifted
      flyMs: 800,        // and travelling up off the axis
      settleMs: 500,     // both up, before the operator appears
      opMs: 300,         // then the minus
      eqMs: 500,         // then the equals
      resMs: 350,        // then the answer
      readMs: 900,       // which is left to be read
      sweepMs: 800,      // the pair lit end to end under it
      holdMs: 900,       // a beat before the answer leaves the sum
      dropMs: 900,       // and comes down to the middle of the span
      wordMs: 850        // where "units" is written after it
    },

    unitBox: {
      /* One beat per unit as the line walks out. Slow enough to count
         along with, quick enough that twelve of them is not a wait. */
      stepMs: 240,
      /* A wrong guess is HELD, then LET GO. The line goes out to the
         number they chose — short of the point or a unit past it,
         which is the feedback — waits long enough to be read against
         the point it was meant to reach, and then fades where it
         stands, leaving the board clear for the squares.

         It walked back, once, unit by unit the way it had come. That
         is the gesture of giving the answer run in reverse, so the eye
         follows the line home and the wrong length is the last thing
         it is still being shown. Fading leaves the length where it was
         drawn and stops showing it, which is the difference between
         withdrawing an answer and letting one go. */
      missHoldMs: 620,   // the wrong length, held to be read
      missFadeMs: 380,   // and then let go where it stands
      /* How long the finished count stays up before the board is handed
         back. It is a hint, not a caption: it says how long a unit is
         and how many fit, and then gets out of the way so the next try
         starts on a clean board. */
      holdMs: 2600,
      /* The total sits above the line, with nothing behind it — the
         coordinates it used to collide with are now under their points,
         so the space above the segment is free. */
      labelSize: 32,

      /* The guided count, shown to a child who has missed twice: the
         squares light one at a time with the running number under
         each, and then it clears and plays again. Paced to be counted
         along with out loud, not to be watched. */
      count: {
        slots: 14,         // the longest span any screen asks about
        stepMs: 1000,      // one square, then the next — slowly
        numMs:  450,       // its arrow first, then its number
        readMs: 900,       // the finished row, held to be read
        /* Once the last arrow and its number are up, the whole count
           stays for this long — to be looked at and counted along —
           before the squares go and the total ("3 units") is written.
           It used to be taken away 1.4s after the last number. */
        holdMs: 5000,
        gapMs: 420,        // blank, before it goes again
        /* Once. It used to play twice, and the second pass was
           doing the job the sentence should have been doing — the
           first time through "says what is happening" only because
           the sentence arrived underneath it. She says it and
           finishes now, so there is nothing left for a second pass
           to say. */
        passes: 1,
        numSize: 20,
        /* An arrow in each square, pointing the way the count is
           running, with its number under it.

           A square on its own says "here is a space"; an arrow in it
           says "and this is the step you just took across it", which
           is the thing being counted. It turns with the count rather
           than always pointing right: along the row on a horizontal
           span, up the column on a vertical one, and reversed on
           either if the count runs the other way.

           All three are fractions of the SMALLER side of the square,
           so the arrow keeps its shape on a board whose cells are not
           square, and the two heights are fractions of the square's
           own, so the pair sits the same way in a tall cell as in a
           squat one. */
        arrow: {
          len:  1,           // tip to tail: the whole square, edge to edge
          head: 0.11,        // small barbs — the line is the mark, not the heads
          w:    2.5,         // a fine line, not a bold one
          near: 0.28,        // how far the arrow sits from the line,
                             // as a share of the square across it
          /* And its number, just past it on the side away from the
             line — close enough to read as the arrow's own label, never
             touching it. This is the clear space between the tips of
             the arrowheads and the number's paper halo, in board units.
             (The number used to hang at a fixed 71% of the square, which
             left a gap wider than the number itself.) */
          numGap: 2
        }
      },
      labelDy: -28,          // horizontal: just above the line
      /* A diagonal has no squares to sit over, so its total goes out to
         the side of the line, clear of the two legs opposite. */
      diagGap: 54
    },

    /* The line the player lays down with the slider. It grows out of
       the point the question starts from, one grid square per step, so
       the answer is something measured rather than guessed: a short
       guess visibly falls short of the other point, a long one runs
       past it. */
    /* Maya herself (42, 46): walking out of her house's door along the
       line to the cafe that is closer, and in at its door. `feet` is
       where her soles are in her frame; she faces left in the drawing
       and is turned to walk right.

       `tall` is her height on the line, in cells: a whole one, so she is
       a girl walking across the map and not a speck on it (she was 0.35,
       a third of the house). In a doorway she is `doorFit` times the
       door's own height instead — about half her height on the line:
       the buildings stand behind the line, so she is smaller back there,
       and she grows as she steps forward out of one and shrinks stepping
       up into the other. `onLine` is how far along the line (cells) that
       step meets it. The steps take whatever time keeps her pace: they
       start and finish at her walking speed. `inMs` is her coming out of
       the dark of the doorway she leaves by, `outMs` her going into the
       one she arrives at. */
    maya: { frames: 8, w: 160, h: 295, feet: 287, facesLeft: true,
            tall: 1, doorFit: 2.1, onLine: 0.3,
            frameMs: 85, speed: 1.25, inMs: 380, outMs: 380 },

    /* The fire engine answering the call (54, Board.fireRescue). Its
       strip is assets/fire-engine.webp, ten frames: 0-7 driving (wheels
       turning, body riding on its springs, lamp flashing), 8-9 standing,
       the lamp still flashing. Every place in it is given in the strip's
       own pixels (`frame`, 421 x 225, whatever size it is shipped at):
       `van` is the van's own box — exactly the town's picture of it —
       `mid` and `feet` where it stands (between its wheels, on the road),
       `pivot` its cannon's turret, which the game puts a barrel on
       (town.js OVERLAY.cannon) and turns to aim at the fire. */
    engine: { frames: 10, frame: { w: 421, h: 225 },
              van: { x: 44 / 421, y: 46 / 225, h: 173 / 225 },
              mid: 0.5424, feet: 0.9653,
              pivot: { x: 250, y: 25 }, barrel: 34,
              restAim: -34,       // the barrel as the town draws it, up and ahead
              aimUp: 30,          // aimed this far above the straight line to the fire
              driveMs: 55, parkMs: 400,
              pullMs: 700,        // off its spot, turning onto the line
              speed: 5.2,         // cells a second along it, at full speed
              stopCells: 2.6,     // it stops this far short of the fire
              turnMs: 600,        // the barrel swinging round onto the fire
              waterMs: 420,       // the jet reaching the fire, or running out
              sprayForMs: 2400,   // on the fire
              outMs: 1600 },      // the flames dying, from the first of it

    measure: {
      color: '#2E9BD4',
      width: 9,
      // the growing end, kept under the plotted points it runs between
      capR: 7
    },

    /* The marker left behind once a point has been found, with its
       coordinates written beside it. */
    found: {
      /* Exactly a plotted point, because that is what it is — the very
         point the next screen goes on to draw a line from. */
      r: POINT.r,
      fill: POINT.fill,
      stroke: POINT.stroke,
      strokeWidth: POINT.strokeW,
      labelSize: 34,
      /* Under the point, matching the pair the argument goes on to make
         of these two: the space above a plotted pair is where its length
         and its working are written, so the coordinates keep out of it
         from the moment the child taps them out. */
      side: 'under',
      /* Close over the point — near enough to belong to it, far enough
         not to touch it: 42 less the dot's 10 and the text's own 17
         leaves 15 of clear air. The length written along the line gets
         out of ITS way rather than the other way round, because the
         coordinates belong to their points and the total is the thing
         that floats.

         There is no labelDx any more. A fixed shift to the right hung a
         third of the label off the board at x = 6, where the SVG cut it
         off; the label is centred over its point instead, which is also
         exactly where a segment puts it, so a located point keeps its
         label when the pair is joined. */
      labelDy: -42
    }
  };



  /* The whole sequence end to end, plus a beat to read what it leaves.
     Derived rather than typed, so tuning any step cannot leave the board
     carried off mid-sentence. */
  const XEQ_HOLD = (function (x) {
    /* No yGlowMs any more: the matching halves are not lit again here,
       so the sequence opens on the first digit being taken. */
    return 2 * (x.pickMs + x.flyMs) + x.settleMs +
           x.opMs + x.eqMs + x.resMs + x.readMs +
           x.sweepMs + x.holdMs + x.dropMs + x.wordMs + 1200;
  })(GRID.xeq);

  /* Both recall beats take the same hold from the same place, so they
     stay the same length as each other whatever is tuned. */
  const EXAMPLE_HOLD = GRID.example.readMs;

  /* Standing pose used once she has landed on screen 5. */
  /* The resting pose, built at whatever size a screen needs. Every
     offset is in rendered stage pixels, so they scale with her, and
     charScale is the sprite-sheet scale that renders the flying frames
     at this same height — the sheet and this artwork are two different
     pictures, so a scale that suits one does not suit the other. */
  const standAt = function (k, x, y) {
    return {
      w: 398 * k, h: 307 * k,
      pos: { x: x, y: y },
      headTop: { x: 206 * k, y: 3 * k },
      belly:   { x: 223 * k, y: 228.4 * k },
      feet:    { y: 300 * k, cx: 208 * k },
      inkW: 335 * k,
      charScale: 307 * k / 355
    };
  };

  /* The grid screens put her back on the grass at the left, full size,
     and give the whole right of the frame to the board. */
  /* Where she stands to talk: down on the grass, front of frame. */
  const STAND = standAt(1, 60, 700);
  /* Her column: the strip of the frame left of the board (which starts
     at 644), less a margin either side. Her balloon keeps inside it. */
  const COLUMN = { left: 24, right: 626 };
  STAND.room = COLUMN;
  /* And where she moves to when a control arrives: standing ON its top
     edge, and a little smaller — she is further away up there, and the
     control is what should hold the eye once it has arrived. The move
     animates, so the size settles with the travel rather than snapping.

     Her feet land at 713. 688 was right while the selector was a
     drawing whose frame began at the top of its own box; rebuilt in
     CSS the housing starts 30 units in, which at the widget's 0.665
     puts its painted top at 711 — so she had been standing 23px above
     it, in the air. Measured off the rendered page, because the art is
     no longer where this number comes from. */
  const STAND_UP = standAt(0.88, 60, 449);
  STAND_UP.room = COLUMN;

  /* Where the answers' panel stands, and at what scale. */
  const OPTS_AT = { x: 64, y: 650 }, OPTS_K = 0.73;

  /* And a seat on the ANSWERS, which is not the selector's seat even
     though the two panels used to share a slot.

     Measured off the rendered page: the answers' painted top edge —
     the outer edge of its gold border — sat at 680 and her feet at
     713, so she was standing 33px inside the panel, on the cream,
     with the stroke behind her ankles. The selector's own painted top
     is at 711, which is why 713 is right there and wrong here: the
     two controls are built differently and only looked alike.

     Her feet are 264 below this pose's own top (300 x 0.88), so this
     is the answers' y less that, plus the 2px of overlap the selector
     already has — enough that she is standing ON the line rather than
     hovering a pixel above it. Move the panel and this has to follow. */
  const STAND_OPTIONS = standAt(0.88, 90, 388);
  STAND_OPTIONS.room = COLUMN;

  const BOARD = {
    /* The same board, in the same place, as every other screen: right
       of the frame, floor to ceiling. The answering screens used to put
       it left with the controls beside it; they share one layout now,
       so nothing jumps between a question and the screens around it. */
    panel: { pos: { x: GRID.box.x, y: GRID.box.y }, w: GRID.box.w, h: GRID.box.h },


    /* Where she stands to ask: on this board's top rail, near its left
       end. Same pose and scale as the grid screens — only the spot
       differs, because this board sits further left. */
    /* She stands on the grass at the left, exactly as she does on the
       grid screens — the rail pose is gone along with the band it
       needed. */
    stand: STAND,
    standUp: STAND_UP,

    /* The one control every answering screen uses now — the number
       selector that replaced both the slider and the typed pad. It is
       built at its own natural 760 x 430 and scaled to fit her column,
       so its proportions stay the ones it was designed at rather than
       whatever happened to fit. */
    selector: {
      /* The combination-lock widget's own natural size — a frame 660
         wide with a round arrow overhanging each end, and GO under its
         foot. Scaled so it keeps the width it has always had in her
         column, and set so she still lands on the frame's own top edge:
         the art's body starts 4.5% down (the pointer is cut into that
         edge rather than standing above it), which at this scale is
         12px, and her feet are at 700. */
      /* x is pulled back by the extra overhang the widget now reserves
         for its left arrow, so the frame itself has not moved. */
      /* y follows the bar. The drawn bar is shorter than the one the
         CSS invented — 794 x 307 rather than 660 x 330 — so the whole
         widget sits three units lower to put the gold's painted top
         back under her feet at 713, which is where `STAND_UP` has
         always expected it. */
      pos: { x: 29, y: 691 },
      w: 816, h: 460,
      scale: 0.665
    },

    /* The triangle-type answer panel takes the slider's place, centred
       on the same footprint so the left column stays put. */
    /* Below her, like the selector — its natural height is about 432,
       so it is scaled to clear the bottom of the frame. */
    /* Its own slot, not the selector's. Three stacked buttons is a
       taller shape than a row of tiles and a differently built one, so
       sharing a top edge with the reel only ever meant they started at
       the same number — it never put her feet on both. It sits a
       little in from the frame's edge and a little higher than the
       reel, which gives the tallest control on the screen room under
       it, and it carries the seat she stands on so the two can never
       drift apart again. h is its real built height — 9px borders,
       28/32 padding, three 108px buttons and two 24px gaps. */
    /* The same two numbers the perch above is worked out from. */
    options: { pos: OPTS_AT, w: 520, h: 450, scale: OPTS_K,
               stand: STAND_OPTIONS },


    /* Where she comes back to when the child has filled the table on
       29c: under the table, on the right, with room above her head for
       her balloon between her and it. */
    tableStand: standAt(0.88, 1371, 786)
  };

  /* -------------------------------------------------------------
     THE TOWN — the closing beat's map

     Three places standing on three coordinates. The dots and the
     coordinate labels under them are the board's own, plotted by the
     segment and by a marked place; everything here is the picture
     drawn over them — a building and the pill that names it.

     The coordinates are load-bearing and two properties of them must
     survive any edit:

       * Both walks out of the house are slanted, so neither can be
         counted off the grid: each one wants the formula, and the
         question is which café is closer, not which line is shorter
         to count.
       * Both come out whole, so neither answer is left under a root
         and a child who works one out properly can see that they are
         right. On a lattice that means a Pythagorean triple, and the
         two must differ: Cafe A makes a 3-4-5 with the house (5 units)
         and Cafe B a 6-8-10 (10 units), so Cafe A is the closer one.

     The places are named in the pills over them and every one has its
     coordinates under its dot, so all three stand on numbered lines,
     none on an axis, and no picture sits over another place's point,
     label or walk.
     ------------------------------------------------------------- */
  const TOWN = {
    /* A 6-8-10 walk is most of this board (x runs -6..6, y -5..5), so it
       fixes the rest: the house stands left of the y-axis, Cafe A up the
       slant to its right, four across and three up, and Cafe B down the
       long slant to the board's last numbered corner, eight across and
       six down. The two walks leave the house 74° apart, so on 46, drawn
       together, they read as two walks and not one line — and each
       coordinate label keeps clear of both.

       A place is drawn standing ON its coordinate — building and name
       pill above the dot — so the top row of the board has no room for
       one: at y = 5 a cafe's roof is off the paper. At y = 4 it has two
       cells of headroom, which is what it needs.

       (The house was at (1, 1), where the only whole slant on the board
       is 3-4-5: Cafe A was at (5, 4) and Cafe B had to be counted, six
       along the house's own row at (-5, 1). Before that, Cafe A was at
       (5, 1), 4 units along the row, and Cafe B at (-3, 4), 5; and before
       that Cafe B was at (-5, 3), √40.) */
    house: { x: -2, y:  1 },
    cafeA: { x:  2, y:  4 },
    cafeB: { x:  6, y: -5 },
    /* And two more for the walk after it. The prompt asked for (-4,-2)
       and (4, 4); neither survives its own rule that a marker needs the
       room it stands in. A place is drawn standing ON its coordinate,
       a cell and a half wide and nearly two tall, so:

         * (4, 4) is one column from Cafe A on the same row, and two
           markers a cell apart overlap by half of one.
         * (-4, -2) rises into the x-axis numbering — a marker below
           the axis has to start at y = -3 to clear the row the numbers
           live in.

       Moved to a pair that keeps everything the beat is for: 8 across,
       6 up, a whole 10, and BOTH subtractions crossing zero — -3 - 5
       and 2 - (-4).

       And running the OTHER way. The first pair tried, (-5,-3) to
       (3,3), had the same gradient as the cafe walk and passed within a
       cell and a half of it: drawn together on the closing screen the
       two lines read as one long line, which is the opposite of what
       that screen is for. This one falls to the left where the cafe
       walk rises to the right, so "two walks" looks like two. */
    school: { x:  5, y: -4 },
    park:   { x: -3, y:  2 },
    /* What is drawn over each. `kind` picks the CSS building, `tone`
       the pill's colour — the same colour its answer button carries,
       so a child can pair the two without reading either. */
    /* Derived from the three coordinates above rather than written out
       again: a picture of a town standing one row off the points it is
       drawn over is what two lists of the same numbers gets you. */
    places: null,   // filled in below, from house / cafeA / cafeB
    /* A cell and a half across, two cells tall including the pill —
       big enough to be a place, small enough that the ruling under it
       is still something a child could count on. Both in cells, so the
       town grows and shrinks with the board rather than with the
       stage. */
    wCells: 1.5,
    hCells: 1.05,
    /* How far the building's foot sits above the dot it stands on, so
       the dot and the coordinates written under it are never covered.
       In cells, for the same reason. */
    liftCells: 0.16,
    /* A door swinging open, or shut (Maya, 46). */
    doorMs: 320
  };

  /* The town's art: one sheet, cut by these rects.

     Measured off the alpha rather than assumed. The sheet came back
     1774 x 887 with the seven drawings placed freely — different
     sizes, different gaps — rather than on the even grid that was
     asked for, so there is no cell to divide by and every rect here
     is the drawing's own opaque bounds.

     They are also different shapes: the café is 1.21 wide to tall,
     the station 1.90, the tower 0.53. So a place is sized by its
     HEIGHT and takes its own width from its own ratio — asking them
     all to fill one box would squash the van and stretch the tower.
     `tall` is that height in cells. */
  TOWN.sheet = { src: ART.townSheet, w: 1774, h: 887 };
  TOWN.sprites = {
    /* A little smaller than they were drawn at first (1.05): at that
       size the pictures crowded the points under them, their
       coordinates and the sides running out of them. */
    /* `door` is the door itself inside its frame, in the drawing's own
       pixels — the part that opens. Measured off the sheet the same
       way: the lighter panel, from the frame's inner edge on each side
       and the lintel's shadow at the top down to the ground. Both hang
       on their left: the knob is on the right. */
    /* The house and the cafes a little smaller than the rest (0.7, not
       0.85): the walks between them are the thing on those screens, and
       at 0.85 the three buildings crowded the lines, the points and the
       coordinates written under them. */
    cafe:    { x:   52, y:  99, w: 346, h: 285, tall: 0.7,
               door: { x: 143, y: 177, w: 59, h: 108 } },
    house:   { x:  484, y: 110, w: 356, h: 274, tall: 0.7,
               door: { x: 147, y: 166, w: 59, h: 108 } },
    school:  { x:  912, y: 101, w: 397, h: 283, tall: 0.85 },
    park:    { x: 1380, y: 129, w: 336, h: 271, tall: 0.85 },
    /* The two towers the cable runs between (49). */
    tower:   { x:  139, y: 470, w: 171, h: 324, tall: 1.3 },
    /* The rescue (54), told as a fire: the school drawing with flames
       out of its roof and windows and smoke going up (`overlay`, drawn
       over the picture by town.js, in its own pixels), and the red van
       with a ladder on its roof and a light on its cab — a fire engine.
       The same sheet underneath, so they are in the same hand as
       everything else in the town. */
    fire:    { x:  912, y: 101, w: 397, h: 283, tall: 0.85, overlay: 'fire' },
    engine:  { x:  927, y: 618, w: 363, h: 173, tall: 0.78, overlay: 'engine' }
  };
  TOWN.places = [
    /* Its name over its roof, as the others have: down in the bottom
       corner there is room over it. (At (-3, 4) it had to go beside it,
       as a name over the roof reached the top of the paper.) */
    { key: 'cafeB',  x: TOWN.cafeB.x,  y: TOWN.cafeB.y,
      name: 'Café B',        kind: 'cafe',   tone: 'yellow' },
    { key: 'house',  x: TOWN.house.x,  y: TOWN.house.y,
      name: 'Maya’s House',  kind: 'house',  tone: 'violet' },
    { key: 'cafeA',  x: TOWN.cafeA.x,  y: TOWN.cafeA.y,
      name: 'Café A',        kind: 'cafe',   tone: 'teal' },
    /* Up from the closing beat: the same town, two more places in it.
       They are on the map from the first beat that uses them and stay
       for the last — a town that gains a building between one question
       and the next is a different town. */
    { key: 'school', x: TOWN.school.x, y: TOWN.school.y,
      name: 'School',             kind: 'school', tone: 'blue' },
    { key: 'park',   x: TOWN.park.x,   y: TOWN.park.y,
      name: 'Park',               kind: 'park',   tone: 'green' },
    /* The two towers the connection runs between (49). Each hangs from
       its point — the point is the top of the tower — so the one at
       y = 5 stays on the paper and the sides leave the points clear of
       the pictures. */
    { key: 'towerA', x: -2, y: 5,  name: 'Tower A', kind: 'tower', tone: 'yellow', hang: true },
    { key: 'towerB', x:  4, y: -3, name: 'Tower B', kind: 'tower', tone: 'teal',   hang: true },
    /* The station and the rescue van (54), on the wide board, where a
       cell is a third the size — so drawn three times their usual
       height. The van hangs below its point, so the side that comes
       down to it arrives at the point rather than through the van. */
    /* Where the station and the van stood: the fire at the origin, in
       the corner of the first quadrant beside its point, and the fire
       engine hanging under its own. */
    /* Bigger than the station it replaces (2.2 cells, not 1.6): on the
       wide board a cell is small, and a fire has to be seen to be a fire.
       The first quadrant it stands in is empty on that screen. */
    { key: 'fire',   x: 0,  y: 0,   name: 'Fire',        kind: 'fire',   tone: 'yellow', tall: 2.2, corner: true },
    { key: 'engine', x: -5, y: -12, name: 'Fire Engine', kind: 'engine', tone: 'violet', tall: 1.4, hang: true }
  ];

  /* The board for the axis cases: big, on the right, with the
     working on the left, where every other panel in the game lives.
     The ratio is held or the cells stop being square. */
  const STUDY = {
    /* Same ratio as the main board, so its gaps come out even too —
       that falls out of the viewBox rather than being tuned per board:
       any panel at this ratio has panel.w = panel.h + 2 x cell, which
       is exactly the condition for the air round the ruling to match on
       all four sides. */
    grid: { x: 790, y: 68, w: 1108, h: 950 }
  };

  /* -------------------------------------------------------------
     SCREENS 39 and 41 — both points on an axis
     The board on the right, and the child's own table (runAxisPick)
     beside it: the zero term goes, and what is left is picked.
     ------------------------------------------------------------- */
  const XAXIS = {
    grid: STUDY.grid,

    /* Both points sit on the axis, so their labels stack above it —
       below is where the axis numbering already lives.

       No letters on these two. A letter is there to tell one point from
       another when a third has joined them and the sides need naming;
       with only two on the board there is nothing to tell apart, and
       the coordinates already say which is which. */
    /* x1 and x2 are pieces of their own now, beside the 0s, so the
       formula table can make a copy of each and carry it across. */
    a: { x: -4, y: 0,
         coordParts: [{ t: '(' }, { t: 'x₁', glow: 'x' }, { t: ', ' },
                      { t: '0', glow: 'y' }, { t: ')' }] },
    b: { x:  4, y: 0,
         coordParts: [{ t: '(' }, { t: 'x₂', glow: 'x' }, { t: ', ' },
                      { t: '0', glow: 'y' }, { t: ')' }] },
    coordDy: -88,

    /* The table the child fills (39): both y's are 0 — read off the
       labels — so the second term is (0 − 0)², then 0, then gone. Each
       term is ONE pick, whole, the way it is on 35: x₂ − x₁, and then
       0 − 0 — it is the term that is being chosen, not the numbers in
       it. Each offered beside what a child reaches for instead: the
       sum, and the term as it stood before the y's were read.

       And the working ends on √((x₂ − x₁)²). It went on to a last line,
       d = |x₂ − x₁|, picked again — the same thing said twice, the
       second time with bars the lesson never introduced. */
    picks: [
      { inline: true, parts: [ { t: 'd' }, { t: ' = ' },
          { t: '\u221A((x₂ − x₁)\u00B2 + (y₂ − y₁)\u00B2)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A((' },
          { t: 'x₂ − x₁', lit: 'h', answer: 'x₂ − x₁', offer: [ 'x₁ + x₂', 'x₂ − x₁' ] },
          { t: ')\u00B2 + (' },
          { t: '0 − 0', lit: 'v', answer: '0 − 0', offer: [ '0 − 0', 'y₂ − y₁' ] },
          { t: ')\u00B2)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A((x₂ − x₁)\u00B2 + 0)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A((x₂ − x₁)\u00B2)' } ] }
    ]
  };

  /* The same thing turned on its side. The pair reads as one idea, so
     the board and the working stay exactly where the x-axis case left
     them — only what is on them changes. A vertical segment puts its
     labels to the side of its own accord, clear of the y numbering. */
  const YAXIS = {
    grid: XAXIS.grid,

    a: { x: 0, y: -4,
         coordParts: [{ t: '(' }, { t: '0', glow: 'x' }, { t: ', ' },
                      { t: 'y₁', glow: 'y' }, { t: ')' }] },
    b: { x: 0, y:  4,
         coordParts: [{ t: '(' }, { t: '0', glow: 'x' }, { t: ', ' },
                      { t: 'y₂', glow: 'y' }, { t: ')' }] },
    /* The same table turned on its side (41): the x's are the 0s — one
       pick, as on 39 — and it ends where 39 does, on √((y₂ − y₁)²). */
    picks: [
      { inline: true, parts: [ { t: 'd' }, { t: ' = ' },
          { t: '\u221A((x₂ − x₁)\u00B2 + (y₂ − y₁)\u00B2)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A((' },
          { t: '0 − 0', lit: 'h', answer: '0 − 0', offer: [ 'x₂ − x₁', '0 − 0' ] },
          { t: ')\u00B2 + (' },
          { t: 'y₂ − y₁', lit: 'v', answer: 'y₂ − y₁', offer: [ 'y₂ − y₁', 'y₁ + y₂' ] },
          { t: ')\u00B2)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A(0 + (y₂ − y₁)\u00B2)' } ] },
      { inline: true, parts: [ { t: '= ' }, { t: '\u221A((y₂ − y₁)\u00B2)' } ] }
    ]
  };

  /* ---------- Audio ---------- */
  /* Screens hand over by themselves rather than waiting to be tapped.
     Skip is still there to jump ahead early, but nothing needs a tap
     to continue. The holds are the pause after the thing that ended
     the screen, long enough to take it in before the next arrives. */
  const AUTO = {
    /* One word at a time rather than one letter: a word appearing whole
       is read as a word, where a letter crawl has to be reassembled
       before it means anything. Paced so a short line still takes about
       as long to deliver as it did. */
    wordMs: 190,
    afterLine: 1500,          // she has finished speaking
    betweenLines: 520,        // and between two things said on one beat
    afterCorrect: 2100,       // a question has been answered right
    afterSilent: 900,         // nothing was said; the screen just drew
    afterReveal: 3800,        // a worked solution, which takes reading
    /* And after a worked solution that wrote itself out line by line —
       long enough to read the whole thing back before it goes. */
    afterWorking: 4000
  };


  /* The navigation bar. `jump` is the screen picker beside Next — a way
     around the lesson rather than a part of it, kept here so a build
     that should not carry it switches it off in one place. */
  const NAV = { jump: true };

  /* How much the game moves. The laptop's own "reduce motion" setting
     used to decide it, invisibly — Windows turns that on whenever
     "Animation effects" is off, which many school laptops ship with —
     so the same game played differently from one laptop to the next,
     and on those laptops the dots on the locate screens were not there
     at all. Now the game decides, once, the same everywhere:

       'off'            the whole game, on every laptop (the default)
       'on'             calm: the sky holds still, the grid markers stop
                        breathing, panels and drawers appear rather than
                        slide — and nothing is ever hidden by it
       'follow-laptop'  calm only where the laptop asks for less motion

     Calm is the stylesheets' (`html.calm` rules). The moves the script
     makes — her flights, the camera, the numbers carried into the
     table — are the lesson, and play in every mode. */
  const MOTION = { calm: 'off' };

  const AUDIO = {
    musicSrc: MUSIC,
    musicVolume: 0.20,   // brief: background music at 20%
    musicDucked: 0.055,  // dipped while Swifty is speaking
    sfxVolume: 0.85,
    duckDown: 0.22,      // seconds
    duckUp: 0.65
  };

  /* -------------------------------------------------------------
     A WALK — the three screens 29 to 29c taught, for any two points.

       1  the two points named A and B, and the dotted line between
          them as she says it; then the first side drawn out to the
          corner C, and measured on the reel;
       2  the second side, measured the same way;
       3  the table out of the board's right edge, which the child
          fills: (AB)² = (CB)² + (AC)², the two sides, their squares,
          the sum, and the root.

     Used by every walk after 30 — the two cafés, the school and the
     park, the towers, the station — so each is taught the same way.

       ids     the three screens' ids
       a, b, c the two points and the corner, in grid units; the first
               side runs a → c, the second c → b (either may be the
               level one — the table takes its colours from the sides)
       say     { first, ask, second, table } — her lines
       base    what all three share (the town, the board, the range)
       first   what only the first screen has (its entrance, a sweep)
       done    where the table hands on to, if not the next screen
       askFirst  { id, rightAt, line } — AB asked for outright first, on
               a screen of its own (it takes the first of `ids`): right,
               and the walk is stepped over to `rightAt`; wrong, and the
               walk is how it is found — its first screen, now `id`,
               opens "Oops! Let’s find it together." and brings C (30).
     ------------------------------------------------------------- */
  const SQ = '²', UNIT = ' units';
  /* The whole triangle each run of screens builds, for its labels to be
     placed against from the start (see `shape` and Board.labelLegs). */
  const SHAPE_1 = [ { from: { x: 2, y: 1 }, to: { x: 6, y: 1 } },
                    { from: { x: 6, y: 1 }, to: { x: 6, y: 4 } } ];     // 22–28
  const SHAPE_2 = [ { from: { x: -2, y: 2 }, to: { x: 2, y: 2 } },
                    { from: { x: 2, y: 2 }, to: { x: 2, y: 5 } } ];     // 29–29c
  const SHAPE_G = [ { from: { x: -5, y: 1 }, to: { x: 5, y: 1 } },
                    { from: { x: 5, y: 1 }, to: { x: 5, y: 4 } } ];     // 31–37

  /* A number as the working writes it: its minus is the arithmetic sign. */
  const MINUS = function (v) { return String(v).replace('-', '\u2212'); };

  /* A place's picture for an answer card (46): where its drawing is
     on the town's sheet, so the card shows the building the map does. */
  const PIC = function (kind) {
    const s = TOWN.sprites[kind];
    return { src: TOWN.sheet.src, x: s.x, y: s.y, w: s.w, h: s.h,
             sw: TOWN.sheet.w, sh: TOWN.sheet.h };
  };

  /* The distance formula worked for two points, as a table the child
     fills: the formula, given; then everything else is theirs, blank by
     blank — the four coordinates put into it, the two differences, their
     squares, the sum, and the root:

         d = √((x₂ − x₁)² + (y₂ − y₁)²)
           = √((5 − 1)² + (4 − 1)²)
           = √(4² + 3²)
           = √(16 + 9)
           = √25
           = 5 units

     One `d`, at the top: every line after it hangs from its = sign, the
     root and then what it comes to each a line of its own.

     P is (x₁, y₁) and Q is (x₂, y₂); `key` names the point on the board
     each is ('a', 'b', or 'c' for the corner). The x's are in the orange
     of a level side and the y's in the green of an upright one, as the
     sides were on the triangle this formula came from. Every blank has
     two tiles: the answer and the mistake it is there to catch, and
     which comes first changes. For a coordinate that mistake is the
     other half of the same point (B's y for B's x), or the other point's
     where the two halves agree. */
  function distanceTable(P, Q) {
    const n = MINUS;
    const two = function (right, wrong, first) {
      if (wrong === right) wrong = right + 1;
      return first ? [n(right), n(wrong)] : [n(wrong), n(right)];
    };
    const dx = Q.x - P.x, dy = Q.y - P.y;
    const sx = dx * dx, sy = dy * dy, sum = sx + sy, root = Math.sqrt(sum);
    /* A difference: the two added, a sign slipped — or, where that is no
       slip because the second is 0, the sign dropped. A square: a
       negative's sign kept, or the number doubled. The sum: the two
       differences added instead of their squares. The root: stopping
       before it. */
    const slip = function (b, a) { return (b + a !== b - a) ? b + a : (-(b - a) || 1); };
    const sq = function (d) { return d < 0 ? -(d * d) : (2 * d !== d * d ? 2 * d : d * d + 1); };
    const blank = function (v, lit, offer) {
      return { t: n(v), lit: lit, answer: n(v), offer: offer };
    };
    /* The number a child mixes up with `v`: the other half of the same
       point, else the other point's — so two different tiles, always. */
    const other = function (v, half, point) {
      return half !== v ? half : (point !== v ? point : v + 1);
    };
    const U = '\u00A0units';
    const rows = [
      { inline: true, parts: [
          { t: 'd' }, { t: ' = ' }, { t: '\u221A((' },
          { t: 'x\u2082 \u2212 x\u2081', lit: 'x' }, { t: ')\u00B2 + (' },
          { t: 'y\u2082 \u2212 y\u2081', lit: 'y' }, { t: ')\u00B2)' } ] },
      { inline: true, parts: [
          { t: '= ' }, { t: '\u221A((' },
          blank(Q.x, 'x', two(Q.x, other(Q.x, Q.y, P.x), true)),
          { t: P.x < 0 ? ' \u2212 (' : ' \u2212 ' },
          blank(P.x, 'x', two(P.x, other(P.x, P.y, Q.x), false)),
          { t: (P.x < 0 ? ')' : '') + ')\u00B2 + (' },
          blank(Q.y, 'y', two(Q.y, other(Q.y, Q.x, P.y), false)),
          { t: P.y < 0 ? ' \u2212 (' : ' \u2212 ' },
          blank(P.y, 'y', two(P.y, other(P.y, P.x, Q.y), true)),
          { t: (P.y < 0 ? ')' : '') + ')\u00B2)' } ] },
      { inline: true, parts: [
          { t: '= ' }, { t: dx < 0 ? '\u221A((' : '\u221A(' },
          blank(dx, 'x', two(dx, slip(Q.x, P.x), true)),
          { t: (dx < 0 ? ')' : '') + '\u00B2 + ' + (dy < 0 ? '(' : '') },
          blank(dy, 'y', two(dy, slip(Q.y, P.y), false)),
          { t: (dy < 0 ? ')' : '') + '\u00B2)' } ] },
      { inline: true, parts: [
          { t: '= ' }, { t: '\u221A(' },
          blank(sx, 'x', two(sx, sq(dx), false)), { t: ' + ' },
          blank(sy, 'y', two(sy, sq(dy), true)), { t: ')' } ] }
    ];
    const sumBlank = blank(sum, 'ab', two(sum, Math.abs(dx) + Math.abs(dy), false));
    /* The last line says what it came to (`result`), which is what flies
       onto the side it measures; `resultFrom` is where on the line that
       is written. The root and its value are two lines — "= √25", then
       "= 5 units" — as a working is written down. */
    rows.push({ inline: true, parts: [
        { t: '= ' }, { t: '\u221A(' }, sumBlank, { t: ')' } ] });
    rows.push({ inline: true, result: Math.round(root) + U, resultFrom: 1, parts: [
        { t: '= ' }, blank(Math.round(root), 'ab', two(Math.round(root), sum, true)),
        { t: U } ] });
    return rows;
  }

  /* Points A and B lit as she names them, wherever a line names them:
     "…A and B" — A on "A", then B on "B". A point's name is matched as a
     capital (game.js, armWordCues), so the "a" of "a fire" is not it. */
  /* "What is the distance between the two points?" (8, 13, 14, 19): both
     points ring out as she says "points", as the pair does wherever a
     line points at it. */
  const POINTS_CUE = [ { word: 'points', beat: ['a', 'b'] } ];

  function namesAB(line) {
    return /\bA and B\b/.test(line || '')
      ? [ { word: 'A', in: line, beat: ['a'] }, { word: 'B', in: line, beat: ['b'] } ] : [];
  }

  function walk(w) {
    const pt = function (p, name) { return { x: p.x, y: p.y, name: name }; };
    const seg = Object.assign({ a: pt(w.a, 'A'), b: pt(w.b, 'B'), dash: true },
                              w.seg || {});
    const len = function (p, q) { return Math.round(Math.hypot(q.x - p.x, q.y - p.y)); };
    const ac = len(w.a, w.c), cb = len(w.c, w.b);
    const sum = ac * ac + cb * cb;
    /* Two tiles for each blank: the right one, and the mistake that
       blank is there to catch — the other side; squaring as doubling;
       adding the sides instead of their squares; stopping before the
       root. Which comes first alternates, so the right one is not
       always on top. */
    const pair = function (right, wrong, first) {
      if (wrong === right) wrong = right + 1;
      return first ? [right, wrong] : [wrong, right];
    };
    const dbl = function (n) { return (n * n === 2 * n) ? n : 2 * n; };
    const res = Math.round(Math.sqrt(sum));
    const legA = { from: w.a, to: w.c, mark: { name: 'C' } };
    const legB = { from: w.c, to: w.b };
    /* The whole triangle, from the first screen of the three: every
       label is placed once, clear of sides that are not drawn yet, and
       stays there (Board.labelLegs). */
    const shape = [ { from: w.a, to: w.c }, { from: w.c, to: w.b } ];
    const say = w.say || {};
    const firstWord = function (t) { return String(t).split(/[\s,.]+/)[0]; };

    /* A walk after the formula has been taught (44 on): one screen. AB
       is asked for outright — A and B, the dotted line between them on
       her word and AB drawn over it, then "What is the distance between A
       and B?" — on the reel. Right, and on. Wrong once, and she flies off, the board makes room and the
       distance formula opens out of its edge (distanceTable): the child
       works it, and what it comes to flies onto AB. No corner and no
       sides: the formula needs only the two points' coordinates, which
       are written in parts so the numbers can be carried out of them. */
    if (w.formula) {
      const parts = function (p) {
        return { coordParts: [ { t: '(' }, { t: MINUS(p.x), glow: 'x' }, { t: ',\u00A0' },
                               { t: MINUS(p.y), glow: 'y' }, { t: ')' } ] };
      };
      const segF = Object.assign({}, seg, {
        a: Object.assign({}, seg.a, parts(w.a)), b: Object.assign({}, seg.b, parts(w.b)) });
      /* `ask: false` — her first line is the question (49: "How long
         should this connection be?"), so it is not asked a second time. */
      const q = say.ask === false ? null : (say.ask || 'What is the distance between A and B?');
      const table = distanceTable({ x: w.a.x, y: w.a.y, key: 'a' },
                                  { x: w.b.x, y: w.b.y, key: 'b' });
      return [ Object.assign({
        id: w.ids[0],
        line: say.first, line2: q || undefined,
        guideOnLine: true,
        /* Or the screen's own (`say.cues`): the towers lit on the first
           sentence and their line drawn on the second, say. */
        /* The points ring as she names them (namesAB), or with the
           guide's word where she does not name them. */
        wordCues: say.cues || [ Object.assign({ word: say.cue || firstWord(say.first), in: say.first, guide: true },
                                              namesAB(say.first).length ? {} : { beat: ['a', 'b'] }) ]
          .concat(namesAB(say.first))
          .concat(q ? [ { word: firstWord(q), in: q, spot: 'ab' } ].concat(namesAB(q)) : []),
        /* AB glows after the question — the second line, or the only one. */
        lineLights: q ? [ {}, { pulse: 'ab' } ] : [ { pulse: 'ab' } ],
        entrance: 'none', layout: 'board', intro: 'measure',
        /* The control is taken away while she asks and comes in after —
           the last screen's may be a different one, or answered. */
        askFirst: true,
        segment: segF,
        /* A right answer is the praise, as everywhere — heard only where
           PRAISE_AT says. A miss is OOPS, said, and then the table it
           promises. */
        /* `say.worked`: what she says when the child has worked the
           table after a miss, where it is not the right answer's line —
           the answer put back into the story ("So, the fire engine needs
           to travel 13 units."). */
        /* `rescue`: the answer found, the fire engine drives the line and
           puts the fire out (54). */
        task: { kind: 'distance', tableOnMiss: true, oopsLine: OOPS,
                workedLine: say.worked, tableSize: 34, formula: table, rescue: w.rescue },
        distance: true
      }, w.base || {}, w.first || {}) ];
    }
    /* Every question in a walk is asked one way: "What is the distance
       between A and C?" — never "How far is it from A to C?" or "Now
       find the distance from C to B." (the same words the pair screens
       and the first question use). */
    const askAC = say.ask || 'What is the distance between A and C?';
    const askCB = 'What is the distance between C and B?';
    const base = Object.assign({ shape: shape }, w.base || {});
    /* AB asked for outright, before any of the walk: A and B, the dotted
       line between them on her word and AB drawn over it, then "What is
       the distance between A and B?" with AB lit, and the reel. A right
       answer steps over the walk; a wrong one — seen as the line falling
       short of B or running past it — hands on to the walk, which finds
       it. */
    const ask = w.askFirst ? 'What is the distance between A and B?' : null;
    const s0 = w.askFirst ? Object.assign({
      id: w.ids[0],
      line: say.first, line2: ask,
      guideOnLine: true,
      wordCues: [ Object.assign({ word: say.cue || firstWord(say.first), in: say.first, guide: true },
                                namesAB(say.first).length ? {} : { beat: ['a', 'b'] }) ]
        .concat(namesAB(say.first), [ { word: firstWord(ask), in: ask, spot: 'ab' } ], namesAB(ask)),
      lineLights: [ {}, { pulse: 'ab' } ],
      entrance: 'none', layout: 'board',
      intro: 'measure', distance: true,
      segment: seg,
      task: { kind: 'distance',
              rightAt: w.askFirst.rightAt, teachAt: w.askFirst.id }
    }, base, w.first || {}) : null;
    const s1 = w.askFirst ? Object.assign({
      id: w.askFirst.id,
      /* Reached from the question above, wrong: AB is on the board
         already, so this screen keeps it and brings only the corner —
         on the first word of her question about AC, as below. */
      line: 'Oops! Let’s find it together.', line2: askAC,
      wordCues: [ { word: firstWord(askAC), in: askAC, spot: 'h', legs: true, beat: ['c'] } ],
      lineLights: [ {}, { pulse: 'h' } ],
      entrance: 'none', layout: 'board', keepSegment: true,
      intro: 'measure', distance: true,
      segment: seg,
      legs: [ Object.assign({ dash: true }, legA) ],
      task: { kind: 'distance', measureLeg: 0, countLine: 'Count carefully!' }
    }, base) : Object.assign({
      id: w.ids[0],
      line: say.first, line2: askAC,
      /* Her first sentence has only A and B in it: the dotted line waits
         for its word, A and B pulse with it, and AB is drawn solid over
         the dots (drawGuide). Her next sentence brings the corner: from
         its first word the dotted side grows out of A with the ease-in
         every dotted line has, and C lands — ringing — as the dots reach
         it, while only A, C and the side between them are at full
         strength. The corner used to come between the two, in silence,
         with her balloon taken away. The second sentence waits for AB to
         finish (lightAfterLine). */
      guideOnLine: true,
      wordCues: [ { word: say.cue || firstWord(say.first), in: say.first,
                    guide: true, beat: ['a', 'b'] },
                  { word: firstWord(askAC), in: askAC, spot: 'h', legs: true, beat: ['c'] } ],
      lineLights: [ {}, { pulse: 'h' } ],
      /* Not quiet: these two screens ask for a side to be COUNTED, and
         a child counting squares needs to see them. */
      entrance: 'none', layout: 'board',
      intro: 'measure', distance: true,
      segment: seg,
      legs: [ Object.assign({ dash: true }, legA) ],
      task: { kind: 'distance', measureLeg: 0, countLine: 'Count carefully!' }
    }, base, w.first || {});
    const s2 = Object.assign({
      id: w.ids[1],
      line: askCB,
      wordCues: [ { word: firstWord(askCB), spot: 'v' } ],
      lineLights: [ { pulse: 'v' } ],
      entrance: 'none', layout: 'board',
      intro: 'measure', distance: true, keepSegment: true,
      segment: seg,
      legs: [ Object.assign({ settled: true, length: true }, legA), legB ],
      task: { kind: 'distance', measureLeg: 1, countLine: 'Count carefully!' }
    }, base);
    const s3 = Object.assign({
      id: w.ids[2],
      lines: [ 'We know AC and CB.', 'Let’s use Pythagoras to find AB.' ],
      /* The two known sides on "We know AC and CB." — lit and pulsing,
         the rest stepped back, for as long as the sentence is up: they
         used to go back the instant its last word was typed, so the
         sentence sat there naming two sides nothing was showing. Then AB
         takes the light on the line that names it — as on 29c: AB and
         its points forward, AB pulsing and A and B ringing, the rest
         stepped back until just after the sentence, and the square left
         up for Pythagoras. */
      /* AB lit on the word "AB": its points ringing, the line pulsing,
         the rest stepped back — and held a moment after she stops. */
      wordCues: [ { word: 'We', spot: ['h', 'v'], pulse: ['h', 'v'], run: 2200 },
                  { word: 'AB', in: 'Let’s use Pythagoras to find AB.', spot: 'ab', pulse: 'ab',
                    beat: ['a', 'b'], run: 1700 } ],
      lineLights: [ { hold: 1000 }, { unspot: true, after: 1300 } ],
      rightAngle: true, keepMark: true,
      entrance: 'none', layout: 'board', quietBoard: true, keepSegment: true,
      segment: seg,
      legs: [ Object.assign({ settled: true, length: true }, legA),
              Object.assign({ settled: true, length: true }, legB) ],
      task: {
        kind: 'table',
        formula: [
          { kind: 'lead', parts: [
              { t: '(AB)' + SQ, lit: 'ab' }, { t: ' = ' },
              { t: '(CB)' + SQ, lit: 'v' }, { t: ' + ' },
              { t: '(AC)' + SQ, lit: 'h' } ] },
          { kind: 'step', parts: [
              { t: '= ' },
              { t: '(' + cb + ')' + SQ, lit: 'v', offer: pair(cb, ac, true) }, { t: ' + ' },
              { t: '(' + ac + ')' + SQ, lit: 'h', offer: pair(ac, cb, false) } ] },
          { kind: 'step', parts: [
              { t: '= ' },
              { t: String(cb * cb), lit: 'ab', offer: pair(cb * cb, dbl(cb), false) }, { t: ' + ' },
              { t: String(ac * ac), lit: 'ab', offer: pair(ac * ac, dbl(ac), true) } ] },
          { kind: 'step', parts: [
              { t: '= ' }, { t: String(sum), lit: 'ab', offer: pair(sum, ac + cb, false) } ] },
          { kind: 'result', parts: [
              { t: 'AB', lit: 'ab' }, { t: ' = ' },
              { t: res + UNIT, lit: 'ab', offer: pair(res, sum, true) } ] }
        ] }
    }, base);
    return s0 ? [s0, s1, s2, s3] : [s1, s2, s3];
  }

  /* Maya's house and the two cafés (42-46), from the town's own three
     coordinates: the dots, the walks between them, Maya's walk and the
     lengths written on them all come from TOWN, so none of it can stand
     apart from the pictures drawn over them. */
  const HOUSE = TOWN.house, CAFE_A = TOWN.cafeA, CAFE_B = TOWN.cafeB;
  const PT = function (p) { return { x: p.x, y: p.y }; };
  // how far a place is from the house, as the board writes it: whole (TOWN)
  const HOUSE_TO = function (p) { return Math.hypot(p.x - HOUSE.x, p.y - HOUSE.y) + '\u00A0units'; };

  /* -------------------------------------------------------------
     SCRIPT — one entry per screen
     ------------------------------------------------------------- */
  /* `entrance` — how Swifty arrives on each screen:
       'fly'  she flies in from off-stage on the fly sheet, then lands
       'stay' she is already standing; only the bubble changes
       'hop'  a short flap-and-hop in place (uses the fly sheet)
     She flies in on screen 1 only; 3 is talking only.

     The ids are labels, not positions: they already skip 23 and 27, and
     2 is gone the same way. Nothing addresses a screen by number — the
     picker and the counter read whatever ids are in the list — so a
     screen that goes simply goes, and the ones after it keep the names
     they have always had. */
  const SCRIPT = [
    { id: 1, line: 'Hey there!',                                         entrance: 'fly'  },
    /* 2 — "Ready to explore distance on the coordinate plane?" She asked
       it and then answered herself by starting, which is a beat that
       costs a screen and settles nothing. Gone; 1 hands straight to 3. */
    { id: 3, line: 'Let’s do a quick warm-up.',                          entrance: 'stay' },

    // 4 — no dialogue: she simply flies back out the way she came in,
    //     then the screen hands over on its own.
    { id: 4, line: null, entrance: 'flyOut', auto: true },

    // 5 — no dialogue: the grid builds itself in and she flies back in
    //     and lands on the left. The question comes on screen 6.
    /* The grid builds itself, then the tappable points wiggle in, and
       only then does she fly back to the left — so the board is whole
       and alive before anyone is asked to do anything with it. */
    { id: 5, line: null, entrance: 'fly',
      layout: 'grid', dots: true },

    /* 6 — the highlighters come up and the board goes live: tap the
       point she asked for. Two wrong taps and she shows the answer
       herself. */
    { id: 6, line: 'Locate the point (3, 2).', entrance: 'stay',
      layout: 'grid', dots: true,
      task: {
        target: { x: 3, y: 2 },
        maxWrong: 2
      } },

    /* 7 — same again with a new point, and without the pulse: the first
       one showed how, so pointing at this one too would be doing it for
       them rather than letting them try.

       And she asks it shorter. Saying "locate the point" a second time
       teaches the instruction over again, when the only new thing on
       the screen is the point — so she says the point, and "now try"
       carries the rest: same task, your turn. */
    { id: 7, line: 'Now try (6, 2).', entrance: 'stay', hint: false,
      layout: 'grid', dots: true,
      task: {
        target: { x: 6, y: 2 },
        maxWrong: 2
      } },

    /* No sweep between 7 and 8: this question is asked on the very board
       the point was just located on, so the board and Swifty both stay
       and only the two points arrive. */
    { id: 8, line: 'What is the distance between the two points?', entrance: 'none',
      wordCues: POINTS_CUE,
      layout: 'board', distance: true, intro: 'measure',

      /* Plotted first, then joined by a dashed guide, and only then is
         the question asked. The guide shows which span is being asked
         about without answering it — the solid line the slider lays
         down is still the answer. */
      /* The coordinates are split into their parts here rather than on
         the screen that argues about them, so that argument can keep
         this very drawing instead of taking it down and putting an
         identical one back up. Nothing about how they read changes. */
      segment: {
        a: { x: 3, y: 2,
             coordParts: [{ t: '(' }, { t: '3', glow: 'x' }, { t: ',\u00A0' },
                          { t: '2', glow: 'y' }, { t: ')' }] },
        b: { x: 6, y: 2,
             coordParts: [{ t: '(' }, { t: '6', glow: 'x' }, { t: ',\u00A0' },
                          { t: '2', glow: 'y' }, { t: ')' }] },
        /* Under the points, the same as the located marks it is carried
           in from and the same as every beat that argues about it — so
           the labels the child put there never move. */
        coordSide: 'under',
        dash: true },

      /* `answer` is left out on purpose: the game measures it from the
         two points, so moving a point can never leave a stale answer
         behind. Set it explicitly only to override that. */
      task: {
        kind: 'distance',       // answered on the reel, not by tapping
        /* A wrong answer counts their number out on the board so the
           miss can be seen, and says this over it. */
        /* No retry. A wrong answer here goes straight to the showing:
                 this beat carries little weight, and a child who has
                 missed learns more from the spaces being counted than
                 from being sent round again. */
              countLine: 'Count carefully!',
              /* And, once the count has written its number on the line,
                 what it came to, said (8, 13, 14, 19). */
              countedLine: 'So, the distance is 3\u00A0units.'
              /* Right: "That's correct!", heard over the confetti and
                 not written (PRAISE). */
      } },

    /* 9-11 — three more of the same, staying on the board. Two of them
       are vertical segments, so the count-out stacks its squares
       beside the line instead of hanging them beneath it. */
    /* ---- why the counting works, on a pair that has just been counted.
       Four beats on one board: the pair joined and measured, then the
       y halves of both labels light (they match), then the x halves
       (they do not), then the subtraction itself — 6 first, then 2, in
       the order it is read. Nothing is asked here; it is the reason
       behind the counting they have just done twice. */
    /* From here to the end of the argument the board is read rather
       than counted, so the ruling, the axes and their numbers fall back
       and the pair, its coordinates and the working come forward. The
       beats that ASK — 8, 13, 14, 19 — keep the board at full strength:
       a child counting squares needs to see them. */
    { id: 9, line: 'Did you notice?',
      entrance: 'stay', layout: 'board', quietBoard: true,
      /* The pair the question was about, KEPT — after a right answer
         the points and the line stay exactly as they are rather than
         being taken away and animated in again. Only the coordinates
         change, and only in how they are built: in parts, for the next
         beats to light (see Board.carryOn). The question's dotted guide
         becomes the solid line — already drawn, not drawing. */
      keepSegment: true, solidLine: true,
      /* The very pair screen 8 asked about, not a fresh one. The whole
         of this argument is "look at what you just measured, and see
         where the answer came from" — which only works if it is
         actually what they measured. Changing the numbers under them
         between the question and its explanation made this read as a
         second, unrelated example. */
      /* This beat plots the pair itself rather than keeping screen 8's.
         Keeping it looked tidier — the same points, no rebuild — but
         nothing on the measure screen before this one ever reveals the
         coordinate labels, so a kept segment arrived with its labels
         still at opacity 0 and the whole argument ran over an empty
         board. Replotting is what puts them on screen.

         The parts are split out here because the three beats that
         follow light the x and y halves separately; without them there
         is nothing for the highlight to take hold of.

         No length is written. The beats that follow build the argument
         that arrives at it, and the last of them works it out on the
         board — stating the answer first would make the argument a
         restatement of something already on screen. */
      segment: {
        a: { x: 3, y: 2,
             coordParts: [{ t: '(' }, { t: '3', glow: 'x' }, { t: ',\u00A0' },
                          { t: '2', glow: 'y' }, { t: ')' }] },
        b: { x: 6, y: 2,
             coordParts: [{ t: '(' }, { t: '6', glow: 'x' }, { t: ',\u00A0' },
                          { t: '2', glow: 'y' }, { t: ')' }] },
        // the working happens over the line; see screen 8
        coordSide: 'under'
      } },

    { id: 10, line: 'The y-coordinates are the same.',
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      highlight: { part: 'y' } },

    { id: 11, line: 'So, the distance is the difference between the x-coordinates.',
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      highlight: { part: 'x' } },

    /* 6 first, then 2 — the order the subtraction is read in, so the
       two numbers light as she says them rather than together. */
    { id: 12,
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      /* The board works it out, and nobody reads it out: 6 − 3 = 3 built
         on the board is the whole of this beat. It used to be said as
         well — a voice reading the sum out while the board built it,
         the answer twice over. No `highlight` here: the sequence does all
         of its own lighting, in its own order. */
      xEquation: true, hold: XEQ_HOLD },

    { id: 13, line: 'What is the distance between the two points?', entrance: 'none',
      wordCues: POINTS_CUE, layout: 'board',
      distance: true, intro: 'measure',
      segment: { a: { x: 4, y: 3 }, b: { x: -3, y: 3 } , dash: true},
      task: { kind: 'distance',
              /* No retry. A wrong answer here goes straight to the showing:
                 this beat carries little weight, and a child who has
                 missed learns more from the spaces being counted than
                 from being sent round again. */
              countLine: 'Count carefully!',
              countedLine: 'So, the distance is 7\u00A0units.' } },

    { id: 14, line: 'What is the distance between the two points?', entrance: 'none',
      wordCues: POINTS_CUE, layout: 'board',
      distance: true, intro: 'measure',
      segment: { a: { x: 1, y: 2 }, b: { x: 1, y: -3 } , dash: true},
      task: { kind: 'distance',
              /* No retry. A wrong answer here goes straight to the showing:
                 this beat carries little weight, and a child who has
                 missed learns more from the spaces being counted than
                 from being sent round again. */
              countLine: 'Count carefully!',
              countedLine: 'So, the distance is 5\u00A0units.' } },

    /* ---- and the same argument for a column. After the first vertical
       question the y-axis gets what the x-axis got: this time the x
       halves are the ones that match, so the distance is the difference
       of the y halves, and the subtraction reads 2 - (-3). */
    { id: 15, line: 'Did you notice?',
      entrance: 'stay', layout: 'board', quietBoard: true,
      /* The pair the question was about, KEPT — after a right answer
         the points and the line stay exactly as they are rather than
         being taken away and animated in again. Only the coordinates
         change, and only in how they are built: in parts, for the next
         beats to light (see Board.carryOn). The question's dotted guide
         becomes the solid line — already drawn, not drawing. */
      keepSegment: true, solidLine: true,
      segment: {
        a: { x: 1, y: -3,
             coordParts: [{ t: '(' }, { t: '1', glow: 'x' }, { t: ',\u00A0' },
                          { t: '\u22123', glow: 'y' }, { t: ')' }] },
        b: { x: 1, y: 2,
             coordParts: [{ t: '(' }, { t: '1', glow: 'x' }, { t: ',\u00A0' },
                          { t: '2', glow: 'y' }, { t: ')' }] }
        /* No length here — screen 18 works it out on the board and
           writes it beside the line itself. */
      } },

    { id: 16, line: 'The x-coordinates are the same.',
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      highlight: { part: 'x' } },

    { id: 17, line: 'So, the distance is the difference between the y-coordinates.',
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      highlight: { part: 'y' } },

    /* She says it; the board works it out — the column twin of screen
       12. The 2 is taken first, out of (1, 2), then the -3, the order
       the points are read down the column. The balloon stays shut and
       the sequence does its own lighting, so no `highlight` here. */
    /* As 12: 2 − (−3) = 5 built on the board, and not read out. */
    { id: 18,
      entrance: 'stay', layout: 'board', keepSegment: true, quietBoard: true,
      xEquation: true, hold: XEQ_HOLD },

    { id: 19, line: 'What is the distance between the two points?', entrance: 'none',
      wordCues: POINTS_CUE, layout: 'board',
      distance: true, intro: 'measure',
      segment: { a: { x: -2, y: 3 }, b: { x: -2, y: 1 } , dash: true},
      task: { kind: 'distance',
              /* No retry. A wrong answer here goes straight to the showing:
                 this beat carries little weight, and a child who has
                 missed learns more from the spaces being counted than
                 from being sent round again. */
              countLine: 'Count carefully!',
              countedLine: 'So, the distance is 2\u00A0units.' } },

    /* ---- 20-21: the recall, immediately before the ground moves.

       Two beats, neither of them a question. The child has just worked
       through a row and a column; these put both back in front of them
       finished — the pair, its coordinates, and the length written on
       the line — one after the other. That is the whole job: the next
       screen shows a pair that answers to neither method, and it can
       only land as a problem if both methods are still in mind when it
       arrives. Recalled first, broken second, rebuilt third.

       They are shown rather than asked deliberately. Asking again here
       would test what was just tested and spend the child's attention
       before the part that needs it; seeing a solved case costs one
       breath and leaves the question that follows the only thing on
       the board worth thinking about.

       The pairs are the very ones they worked: (3,2)-(6,2) is the row
       from screen 9 and the argument on 10-12, and (1,-3)-(1,2) is the
       column from 14 and the argument on 15-18. Fresh numbers here
       would read as new examples rather than as their own. */
    /* Half a sentence each. One line covering both, said on the second
       of them, was the old shape — and a whole sentence on each would
       indeed have said the same thing twice. Half a sentence does not:
       this beat names rows, the next names columns, and the two halves
       are one thought spoken across two pictures. "And vertical
       distance." cannot be read on its own, which is what keeps them
       from reading as two separate recollections. */
    { id: 20,
      /* One sentence, and the board follows it word by word.

         It was two screens — a row on one, a column on the next — and
         then one screen saying both in two lines. Both were spending
         beats on a single fact: that these two are solved, and the
         pair after them will be neither. It is one sentence, so it is
         one line, and the two pairs are drawn as the words for them go
         up: the row on "horizontally", the column on "vertically".
         See `wordCues` and armWordCues.

         Neither pair is the board's own segment. Both are carried as
         recalled ones, because neither is the subject of the screen —
         the sentence is, and they are what it points at. It also means
         the board draws nothing until she starts talking, which is the
         whole of the effect asked for. */
      line: 'So far, the points were lined up horizontally or vertically.',
      entrance: 'stay', layout: 'board', hold: EXAMPLE_HOLD + 1600,
      /* Two pairs on one board: the furniture steps back so they read as
         the subject rather than as more lines among the ruling. */
      quietBoard: true,
      examples: [
        /* The row, laid out the way the argument laid it out: the
           coordinates under their points, the length over the line. */
        { a: { x: 3, y: 2 }, b: { x: 6, y: 2 },
          coordSide: 'under', result: { text: '3\u00A0units' } },
        /* And the column they measured on 19, with the answer they
           gave it — revealed again on its word, like the row. */
        { a: { x: -2, y: 3 }, b: { x: -2, y: 1 },
          result: { text: '2\u00A0units' } }
      ],
      /* 19's pair, its line and its "2 units" do not stay: as the screen
         opens they fade out together (fadeOld), and the board is clear
         for the two pairs to be revealed on their words. They used to be
         wiped in one frame and the column drawn straight back — which
         read as the line vanishing and coming back. */
      fadeOld: true,
      wordCues: [ { word: 'horizontally', example: 0 },
                  { word: 'vertically',   example: 1 } ] },

    /* Both lengths go where every length goes: the middle of the span
       it measures, out to the side of the line by the same air a
       coordinate keeps from its dot. This column straddles the x-axis,
       so its own middle is the row the axis numbers live in — the
       board slides it down its own line until it is clear of them, and
       no further. */

    /* 12 — leaves sweep again and the scene goes back to the field
       layout of screen 5: board on the right, Swifty standing on the
       left, and no slider. The segment is diagonal this
       time, so counting whole squares no longer works — which is the
       point she is about to make.

       The board does the whole of it before she arrives: the diagonal
       is drawn, then the run across to C is dropped from it, and only
       then does she fly in and say her line. She is remarking on a
       picture that is finished, rather than talking over one being
       made — which is also why she is given the flight to arrive in
       and does not simply appear. */
    /* Both lines belong here. "Our earlier way won't work this time" is
       a statement about THIS pair, and this is the beat where the pair
       is introduced — it used to be merged into the question on 24.

       The warning that merged them was about a different thing: a HINT
       held across a screen change ("can the grid help?", then "how far
       apart are A and C?"). A statement about the problem is carried
       nowhere; the question on 24 stands on its own. */
    { id: 22, shape: SHAPE_1,
      /* Beats 1 to 3. She notices, she wonders, and then she tries
         something — and C arrives because she said she would look for
         a way, not because the screen opened carrying it.

         Three sentences on one board, so `lines` rather than
         line/line2. "These two aren't" is an observation and "how can
         we find the distance" is a question; run together they become
         one shrug. The question is the one the whole lesson answers,
         so it is allowed to sit. */
      lines: [ 'But these two aren’t.',
               'How can we find the distance between these two?',
               'Let’s explore.' ],
      /* The two points lit from "these", the pair the line is about, to
         the end of the sentence (`run`): A and B pulsing, their letters
         and coordinates highlighted — and nothing else lights on it. */
      wordCues: [ { word: 'these', in: 'But these two aren’t.', beat: ['a', 'b'], run: 2000 } ],
      /* Only the two points on the first — no line, no glow: "these two
         aren't" is about where the points are. The line between them
         comes after the second, the question about their distance: it
         draws, and then it glows (join, then the pulse once it is down).
         And on the third, the side that puts C on the board. */
      pointsOnly: true,
      lineLights: [ {},
                    { join: true, pulse: 'ab', pulseAt: 700 },
                    /* Once "Let's explore." is finished, and not
                       before: her balloon goes (`closeFirst`), and only
                       then does the side that puts C on the board draw
                       in, dotted from A — so the words and the new line
                       are never on the screen together. Nothing lit —
                       the side drawing in to C is the thing to look at
                       — and the beat stays open until it has arrived,
                       so nobody is handed on with C still on its way. */
                    { legs: true, hold: 1700, closeFirst: true } ],
      entrance: 'fly',
      layout: 'grid', transition: 'leaves',
      /* The same push its neighbours use, so the whole stretch is read
         at one scale — and taken in order rather than on a timer:
         the paper builds in the middle of an empty frame, moves aside,
         the camera comes in on where the pair is going to be, the two
         points land, and only then does she fly in to talk about them.
         See the grid branch of `dress` and the guard in `goTo`. */
      rebuild: true, view: 'triangle',
      /* Named here rather than three screens on. They are called A and B
         from the moment the question about them is asked, and a pair
         that gains its letters later reads as two different pairs — the
         one she wondered about, and the one the triangle is built on. */
      /* A and B, and only A and B. The run across to C belongs to the
         beat that says to look at it — put here it answered a question
         the child has not been asked yet. */
      segment: { a: { x: 2, y: 1, name: 'A' },
                 b: { x: 6, y: 4, name: 'B' } },
      /* Dashed, because it is something she is trying rather than a
         measurement anyone has taken. The child measures it next.
         Held back until the third line asks for it — see `lineLights`
         above and lightAfterLine. */
      legs: [ { from: { x: 2, y: 1 }, to: { x: 6, y: 1 },
                dash: true, mark: { name: 'C' } } ] },

    // 13 — same board and same segment, she just carries on talking
    /* The board pushes in here, on the first quadrant the triangle sits
       in, and stays pushed in while the triangle is being measured. */
    /* 14 — leaves again, back to the board layout with the slider.
       The diagonal is redrawn and a corner C is dropped from it, so
       the horizontal step A-C can be measured on its own. The answer
       is that leg, not the diagonal, so the task measures from it. */
    /* Same grid, same points, same leg. Nothing here is new to look at:
       A, B and the run across to C are all already on the board the
       child is reading, so the leg is marked settled and only the
       question arrives. */
    /* The reason and the question in one breath. They used to be two
       beats — "can the grid help?", then "how far apart are A and C?" —
       which asked the child to hold a hint across a screen change. */
    /* Two sentences, and a light each: the two points, then the line
       between them. Naming the points and lighting the line in one
       breath answers the question in the act of asking it.

       It stays ONE screen. These were two beats once and were merged
       because two beats asked the child to hold a hint across a screen
       change; what splits here is the sentence and its highlighting,
       not the beat. One board, one question, one control. */
    { id: 24, shape: SHAPE_1,
      /* Beats 4 and 5. A guess, and then the question it leads to.

         "Hmm" is her thinking aloud rather than instructing, which is
         the difference between a child watching somebody work and a
         child being told where to look. The second line asks it
         outright, in the words every other distance question uses —
         they measured rows and columns four screens ago, so this is
         one they can answer.

         C and its dashed guide are already on the board from 22. They
         are declared again so the screen stands on its own after a
         jump: `placeLeg` recognises the same side in the same place
         and hands it over rather than drawing it a second time. */
      line: 'Hmm… what about A and C?',
      line2: 'What is the distance between A and C?',
      /* While she talks about A and C, the rest steps back — B and the
         dotted AB fade from her first word, so the side she means is
         the only thing at full strength — and AC pulses once she has
         named it. It stays that way through the question. */
      wordCues: [ { word: 'Hmm', spot: 'h' } ],
      lineLights: [ { pulse: 'h' }, {} ],
      entrance: 'none',
      layout: 'board', distance: true, intro: 'measure', keepSegment: true,
      view: 'triangle', quietBoard: true,
      segment: { a: { x: 2, y: 1, name: 'A' },
                 b: { x: 6, y: 4, name: 'B' } },
      legs: [ { from: { x: 2, y: 1 }, to: { x: 6, y: 1 },
                dash: true, mark: { name: 'C' } } ],
      task: {
        kind: 'distance',
        measureLeg: 0,        // A to C, not A to B
        /* No retry, and the spaces counted rather than a nudge to go
           and count them — the same showing every other miss gets. */
        countLine: 'Count carefully!'
      } },

    /* 15 — the board is kept exactly as it was. The first leg is
       already drawn, so it only gains its length, and the second leg
       rises from the corner to B. */
    /* "Great!" closes beat 4 before beat 5 opens, so the child knows the
       first answer was taken; "now find CB" says this is the same job
       again rather than a new one, which is the point — it is the
       vertical method they already have.

       And AC stays on the board while they do it, stepped back rather
       than cleared: they need to see they now have two measured sides,
       and the one being asked for has to be the loud one. */
    { id: 25, shape: SHAPE_1,
      /* Beat 6. From her first word the side she is talking about is
         the only one at full strength: C, B and the run between them
         stay, and A, AC and the dotted AB step back — through the
         question, until the screen goes. It used to wait for the end of
         the sentence, so "from C to B" was said over the whole drawing. */
      line: 'What is the distance between C and B?',
      wordCues: [ { word: 'What', spot: 'v' } ],
      entrance: 'none', view: 'triangle', quietBoard: true,
      layout: 'board', distance: true, intro: 'measure', keepSegment: true,
      segment: { a: { x: 2, y: 1, name: 'A' },
                 b: { x: 6, y: 4, name: 'B' } },
      legs: [
        { from: { x: 2, y: 1 }, to: { x: 6, y: 1 }, mark: { name: 'C' },
          settled: true, length: true },
        { from: { x: 6, y: 1 }, to: { x: 6, y: 4 } }
      ],
      task: {
        kind: 'distance',
        measureLeg: 1,        // C to B
        // no retry; see screen 24
        countLine: 'Count carefully!'
      } },

    /* 16 — leaves, then the whole shape redrawn as one closed red
       triangle with both legs measured. Nothing to answer here, so no
       slider: she is just naming what they have built. */
    /* Still the same grid: the triangle is the two legs they have just
       measured, not a new drawing. */
    /* They built this right angle themselves two beats ago, by walking
       across and then up — and it is exactly the precondition for
       Pythagoras, which is what lets her simply tell them the theorem on
       the next beat. It was asked once, as a question with three
       buttons (26); the drawing answers it, so now she says it. */
    { id: 27, shape: SHAPE_1,
      /* Beat 7. The result.

         AC and CB stay exactly as the child left them — both
         `settled`, both carrying the length that was measured — and
         the only thing that moves is AB coming back to full strength.
         So the whole shape is on the board at once for the first time,
         and it is there because of what they just did rather than
         because a screen arrived carrying it.

         This is where the line belongs. It was on 26 once, beside
         three buttons, which made an observation into the preamble of
         a question. Standing on its own it is what it says it is.

         And it says what KIND of triangle, which is the whole of what
         26's question used to ask: three buttons to name a shape the
         child can see the square corner of. Named here instead, with the
         square put into the corner at C as she says "right-angled" — the
         evidence arriving with the word — and the three sides lit as she
         says "triangle". Voiced from her own takes: "Look! We made a" and
         "right-angled triangle!", joined in the pause between them. */
      line: 'Look! We made a right-angled triangle!',
      entrance: 'none', layout: 'board', keepSegment: true,
      view: 'triangle', quietBoard: true,
      /* Nothing is drawn here, and nothing is singled out either.

         `spots: ['ab']` was tried and is wrong: lighting one side
         hushes the others, so bringing AB forward pushed the two legs
         the child had just measured down to 0.28 — and the point of
         this beat is the shape all three make together. `clear` puts
         the board back instead: AB comes up out of the hush beat 6
         left it in, the legs stay exactly where they were, and the
         whole triangle reads at once. */
      lineLights: [ { clear: true } ],
      /* On the word, not after the sentence. `lineLights` fires when a
         line finishes, and measured that left the hypotenuse wound
         back to nothing until 3.5s into a beat whose words land at
         1.25s — so for over two seconds she was naming a triangle
         with two sides on the board. The shape closes as she says
         what it is. */
      /* And the three sides light on that same word. "Look! We made a
         right-angled triangle!" is the moment the shape is named, so
         this is where the board shows which three lines she means: two
         full swells, the third side coming up as the light goes round
         all three — the square in the corner a word before them. */
      wordCues: [ { word: 'right-angled', mark: true },
                  { word: 'triangle', settle: true, pulse: 'triangle', run: 1800 } ],
      /* The square stays in the corner from here on: 28 goes on to say
         "since it's a right triangle", and keeps it (`keepMark`). */
      /* Long enough after her last word for the light to finish before
         28 arrives: the word lands one beat (~0.4s) before her balloon
         closes, and the light runs 1.8s from it. */
      hold: 1900,
      segment: { a: { x: 2, y: 1, name: 'A' },
                 b: { x: 6, y: 4, name: 'B' } },
      legs: [
        { from: { x: 2, y: 1 }, to: { x: 6, y: 1 }, mark: { name: 'C' },
          settled: true, length: true },
        { from: { x: 6, y: 1 }, to: { x: 6, y: 4 },
          settled: true, length: true }
      ] },

    /* No question here any more. It asked "how can we find the third
       side?" — Area, Perimeter, Pythagoras — which is not answerable
       from the screen: Pythagoras has not been taught in this lesson,
       so a child picks it by elimination, by recognising the word, or
       by guessing, and the answer teaches nothing because the question
       tested nothing.

       That question has moved to 26 and become one the child can
       actually answer. There is still exactly one question in these
       seven beats; it is just a better one. Here she simply says the
       theorem, which is the honest thing to do with a theorem they
       have not met, and the derivation follows on its own. */
    { id: 28, shape: SHAPE_1,
      /* The same drawing as the four beats before it — this screen
         keeps their triangle rather than making one — so it keeps
         their camera too. Without a view named here the push pulls
         all the way back out for one beat and goes in again on the
         next, which reads as the board flinching between two
         sentences about the same picture. */
      view: 'triangle',
      /* The need, then the reason, then the theorem.

         What we have — the two sides the child measured, lit together
         as the screen opens and named after, so she confirms what they
         are already reading. What we need — AB, the one side with no
         length on it, lit on the word that names it. Why the tool
         applies — it is a right triangle, and the marker at C that
         says so stays at full strength the whole time. Then the tool:
         the working, unchanged.

         It used to open "A right triangle!" — the answer the child had
         given one screen before — light the two known sides one after
         the other so they were never seen together, and reach for
         Pythagoras with the marker dimmed by every highlight.

         None of these lines is recorded; neither were the two they
         replace. */
      lines: [ 'We know AC and CB.',
               'But we still need AB.',
               'Since it’s a right triangle, Pythagoras theorem can help!' ],
      entrance: 'stay', layout: 'board',
      /* The working is about the drawing, so the paper steps back:
         the ruling, the axes and their numbering fade and the triangle
         and its lengths are what is left at full strength. The screens
         that write a solution on the board all do this now — it was on
         only the last two of them, so the same beat came up loud on one
         screen and quiet on the next. */
      quietBoard: true, keepSegment: true,
      /* The triangle is left exactly as the child built it: every
         side, every point, both lengths, at full strength, with
         nothing pulsing and nothing stepped back. She names what is
         already plainly there. The holds are the breaths between the
         three sentences — what we have, what we need, why the tool
         applies. */
      /* "We know AC and CB." — the two measured sides come forward and
         pulse while she says it, and AB steps back; when the sentence
         ends the triangle is whole again for the rest of the screen and
         the table. */
      /* The pulse and the fade end together, just after the sentence
         has finished — the pulse used to run on into "But we still
         need AB." with AB already back. */
      /* "But we still need AB." — the same again for the side still to
         find, from her first word: AB and its two points come forward, AB
         pulses and A and B ring, and everything else steps back — AC and
         CB, their lengths, C, and the square at C, which is only the
         reason on the next line. The fade ends with the pulse, just after
         the sentence, so "Since it’s a right triangle…" has the whole
         triangle and its square at full strength. */
      wordCues: [ { word: 'We', spot: ['h', 'v'], pulse: ['h', 'v'], run: 1500 },
                  { word: 'AB', in: 'But we still need AB.', spot: 'ab', pulse: 'ab',
                    beat: ['a', 'b'], run: 1500, hushMark: true } ],
      lineLights: [ { unspot: true, after: 550, hold: 500 },
                    { unspot: true, after: 1300, hold: 500 }, {} ],
      /* The right angle is what the theorem rests on, so the marker is
         asserted on arrival (a jump from the picker would otherwise
         land without it) and exempt from every highlight's hush —
         through the working too, which lights each side as it writes. */
      rightAngle: true, keepMark: true,
      derive: {
        /* As a table out of the board's edge, not writing on the paper:
           the board slides left, the table opens to its right, and each
           name and number is lifted off the triangle as a copy — which
           is left exactly as the child built it. See workAsTable. */
        table: true,
        /* The working, tagged to the board. Every part that names a
           length carries the side it belongs to — 'h' the horizontal,
           'v' the vertical, 'ab' the line between the two points — and
           each lights that side as it lands. The two squares are read
           off the leg lengths, so they arrive from them; 16, 9 and 25
           are arithmetic and simply appear. */
        formula: [
          /* The theorem first, with no numbers in it at all. The
             working used to open on `AB² = 4² + 3²` — already
             substituted — so the one line the beat exists to teach
             was never written, and the line that followed could not
             read as a substitution because there was nothing above it
             to substitute into. */
          /* Every name is lifted off the side it names. The bracket
             says "the whole of this side, and THEN squared" — which is
             exactly what a child gets wrong the first time they meet
             AB² and read it as A times B squared. */
          { kind: 'lead', parts: [
              { t: '(AB)\u00B2', lit: 'ab', from: { side: 'ab' } }, { t: ' = ' },
              { t: '(AC)\u00B2', lit: 'h',  from: { side: 'h'  } }, { t: ' + ' },
              { t: '(CB)\u00B2', lit: 'v',  from: { side: 'v'  } } ] },
          { kind: 'step', parts: [
              { t: '= ' },
              { t: '(4)\u00B2', lit: 'h', from: { leg: 0 } }, { t: ' + ' },
              { t: '(3)\u00B2', lit: 'v', from: { leg: 1 } } ] },
          { kind: 'step', parts: [
              { t: '= ' }, { t: '16', lit: 'h' }, { t: ' + ' }, { t: '9', lit: 'v' } ] },
          { kind: 'step', parts: [
              { t: '= ' }, { t: '25', lit: 'ab' } ] },
          /* AB off its side like the first line's, so the answer's
             name is carried in too; the answer itself is worked out,
             so it is written — and it stays in the table: nothing is
             added to the triangle, so it does not fly home onto AB. */
          { kind: 'result', parts: [
              { t: 'AB', lit: 'ab', from: { side: 'ab' } }, { t: ' = ' },
              { t: '5\u00A0units', lit: 'ab' } ] }
        ]
      } },

    /* 19-20 — the method used straight away on two fresh triangles,
       both already drawn. Only the coordinates are given: no side
       lengths, so the legs have to be read off the grid before
       Pythagoras can be applied. Both are Pythagorean triples, so the
       answer comes out whole — 3-4-5 first, then the same shape
       doubled to 6-8-10. */
    /* The child's own go at the argument 22 to 28 made — on a fresh
       triangle, A(−2, 2), B(2, 5), C(2, 2) — ending in the same table
       as 28, filled by the child this time. Three screens on one board,
       one question each, with no sweep between them. */
    { id: 29, shape: SHAPE_2,
      /* Beats 0–3, one thing with each sentence.
         The grid fills and the camera frames the triangle before a point
         is drawn (frameDrawing); A and B go up. Then, with "Now, let's
         find the distance between A and B.", A and B pulse and the dotted
         line between them is drawn as she says "distance", then the line
         itself drawn over it from A to B — and nothing else is on the
         board. Then "What is the distance between these two points?",
         and from its first word C arrives with a pulse, the dotted side
         from A running out to it, AC the only side at full strength, B
         and AB stepping back — with AC glowing after it. CB is not drawn here:
         it comes on the next screen, once AC has been answered. */
      view: 'triangle',
      line: 'Now, let’s find the distance between A and B.',
      line2: 'What is the distance between these two points?',
      guideOnLine: true,
      /* C and the dotted side out to it come with "What is the
         difference…", from its first word — see the walks (walk, s1). */
      wordCues: [ { word: 'distance', guide: true },
                  { word: 'What', spot: 'h', legs: true, beat: ['c'] } ]
        .concat(namesAB('Now, let’s find the distance between A and B.')),
      lineLights: [ {}, { pulse: 'h' } ],
      entrance: 'none', layout: 'board', quietBoard: true, transition: 'leaves',
      intro: 'measure', distance: true,
      segment: { a: { x: -2, y: 2, name: 'A' }, b: { x: 2, y: 5, name: 'B' }, dash: true },
      legs: [ { from: { x: -2, y: 2 }, to: { x: 2, y: 2 }, dash: true,
                mark: { name: 'C', away: { x: 1, y: 0 } } } ],
      task: { kind: 'distance', measureLeg: 0, countLine: 'Count carefully!' } },

    { id: '29b', shape: SHAPE_2,
      /* Beat 4. AC is settled with its length; CB is drawn, and asked
         the same way: from her first word C, B and the side between them
         are the only things at full strength — A, AC and the dotted AB
         step back — and CB glows as she asks. */
      line: 'What is the distance between these two points?',
      wordCues: [ { word: 'What', spot: 'v' } ],
      lineLights: [ { pulse: 'v' } ],
      entrance: 'none', view: 'triangle', quietBoard: true,
      layout: 'board', distance: true, intro: 'measure', keepSegment: true,
      segment: { a: { x: -2, y: 2, name: 'A' }, b: { x: 2, y: 5, name: 'B' }, dash: true },
      legs: [ { from: { x: -2, y: 2 }, to: { x: 2, y: 2 },
                mark: { name: 'C', away: { x: 1, y: 0 } }, settled: true, length: true },
              { from: { x: 2, y: 2 }, to: { x: 2, y: 5 } } ],
      task: { kind: 'distance', measureLeg: 1, countLine: 'Count carefully!' } },

    { id: '29c', shape: SHAPE_2,
      /* Beats 5–7. The shape named, with its marker on the word — the
         reason the theorem applies — then the table, which the child
         fills blank by blank (runTable). The marker stays at full
         strength to the end, and the triangle is left alone. */
      lines: [ 'Look, we made a right triangle.',
               'Let’s use Pythagoras to find AB.' ],
      /* "Look, we made a right triangle." — the triangle is what she is
         showing, so all three sides light together, pulsing, from her
         first word, and nothing steps back: AB is as lit as the two sides
         that make the right angle (it used to go grey here). The marker
         comes up on "triangle". The light runs as long as the sentence is
         up. */
      /* Then AB, the side to find, on the word "AB" in "Let’s use
         Pythagoras to find AB.": AB and its points forward, AB pulsing
         and A and B ringing, AC, CB and C stepped back — until just
         after the sentence, before the table opens. The square stays up:
         it is what lets Pythagoras be used, named in the same breath. */
      wordCues: [ { word: 'Look', pulse: 'triangle', run: 2600 },
                  { word: 'triangle', mark: true },
                  { word: 'AB', in: 'Let’s use Pythagoras to find AB.', spot: 'ab', pulse: 'ab',
                    beat: ['a', 'b'], run: 1700 } ],
      lineLights: [ { hold: 1000 }, { unspot: true, after: 1300 } ],
      keepMark: true,
      entrance: 'none', view: 'triangle', quietBoard: true, layout: 'board', keepSegment: true,
      segment: { a: { x: -2, y: 2, name: 'A' }, b: { x: 2, y: 5, name: 'B' }, dash: true },
      legs: [ { from: { x: -2, y: 2 }, to: { x: 2, y: 2 },
                mark: { name: 'C', away: { x: 1, y: 0 } }, settled: true, length: true },
              { from: { x: 2, y: 2 }, to: { x: 2, y: 5 }, settled: true, length: true } ],
      task: {
        kind: 'table',
        /* The theorem is given; every number after it is a blank the
           child fills, choosing between the two in `offer` (in the order
           they drop down — the right one is not always on top). Each
           wrong number is the mistake that blank is there to catch: the
           other side; squaring as doubling; a slip adding; stopping
           before the square root. Coloured by side where a number is a
           side's (CB green, AC orange), the working's blue otherwise. */
        formula: [
          { kind: 'lead', parts: [
              { t: '(AB)\u00B2', lit: 'ab' }, { t: ' = ' },
              { t: '(CB)\u00B2', lit: 'v' }, { t: ' + ' },
              { t: '(AC)\u00B2', lit: 'h' } ] },
          { kind: 'step', parts: [
              { t: '= ' },
              { t: '(3)\u00B2', lit: 'v', offer: [3, 4] }, { t: ' + ' },
              { t: '(4)\u00B2', lit: 'h', offer: [3, 4] } ] },
          { kind: 'step', parts: [
              { t: '= ' },
              { t: '9', lit: 'ab', offer: [6, 9] }, { t: ' + ' },
              { t: '16', lit: 'ab', offer: [16, 8] } ] },
          { kind: 'step', parts: [
              { t: '= ' }, { t: '25', lit: 'ab', offer: [23, 25] } ] },
          { kind: 'result', parts: [
              { t: 'AB', lit: 'ab' }, { t: ' = ' },
              { t: '5\u00A0units', lit: 'ab', offer: [5, 25] } ] }
        ] } },

    /* 30–30c — Question 2, the way 29 taught it, on a harder triangle:
       A(−3, 3), B(5, −3), C(5, 3), across three quadrants. A and B go up
       and pulse, the dotted line between them is drawn as she says
       "AB"; then AC is drawn out to C and she asks for it; then CB; then
       the table, which the child fills. 8, 6, 10.
       From here to the end the board carries no numbers on its axes —
       every point has its coordinates written beside it, and those are
       what the child reads. The axes still sweep in. Said once, on 30;
       it holds for every screen after (Game.numbersAt). */
    ...walk({
      ids: [30, '30b', '30c'],
      a: { x: -3, y: 3 }, b: { x: 5, y: -3 }, c: { x: 5, y: 3 },
      say: { first: 'Now find AB.', cue: 'AB' },
      base: { view: 'triangle', range: { min: 0, max: 12 } },
      first: { transition: 'leaves', numbers: false },
      /* AB first, outright: 10 on the reel steps over the walk to 31; a
         miss and the walk works it out, from 30a. */
      askFirst: { id: '30a', rightAt: 31 }
    }),

    /* 31–36 — the general triangle, on the board layout the questions
       before it use, so the answers can rise under her. Subscripts and
       the minus sign are real characters now: the game carries its own
       font for them. */
    { id: 31, shape: SHAPE_G, line: 'The same idea works for any two points.', entrance: 'fly',
      layout: 'board', transition: 'leaves',
      segment: {
        a: { x: -5, y: 1, coordParts: [ { t: '(' }, { t: 'x₁', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₁', glow: 'y' }, { t: ')' } ] },
        b: { x:  5, y: 4, coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₂', glow: 'y' }, { t: ')' } ] }
      } },

    /* 32 — the same general segment, with the corner dropped and both
       legs drawn: the right-angled triangle in its general form. The
       corner is named from the two points' own coordinates. */
    { id: 32, shape: SHAPE_G, line: null, entrance: 'stay',
      layout: 'board', keepSegment: true,
      segment: {
        a: { x: -5, y: 1, name: 'A', coordParts: [ { t: '(' }, { t: 'x₁', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₁', glow: 'y' }, { t: ')' } ] },
        b: { x:  5, y: 4, name: 'B', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₂', glow: 'y' }, { t: ')' } ] }
      },
      legs: [
        { from: { x: -5, y: 1 }, to: { x: 5, y: 1 },
          mark: { name: 'C', coordText: '(x₂, y₁)', fill: '#3B7DD8', away: { x: 1, y: 0 } } },
        { from: { x:  5, y: 1 }, to: { x: 5, y: 4 } }
      ] },

    /* 33 — the horizontal side named. Nothing asked: as she says "AC",
       AC and its two corners stay at full strength and the rest steps
       back, and its length is put together in the middle of the side as
       she says it — x₂ lifted off B's label, then the sign, then x₁ off
       A's. */
    { id: 33, shape: SHAPE_G, line: 'AC = x₂ − x₁', entrance: 'stay',
      layout: 'board', keepSegment: true,
      wordCues: [ { word: 'AC', spot: 'h', leg: 0 } ],
      hold: 1800,
      segment: {
        a: { x: -5, y: 1, name: 'A', coordParts: [ { t: '(' }, { t: 'x₁', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₁', glow: 'y' }, { t: ')' } ] },
        b: { x:  5, y: 4, name: 'B', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₂', glow: 'y' }, { t: ')' } ] }
      },
      legs: [
        /* AC runs from A to C, so its two x's are read off those two
           points: x₂ lights on C and flies to the side, then the sign, then
           x₁ lights on A and flies — AC = x₂ − x₁, each symbol seen coming
           from its own point. (x₂ came off B once: the same number, but
           not the point this side ends at.) C's label is in parts so its
           x₂ can light and be lifted; the words are the same. */
        { from: { x: -5, y: 1 }, to: { x: 5, y: 1 },
          mark: { name: 'C', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' }, { t: 'y₁', glow: 'y' }, { t: ')' } ], fill: '#3B7DD8', away: { x: 1, y: 0 } },
          settled: true, lengthText: 'x₂ − x₁',
          lengthFrom: [ { p: 'c', half: 'x' }, { p: 'a', half: 'x' } ] },
        { from: { x:  5, y: 1 }, to: { x: 5, y: 4 }, settled: true }
      ] },

    /* 34 — and the vertical side, the same way: CB, C and B stay at full
       strength while she says it; y₂, then the sign, then y₁, written
       along CB, between C and B. */
    { id: 34, shape: SHAPE_G, line: 'CB = y₂ − y₁', entrance: 'stay',
      layout: 'board', keepSegment: true,
      wordCues: [ { word: 'CB', spot: 'v', leg: 1 } ],
      hold: 1800,
      segment: {
        a: { x: -5, y: 1, name: 'A', coordParts: [ { t: '(' }, { t: 'x₁', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₁', glow: 'y' }, { t: ')' } ] },
        b: { x:  5, y: 4, name: 'B', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₂', glow: 'y' }, { t: ')' } ] }
      },
      legs: [
        { from: { x: -5, y: 1 }, to: { x: 5, y: 1 },
          mark: { name: 'C', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' }, { t: 'y₁', glow: 'y' }, { t: ')' } ], fill: '#3B7DD8', away: { x: 1, y: 0 } },
          settled: true, length: true, lengthText: 'x₂ − x₁' },
        /* CB runs from C up to B: y₂ lights on B and flies, then the sign,
           then y₁ lights on C — CB = y₂ − y₁. (y₁ came off A once.) */
        { from: { x:  5, y: 1 }, to: { x: 5, y: 4 },
          settled: true, lengthText: 'y₂ − y₁',
          lengthFrom: [ { p: 'b', half: 'y' }, { p: 'c', half: 'y' } ] }
      ] },

    /* 35 — and AB: it lights as she names it, then she flies off, the
       board makes room and the formula opens out of its right edge,
       every piece of it carried in off the triangle — AB, CB and AC off
       their sides, y₂ − y₁ and x₂ − x₁ off the lengths just written —
       ending on AB = √((y₂ − y₁)² + (x₂ − x₁)²). Nothing asked. */
    { id: 35, shape: SHAPE_G, line: 'Now, let’s find AB.', entrance: 'stay',
      layout: 'board', keepSegment: true,
      wordCues: [ { word: 'AB', spot: 'ab', pulse: 'ab', beat: ['a', 'b'], run: 1700 } ],
      lineLights: [ { unspot: true, after: 500 } ],
      /* The child's to fill, the way 29c's table is: she flies off, the
         board makes room and the table opens out of its right edge — AB,
         AC and CB carried in off the triangle — then each blank, tapped,
         drops two tiles: the side's own difference, read off the labels
         on the board, or the sum a child reaches for instead. Then the
         root is written and she comes back under the table. */
      task: {
        kind: 'table',
        /* Nothing said when the last blank is in (`false`): the line it
           ends on goes green, and 37 puts it up on its own. */
        correctLine: false,
        tableSize: 36,
        /* Written as it is read, one line a row with the = signs under
           one another: AC before CB and the x's before the y's, each
           term whole in its side's colour — AC and the x's orange, CB and
           the y's green, AB and the root blue:

               (AB)² = (AC)² + (CB)²
                     = (x₂ − x₁)² + (y₂ − y₁)²
                  AB = √((x₂ − x₁)² + (y₂ − y₁)²)

           They used to stand in columns, CB first, and the columns left
           wide gaps inside the brackets. The second row's two
           differences are the child's to fill. */
        formula: [
          { kind: 'lead', inline: true, parts: [
              { t: '(AB)\u00B2', lit: 'ab', from: { side: 'ab' } }, { t: ' = ' },
              { t: '(AC)\u00B2', lit: 'h',  from: { side: 'h'  } }, { t: ' + ' },
              { t: '(CB)\u00B2', lit: 'v',  from: { side: 'v'  } } ] },
          { kind: 'step', inline: true, parts: [
              { t: '= ' },
              { t: '(', lit: 'h' },
              { t: 'x\u2082 \u2212 x\u2081', lit: 'h', answer: 'x\u2082 \u2212 x\u2081',
                offer: [ 'x\u2081 + x\u2082', 'x\u2082 \u2212 x\u2081' ] },
              { t: ')\u00B2', lit: 'h' }, { t: ' + ' },
              { t: '(', lit: 'v' },
              { t: 'y\u2082 \u2212 y\u2081', lit: 'v', answer: 'y\u2082 \u2212 y\u2081',
                offer: [ 'y\u2082 \u2212 y\u2081', 'y\u2081 + y\u2082' ] },
              { t: ')\u00B2', lit: 'v' } ] },
          /* Named d, not AB: this is the distance formula now, for any
             two points, and d is what every screen after it calls it. */
          { kind: 'result', inline: true, parts: [
              { t: 'd', lit: 'ab' }, { t: ' = ' },
              { t: '\u221A(', lit: 'ab' },
              { t: '(x\u2082 \u2212 x\u2081)\u00B2', lit: 'h' },
              { t: ' + ', lit: 'ab' },
              { t: '(y\u2082 \u2212 y\u2081)\u00B2', lit: 'v' },
              { t: ')', lit: 'ab' } ] }
        ] },
      segment: {
        a: { x: -5, y: 1, name: 'A', coordParts: [ { t: '(' }, { t: 'x₁', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₁', glow: 'y' }, { t: ')' } ] },
        b: { x:  5, y: 4, name: 'B', coordParts: [ { t: '(' }, { t: 'x₂', glow: 'x' }, { t: ',\u00A0' },
                           { t: 'y₂', glow: 'y' }, { t: ')' } ] }
      },
      legs: [
        { from: { x: -5, y: 1 }, to: { x: 5, y: 1 },
          mark: { name: 'C', coordText: '(x₂, y₁)', fill: '#3B7DD8', away: { x: 1, y: 0 } },
          settled: true, length: true, lengthText: 'x₂ − x₁' },
        { from: { x:  5, y: 1 }, to: { x: 5, y: 4 },
          settled: true, length: true, lengthText: 'y₂ − y₁' }
      ] },

    /* 36 — the recap of the formula — is gone: 35 has just written it.

       37 — the formula, on its own. No leaf sweep: the table stays
       where 35 wrote it, the two lines that led to it fade and fold away
       (`tableOnly`), and what is left is the one line it ended on, made
       big — the board steps back to 85% against its left edge and the
       table comes out into the room at 125%, between the board and the
       frame's right edge, and down (`top`, its top edge) to leave her
       room over it. Then Swifty comes up from behind it, her hands on
       its edge, and says what it gives (`peek`); a Next comes up in the
       corner, and the screen waits for it (`waitNext`). */
    { id: 37, shape: SHAPE_G,
      entrance: 'away', layout: 'board', keepSegment: true, keepTable: true,
      tableOnly: 'last', waitNext: true,
      tableGrow: { board: 0.85, table: 1.25, top: 350 },
      peek: { line: 'And that gives the distance between any two points.' } },


    /* Back to the field, behind the leaves: the scene changes here now
       that 37 stays on the board with the table. */
    { id: 38, line: 'What if both points are on the x-axis?', entrance: 'fly',
      transition: 'leaves' },

    /* 29 — the x-axis case worked through: the general formula narrows
       to |x2 - x1| as the y terms fall away. She says which case it is
       from her own bubble, standing beside the board. */
    { id: 39, entrance: 'none', layout: 'xaxis',
      /* No leaf sweep and no Swifty: the grid builds in the middle, moves
         to its side, and the table opens for the child — she only comes
         back to say it was right. "Both points are on the x-axis." was
         hers, between the grid and the table. */
      noIntro: true,
      /* The child's own go (runAxisPick): the board builds in the middle
         and moves across, she says which case it is and goes, and the
         table opens out of the board for the child to fill. */
      /* She is only seen over the table on this screen (`peek`), never
         flown in: as it opens — down the middle of the room right of the
         board (`tableTop`, its top edge), with room over it for her — she
         comes up from behind it and names what its first line is, the
         formula, written as she finishes saying so; then she goes back
         down, and the rest is the child's. At the end the line it ends on
         goes green, the rest fold away and it is written as "d = …"
         (`name`), the board steps back and the table grows (`grow`, as
         37's does), and she comes up again to say what it gives. A Next
         comes up in the corner, and the screen waits for it (`waitNext`). */
      task: { kind: 'table', formula: XAXIS.picks, tableSize: 32,
              tableLine: 'The distance between any two points is:',
              tableTop: 470, correctLine: false },
      waitNext: true,
      peek: { line: 'And that gives the distance when the points are on the x-axis.',
              name: 'd', grow: { board: 0.85, table: 1.25, top: 350 } } },

    /* 30 — leaves again, and the same empty field as 25: board and
       working left behind, Swifty flying back in alone to put the next
       question. */
    { id: 40, line: 'And what if they’re on the y-axis?',
      /* No leaf sweep: she flies off from under 39's table, the table
         folds back and the board fades, and she flies back in to ask. */
      entrance: 'fly', flyBack: true },

    /* 31 — the same working as 27 with the axes swapped: the x terms
       are the pair that falls away this time. */
    { id: 41, entrance: 'none', layout: 'yaxis',
      /* As 39: no leaf sweep and no Swifty — the grid, its two points,
         then the table. */
      noIntro: true,
      /* And the same as 39, on the y-axis. */
      task: { kind: 'table', formula: YAXIS.picks, tableSize: 32,
              tableLine: 'The distance between any two points is:',
              tableTop: 470, correctLine: false },
      waitNext: true,
      peek: { line: 'And that gives the distance when the points are on the y-axis.',
              name: 'd', grow: { board: 0.85, table: 1.25, top: 350 } } },

    /* 41b — the formula, asked for straight out, before it is put to
       work in the town: two points and nothing else, and "Find the
       distance between A and B." Three across and four up, so it comes
       out whole — 5 units, on the reel. Wrong once, and the formula
       opens out of the board for the child to work, as on every walk. */
    ...walk({
      ids: ['41b'], formula: true,
      a: { x: 1, y: -1 }, b: { x: 4, y: 3 }, c: { x: 4, y: -1 },
      say: { first: 'Find the distance between A and B.', cue: 'distance', ask: false },
      base: { range: { min: 0, max: 8 } },
      first: { transition: 'leaves', entrance: 'fly' }
    }),

    /* 41c — between the formula and what it is for: two lines, one at
       a time, in the open field. The board goes as she flies off it, and
       she comes back in to say them. */
    { id: '41c', entrance: 'fly', flyBack: true,
      lines: [ 'Now we know how to find the distance between any two points.',
               'Let\u2019s apply this to solve some real-life problems!' ] },

    /* ================= real-life problems =================
       No help with the method: a fire and a fire engine, then two towers
       — each worked as a walk, on the child's own — then Maya and her
       cafés, and the park. */

    /* 54 — the fire. The fire at the origin and the engine at (−5, −12):
       along the x-axis to the corner, then down; five, twelve, thirteen.
       On the reel, like every other walk; on the wide board, where a unit
       is still a cell. The fire lights up as she says there is one, the
       engine as she names it — and the way between them is drawn then. */
    ...walk({
      ids: [54], formula: true,
      a: { x: 0, y: 0 }, b: { x: -5, y: -12 }, c: { x: -5, y: 0 },
      /* Found — by the reel or on the table — and the engine goes: up the
         line to the fire, and the fire goes out. */
      rescue: { engine: 'engine', fire: 'fire' },
      say: { first: 'There\u2019s a fire at A!',
             ask: 'How far is it from the fire engine at B?',
             worked: 'So, the fire engine needs to travel 13\u00A0units.',
             cues: [ { word: 'fire', in: 'There\u2019s a fire at A!', townGlow: ['fire'] },
                     { word: 'A', in: 'There\u2019s a fire at A!', beat: ['a'] },
                     { word: 'engine', in: 'How far is it from the fire engine at B?',
                       guide: true, townGlow: ['engine'] },
                     { word: 'B', in: 'How far is it from the fire engine at B?', beat: ['b'] } ] },
      base: { textScale: 0.85, town: ['fire', 'engine'], board: 'wide', range: { min: 0, max: 15 } },
      first: { transition: 'leaves', entrance: 'fly' }
    }),

    /* 49 — the two towers: across, then down; six, eight, ten. Both
       towers light up as she names them, and the cable between them is
       drawn as she asks how long it must be. */
    ...walk({
      ids: [49], formula: true,
      a: { x: -2, y: 5 }, b: { x: 4, y: -3 }, c: { x: 4, y: 5 },
      seg: { coordSide: 'under' },
      say: { first: 'There are two towers at A and B.',
             ask: 'How long must a cable be to connect them directly?',
             worked: 'So, the cable needs to be 10\u00A0units long to connect the towers.',
             cues: [ { word: 'towers', in: 'There are two towers at A and B.',
                       townGlow: ['towerA', 'towerB'] } ].concat(namesAB('There are two towers at A and B.'), [
                     { word: 'cable', in: 'How long must a cable be to connect them directly?',
                       guide: true } ]) },
      base: { textScale: 0.85, town: ['towerA', 'towerB'], range: { min: 0, max: 12 } },
      first: { transition: 'leaves', entrance: 'fly' }
    }),

    /* ---- 42-46: the closer cafe.

       The only beat in the game that does not look like maths. Every
       screen before it speaks in A, B, C, legs and units, with the
       triangle already drawn — so the child can DO the formula when
       they are told to. Whether they know what it is FOR is a
       different question, and this is the one that asks it.

       Nothing here says distance, triangle or formula. There is a
       town, a house, two cafes, and a question a person would ask.
       Noticing that it is a distance question is the whole skill; the
       arithmetic after it they already have. That is why the points
       are plotted but not joined, carry no letters, and why the board
       stays quiet until she has been answered.

       42 asks, and a child who gets it is told so and watches Maya
       walk to it — nothing more: no lengths, and nobody saying which
       one is closer, because they have just said it. 43 to 46 are the
       way through for a child who missed, and a child who did not never
       sees them — `rightAt` steps over them, to the park. */
    { id: 42, entrance: 'fly', layout: 'board', transition: 'leaves',
      line: 'Maya wants to walk to the closer café. Which café is closer to her house?',
      /* The house and the two cafes, and nothing else: the school and
         the park have nothing to do with this question. Every place on
         the map has its point and its coordinates. */
      town: ['house', 'cafeA', 'cafeB'], textScale: 0.85,
      /* Plotted, not joined: a line between any two of them would say
         which pair the question is about, which is the question. */
      pointsOnly: true,
      segment: { a: PT(HOUSE), b: PT(CAFE_A), coordSide: 'under' },
      // the third place, plotted the same way and labelled the same way
      mark: [ PT(CAFE_B) ],
      /* She asks, and then the two answers come up under her — the order
         every other question in the game has. (They used to go up first,
         with her arriving after.) No hint under them: the question is the
         whole screen. */
      options: [
        { key: 'a', label: 'Café A', cls: 'cafe-a' },
        { key: 'b', label: 'Café B', cls: 'cafe-b' }
      ],
      optionRow: true,              // side by side, as the two places are
      task: {
        kind: 'choice',
        answer: 'a',
        /* No second go: on a two-answer question the second try is only
           the other button. One miss and the walks work it out. */
        feedback: [],
        voiceOnly: true,
        /* Right, and Maya comes out of her house and walks up the slant
           to Café A, and goes in (Board.mayaWalk) — the screen held until
           the door has shut behind her. */
        walkOnRight: { from: PT(HOUSE), to: PT(CAFE_A) },
        /* Right: past the walks, to the park. */
        rightAt: 55,
        /* Wrong: the two walks, worked the way 29 taught them. */
        teachAt: 43
      } },

    /* One sentence and a breath — a child needs a moment to stop being
       wrong before they can start learning. */
    { id: 43, line: 'Oops! Let’s find it together.',
      entrance: 'stay', layout: 'board', keepSegment: true,
      town: ['house', 'cafeA', 'cafeB'], textScale: 0.85,
      hold: 1500 },

    /* 44 — Maya's house to Café A: the house and Café A at full strength
       and Café B stepped back; named A and B and joined by the dotted
       line as she says it; asked on the reel. Four across and three up:
       5 units, whole — the slant that wants the formula. */
    ...walk({
      ids: [44], formula: true,
      a: PT(HOUSE), b: PT(CAFE_A), c: { x: CAFE_A.x, y: HOUSE.y },
      seg: { coordSide: 'under' },
      say: { first: 'First, find the distance from Maya\u2019s house to Café A.' },
      base: { textScale: 0.85, town: ['house', 'cafeA', 'cafeB'], townFocus: ['house', 'cafeA'],
              mark: [ PT(CAFE_B) ], range: { min: 0, max: 8 } },
      first: { keepSegment: true }
    }),

    /* 45 — and Maya's house to Café B, the same way: the long slant,
       eight across and six down, 10 units, on the reel — twice Café A's
       5. */
    ...walk({
      ids: [45], formula: true,
      a: PT(HOUSE), b: PT(CAFE_B), c: { x: CAFE_B.x, y: HOUSE.y },
      seg: { coordSide: 'under' },
      say: { first: 'Now, find the distance from Maya\u2019s house to Café B.' },
      base: { textScale: 0.85, town: ['house', 'cafeA', 'cafeB'], townFocus: ['house', 'cafeB'],
              mark: [ PT(CAFE_A) ], range: { min: 0, max: 12 } },
      /* No leaf sweep: it follows the last walk's table on the same
         town, so she flies off from under it and back in (flyBack). */
      first: { flyBack: true }
    }),

    /* The comparison, not the winner: both walks on the map with their
       lengths, and the smaller one named. */
    { id: 46, line: 'Which distance is shorter?',
      /* No leaf sweep: she flies off from under the second walk's table
         (or from the answers, answered right on 42), the table folds away
         and the board slides back, the walk's triangle fades — and the
         pair already on the board STAYS: the two places, their points and
         their coordinates, exactly where they were. Its line is drawn
         solid with its length on it, and the other walk is drawn beside
         it (compareWalks). */
      entrance: 'fly', layout: 'board', flyBack: true,
      town: ['house', 'cafeA', 'cafeB'], textScale: 0.85,
      keepSegment: true, dropLegs: true, dropNames: true,
      /* The two walks on the map with their lengths written on them —
         10 units to Cafe B, 5 units to Cafe A — and the same two on the
         cards (below). A wrong card and the two lengths blink on the map,
         with nothing said (blinkOnMiss). (Held back once: then the 5 units
         carried over from 45's table stood alone, and Cafe A's line had
         nothing on it.) */
      compare: [
        { a: PT(HOUSE), b: PT(CAFE_B), coordSide: 'under',
          result: { text: HOUSE_TO(CAFE_B) } },
        { a: PT(HOUSE), b: PT(CAFE_A), coordSide: 'under',
          result: { text: HOUSE_TO(CAFE_A) } }
      ],
      options: [
        { key: 'cafeA', label: 'Café A', dist: HOUSE_TO(CAFE_A), pic: PIC('cafe') },
        { key: 'cafeB', label: 'Café B', dist: HOUSE_TO(CAFE_B), pic: PIC('cafe') }
      ],
      optionRow: true, optionWide: true,     // two cards side by side, the width of the trio
      /* She asks first, then the cards come up — even straight after 42,
         whose answers would otherwise be kept and simply rewritten. */
      askFirst: true,
      /* Wrong: OOPS, and then the two lengths blink on the map. */
      task: { kind: 'choice', answer: 'cafeA', blinkOnMiss: true, voiceOnly: true,
              oopsLine: OOPS,
              /* Right, and Maya comes out of her house and walks along the
                 line to Cafe A, and goes in (Board.mayaWalk). */
              walkOnRight: { from: PT(HOUSE), to: PT(CAFE_A) } } },

    /* ================= what kind of triangle is this park? =========
       The last beat, and the first one where the distance formula is
       not the question but the tool. Three sides, measured, compared,
       and a name put to the shape.

       The triangle is 13-14-15 — the only near-equilateral triangle
       with whole, unequal sides that fits on a lattice this size. That
       is the whole design: it LOOKS equilateral, so a child who answers
       by eye is wrong, and the only way through is to measure. Drawn as
       a pair (A–B) with two legs (B→C, C→A), which is how the board
       already holds three sides: `ab`, `h` and `v`.
       ============================================================== */

    /* 55 — the question: what it is, then what kind — the three sides
       lit as she names the triangle. */
    { id: 55, line: 'The park forms triangle ABC.',
      line2: 'What type of triangle is it?',
      wordCues: [ { word: 'triangle', in: 'The park forms triangle ABC.',
                    pulse: 'triangle', run: 1800 } ],
      transition: 'leaves', entrance: 'fly', layout: 'board',
      board: 'mid', askFirst: true, optionTrio: true,
      quietBoard: true, park: true,
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under' },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under' } },
      legs: [
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C' } },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 } }
      ],
      options: [
        { key: 'scalene',     cls: 'scalene',     label: 'Scalene',     marks: 0 },
        { key: 'isosceles',   cls: 'isosceles',   label: 'Isosceles',   marks: 2 },
        { key: 'equilateral', cls: 'right-angled', label: 'Equilateral', marks: 3 }
      ],
      task: {
        kind: 'choice',
        answer: 'scalene',
        /* Wrong, and the sides are measured: 56 says OOPS and 57-59 do
           the finding. (One rung used to come first: "Have another look
           at the three sides.") */
        feedback: [],
        voiceOnly: true,
        /* Right, and the beats that measure it are stepped over — they
           are for a child who guessed — to the close. */
        rightAt: 62,
        teachAt: 56
      },
      hold: 3000 },

    /* 56 — a beat to stop being wrong in. The cards go, the triangle
       stays exactly where it was. Screens 43 and 50 do the same job for
       the same reason. */
    /* Said as every miss from 41b on is (OOPS). */
    { id: 56, line: OOPS,
      entrance: 'stay', layout: 'board', board: 'mid', keepSegment: true,
      quietBoard: true, park: true,
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under' },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under' } },
      legs: [
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C' }, settled: true },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 }, settled: true }
      ],
      hold: 1500 },

    /* 57, 58, 59 — one shape three times: the side being asked about is
       the loud one, the sides already found keep their lengths and step
       back, and the board fills up in front of them. */
    { id: 57, line: 'What is the length of AB?', focus: 'ab',
      wordCues: [ { word: 'AB', pulse: 'ab', beat: ['a', 'b'], run: 1700 } ],
      entrance: 'stay', layout: 'board', board: 'mid', keepSegment: true,
      quietBoard: true, park: true,
      intro: 'measure', entry: true, range: { min: 0, max: 18 },
      /* A and B's coordinates in parts, so the working can carry their
         numbers out of them. The same words either way. */
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under', coordParts: [ { t: '(' }, { t: '−6', glow: 'x' }, { t: ',\u00A0' }, { t: '−2', glow: 'y' }, { t: ')' } ] },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under', coordParts: [ { t: '(' }, { t: '6', glow: 'x' }, { t: ',\u00A0' }, { t: '−7', glow: 'y' }, { t: ')' } ] } },
      legs: [
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C' }, settled: true },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 }, settled: true }
      ],
      task: { kind: 'entry', answer: 13, noCount: true,
              keepLength: true,
              /* Missed once: OOPS, and she flies off, the board makes room, and the
                 distance formula opens out of its right edge for the child
                 to work — A's and B's numbers carried into it off their
                 coordinates, then the rest theirs, blank by blank. What it
                 comes to flies onto AB and stays there. */
              feedback: [], tableOnMiss: true, oopsLine: OOPS, tableSize: 34,
              formula: distanceTable({ x: -6, y: -2, key: 'a' }, { x: 6, y: -7, key: 'b' }) } },

    /* The one side of this triangle that runs straight up the grid — so
       it is the one a child can COUNT, and counting a side you can count
       is knowing which tool a job needs, not cheating. It is asked as a
       distance rather than as a typed answer for exactly that reason. */
    { id: 58, line: 'Now, what is the length of BC?', focus: 'h',
      entrance: 'none', layout: 'board', board: 'mid', keepSegment: true,
      /* The board stays at full strength here, alone of the seven: this
         is the beat that asks a child to COUNT, and counting squares
         needs the squares. */
      park: true,
      intro: 'measure', distance: true, range: { min: 0, max: 18 },
      hint: 'This one runs straight up. You can count it.',
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under' },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under' },
                 result: { text: '13\u00A0units' } },
      legs: [
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C' }, settled: true },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 }, settled: true }
      ],
      /* Wrong: OOPS, the squares counted up the side, and what they came
         to said (as 8, 13, 14 and 19 do). (It was "Count the squares from
         B up to C." and a second go first.) */
      task: { kind: 'distance', measureLeg: 0, keepLength: true,
              feedback: [],
              countLine: OOPS,
              countedLine: 'So, the distance is 14\u00A0units.' } },

    { id: 59, line: 'One side left! What is the length of CA?', focus: 'v',
      entrance: 'none', layout: 'board', board: 'mid', keepSegment: true,
      quietBoard: true, park: true,
      intro: 'measure', entry: true, range: { min: 0, max: 18 },
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under', coordParts: [ { t: '(' }, { t: '−6', glow: 'x' }, { t: ',\u00A0' }, { t: '−2', glow: 'y' }, { t: ')' } ] },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under', coordParts: [ { t: '(' }, { t: '6', glow: 'x' }, { t: ',\u00A0' }, { t: '−7', glow: 'y' }, { t: ')' } ] },
                 result: { text: '13\u00A0units' } },
      legs: [
        /* C's coordinates in parts as well: the working lifts its 6 and
           its 7 out of them. */
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C', coordParts: [ { t: '(' }, { t: '6', glow: 'x' }, { t: ',\u00A0' }, { t: '7', glow: 'y' }, { t: ')' } ] },
          settled: true, length: true },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 }, settled: true }
      ],
      task: { kind: 'entry', measureLeg: 1, answer: 15, noCount: true,
              keepLength: true,
              /* Nothing said: the length goes onto CA, and the question
                 comes straight back. */
              /* As 57: missed once, the distance formula for the child to
                 work, read from C to A — C's numbers out of the corner's
                 own coordinates. It comes to 15, which flies onto CA. */
              feedback: [], tableOnMiss: true, oopsLine: OOPS, tableSize: 34,
              formula: distanceTable({ x: 6, y: 7, key: 'c' }, { x: -6, y: -2, key: 'a' }) } },

    /* 61 — and back to the question they opened. Same three cards, same
       triangle, three lengths on the board now. The loop a child opened
       by getting it wrong is closed by them getting it right. */
    { id: 61, line: 'So, what type of triangle is it?',
      entrance: 'stay', layout: 'board', board: 'mid', keepSegment: true,
      askFirst: true, optionTrio: true, quietBoard: true, park: true,
      /* No hint under the cards: the three lengths are on the board,
         and the three cards are the whole question — as on 55. */
      segment: { a: { x: -6, y: -2, name: 'A', coordSide: 'under' },
                 b: { x:  6, y: -7, name: 'B', coordSide: 'under' },
                 result: { text: '13\u00A0units' } },
      legs: [
        { from: { x:  6, y: -7 }, to: { x: 6, y: 7 }, mark: { name: 'C' }, settled: true, length: true },
        { from: { x:  6, y:  7 }, to: { x: -6, y: -2 }, settled: true, length: true }
      ],
      options: [
        { key: 'scalene',     cls: 'scalene',     label: 'Scalene',     marks: 0 },
        { key: 'isosceles',   cls: 'isosceles',   label: 'Isosceles',   marks: 2 },
        { key: 'equilateral', cls: 'right-angled', label: 'Equilateral', marks: 3 }
      ],
      task: {
        kind: 'choice',
        answer: 'scalene',
        /* No second go: a wrong name, OOPS, and she gives the right one,
           and why — and the card says so too (Opts.reveal). */
        feedback: [],
        voiceOnly: true,
        oopsLine: OOPS,
        spentLine: 'All three sides have different lengths. So, it\u2019s a scalene triangle!'
      },
      hold: 6000 },

    /* 62 — the close. The board goes as she flies off it (flyBack), and
       she comes back in to the middle of an empty field for three lines,
       one at a time — back to the story the lesson began with. */
    { id: 62, entrance: 'fly', flyBack: true,
      lines: [ 'You\u2019re all set!',
               'Now you know how to find the distance between any two points.',
               'Let\u2019s head back and bridge that gap!' ] }
  ];

  return {
    VERSION, stamp: stamped, STAGE_W, STAGE_H, ART, AUDIO_EXT, SHEETS, SHEET_W, SHEET_H,
    SWIFTY, CHAR_SCALE, ANCHOR, HEAD_TOP, FEET_DY, SHADOW, CLOUD,
    GRID, STAND, BOARD, XAXIS, YAXIS, TOWN,
    BUBBLE, PEEK, PRAISE, PRAISE_AT, OOPS, PLAY, START, AUDIO, AUTO, NAV, MOTION, SCRIPT
  };
})();
