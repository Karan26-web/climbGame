/* =============================================================
   Distance Formula — screen flow
   ============================================================= */
(function () {
  'use strict';
  const C = window.CFG, SFX = window.Audio8, FX = window.FX;

  /* ---------------- element handles ---------------- */
  const el = {};
  ['viewport', 'stage', 'loadBar', 'loadFill', 'loadPct', 'loadVer',
   'startScreen', 'playBtn', 'playImg', 'scene', 'skyLayer',
   'shadow', 'birdRig', 'birdWin', 'flySheet', 'talkSheet',
   'bubble', 'bubbleBody',
   'bubbleLine', 'nav', 'nextBtn', 'backBtn', 'goOn', 'charGroup',
   'gridPanel', 'gridImg', 'gridAxes', 'standSwifty',
   'leafLayer', 'fxLayer', 'sceneArt', 'startArt',
   'startBird', 'startBirdWin', 'startFly', 'startTalk', 'startShadow', 'startSky'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  /* Every number the board writes, with a real MINUS SIGN in front of
     it rather than a hyphen.

     `String(-6)` gives "-6", and the hyphen-minus is a word-joining
     dash: short, sitting low, and cut to the width of a letter. Beside
     a 32px numeral it reads as a speck of dirt rather than as part of
     the number, which is what made the negative numbering look wrong
     along the bottom of the board. U+2212 is the arithmetic sign — the
     width of a digit, on the same line as the bar of a plus, which is
     what the eye is looking for. The subtraction the board writes
     already uses it; this brings the numbers themselves into line. */
  const numText = function (v) { return String(v).replace('-', '\u2212'); };

  /* A line wound back out of sight, ready to draw itself on, without
     the dots a round cap leaves behind. Wound back the plain way — a
     dash as long as the line, offset by the same — every end sits on a
     zero-length dash, and a round cap paints a dot there: the pair's
     undrawn line left a navy dot beside each of its points. So the gap
     is longer than the line by two cap widths and the line sits in the
     middle of it, clear of both caps. Drawn, the offset is 0 as before. */
  /* A side or a pair's line — a line that meets points — is also given
     a round head for the draw (`inking`). At rest its ends are square,
     set to meet the points' rings (Board.meetPoint), but a square head
     crossing the paper reads as a cut rather than a pen; commitDraw
     takes `inking` off as the draw ends, when both round ends are under
     points, so the change shows nowhere. */
  function windBack(line, len, drawn) {
    const w = Math.max(+line.getAttribute('stroke-width') || 0, 10) + 4;
    line.setAttribute('stroke-dasharray', len + ' ' + (len + 2 * w));
    line.style.strokeDashoffset = drawn ? 0 : (len + w);
    if (line.classList.contains('legline') || line.classList.contains('segline')) {
      line.classList.toggle('inking', !drawn);
    }
  }

  /* Whether a row of a table carries anything in off the triangle — a
     part that says where on the drawing it was read from. */
  const carries = function (line) {
    return !!line && (line.parts || []).some(function (p) { return !!p.from; });
  };

  /* The version stamp (see VERSION in config.js) as a date a person
     reads — "Version 24 Sep 2026, 23:41" — for the loading screen and
     the picker, so two laptops can be compared at a glance. */
  const versionText = function () {
    const V = C.VERSION || '';
    if (V.length < 12) return '';
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return 'Version ' + (+V.slice(6, 8)) + ' ' + MON[+V.slice(4, 6) - 1] + ' ' +
      V.slice(0, 4) + ', ' + V.slice(8, 10) + ':' + V.slice(10, 12);
  };

  /* ---------------- responsive stage ---------------- */
  /* The whole responsive system, in one function.

     The game is authored at one size and scaled as a single object, so
     every screen gets the same layout rather than a layout of its own:
     nothing reflows, nothing is repositioned per device, and the only
     thing that changes between a 1366 laptop and a 2560 desktop is the
     number below. `min` of the two ratios is what keeps it honest —
     one scale for both axes, so the aspect is preserved and a screen
     that is not 16:9 gets bars rather than a stretched picture.

     It measures #viewport, not the window. Those are usually the same
     number and sometimes not, and every time they differ the window is
     the wrong one:

       - `innerWidth` includes the classic scrollbar gutter, so a
         stylesheet that failed to load, or any future overflow, makes
         the stage ~15px wider than the room it has and clips it;
       - on a tablet or phone with a collapsing URL bar, the window can
         still be reporting the old height at the moment `resize` fires,
         while the fixed box has already been re-laid-out;
       - and a container can change size with no window event at all —
         fullscreen, devtools docking, split view or Stage Manager on an
         iPad, or the page running inside an iframe that resizes.

     #viewport is `position: fixed; inset: 0`, so its box IS the room
     available, whatever caused it to change. Measuring the thing we
     have to fit into, and watching that same thing, answers all four. */

  /* The design space, published to CSS once, so a stylesheet that needs
     to know how much room the whole frame has can ask for it instead of
     reaching for `vw`. The config is where the size is decided; the
     stylesheet's own :root values are the fallback that keeps the first
     paint right before this runs. Written once rather than on every fit
     because a custom property on :root invalidates everything that
     reads it, and these two never change. */
  function declareStage() {
    const r = document.documentElement.style;
    r.setProperty('--stage-w', C.STAGE_W + 'px');
    r.setProperty('--stage-h', C.STAGE_H + 'px');
  }

  let lastK = null;
  function fitStage() {
    const box = el.viewport.getBoundingClientRect();
    const doc = document.documentElement;
    const w = box.width  || doc.clientWidth  || window.innerWidth;
    const h = box.height || doc.clientHeight || window.innerHeight;
    const s = Math.min(w / C.STAGE_W, h / C.STAGE_H);
    /* Nothing useful to do with a box that has no size yet — a hidden
       tab, or a fit that beat the first layout. Leaving lastK alone
       means the next real measurement is not mistaken for a repeat. */
    if (!(s > 0) || !isFinite(s)) return;
    if (s === lastK) return;              // a drag that has not moved a pixel
    lastK = s;
    el.stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }

  /* Resizing a window fires `resize` for every pixel of the drag, and
     each one of those would be a synchronous measure-and-write. One per
     frame is all a transform can show. */
  let fitPending = 0;
  function scheduleFit() {
    if (fitPending) return;
    fitPending = requestAnimationFrame(function () { fitPending = 0; fitStage(); });
  }

  window.addEventListener('resize', scheduleFit);
  /* iOS reports the old size for a moment after this fires, so it is a
     trigger rather than the measurement; the observer below catches the
     box actually changing. */
  window.addEventListener('orientationchange', scheduleFit);
  /* Pinch-zoom and the mobile URL bar move the visual viewport without
     always moving the layout one. Harmless when nothing really changed:
     the measurement still comes from #viewport, so a zoom re-measures
     the same box, finds the same scale and writes nothing — the game
     zooms with the page instead of fighting it. */
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleFit);
  }
  /* The one that catches everything else — fullscreen, devtools, split
     view, an iframe resizing — because it watches the box instead of
     waiting to be told the window moved. */
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleFit).observe(el.viewport);
  }

  /* ---------------- sprite player ---------------- */
  /* Built per rig rather than as a singleton: the title screen runs its
     own Swifty, at its own size, on elements of its own — the game's rig
     lives inside #scene, which is still hidden while that plays. */
  function makeSprite() {
   return {
    sheet: 'talk', frame: 0, playing: false, acc: 0, last: 0, loop: true,
    scale: 1,
    win: null,
    img: {},

    /* Any number of sheets, each with its own image, its own pixel
       size and its own scale factor. It was exactly two of one size
       once; both of hers are that size again, and the generality is
       kept because it costs nothing and a sheet that states its own
       dimensions is the honest way round. */
    setup: function (win, imgs, scale) {
      this.win = win;
      this.img = imgs || {};
      this.setScale(scale);
    },

    /* Screens draw her at different sizes — small in the field, full
       size beside the board — so the sheet is rescaled per screen. */
    setScale: function (S) {
      this.scale = S;
      const self = this;
      Object.keys(this.img).forEach(function (name) {
        const im = self.img[name], sh = C.SHEETS[name];
        if (!im || !sh) return;
        im.style.width = (sh.sw || C.SHEET_W) * S * (sh.k || 1) + 'px';
        im.style.height = (sh.sh || C.SHEET_H) * S * (sh.k || 1) + 'px';
      });
      this.show(this.sheet, this.frame);
    },

    /* Seats one pose so its belly anchor lands on the rig origin.
       Every pose has its own opaque bounds and its own anchor, so
       all six numbers are recomputed per frame. */
    show: function (sheet, i) {
      const spec = C.SHEETS[sheet];
      const im = this.img[sheet];
      if (!spec || !im) return;                 // a rig without this sheet
      const S = this.scale * (spec.k || 1);
      const f = spec.frames[i];
      this.sheet = sheet; this.frame = i;

      this.win.style.left = -(f.ax - f.x) * S + 'px';
      this.win.style.top = -(f.ay - f.y) * S + 'px';
      this.win.style.width = f.w * S + 'px';
      this.win.style.height = f.h * S + 'px';

      im.style.left = -f.x * S + 'px';
      im.style.top = -f.y * S + 'px';
      im.style.visibility = 'visible';
      const self = this;
      Object.keys(this.img).forEach(function (n) {
        if (n !== sheet && self.img[n]) self.img[n].style.visibility = 'hidden';
      });
    },

    play: function (sheet, loop) {
      this.sheet = sheet;
      this.loop = loop !== false;
      this.playing = true;
      this.acc = 0;
      this.show(sheet, 0);
    },

    stopAt: function (sheet, i) {
      this.playing = false;
      this.show(sheet, i || 0);
    },

    tick: function (dt) {
      if (!this.playing) return;
      const def = C.SHEETS[this.sheet];
      this.acc += dt;
      const step = 1000 / def.fps;
      while (this.acc >= step) {
        this.acc -= step;
        let n = this.frame + 1;
        if (n >= def.frames.length) {
          if (!this.loop) { this.playing = false; n = def.frames.length - 1; }
          else n = 0;
        }
        this.show(this.sheet, n);
      }
    }
   };
  }
  const Sprite = makeSprite();        // the game's rig, inside #scene
  const StartSprite = makeSprite();   // the title screen's, bigger

  let lastT = 0;
  function loop(t) {
    /* A long frame is caught up, not dropped: clamped at 60ms, a laptop
       that managed ten frames a second played her wings and beak at
       60% speed against a flight and a voice that do not slow down.
       The cap only stops a tab that was hidden for a minute from
       spinning through a minute of frames. */
    const dt = lastT ? Math.min(t - lastT, 250) : 16;
    lastT = t;
    Sprite.tick(dt);
    StartSprite.tick(dt);
    requestAnimationFrame(loop);
  }

  /* ---------------- layout of positioned art ---------------- */
  const REF_W = C.SHEETS.talk.frames[0].w;
  /* One control answers every screen that has a number for an answer —
     the distance questions and the two worked-out ones alike. It
     replaced a slider and a typed keypad that did the same job in two
     different shapes. */
  let Sel  = null;              // the combination reel: every number is given on it
  let Opts = null;              // the triangle-type answer panel
  let Table = null;             // the formula table, out of the board's edge
  let Jump = null;              // the screen picker beside Next
  let Hints = null;             // the "Need a hint?" row inside it
  let Town = null;              // the closing beat's map, drawn over the board

  /* Where the character, her shadow and her bubble sit on a given
     screen. Screens 1-4 use the small field pose; screen 5 puts her
     full size on the left of the board in the standing artwork. */
  /* The x-axis and y-axis cases are the same screen with the axes
     swapped, so they share a code path and differ only in config. */
  function axisOf(entry) {
    if (entry.layout === 'xaxis') return C.XAXIS;
    if (entry.layout === 'yaxis') return C.YAXIS;
    return null;
  }

  /* The places a screen's town puts on the map: `town: true` is every
     one, a list names the ones the screen is about. */
  function townPlaces(entry) {
    const keys = Array.isArray(entry.town) ? entry.town : null;
    return (C.TOWN.places || []).filter(function (p) {
      return !keys || keys.indexOf(p.key) >= 0;
    });
  }

  /* Her rig for a given standing spot. Two screens' worth of geometry
     used to be written out twice; they differ only in where she is. */
  function standGeom(S, extra) {
    const g = {
      stand: true,
      scale: S.charScale,
      standBox: { x: S.pos.x, y: S.pos.y, w: S.w, h: S.h },
      anchor: { x: S.pos.x + S.belly.x,   y: S.pos.y + S.belly.y },
      aim:    { x: S.pos.x + S.headTop.x, y: S.pos.y + S.headTop.y },
      feetY:  S.pos.y + S.feet.y,
      feetCx: S.pos.x + S.feet.cx,
      inkW:   S.inkW,
      bubble: C.GRID.bubbleDown,
      bubbleScale: 1,
      // the room her balloon keeps inside (her column, beside the board)
      room:   S.room || null
    };
    if (extra) Object.keys(extra).forEach(function (k) { g[k] = extra[k]; });
    return g;
  }

  function geomFor(i) {
    const entry = C.SCRIPT[i] || {};
    const AX = axisOf(entry);
    if (AX) {
      /* Board top right, the working under it, and her in her own
         column saying what the case is — the same rig as every other
         screen she speaks on. */
      return standGeom(C.BOARD.stand, {
        panelBox: { x: AX.grid.x, y: AX.grid.y, w: AX.grid.w, h: AX.grid.h }
      });
    }
    if (entry.keepTable) {
      /* Back under the table the screen before wrote, the board where
         that table pushed it. */
      return standGeom(C.BOARD.tableStand, { panelBox: C.GRID.table.board });
    }
    /* A distance question has her on screen after all: she flies in to
       put it, then leaves before the controls arrive. She lands at the
       bottom left, in front of the centred board. */
    if (entry.intro === 'measure') {
      /* The same rig the grid screens use — she lands on the grass at
         the left and the board sits right. She stays down here to ask;
         if a control turns up it moves her out of its way. */
      return standGeom(C.BOARD.stand, {
        panelBox: { x: C.BOARD.panel.pos.x, y: C.BOARD.panel.pos.y,
                    w: C.BOARD.panel.w, h: C.BOARD.panel.h }
      });
    }
    if (entry.layout === 'board') {
      /* The same rig as a distance screen: she stands in her column and
         speaks from her own bubble. */
      return standGeom(C.BOARD.stand, {
        panelBox: { x: C.BOARD.panel.pos.x, y: C.BOARD.panel.pos.y,
                    w: C.BOARD.panel.w, h: C.BOARD.panel.h }
      });
    }
    if (entry.layout === 'grid') {
      const S = C.STAND;
      return {
        stand: true,
        // matches the flying sheet to the landed artwork's height
        scale: S.charScale,
        standBox: { x: S.pos.x, y: S.pos.y, w: S.w, h: S.h },
        anchor: { x: S.pos.x + S.belly.x,   y: S.pos.y + S.belly.y },
        // she is under her line here, so the tail comes down on her crown
        aim:    { x: S.pos.x + S.headTop.x, y: S.pos.y + S.headTop.y },
        feetY:  S.pos.y + S.feet.y,
        feetCx: S.pos.x + S.feet.cx,
        inkW:   S.inkW,
        /* Its own wide bubble, at full size: the screens' own
           bubbleScale was tuning the tall one down to fit beside the
           board, and there is no board beside her any more. */
        bubble: C.GRID.bubbleDown,
        bubbleScale: 1,
        room: S.room || null
      };
    }
    return {
      stand: false,
      scale: C.CHAR_SCALE,
      anchor: C.ANCHOR,
      aim:    { x: C.ANCHOR.x + C.HEAD_TOP.dx, y: C.ANCHOR.y + C.HEAD_TOP.dy },
      /* And where a corner-tailed balloon points instead: her cheek,
         out at the right of her head rather than on top of it. */
      aimSide: {
        x: C.ANCHOR.x + REF_W * C.CHAR_SCALE * C.BUBBLE.aimSide.dx,
        y: (C.ANCHOR.y + C.HEAD_TOP.dy) +
           (C.FEET_DY - C.HEAD_TOP.dy) * C.BUBBLE.aimSide.dy
      },
      feetY:  C.ANCHOR.y + C.FEET_DY,
      feetCx: C.SWIFTY.cx,
      inkW:   REF_W * C.CHAR_SCALE,
      bubble: C.BUBBLE,
      bubbleScale: 1
    };
  }

  /* Seats the rig, shadow and bubble for one screen's geometry. */
  function applyGeom(g) {
    Sprite.setScale(g.scale);
    el.birdRig.style.left = g.anchor.x + 'px';
    el.birdRig.style.top = g.anchor.y + 'px';

    /* She stands on a different board's rail depending on the screen,
       so the resting artwork is seated here rather than once at boot. */
    if (g.standBox) {
      el.standSwifty.style.left = g.standBox.x + 'px';
      el.standSwifty.style.top = g.standBox.y + 'px';
      el.standSwifty.style.width = g.standBox.w + 'px';
      el.standSwifty.style.height = g.standBox.h + 'px';
    }

    /* The shadow is a soft ellipse on the ground. On the grid screens
       she is up on the board's frame, and a ground shadow on a 28px rail
       reads as her hovering over a surface that is not there. */
    el.shadow.classList.toggle('gone', !!g.noShadow);
    const SH = C.SHADOW;
    const shW = g.inkW * SH.widthRatio;
    const shH = shW * SH.heightRatio;
    el.shadow.style.left = (g.feetCx - shW / 2) + 'px';
    el.shadow.style.top = (g.feetY + SH.dy - shH / 2) + 'px';
    el.shadow.style.width = shW + 'px';
    el.shadow.style.height = shH + 'px';

    /* Speech bubble: the tail tip is driven onto the top of her head
       (sinking `biteIntoHead` px into it) so the two touch instead of
       the bubble floating above.

       A balloon already on screen keeps the shape it is holding. Re-
       seating it at the shape's default first made every screen change
       flash the full-width box for a few frames before the line it was
       about to say shrank it again. */
    seatBubble(g,
      Bubble.up ? Bubble.boxW : null,
      Bubble.up ? Bubble.boxH : null);
  }

  /* Seats the speech balloon for one screen. Split out of applyGeom so a
     line can re-seat it at the height measured from its text.

     The balloon is css/speech-bubble.css; this only says where it goes
     and how big it is. The tail's point is driven onto her — her crown,
     or her cheek on the open field — sinking `biteIntoHead` into it. The
     point sits near the balloon's left end, where the CSS draws it, and
     where the room she is standing in would push the balloon past its
     edge (her column beside the board) the balloon moves back inside and
     the point slides along its underside to stay on her. */
  function seatBubble(g, wOverride, bodyHOverride) {
    const B = g.bubble || C.BUBBLE;
    const aim = (B.tailSide === 'left' && g.aimSide) || g.aim;
    const W = wOverride != null ? wOverride : B.minW;
    const H = bodyHOverride != null ? bodyHOverride : B.lineH + 2 * (B.pad.y + B.edge);
    const T = B.tailLen;
    const tip = { x: aim.x, y: aim.y + B.biteIntoHead };
    const room = g.room || { left: 24, right: C.STAGE_W - 24 };
    let left = Math.max(room.left, Math.min(room.right - W, tip.x - B.tip.x));
    const tx = Math.max(B.tailMin, Math.min(W - B.tailRight, tip.x - left));
    left = tip.x - tx;

    const bs = el.bubble.style;
    bs.left = left + 'px';
    bs.top = (tip.y - H - T) + 'px';
    bs.width = W + 'px';
    bs.height = (H + T) + 'px';
    // it arrives out of its own point, where the rig has put it
    bs.transformOrigin = tx + 'px ' + (H + T) + 'px';
    el.bubbleBody.style.height = H + 'px';
    el.bubbleBody.style.setProperty('--bubble-tail-x', tx + 'px');
  }

  function layout() {
    applyGeom(geomFor(0));

    /* Screen 5 art sits at fixed 1:1 positions from the brief. */
    Board.place(C.GRID.box);

    /* It mounts itself and owns its own markup and styles; the game
       only decides where, when, and what range it counts over. */
    if (window.NumberSelector && !Sel) {
      const SP = C.BOARD.selector;
      Sel = window.NumberSelector.mount(el.scene,
        { x: SP.pos.x, y: SP.pos.y, scale: SP.scale, hidden: true });
    }
    /* The formula table. Inserted just before the board so it sits
       UNDER it, its left edge tucked behind the board's right one, and
       coloured with the same three the working and the panel use. */
    if (window.FormulaTable && !Table) {
      Table = window.FormulaTable.mount(el.scene, { before: el.gridPanel });
      Table.setColours({ h: C.GRID.leg.hColor, v: C.GRID.leg.vColor, ab: '#1F6FD0' });
    }
    if (window.TriangleOptions && !Opts) {
      const OP = C.BOARD.options;
      // scaled to her column, the same way the number selector is
      Opts = window.TriangleOptions.mount(el.scene,
        { x: OP.pos.x, y: OP.pos.y, scale: OP.scale, hidden: true });
      /* The hint lives inside the answers, so it takes their scale and
         their column without needing to know where either is. */
      if (window.HintNote) Hints = window.HintNote.mount(Opts.el);
    }

    /* A way around the lesson, beside the way on: which screen you are
       on, and every screen you could be on instead. It goes through
       goTo, so a jump is the ordinary screen change Back and Next make.
       Switched off in one place — `CFG.NAV.jump` — for a build that
       should not carry it. */
    if (window.ScreenJump && !Jump && (!C.NAV || C.NAV.jump !== false)) {
      Jump = window.ScreenJump.mount(el.nav, {
        screens: function () { return C.SCRIPT; },
        current: function () { return Game.index; },
        go: function (i) { Game.jumpTo(i); },
        version: versionText
      });
      Jump.sync();
    }

    /* The town is drawn over the board, so it goes in the panel and
       follows every re-place the board makes. */
    if (window.TownMap && !Town) {
      Town = window.TownMap.mount(el.gridPanel);
      Board.onPlaced = function () {
        const cell = Board.cellSize();
        Town.place(function (gx, gy) {
          const G = C.GRID, b = Board.box || G.box;
          /* Inside the panel, so the panel's own corner is the origin
             — stagePos answers in stage coordinates and this layer is
             not on the stage. */
          return { x: (G.originX + gx * G.stepX) * (b.w / G.w),
                   y: (G.originY - gy * G.stepY) * (b.h / G.h) };
        }, cell.w, cell.h);

        /* And what the town now covers, in board units, so the label
           placer can keep clear of it the way it keeps clear of the
           axis numbers. The panel is stretched to its box, so the two
           axes scale by different amounts and each has to be undone
           with its own. */
        const G = C.GRID, b = Board.box || G.box;
        const kx = (b.w / G.w) || 1, ky = (b.h / G.h) || 1;
        Board.townInk = (Town.boxes() || []).map(function (o) {
          return { l: o.l / kx, t: o.t / ky, r: o.r / kx, b: o.b / ky,
                   what: o.what };
        });
      };
    }

    /* The standing pose is seated per screen now, in applyGeom — the
       grid screens and the distance screens put her on different
       boards' rails. */

    /* Play button: the glowing disc is fitted into the briefed box. */
    const P = C.PLAY;
    const k = P.sizeScale || 1;
    const ps = Math.min((P.box.w * k) / P.ink.w, (P.box.h * k) / P.ink.h);
    const dw = P.ink.w * ps, dh = P.ink.h * ps;
    el.playBtn.style.left = (P.box.cx - dw / 2) + 'px';
    el.playBtn.style.top = (P.box.cy - dh / 2) + 'px';
    // the loading bar stands exactly where Play will pop up
    el.loadBar.style.left = P.box.cx + 'px';
    el.loadBar.style.top = P.box.cy + 'px';
    el.playBtn.style.width = dw + 'px';
    el.playBtn.style.height = dh + 'px';
    el.playImg.style.width = P.srcW * ps + 'px';
    el.playImg.style.height = P.srcH * ps + 'px';
    el.playImg.style.left = -P.ink.x * ps + 'px';
    el.playImg.style.top = -P.ink.y * ps + 'px';
  }

  /* True while a screen shows the standing artwork instead of the
     animated sheet. She must not flip to the talking sheet to speak
     on those screens. */
  let standPose = false;

  /* Her beak, wherever she is standing.

     The board screens settle her into a single standing painting the
     moment she lands, which is right for standing still and wrong
     while she is talking — on some of those boards she says three or
     four sentences without so much as a blink. The talking sheet was
     there the whole time and simply switched off by `standPose`.

     The swap is the landing's own, run backwards: `onEnd` hides the
     rig and shows the painting because the two are drawn at the same
     size in the same place, and that is exactly what lets the rig take
     the line back off it and hand it over again when she stops. */
  /* A dotted pattern stretched to fit its line exactly: a dot at each
     end and the rest evenly between. Left to itself a pattern stops
     wherever it runs out, so a dotted line began at one point and gave
     up short of the other. `len` is in the pattern's own units. */
  function evenDots(pattern, len) {
    const p = String(pattern).split(/[ ,]+/).map(Number);
    const dash = p[0] || 1, gap = p[1] || 14, period = dash + gap;
    const n = Math.max(1, Math.round((len - dash) / period));
    return dash + ' ' + Math.max(0, (len - dash) / n - dash);
  }

  /* A line's two ends, each moved in along it by its own amount —
     never past the middle, so a side too short to clear both of its
     points keeps a sliver rather than turning inside out. */
  function inset(x1, y1, x2, y2, t1, t2) {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    t1 = Math.min(t1, len / 2 - 1); t2 = Math.min(t2, len / 2 - 1);
    return [x1 + ux * t1, y1 + uy * t1, x2 - ux * t2, y2 - uy * t2];
  }

  function mouthOpen() {
    // over the panel, it is the head there that talks
    if (Peek.up) { Peek.talk(true); return; }
    if (standPose) {
      el.standSwifty.classList.add('hidden');
      el.birdWin.classList.remove('hidden');
    }
    Sprite.play('talk', true);
  }
  function mouthShut() {
    if (Peek.up) { Peek.talk(false); return; }
    Sprite.stopAt('talk', 0);
    if (!standPose) return;
    el.birdWin.classList.add('hidden');
    el.standSwifty.classList.remove('hidden');
  }

  /* A box on the page, in stage pixels. */
  function stageBox(node) {
    const st = el.stage.getBoundingClientRect(), k = st.width / C.STAGE_W || 1;
    const r = node.getBoundingClientRect();
    return { l: (r.left - st.left) / k, t: (r.top - st.top) / k,
             r: (r.right - st.left) / k, b: (r.bottom - st.top) / k };
  }

  /* ---------------- Swifty over the panel ----------------
     37, 39 and 41 end with her coming up from behind the panel the
     formula is written on, her hands on its top edge, to say what it
     gives (CFG.PEEK). A strip of six frames rather than her rig: she is
     a head and two hands here, and the rest of her is behind the panel.

     She is seen through a window that ends at the panel's edge, so as
     she rises the panel hides everything of her below it — she comes up
     from BEHIND it. Once she is up the window drops by the length of her
     fingers, and her hands come over the edge and hold it. */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const Peek = {
    up: false, win: null, bird: null, joy: null,
    frame: 0, beat: 0, talkT: null, timers: [], anim: null,
    k: 1, fw: 0, fh: 0, pad: 70, at: null,

    build: function () {
      if (this.win) return;
      const w = document.createElement('div');
      w.id = 'peek';
      w.className = 'hidden';
      w.setAttribute('aria-hidden', 'true');
      const bird = document.createElement('div');
      bird.className = 'peek-bird';
      /* The little lines either side of her head as she arrives, as the
         picture she was drawn from has them: three on each side,
         drawn out and gone again. */
      const joy = document.createElementNS(SVGNS, 'svg');
      joy.setAttribute('class', 'peek-joy');
      [[-1, 1], [1, -1]].forEach(function (side) {
        [[-0.98, -0.2], [-0.78, -0.62], [-0.36, -0.93]].forEach(function (d, n) {
          const ln = document.createElementNS(SVGNS, 'line');
          ln.setAttribute('data-side', side[0] < 0 ? 'l' : 'r');
          ln.setAttribute('data-dx', String(d[0] * side[0] * -1));
          ln.setAttribute('data-dy', String(d[1]));
          ln.style.animationDelay = (n * 70) + 'ms, ' + (1250 + n * 70) + 'ms';
          joy.appendChild(ln);
        });
      });
      w.appendChild(bird);
      w.appendChild(joy);
      el.scene.insertBefore(w, el.charGroup);
      this.win = w; this.bird = bird; this.joy = joy;
    },

    show: function (i) {
      this.frame = i;
      if (this.bird) this.bird.style.backgroundPosition = (-i * this.fw) + 'px 0';
    },

    later: function (fn, ms) { this.timers.push(setTimeout(fn, ms)); },

    /* Up from behind the panel. `at` is where: her middle (x) and the
       panel's top edge (y), in stage pixels. `done` once her hands are
       on it. */
    rise: function (at, done) {
      const P = C.PEEK, self = this;
      this.build();
      this.leave(true);
      const k = this.k = P.size / P.w;
      const fw = this.fw = P.w * k, fh = this.fh = P.h * k, pad = this.pad;
      const body = P.body * k, grip = (P.hands - P.body) * k;
      /* The window: from well over her crest to the ends of her fingers,
         a hand's width clear either side for the little lines. Its foot
         is cut back to the edge until her hands come over it. The flat
         foot of her body sits a pixel into the edge, so no sky shows
         between her and it. */
      const top = at.y + 1 - body - pad;
      const ws = this.win.style;
      ws.left = (at.x - fw / 2 - pad) + 'px';
      ws.top = top + 'px';
      ws.width = (fw + 2 * pad) + 'px';
      ws.height = (pad + body + grip + 3) + 'px';
      ws.setProperty('--grip', (grip + 2) + 'px');
      const bs = this.bird.style;
      bs.left = pad + 'px'; bs.top = pad + 'px';
      bs.width = fw + 'px'; bs.height = fh + 'px';
      bs.backgroundImage = 'url("' + C.ART.swiftyPeek + '")';
      bs.backgroundSize = (fw * P.frames) + 'px ' + fh + 'px';
      this.show(0);
      /* The little lines, round her head at the height of her brow. */
      const js = this.joy;
      js.setAttribute('width', String(fw + 2 * pad));
      js.setAttribute('height', String(pad + body));
      [].forEach.call(js.childNodes, function (ln) {
        const l = ln.getAttribute('data-side') === 'l';
        const ox = pad + (l ? 0.07 : 0.93) * fw, oy = pad + 0.3 * fh;
        const dx = +ln.getAttribute('data-dx'), dy = +ln.getAttribute('data-dy');
        const r0 = 0.05 * fw, r1 = 0.14 * fw;
        ln.setAttribute('x1', (ox + dx * r0).toFixed(1)); ln.setAttribute('y1', (oy + dy * r0).toFixed(1));
        ln.setAttribute('x2', (ox + dx * r1).toFixed(1)); ln.setAttribute('y2', (oy + dy * r1).toFixed(1));
        ln.style.strokeWidth = (0.022 * fw).toFixed(1) + 'px';
      });
      this.at = { x: at.x, y: at.y, top: top };
      this.win.classList.remove('hidden', 'gripped', 'cheer');
      this.up = true;
      this.anim = this.bird.animate(
        [{ transform: 'translateY(' + (body + 6) + 'px)' }, { transform: 'translateY(0)' }],
        { duration: P.riseMs, easing: 'cubic-bezier(.18, .82, .26, 1)', fill: 'backwards' });
      SFX.whoosh && SFX.whoosh();
      this.later(function () {
        self.win.classList.add('gripped', 'cheer');
        self.bird.animate(
          [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.025, .955)', offset: 0.45 },
           { transform: 'scale(1, 1)' }],
          { duration: P.gripMs + 160, easing: 'ease-out' });
        SFX.pop && SFX.pop();
        self.later(function () { if (done) done(); }, P.gripMs + 120);
      }, P.riseMs);
    },

    /* Her beak while she talks: the open frames in turn, then shut. */
    talk: function (on) {
      const P = C.PEEK, self = this;
      clearInterval(this.talkT); this.talkT = null;
      if (!on) { this.show(0); return; }
      this.beat = 0;
      this.show(P.talk[0]);
      this.talkT = setInterval(function () {
        self.beat = (self.beat + 1) % P.talk.length;
        self.show(P.talk[self.beat]);
      }, 1000 / P.fps);
    },

    /* Down behind the panel again, when the screen goes — or at once. */
    leave: function (now) {
      this.timers.forEach(clearTimeout); this.timers = [];
      clearInterval(this.talkT); this.talkT = null;
      if (this.anim) { this.anim.cancel(); this.anim = null; }
      if (!this.win || !this.up) return;
      this.up = false;
      const w = this.win, bird = this.bird;
      if (now) { w.classList.add('hidden'); return; }
      w.classList.remove('gripped', 'cheer');
      this.show(0);
      const body = C.PEEK.body * this.k;
      bird.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (body + 6) + 'px)' }],
                   { duration: 300, easing: 'cubic-bezier(.5, 0, .75, .4)', fill: 'forwards' })
        .onfinish = function () { if (!Peek.up) w.classList.add('hidden'); this.cancel(); };
    },

    /* Her balloon over her head, its point on her crown: the screen's
       geometry, pointed at her, kept to the room right of the board. */
    geom: function (base, room) {
      const P = C.PEEK, k = this.k, a = this.at || { x: 0, y: 0 };
      const left = a.x - this.fw / 2, top = a.y + 1 - P.body * k;
      return Object.assign({}, base || {}, {
        stand: false,
        aim: { x: left + P.crown.x * k, y: top + P.crown.y * k },
        bubble: P.bubble,
        room: room
      });
    }
  };

  /* The Next that comes up in the corner once she has said what the
     formula gives (37, 39, 41): the way on, pulsing, for the child to
     take when they are ready. */
  const GoOn = {
    show: function () {
      el.goOn.classList.remove('hidden');
      void el.goOn.offsetWidth;
      el.goOn.classList.add('on');
      el.nextBtn.classList.remove('ready');     // one thing nudging, not two
    },
    hide: function () { el.goOn.classList.remove('on'); el.goOn.classList.add('hidden'); }
  };

  /* ---------------- speech bubble ---------------- */
  const Bubble = {
    typing: false, timer: null, hideTimer: null, full: '', shown: 0, onDone: null,
    voiceMs: 0,
    /* How much of the recording is still sounding when the last word
       lands. The words are paced across the voice with a little left
       over, so a caller that has to wait for her to actually stop —
       the count-out does — has something true to wait on rather than a
       guess that happens to fit this line's length. */
    voiceTail: 0,
    /* Whether the balloon is already on screen. A line replacing another
       must not pop the box away and back — that is the flicker between
       every sentence — so it resizes instead, and only an arrival pops. */
    up: false,
    boxW: null, boxH: null,          // the shape it currently holds
    glide: 0,                        // id of the resize in flight, if any
    spans: [],
    /* The line split into words, each keeping its trailing space, so
       joining the shown ones reproduces the text exactly. The reveal
       steps a word at a time rather than a letter at a time — at this
       reading age a word appearing whole is read as a word, where a
       letter crawl has to be reassembled before it means anything. */
    words: [],

    /* The balloon cut to the line it is about to say — no empty band
       round it. The whole line on one row if it fits the widest the
       balloon may be here; if not, wrapped there and then drawn in to its
       longest row, so a two-row line is as wide as its rows and no wider.
       The words are 34px everywhere and are never made smaller: a long
       line takes another row. Measured with the line laid in once, the
       way it will wrap, and taken out again. */
    fitBox: function (text) {
      const g = Game.geom, B = (g && g.bubble) || C.BUBBLE;
      if (!g || !B.autoWidth) return 0;
      const line = el.bubbleLine, box = el.bubble.style, ls = line.style;
      const room = g.room || { left: 24, right: C.STAGE_W - 24 };
      const maxW = Math.min(B.maxW, room.right - room.left);
      const P = 2 * (B.pad.x + B.edge) + 2, Q = 2 * (B.pad.y + B.edge);
      const wasW = box.width;
      line.textContent = text;
      /* Measured as it will be drawn: x₂ in its own face (math-text.js),
         which is not the balloon's, and not its width. */
      if (window.MathText) window.MathText.set(line);
      ls.display = 'inline-block'; ls.width = 'auto'; ls.whiteSpace = 'nowrap';
      const one = line.offsetWidth;
      ls.display = ls.width = ls.whiteSpace = '';
      if (!one) { line.textContent = ''; return 0; }   // hidden, or no metrics yet
      let W;
      if (one + P <= maxW) W = one + P;
      else {
        box.width = maxW + 'px';
        /* Its rows as the browser broke them: the text's own boxes, one a
           row, in stage pixels. */
        const k = (el.stage.getBoundingClientRect().width / C.STAGE_W) || 1;
        const r = document.createRange();
        r.selectNodeContents(line);
        let widest = 0;
        [].forEach.call(r.getClientRects(), function (q) { widest = Math.max(widest, q.width / k); });
        W = Math.min(maxW, Math.ceil(widest) + P);
      }
      W = Math.max(B.minW, Math.ceil(W));
      box.width = W + 'px';
      const H = Math.ceil(line.offsetHeight + Q);
      line.textContent = '';
      box.width = wasW;
      return this.setBox(g, W, H);
    },

    /* Takes the balloon to a shape. Already up, it is re-cut a frame at
       a time between the old one and the new: the balloon is a drawn
       path, so a CSS transition on the box would glide the element
       while the outline inside it snapped. */
    setBox: function (g, want, bodyH) {
      const fromW = this.boxW, fromH = this.boxH;
      this.boxW = want; this.boxH = bodyH;
      this.glide++;                                  // any resize in flight is stale
      /* `rising` carries the balloon to the raised spot on a CSS
         transition that owns its left and top. Re-cutting the shape
         every frame moves those too, and the two chase each other, so
         that moment is left to seat in one go. */
      if (!this.up || fromW == null || fromH == null ||
          el.bubble.classList.contains('rising') ||
          (Math.abs(fromW - want) < 1 && Math.abs(fromH - bodyH) < 1)) {
        seatBubble(g, want, bodyH);
        return 0;
      }
      /* Seat the shape it is going to first, so anything measuring the
         balloon this tick sees the box the line will actually get rather
         than the one it is still leaving. The first glide frame runs
         before the next paint, so this never reaches the screen. */
      seatBubble(g, want, bodyH);
      const self = this, mine = this.glide, t0 = performance.now(), MS = 300;
      const step = function () {
        if (self.glide !== mine) return;             // a newer line took over
        const k = Math.min(1, (performance.now() - t0) / MS);
        const e = 1 - Math.pow(1 - k, 3);            // ease out, no overshoot
        seatBubble(g, fromW + (want - fromW) * e, fromH + (bodyH - fromH) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      /* Scheduled, not called: running the first frame here would put
         the old shape straight back over the target seated above, and
         the type would then be fitted to the box it is leaving. */
      requestAnimationFrame(step);
      return MS;
    },

    /* A coordinate pair must never break across lines, so the space
       inside one becomes non-breaking. Applies to every line, so any
       future "(x, y)" is handled without special-casing. */
    keepPairs: function (text) {
      return text.replace(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g, '($1,\u00A0$2)');
    },

    /* The line laid out in full, a span per word, every one hidden. The
       box is therefore the right size before the first word lands, and
       each word fades up exactly where it will sit rather than shoving
       the centred line along as it grows. */
    lay: function (text) {
      const line = el.bubbleLine;
      line.textContent = '';
      this.spans = [];
      const self = this;
      (text.match(/\S+\s*/g) || (text ? [text] : [])).forEach(function (w) {
        const sp = document.createElement('span');
        sp.className = 'wd';
        sp.textContent = w;
        line.appendChild(sp);
        self.spans.push(sp);
      });
      return this.spans;
    },

    /* The same line put back, already out.

       lay() empties the box and builds a fresh span per word, and every
       fresh word arrives with its own little fade — so re-showing a line
       she has already finished saying played that arrival a second time,
       word by word, and read as the question being asked twice. This
       marks them settled instead: same words, same box, no arrival. */
    restore: function (text) {
      this.lay(text == null ? this.full : text);
      this.spans.forEach(function (sp) { sp.classList.add('in', 'shown'); });
    },

    /* The balloon fitted to a line. The type is 34px everywhere, set in
       the balloon's own CSS, so this is only the box. */
    fit: function (text) {
      return this.fitBox(text);
    },

    open: function (text, done) {
      // an answer can arrive mid-sentence, so stop any line in flight
      if (this.typing) { this.typing = false; clearInterval(this.timer); SFX.duck(false); }
      if (window.Voice) window.Voice.stop();
      text = this.keepPairs(text);
      this.full = text; this.shown = 0; this.onDone = done;
      this.words = text.match(/\S+\s*/g) || [];
      // Unhide first: a display:none plate measures zero.
      clearTimeout(this.hideTimer);
      if (this.hideEnd) { el.bubble.removeEventListener('animationend', this.hideEnd); this.hideEnd = null; }
      el.bubble.classList.remove('hidden', 'pop-out');
      const settled = this.fit(text);
      el.bubbleLine.textContent = '';
      /* How long she will take to say it, if there is a recording. The
         words are then paced to her voice instead of to a fixed beat,
         so the line finishes as she does. */
      this.voiceMs = (window.Voice && window.Voice.lengthOf(text)) || 0;
      /* Pop only on arrival. Replacing a line re-pops nothing: the box
         has already resized itself to the new words. */
      let wait;
      if (!this.up) {
        el.bubble.classList.remove('pop-in');
        void el.bubble.offsetWidth;
        el.bubble.classList.add('pop-in');
        this.up = true;
        /* 260 as it always was. Later than this and a question she is
           still asking runs into the player pressing Check, which stops
           her mid-word. */
        wait = 260;
      } else {
        wait = settled ? settled - 40 : 90;
      }

      /* Kept, so a close or a screen change can take it back: left
         untracked, a line closed inside this wait typed itself anyway —
         her voice with no balloon — and then handed its screen on from
         whatever screen had replaced it. */
      const self = this;
      clearTimeout(this.typeT);
      this.typeT = setTimeout(function () { self.typeT = null; self.type(); }, wait);
    },

    type: function () {
      const self = this;
      clearInterval(this.timer);       // never two word-timers at once
      this.typing = true;
      SFX.duck(true);                 // dip the music under her voice
      mouthOpen();                       // her beak moves while she speaks

      this.lay(this.full);
      const voiced = window.Voice ? window.Voice.say(this.full) : 0;
      /* Spread the words across the recording so the last one lands as
         she stops speaking. Without one, the old fixed beat stands. */
      const beat = voiced
        ? Math.max(90, voiced / Math.max(1, this.words.length + 0.6))
        : C.AUTO.wordMs;
      this.voiceTail = voiced
        ? Math.max(0, voiced - this.words.length * beat)
        : 0;

      this.timer = setInterval(function () {
        if (self.shown >= self.words.length) { self.finish(); return; }
        const w = self.words[self.shown];
        const sp = self.spans[self.shown++];
        if (sp) sp.classList.add('in');
        /* And says which word that was. A beat can hang something on a
           word — draw the row as she says "horizontally" — and the word
           arriving is the only moment that knows. */
        if (self.onWord) self.onWord(w, self.shown - 1);
        /* Her own voice where there is one; the little notes where not —
           and where there is one the browser would not let her say. */
        if (!voiced || (window.Voice && window.Voice.silent && window.Voice.silent())) {
          SFX.chirp(/[.!?]\s*$/.test(w) ? 0.7 : 1);
        }
      }, beat);
    },

    /* Tapping mid-line reveals the rest immediately. */
    skip: function () {
      if (!this.typing) return false;
      if (window.Voice) window.Voice.stop();
      const from = this.shown;
      this.shown = this.words.length;
      this.spans.forEach(function (sp) { sp.classList.add('in'); });
      /* Everything the rest of the line would have triggered still
         happens: a child who taps through the words has still been
         shown them, and must not be left looking at half a board. */
      if (this.onWord) {
        for (let n = from; n < this.words.length; n++) this.onWord(this.words[n], n);
      }
      this.finish();
      return true;
    },

    finish: function () {
      if (!this.typing) return;
      this.typing = false;
      clearInterval(this.timer);
      SFX.duck(false);
      SFX.chime();
      mouthShut();
      if (this.onDone) { const d = this.onDone; this.onDone = null; d(); }
    },

    /* The box has to stay in the layout until the pop-out has played,
       so the hide waits 240ms — and a line arriving inside that window
       would otherwise be hidden by the timer set for the box it
       replaced. open() cancels it. */
    /* A screen change: the line stops where it is and hands nothing on.
       The words already out stay up — the next screen's line replaces
       them, or its own close takes them away. */
    cancel: function () {
      clearTimeout(this.typeT); this.typeT = null;
      if (this.typing) {
        this.typing = false; clearInterval(this.timer);
        SFX.duck(false); mouthShut();
      }
      this.onDone = null;
      this.onWord = null;              // a cue is the screen's own
      if (window.Voice) window.Voice.stop();
    },

    close: function () {
      if (window.Voice) window.Voice.stop();
      clearTimeout(this.typeT); this.typeT = null;
      this.onDone = null;              // closed is finished: nothing to hand on
      this.up = false;
      this.boxW = this.boxH = null;
      this.glide++;                    // drop any resize still running
      if (this.typing) { this.typing = false; clearInterval(this.timer); SFX.duck(false); }
      el.bubble.classList.remove('pop-in');
      el.bubble.classList.add('pop-out');
      const b = el.bubble, self = this;
      clearTimeout(this.hideTimer);
      /* Out of the layout once the pop-out has PLAYED — it runs .26s, and
         hiding it at a flat 240ms cut the last of it on every machine.
         The timer only covers a pop-out that never reports its end. */
      if (this.hideEnd) b.removeEventListener('animationend', this.hideEnd);
      const hide = function (e) {
        if (e && e.animationName !== 'bubbleOut') return;
        b.removeEventListener('animationend', hide);
        self.hideEnd = null;
        clearTimeout(self.hideTimer);
        if (!b.classList.contains('pop-out')) return;   // a line came back in
        b.classList.add('hidden'); b.classList.remove('pop-out');
      };
      this.hideEnd = hide;
      b.addEventListener('animationend', hide);
      this.hideTimer = setTimeout(hide, 260 + 300);
    }
  };

  /* ---------------- coordinate board ---------------- */
  /* The panel art carries only the cream board and its grid. The axes,
     arrowheads and numbers are drawn as an SVG overlay so each part
     can animate in on its own, and so the numbers land exactly on the
     drawn gridlines (measured into CFG.GRID). */
  const Board = {
    built: false, shown: false, labels: [], axisLabels: [], lines: [], arrows: [], dots: [],
    /* Which of `GRID.ranges` the board is currently drawn on. */
    rangeName: 'close', baseGeom: null,
    foundMarks: [],          // points already located, left on the board

    /* Which board this screen stands on. `close` is the plane the whole
       lesson is taught on; `wide` is the same plane at two fifths, for
       a pair that does not fit on it.

       A unit is a cell on both, which is the rule that matters: every
       point lands on an intersection and can still be counted to. What
       changes is the size of the cell, the numbers written along the
       axes, and how far the ruling runs — and nothing else, because
       every mark the board makes works out where it goes from `origin
       + n × step` at the moment it is drawn. The origin itself does
       not move: both ranges are centred on the viewBox, so the panel,
       the frame and everything measured against them stay put.

       The base geometry is read once and kept, so switching back and
       forth cannot accumulate rounding. */
    setRange: function (name) {
      const G = C.GRID, R = (G.ranges || {})[name || 'close'];
      if (!R || this.rangeName === (name || 'close')) return false;
      if (!this.baseGeom) {
        this.baseGeom = { stepX: G.stepX, stepY: G.stepY,
                          numGap: G.numGap, zeroGap: G.zeroGap };
      }
      const B = this.baseGeom;
      G.stepX = B.stepX * R.k;
      G.stepY = B.stepY * R.k;
      G.originX = G.w / 2;
      G.originY = G.h / 2;
      G.xFrom = R.xFrom; G.xTo = R.xTo;
      G.yFrom = R.yFrom; G.yTo = R.yTo;
      G.labelEvery = R.every;
      G.labelSize = R.labelSize;
      G.overshoot = R.overshoot;
      G.arrow = R.arrow;
      /* The gap that holds a number off its axis is cell-sized, so it
         comes down with the cell; the axis stroke and the type of the
         letters x and y do not, because neither is measured in units. */
      G.numGap = B.numGap * R.k;
      G.zeroGap = B.zeroGap * R.k;
      G.paper.gxFrom = R.gxFrom; G.paper.gxTo = R.gxTo;
      G.paper.gyFrom = R.gyFrom; G.paper.gyTo = R.gyTo;
      this.rangeName = name || 'close';
      this.forgetTextMetrics && this.forgetTextMetrics();
      /* Whatever pair is up was placed against the old cell. It is not
         "already drawn" any more, whatever its coordinates say. */
      this.lastPlotted = null;

      if (this.built) this.rebuildAxes();
      /* The ruling is laid out from the origin at `place` time, so the
         new cell size reaches it as soon as the board is placed again
         — which the screen change is about to do. */
      return true;
    },

    /* The axis furniture made again, in the state the old one was in.
       Everything in these four lists was made BY the range (or measured
       in the type) and means nothing once either has changed; everything
       else on the board is placed against it and will be placed again. */
    rebuildAxes: function () {
      {
        const drop = function (list) {
          list.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
          list.length = 0;
        };
        const wasDrawn = this.lines.some(function (l) { return l.classList.contains('draw'); });
        /* The lines and arrowheads live in a group of their own now (so
           the board can fade them as one shape), and `buildAxes` makes
           a fresh one — the old, emptied group goes with them. */
        const oldAxes = this.axesG;
        drop(this.lines); drop(this.arrows); drop(this.labels);
        this.axisLabels.length = 0;
        this.buildAxes();
        if (oldAxes && oldAxes !== this.axesG && oldAxes.parentNode) {
          oldAxes.parentNode.removeChild(oldAxes);
        }
        /* New axes are made the way the board makes them at the start of
           a screen: dashed out of sight, waiting for the sweep that
           reveals them. A range that changes on a board already on the
           frame gets no sweep — the screen has not been rebuilt — so
           without this the new plane came up as bare paper with no axes
           and no numbers on it at all. They are simply put in the state
           the ones they replaced were in. */
        /* And put back UNDER the drawing. `buildAxes` appends, which is
           right the first time — it runs before anything else is made —
           and wrong every time after: a rebuilt axis went on top of the
           very triangle it is the paper for. Since the board gained a
           second range this has been true of every screen that changes
           one. */
        /* The GROUP goes under the drawing, not each line in it: the
           lines are its children, not the board's, and asking the board
           to remove them threw — on every screen from 54 on, which is
           where the range first changes. */
        const svg2 = el.gridAxes;
        const axisNodes = [this.axesG].concat(this.labels).filter(Boolean);
        axisNodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        for (let k = axisNodes.length - 1; k >= 0; k--) {
          svg2.insertBefore(axisNodes[k], svg2.firstChild);
        }
        if (wasDrawn || this.shown) this.showAxes();
      }
    },

    /* Axes already drawn, with no sweep. The sweep is how a board
       ARRIVES; a board that is already here and has only changed its
       numbering has nothing to announce. */
    showAxes: function () {
      /* Drawn outright: the offset itself set to nothing, as
         settleFurniture does, not left to an animation — a browser that
         drops an animation's held last frame then drops the axes. */
      this.lines.forEach(function (l) { l.style.strokeDashoffset = 0; l.classList.add('draw'); });
      this.arrows.forEach(function (a) { a.classList.add('pop'); });
      this.labels.forEach(function (t) { t.classList.add('pop'); });
    },

    /* The axes, their arrowheads and their numbering — everything on
       the board that is made OF the range rather than merely placed
       against it. Split out of `build` because a screen can change the
       range, and then this is the only part that has to be made again:
       every line, label and marker the board draws afterwards works
       out where it goes from `origin + n × step` at the moment it is
       drawn, so those follow the new board without being touched. */
    buildAxes: function () {
      const G = C.GRID, NS = 'http://www.w3.org/2000/svg';
      const svg = el.gridAxes;
      const ox = G.originX, oy = G.originY;
      /* Each axis runs a fixed overshoot past its last number to carry
         the arrowhead, sized so no tip leaves the drawn grid. */
      const ov = G.overshoot;
      const xMin = ox + G.xFrom * G.stepX - ov;
      const xMax = ox + G.xTo   * G.stepX + ov;
      const yMin = oy - G.yTo   * G.stepY - ov;
      const yMax = oy - G.yFrom * G.stepY + ov;
      const self = this;

      svg.style.setProperty('--axisDraw', G.axisDrawMs + 'ms');
      svg.style.setProperty('--numLit', G.numLit);
      svg.style.setProperty('--numInk', G.ink);

      /* Lines and arrowheads in one group, so the board can fade them
         as ONE shape. Faded one by one, every overlap stacked: the
         shaft's round cap tucked under each arrowhead showed through it
         as a darker bump, and the four half-axes' caps made a dark spot
         at the origin — invisible at full strength, obvious at .3. A
         group is composited once, so where two parts overlap there is
         still only one layer of ink. */
      const axesG = document.createElementNS(NS, 'g');
      axesG.setAttribute('class', 'axes');
      svg.appendChild(axesG);
      this.axesG = axesG;

      const half = function (x2, y2) {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', ox); l.setAttribute('y1', oy);
        l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        l.setAttribute('stroke', G.ink);
        l.setAttribute('stroke-width', G.axisWidth);
        l.setAttribute('class', 'axis');
        const len = Math.hypot(x2 - ox, y2 - oy);
        l._len = len;                 // kept, so reset can wind it back again
        windBack(l, len, false);
        axesG.appendChild(l);
        self.lines.push(l);
        return l;
      };
      /* Four half-axes, each drawn outward from the origin and stopped
         at its arrowhead's base rather than its tip: the round line cap
         would otherwise stick out past the point of the arrow. Ending
         at the base tucks the cap under the triangle instead. */
      const al = G.arrow.len;
      this.axisX = [half(xMin + al, oy), half(xMax - al, oy)];
      this.axisY = [half(ox, yMin + al), half(ox, yMax - al)];

      const arrow = function (tx, ty, dx, dy) {
        const a = G.arrow, p = document.createElementNS(NS, 'polygon');
        // base sits `len` back along the axis, corners `halfW` to each side
        const bx = tx - dx * a.len, by = ty - dy * a.len;
        const px = -dy * a.halfW, py = dx * a.halfW;
        p.setAttribute('points',
          tx + ',' + ty + ' ' + (bx + px) + ',' + (by + py) + ' ' + (bx - px) + ',' + (by - py));
        p.setAttribute('fill', G.ink);
        p.setAttribute('class', 'arrow');
        axesG.appendChild(p);
        self.arrows.push(p);
      };
      arrow(xMin, oy, -1, 0);
      arrow(xMax, oy,  1, 0);
      arrow(ox, yMin, 0, -1);
      arrow(ox, yMax, 0,  1);

      const label = function (txt, x, y, size, axis, v) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y);
        /* Scale it about its own spot, in the SVG's own units. Relying
           on `transform-box: fill-box` here is what stops the pop being
           seen in some browsers — Safari has long been unreliable about
           the fill box of an SVG <text>, and when it falls back the
           origin becomes the whole viewBox's centre, so the label flies
           in from the middle of the board instead of growing in place.
           Naming the point outright removes the guesswork. */
        t.style.transformOrigin = x + 'px ' + y + 'px';
        t.setAttribute('fill', G.ink);
        t.setAttribute('font-size', size || G.labelSize);
        t.setAttribute('class', 'glabel');
        t.textContent = txt;
        svg.appendChild(t);
        self.labels.push(t);
        /* Which axis it belongs to and how far along it, so it can be
           revealed by the line as that line reaches it. */
        self.axisLabels.push({ el: t, axis: axis || 'x', v: v || 0 });
      };
      /* x numbers sit under the axis, y numbers to its left, 0 in the
         corner between them. The three rows are tuned against each
         other: at stepY 61 a 32px number cannot be centred on both the
         x row and the y=-1 row without them touching, so the x row is
         tucked up under its axis, which is what opens the gap the 0
         and the -1 need. */
      /* Every unit on the close board; every fifth on the wide one,
         where thirty-one numbers along an axis would be a wall of
         digits rather than a scale. The gridline is still there for
         each of the unnumbered ones — a point between two labels is
         still a point you can count to. */
      const step = G.labelEvery || 1;
      const rowTop = self.numRow().top, colRight = self.numCol().right;
      for (let x = G.xFrom; x <= G.xTo; x++) {
        if (x === 0 || x % step) continue;
        /* Its ink's top edge `numGap` below the axis, whatever the
           label is: the y attribute is the MIDDLE, so the ink's own
           rise above that middle is added back. */
        label(numText(x), ox + x * G.stepX,
              rowTop + self.textMetrics(numText(x), G.labelSize).up, 0, 'x', x);
      }
      for (let y = G.yFrom; y <= G.yTo; y++) {
        if (y === 0 || y % step) continue;
        /* And its ink's right edge `numGap` left of the axis. The x
           attribute is the CENTRE, so half the label's own width comes
           off — which is the whole of why "−5" used to sit ten pixels
           closer to the line than "5" did. */
        label(numText(y), colRight - self.textMetrics(numText(y), G.labelSize).w / 2,
              oy - y * G.stepY, 0, 'y', y);
      }
      /* The zero, in the corner between the two runs — held off the
         y-axis so it does not stand on the stroke, and off −1 so the
         two do not read as one number.

         How far off cannot be the constant it was. `zeroGap` is a
         fraction of a cell, and on the wide boards a cell is small
         while −1 is not: a real minus sign is the width of a digit,
         not of a hyphen, so −1 is wider than the gap was written for.
         Measured on those boards, 0 was sitting 1.6px from −1 — close
         enough that "−1 0" read as "−10" along the bottom of every
         screen from 55 on.

         So the offset is measured instead: as far from the axis as
         `zeroGap` asks, unless that would crowd −1, in which case as
         far as there is room for — and never so close to the axis that
         it touches the stroke. On the close board there is room for
         the full gap and nothing moves. */
      const zeroW = self.textW('0', G.labelSize);
      /* Whichever number is actually drawn next to it — which is -1
         when every unit is numbered and -2 when every second one is. */
      const leftV = -step, leftW = self.textW(numText(leftV), G.labelSize);
      const air = G.labelSize * 0.34;          // the space between two numbers
      /* Nearest the axis it may sit, and furthest before it reaches
         that neighbour. */
      const nearest = zeroW / 2 + G.axisWidth / 2 + air * 0.5;
      const furthest = Math.abs(leftV) * G.stepX - leftW / 2 - zeroW / 2 - air;
      const off = Math.max(nearest, Math.min(G.zeroGap, furthest));
      // at the origin, so it lights as the sweep sets off
      label('0', ox - off, rowTop + self.textMetrics('0', G.labelSize).up, 0, 'x', 0);

      /* Everything so far is numbering; the two letters below are not.
         A board can be asked to carry no numbers (`numbers` in the
         script), and these are what it leaves off. */
      self.labels.forEach(function (t) { t.classList.add('gnum'); });

      /* The axis names sit past the last number, where each sweep ends —
         but the ruling now runs to the panel's own edges, so past the
         last number can be past the paper. Clamped on, like every other
         label the board writes. */
      const N = G.axisName;
      const nw = self.textW('x', N.size);
      label('x', self.clampX(xMax + N.gap, nw), oy - N.rise, N.size, 'x', G.xTo + 1);
      label('y', ox + N.yGap, self.clampY(yMin + N.yDrop, N.size), N.size, 'y', G.yTo + 1);
      /* The axes' names are the x and y of every coordinate on it, and are
         set as those are (.mvar). */
      self.labels.slice(-2).forEach(function (t) { t.classList.add('mvar'); });
      /* Held onto so a label can keep off them. They are the two pieces
         of ink on this board that nothing has ever avoided, which is
         how `(6, 1)` came to be written into the x. */
      this.axisNames = self.labels.slice(-2);
    },

    /* Everything the board owns that outlives a change of range, plus
       the axes for whichever range is current. Runs once. */
    build: function () {
      if (this.built) return;
      this.built = true;

      const G = C.GRID, NS = 'http://www.w3.org/2000/svg';
      const svg = el.gridAxes;
      const ox = G.originX, oy = G.originY;
      const self = this;

      const defs = document.createElementNS(NS, 'defs');
      /* The park (55–61): grass, laid in board units so it stays put as
         the camera moves, with tufts scattered through it. */
      const grass = '<pattern id="parkGrass" patternUnits="userSpaceOnUse" width="96" height="84">' +
          '<rect width="96" height="84" fill="#CFE9B2"/>' +
          '<path d="M14 22 l3 -7 l3 7 M50 58 l3 -7 l3 7 M78 18 l3 -7 l3 7 M30 74 l3 -7 l3 7 M70 70 l3 -7 l3 7"' +
          ' stroke="#9CCB7A" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</pattern>';
      defs.innerHTML = grass;
      svg.insertBefore(defs, svg.firstChild);

      this.buildAxes();

      /* Screen 6's intersection markers: every gridline crossing in
         the numbered range. Built once, hidden until that screen. */
      const D = G.dot;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('id', 'gridDots');
      g.setAttribute('class', 'dots');
      svg.appendChild(g);
      for (let gy = D.yFrom; gy <= D.yTo; gy++) {
        for (let gx = D.xFrom; gx <= D.xTo; gx++) {
          // points that would land on an axis line are left clear
          if (D.skipOnAxes && (gx === 0 || gy === 0)) continue;
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', ox + gx * G.stepX);
          c.setAttribute('cy', oy - gy * G.stepY);
          c.setAttribute('r', D.r);
          c.setAttribute('fill', D.fill);
          c.setAttribute('stroke', D.stroke);
          c.setAttribute('stroke-width', D.strokeWidth);
          c.setAttribute('class', 'gdot');
          c.dataset.gx = gx;
          c.dataset.gy = gy;
          // pulse travels outward from the origin rather than in unison
          const ring = Math.abs(gx) + Math.abs(gy);
          const d = ring * D.rippleMs;
          c.style.animationDelay = d + 'ms, ' + (d + 380) + 'ms';
          g.appendChild(c);
          self.dots.push(c);
        }
      }
      /* The face of the triangle, once its three sides are there. Built
         before the legs and the segment, so it lies under every line and
         every label rather than washing over them. */
      const tf = document.createElementNS(NS, 'polygon');
      tf.setAttribute('class', 'trifill');
      svg.appendChild(tf);
      this.triFill = tf;

      /* Legs of the right-angled path. Two slots, each a coloured line
         with an optional endpoint marker and an optional length
         written alongside it. Built once and reused. */
      const LG = G.leg;
      this.legSlots = [];
      for (let i = 0; i < LG.slots; i++) {
        const lg = document.createElementNS(NS, 'g');
        lg.setAttribute('class', 'leg');

        /* The dotted guide, under the solid line and under the
           measuring stroke — the legs are appended before the segment
           group, which is where that stroke lives (and in this group it
           goes in after the guide and the line: measLayer). It grows out of its
           own start, so it sits in a group that can carry a transform
           origin; the dots themselves are held at size by
           non-scaling-stroke, or they would swell as it grows. */
        const dg = document.createElementNS(NS, 'g');
        dg.setAttribute('class', 'legdash-g');
        const dl = document.createElementNS(NS, 'line');
        dl.setAttribute('class', 'legdash');
        dl.setAttribute('stroke-width', LG.dashWidth || 7);
        dl.setAttribute('stroke-linecap', 'round');
        dl.setAttribute('stroke-dasharray', LG.dashArray || '2 14');
        dl.setAttribute('vector-effect', 'non-scaling-stroke');
        dg.appendChild(dl);

        const ln = document.createElementNS(NS, 'line');
        ln.setAttribute('class', 'legline');
        ln.setAttribute('stroke', LG.color);
        ln.setAttribute('stroke-width', LG.width);
        /* Square ends, set so each end's two corners sit on the ring of
           the point it meets (meetPoint): the side reaches the point all
           the way across its width, with no paper showing between them,
           and goes a hair under the ring in the middle and no further.
           A round end cannot do that — tangent to the ring, it left paper
           either side of the join; pushed in until it closed, it ran a
           cap's depth under the dot, and showed through whenever the dot
           was faded. */
        ln.setAttribute('stroke-linecap', 'butt');

        const dt = document.createElementNS(NS, 'circle');
        dt.setAttribute('class', 'legdot');
        dt.setAttribute('r', LG.dotR);
        dt.setAttribute('fill', LG.color);
        dt.setAttribute('stroke', '#FFFFFF');
        dt.setAttribute('stroke-width', 3);

        const co = document.createElementNS(NS, 'text');
        co.setAttribute('class', 'legcoord');
        co.setAttribute('fill', G.ink);
        co.setAttribute('font-size', G.segment.coordSize);

        const nm = document.createElementNS(NS, 'text');
        nm.setAttribute('class', 'legname');
        nm.setAttribute('fill', G.ink);
        nm.setAttribute('font-size', G.segment.nameSize);

        /* In the leg's own colour: with the plate gone, that is what
           says which of the two sides a measurement belongs to. */
        const lt = document.createElementNS(NS, 'text');
        lt.setAttribute('class', 'leglen');
        lt.setAttribute('fill', LG.color);
        lt.setAttribute('font-size', LG.lenSize);

        ln.id = i === 0 ? 'lineAC' : 'lineCB';     // first leg, then second
        /* The length hangs in a group of its own so it can be TURNED.
           Its own `pop` is a filled animation, and a filled animation
           beats a transform attribute on the same element — so the
           rotation has to sit on something the animation does not
           touch. */
        const lturn = document.createElementNS(NS, 'g');
        lturn.appendChild(lt);
        [dg, ln, dt, co, nm, lturn].forEach(function (n) { lg.appendChild(n); });
        svg.appendChild(lg);
        this.commitDraw(ln);
        this.legSlots.push({ g: lg, line: ln, dot: dt, coord: co, name: nm,
                             len: lt, lenTurn: lturn,
                             dash: dl, dashG: dg });
      }
      /* The first side's layer on top of the others. Its corner C is the
         point the second side starts from, and a point has to be above
         every line that meets it — a line's end now goes a hair under
         the ring it meets (meetPoint). The second side is drawn first,
         then the first over it. */
      for (let i = 1; i < this.legSlots.length; i++) {
        svg.insertBefore(this.legSlots[i].g, this.legSlots[0].g);
      }

      /* Three spare lines that do nothing but pulse, laid behind the
         real ones. The real lines carry stroke-width as a presentation
         attribute written by the drawing code, and a highlight that
         fights that is a highlight that loses — so nothing here touches
         them. They sit just above the triangle's face and below every
         side and every point (see where pulseG is inserted), so the
         glow shows around the side and the points stay crisp on top;
         they take their ends and their colour from whatever side they
         are lighting. */
      const pulseG = document.createElementNS(NS, 'g');
      pulseG.setAttribute('class', 'tri-pulse-overlay');
      pulseG.setAttribute('pointer-events', 'none');
      this.pulseLines = [0, 1, 2].map(function () {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('class', 'triangle-pulse-line');
        l.setAttribute('fill', 'none');
        /* Square ends, finished just inside each point — see
           pulseSides — so no corner of the glow shows past a dot. */
        l.setAttribute('stroke-linecap', 'butt');
        pulseG.appendChild(l);
        return l;
      });
      this.pulseOverlay = pulseG;

      /* The count's total. There used to be a filled square per unit
         under it as well; the line walking out a unit at a time already
         says how many there are, and the squares only buried the
         coordinates and the ruling under a block of colour. */
      const U = G.unitBox;
      const ug = document.createElementNS(NS, 'g');
      // (the overlay is appended at the very end of build, below)
      ug.setAttribute('class', 'units');

      const ul = document.createElementNS(NS, 'text');
      ul.setAttribute('class', 'ulabel');
      ul.setAttribute('fill', G.ink);
      ul.setAttribute('font-size', U.labelSize);
      ug.appendChild(ul);

      svg.appendChild(ug);
      this.unitGroup = ug;

      /* The subtraction worked on the board. Five separate nodes so each
         part can be revealed on its own, inside one group so the finished
         sum can be lifted as a single object rather than five characters
         moving independently.

         The sweep is a second line laid over the segment and drawn end to
         end; the real line is never touched, so nothing here can disturb
         what is already on the board. */
      const eg = document.createElementNS(NS, 'g');
      eg.setAttribute('class', 'xeq');
      this.xParts = [0, 1, 2, 3, 4].map(function () {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('class', 'xeq-p');
        t.setAttribute('font-size', G.xeq.size);
        eg.appendChild(t);
        return t;
      });
      const fly = document.createElementNS(NS, 'text');
      fly.setAttribute('class', 'xfly');
      const word = document.createElementNS(NS, 'text');
      word.setAttribute('class', 'xword');
      word.setAttribute('font-size', G.unitBox.labelSize);
      const sweep = document.createElementNS(NS, 'line');
      sweep.setAttribute('class', 'xsweep');
      svg.appendChild(sweep); svg.appendChild(eg); svg.appendChild(fly); svg.appendChild(word);
      this.xGroup = eg; this.xFly = fly; this.xSweep = sweep; this.xWord = word;

      /* The square in the corner of a right angle, shown only once the
         triangle has been named. */
      const ra = document.createElementNS(NS, 'polyline');
      ra.setAttribute('class', 'rightangle');
      ra.setAttribute('fill', 'none');
      ra.setAttribute('stroke', G.leg.color);
      svg.appendChild(ra);
      this.rightMark = ra;

      this.unitLabel = ul;

      /* The guided count: one square per unit, each with its own number
         under it. Built as a pool at the widest span any screen asks
         about, and seated per count — a node per unit made and thrown
         away on every miss would flicker. */
      const UC = G.unitBox.count;
      this.countCells = [];
      for (let u = 0; u < UC.slots; u++) {
        const cg = document.createElementNS(NS, 'g');
        cg.setAttribute('class', 'ucell');
        /* The step taken across this space, and the count of it. No
           box: the square used to be drawn as a filled, stroked tile
           and the two marks sat on it, which made the tile the thing
           on the board and the count a caption on the tile. The space
           is already ruled on the paper — an arrow across it and a
           number under that is the whole of what there is to say.

           Pointed by countUnits, which is the only thing that knows
           which way the count is running. */
        const ca = document.createElementNS(NS, 'path');
        ca.setAttribute('class', 'ucell-arrow');
        /* The board's own ink, the same as the number under it, so the
           step and the count of it read as one mark.

           It was the band's edge colour — a blue at 55% alpha, chosen
           to outline a tile without dominating it. With the tile gone
           that alpha left the arrow the faintest thing on the paper,
           fainter than the number beside it, when the arrow IS the
           step being counted. */
        ca.setAttribute('stroke', G.ink);
        ca.setAttribute('stroke-width', (UC.arrow && UC.arrow.w) || 4);
        const ct = document.createElementNS(NS, 'text');
        ct.setAttribute('class', 'ucell-n');
        ct.setAttribute('fill', G.ink);
        ct.setAttribute('font-size', UC.numSize);
        cg.appendChild(ca); cg.appendChild(ct);
        ug.appendChild(cg);
        this.countCells.push({ g: cg, arrow: ca, num: ct });
      }

      const SG = G.segment;

      /* Pairs the child has already finished with, brought back on a
         later screen beside the one that screen is about.

         Each slot is the segment's own furniture — a line, two points,
         two labels, two letters and a length — carrying the segment's
         own classes, so an example is styled by the very rules that
         styled it the first time and cannot drift from it. No dashed
         guide: an example is only ever shown finished. Built before the
         segment group, which leaves the pair a screen is actually about
         on top of anything recalled beside it. */
      const EX = G.example;
      this.exSlots = [];
      for (let e = 0; e < (EX && EX.slots || 0); e++) {
        const exg = document.createElementNS(NS, 'g');
        exg.setAttribute('class', 'example');
        const exl = document.createElementNS(NS, 'line');
        exl.setAttribute('class', 'segline');
        exl.setAttribute('stroke', SG.lineColor);
        exl.setAttribute('stroke-width', SG.lineWidth);
        exl.setAttribute('stroke-linecap', 'butt');     // see the sides' ends
        exg.appendChild(exl);
        this.commitDraw(exl);
        const exParts = { a: {}, b: {} };
        ['a', 'b'].forEach(function (key) {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('class', 'segdot');
          c.setAttribute('r', SG.dotR);
          c.setAttribute('fill', SG.dotFill);
          c.setAttribute('stroke', SG.dotStroke);
          c.setAttribute('stroke-width', SG.dotStrokeW);
          const co = document.createElementNS(NS, 'text');
          co.setAttribute('class', 'segcoord');
          co.setAttribute('fill', G.ink);
          co.setAttribute('font-size', SG.coordSize);
          const nm = document.createElementNS(NS, 'text');
          nm.setAttribute('class', 'segname');
          nm.setAttribute('fill', G.ink);
          nm.setAttribute('font-size', SG.nameSize);
          exg.appendChild(c); exg.appendChild(co); exg.appendChild(nm);
          exParts[key] = { dot: c, coord: co, name: nm };
        });
        const exr = document.createElementNS(NS, 'text');
        exr.setAttribute('class', 'segres');
        exr.setAttribute('fill', G.ink);
        exr.setAttribute('font-size', 34);
        /* In a group of its own so a column's length can be turned
           along its line — `segres.pop` is a filled animation and
           would beat a transform on the text itself. */
        const ext = document.createElementNS(NS, 'g');
        ext.appendChild(exr);
        exg.appendChild(ext);
        svg.appendChild(exg);
        this.exSlots.push({ g: exg, segParts: exParts, segLine: exl,
                            segRes: exr, segResTurn: ext });
      }

      /* A plotted segment: two named points joined by a line. Built
         here, positioned and revealed by showSegment(). */
      const seg = document.createElementNS(NS, 'g');
      seg.setAttribute('class', 'seg');
      /* A dashed guide along the segment, shown before the question so
         the span being asked about is visible without being answered.
         It goes in first so the solid line and the player's measuring
         line both draw over it. Wrapped in a group because the reveal
         scales it out from A, and scaling the line itself would drag
         its own transform-origin with it. */
      const dashG = document.createElementNS(NS, 'g');
      dashG.setAttribute('class', 'segdash-g');
      const segDash = document.createElementNS(NS, 'line');
      segDash.setAttribute('class', 'segdash');
      segDash.setAttribute('stroke', SG.dashColor);
      segDash.setAttribute('stroke-width', SG.dashWidth);
      segDash.setAttribute('stroke-linecap', 'round');
      segDash.setAttribute('stroke-dasharray', SG.dashArray);
      segDash.setAttribute('vector-effect', 'non-scaling-stroke');
      dashG.appendChild(segDash);
      seg.appendChild(dashG);
      this.segDash = segDash;
      this.segDashG = dashG;

      const segLine = document.createElementNS(NS, 'line');
      segLine.setAttribute('class', 'segline');
      segLine.setAttribute('stroke', SG.lineColor);
      segLine.setAttribute('stroke-width', SG.lineWidth);
      segLine.setAttribute('stroke-linecap', 'butt');   // see the sides' ends
      segLine.id = 'lineAB';          // the line between the two points
      seg.appendChild(segLine);
      this.segLine = segLine;
      this.commitDraw(segLine);

      /* The player's own line, laid down with the slider. It sits in
         the same group as the segment so it is cleared alongside it —
         except while it touches the corner C, when it lies just under
         C's dot in the first side's layer (measLayer). */
      const ml = document.createElementNS(NS, 'line');
      ml.setAttribute('class', 'measline');
      ml.setAttribute('stroke', G.measure.color);
      ml.setAttribute('stroke-width', G.measure.width);
      /* Square ends like every line that meets a point; between points
         the round head (the cap, below) is drawn over its free end. */
      ml.setAttribute('stroke-linecap', 'butt');
      const mc = document.createElementNS(NS, 'circle');
      mc.setAttribute('class', 'mescap');
      mc.setAttribute('r', G.measure.capR);
      mc.setAttribute('fill', G.measure.color);
      seg.appendChild(ml); seg.appendChild(mc);
      this.measLine = ml; this.measCap = mc;
      this.segParts = { a: {}, b: {} };
      ['a', 'b'].forEach(function (key) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'segdot');
        c.setAttribute('r', SG.dotR);
        c.setAttribute('fill', SG.dotFill);
        c.setAttribute('stroke', SG.dotStroke);
        c.setAttribute('stroke-width', SG.dotStrokeW);
        const co = document.createElementNS(NS, 'text');
        co.setAttribute('class', 'segcoord');
        co.setAttribute('fill', G.ink);
        co.setAttribute('font-size', SG.coordSize);
        const nm = document.createElementNS(NS, 'text');
        nm.setAttribute('class', 'segname');
        nm.setAttribute('fill', G.ink);
        nm.setAttribute('font-size', SG.nameSize);
        seg.appendChild(c); seg.appendChild(co); seg.appendChild(nm);
        self.segParts[key] = { dot: c, coord: co, name: nm };
      });
      /* The answer written on the segment, on its own plate. */
      const rt = document.createElementNS(NS, 'text');
      rt.setAttribute('class', 'segres');
      rt.setAttribute('fill', G.ink);
      rt.setAttribute('font-size', 34);
      const rtt = document.createElementNS(NS, 'g');
      rtt.appendChild(rt);
      seg.appendChild(rtt);
      this.segRes = rt;
      this.segResTurn = rtt;

      svg.appendChild(seg);
      this.segGroup = seg;

      /* The marker left on a point once it has been found, plus its
         written coordinates. Built here, placed by solve(). */
      const F = G.found;
      const fg = document.createElementNS(NS, 'g');
      fg.setAttribute('class', 'found');
      const fc = document.createElementNS(NS, 'circle');
      fc.setAttribute('r', F.r);
      fc.setAttribute('fill', F.fill);
      fc.setAttribute('stroke', F.stroke);
      fc.setAttribute('stroke-width', F.strokeWidth);
      fc.setAttribute('class', 'fdot');
      const ft = document.createElementNS(NS, 'text');
      ft.setAttribute('fill', G.ink);
      ft.setAttribute('font-size', F.labelSize);
      ft.setAttribute('class', 'flabel');
      fg.appendChild(fc);
      fg.appendChild(ft);
      svg.appendChild(fg);
      this.foundGroup = fg;
      this.foundDot = fc;
      this.foundLabel = ft;

      /* They look tappable, so they take the tap — and swallow it, or
         it would bubble to the scene and skip the screen. */
      g.addEventListener('click', function (e) {
        const c = e.target;
        if (!c || !c.classList || !c.classList.contains('gdot')) return;
        e.stopPropagation();
        Game.tapPoint(Number(c.dataset.gx), Number(c.dataset.gy), c);
      });

      this.dotGroup = g;
      // last of all, so the pulse overlay sits above every other part
      /* Behind every line and every point: just above the triangle's
         face, below the sides. The highlight is a glow BEHIND the side,
         the full length of it, with the line and its two points drawn
         crisp on top — not a band laid over the drawing that has to be
         cut short to keep it off the dots. */
      svg.insertBefore(pulseG, this.triFill ? this.triFill.nextSibling : svg.firstChild);
    },

    /* The board is seated in different boxes on different screens, so
       its placement is applied rather than fixed. */
    box: null,
    /* The panel fills its briefed box exactly rather than being
       letterboxed inside it. The art's own ratio differs by under half
       a percent, so nothing reads as stretched, and the SVG overlay
       maps through the same viewBox — axes and numbers stay locked to
       the drawn gridlines either way. */
    /* How much of the board is inside the window, in the board's own
       units. Nothing set means all of it, which is what every screen
       outside the triangle sees. */
    viewRect: function () {
      const G = C.GRID;
      return this.view || { x: 0, y: 0, w: G.w, h: G.h };
    },

    /* The region a named view asks for, worked out from what is on the
       board rather than typed.

       Framed on what is DRAWN AND WRITTEN, not on the coordinates alone:
       a label sits out beyond the point it names, and air measured from
       the point would crowd the label against the edge. The origin is
       taken in too, so both axes stay in shot — as lines, since the
       numbers are not shown at this range. */
    viewFor: function (name) {
      if (!name) return null;
      const G = C.GRID, Z = G.zoom, self = this, SG = G.segment, LG = G.leg;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };

      let x1 = px(0), x2 = px(0), y1 = py(0), y2 = py(0);   // the origin, always
      const span = function (cx, cy, w, h) {
        x1 = Math.min(x1, cx - w / 2); x2 = Math.max(x2, cx + w / 2);
        y1 = Math.min(y1, cy - h / 2); y2 = Math.max(y2, cy + h / 2);
      };
      const text = function (n, size) {
        if (!n || !n.textContent) return;
        if (n.style && n.style.display === 'none') return;
        const cx = parseFloat(n.getAttribute('x')), cy = parseFloat(n.getAttribute('y'));
        if (!isFinite(cx) || !isFinite(cy)) return;
        span(cx, cy, self.textW(n.textContent, size), size);
      };
      const dot = function (n, r) {
        if (!n || (n.style && n.style.display === 'none')) return;
        const cx = parseFloat(n.getAttribute('cx')), cy = parseFloat(n.getAttribute('cy'));
        if (!isFinite(cx) || !isFinite(cy)) return;
        span(cx, cy, r * 2, r * 2);
      };

      const sp = this.lastPlotted;
      if (sp && sp.a) [sp.a, sp.b].forEach(function (p) { span(px(p.x), py(p.y), SG.dotR * 2, SG.dotR * 2); });
      if (this.segParts) ['a', 'b'].forEach(function (k) {
        text(self.segParts[k].coord, SG.coordSize);
        text(self.segParts[k].name, SG.nameSize);
      });
      (this.legPlaced || []).forEach(function (l, i) {
        if (!l || !l.from) return;
        span(px(l.from.x), py(l.from.y), SG.dotR * 2, SG.dotR * 2);
        span(px(l.to.x), py(l.to.y), SG.dotR * 2, SG.dotR * 2);
        const L = self.legSlots && self.legSlots[i];
        if (!L) return;
        dot(L.dot, LG.dotR);
        text(L.coord, SG.coordSize);
        text(L.name, SG.nameSize);
        text(L.len, LG.lenSize);
      });

      const mx = Z.margin * G.stepX, my = Z.margin * G.stepY;
      const r = { x: x1 - mx, y: y1 - my, w: (x2 - x1) + 2 * mx, h: (y2 - y1) + 2 * my };
      /* Kept, so the working can be laid out beside the very thing the
         camera framed rather than beside a second guess at it. */
      this.drawnBox = { x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h };
      /* Grown to the board's own shape about its middle, so a square on
         the grid is still square and the drawing sits in the middle of
         the window rather than off one side. */
      const A = G.w / G.h;
      if (r.w / r.h < A) { const w = r.h * A; r.x -= (w - r.w) / 2; r.w = w; }
      else               { const h = r.w / A; r.y -= (h - r.h) / 2; r.h = h; }
      // never past the paper's own edge, and never wider than the board
      if (r.w >= G.w || r.h >= G.h) return null;
      r.x = Math.max(0, Math.min(G.w - r.w, r.x));
      r.y = Math.max(0, Math.min(G.h - r.h, r.y));
      return r;
    },

    /* Pushes the board in to a view, or back out to all of it. The board
       is re-placed on every frame rather than transformed: the ruling,
       the axes and everything plotted are all drawn from the view, so
       they are exactly as sharp pushed in as they are pulled out.

       Token-cancelled, like the text tweens — a screen change or a skip
       must not leave the board stopped halfway. */
    viewTo: function (rect, ms) {
      const self = this, G = C.GRID;
      const to = rect || { x: 0, y: 0, w: G.w, h: G.h };
      const from = this.viewRect();
      this.viewSeq = (this.viewSeq || 0) + 1;
      const token = this.viewSeq;
      const near = function (a, b) { return Math.abs(a - b) < 0.5; };
      /* Pushed in, the board is about one drawing rather than about the
         scale it sits on, so the axis numbers go — the axes stay, as
         lines. Set from where the push is HEADING, not from where it
         is, so the numbers leave as the board comes in and come back as
         it goes out, rather than either waiting for the other. */
      el.gridPanel.classList.toggle('framed', !!rect);
      const same = near(from.x, to.x) && near(from.y, to.y) &&
                   near(from.w, to.w) && near(from.h, to.h);
      /* Already there, and on the same footing — pushed in asking to be
         pushed in, or out asking to be out. Keep the view it has rather
         than pinning the one just asked for: they are the same view,
         and only one of them is the one everything on the board was
         last placed against. */
      if (same && (!rect === !this.view)) return;
      if (!this.box || !ms || same) {
        this.view = rect;
        if (this.box) { this.place(this.box); this.relabel(); }
        return;
      }
      const ease = function (t) {                 // cubic-bezier(.22,.61,.36,1)
        let lo = 0, hi = 1, u = t;
        for (let i = 0; i < 14; i++) {
          u = (lo + hi) / 2;
          const x = 3 * (1-u) * (1-u) * u * 0.22 + 3 * (1-u) * u * u * 0.36 + u*u*u;
          if (x < t) lo = u; else hi = u;
        }
        return 3 * (1-u) * (1-u) * u * 0.61 + 3 * (1-u) * u * u + u*u*u;
      };
      const start = performance.now();
      const step = function () {
        if (token !== self.viewSeq) return;
        const p = Math.min(1, (performance.now() - start) / ms), e = ease(p);
        self.view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e,
                      w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
        self.place(self.box);
        self.relabel();
        if (p < 1) requestAnimationFrame(step);
        else { self.view = rect; self.place(self.box); self.relabel(); }  // pinned
      };
      requestAnimationFrame(step);
    },

    /* The pair laid out again where it stands, without winding back a
       line that is already drawn — see relabel, and nameSegment, which
       lays it out again when its letters arrive (every walk's AB is a
       solid line by then: drawGuide). */
    relayPair: function () {
      if (!this.lastPlotted) return;
      const L = this.segLine;
      /* Its length from its own two ends. getTotalLength is 0 in Safari
         while the board is still hidden, as it is when a screen is
         reached with the picker and its drawing is put up before the
         board shows — and a line of no length is a line never drawn, so
         the solid AB put up a moment before was wound back out of sight. */
      const len = L ? Math.hypot(+L.getAttribute('x2') - +L.getAttribute('x1'),
                                 +L.getAttribute('y2') - +L.getAttribute('y1')) || 0 : 0;
      const was = L ? parseFloat(getComputedStyle(L).strokeDashoffset) : NaN;
      const drawn = len > 1 && was <= 1;
      this.placeSegment(this.lastPlotted);
      /* Drawn, it has no draw to come, so no round head waiting on one
         (windBack): square-ended where it meets its points. */
      if (drawn) { L.style.strokeDashoffset = 0; L.classList.remove('inking'); }
    },

    /* Everything written on the board, put back where it belongs for
       the camera it is under now. The type is set smaller as the board
       pushes in, so every offset worked out from its size has to be
       worked out again — otherwise a pair lettered at full size floats
       half a cell off its own points the moment the board comes in.

       Only the placing is redone: nothing is cleared, nothing pops
       again, and a label whose words have not changed keeps the very
       nodes it had, so a highlight lit on one of its halves survives. */
    relabel: function () {
      const self = this;
      if (this.lastPlotted) {
        /* `placeSegment` winds the line back to nothing, because almost
           everything that calls it is about to draw it. This is not:
           relabel only lays a pair out again — it is what runLegs calls
           once the sides are down, so the corners can be placed knowing
           the shape. Winding a line that is already ON the board back to
           nothing, with no animation following to bring it out again,
           is how the hypotenuse went missing from a screen that had
           merely moved its labels. Put it back where it was.

           Ask the LINE, not a class. `draw` is not on it by every route
           into a screen — an inherited pair arrives without it — and a
           test that reads the class quietly did nothing on exactly the
           screens that needed it. A stroke whose dash offset is already
           at nothing is a stroke somebody can see, whatever it is
           wearing. Only a finished one is restored: a line caught
           halfway through its own draw is left to finish. */
        this.relayPair();
      }
      (this.legPlaced || []).forEach(function (s, i) {
        if (s && self.legSlots && self.legSlots[i]) self.placeLeg(i, s);
      });
      if (this.legPlaced && this.legPlaced.length) this.clearMarksOfLines();
    },

    place: function (box) {
      const G = C.GRID, P = G.paper;
      this.box = box;
      el.gridPanel.style.left = box.x + 'px';
      el.gridPanel.style.top = box.y + 'px';
      el.gridPanel.style.width = box.w + 'px';
      el.gridPanel.style.height = box.h + 'px';

      /* The board is stretched to its box rather than fitted, so the
         two axes scale by different amounts. Anything round — the
         frame, the corners — follows the wider one. */
      /* Two scales, not one. The panel's own says how big the window is
         on the stage, and the frame round it follows that — it must not
         thicken when the board pushes in. The view's says how much board
         is inside the window, and everything drawn follows that. With no
         view set the two are the same number, which is what every screen
         but the triangle's sees. */
      const V = this.viewRect();
      const fs = box.w / G.w;
      const sx = box.w / V.w, sy = box.h / V.h;
      const st = el.gridPanel.style;
      st.setProperty('--paper-inner', P.inner);
      st.setProperty('--paper-frame', P.frame);
      st.setProperty('--paper-edge',  P.edge);
      st.setProperty('--paper-hi',    P.highlight);
      st.setProperty('--radius', P.radius * fs + 'px');
      st.setProperty('--edgeW',  P.edgeW  * fs + 'px');
      st.setProperty('--frameW', P.frameW * fs + 'px');
      st.setProperty('--hiW',   (P.frameW + P.hiW) * fs + 'px');

      /* The grid is pinned to the origin, not to the panel: a line
         every stepX across and every stepY down, so whatever size the
         board is drawn at, a line still falls on every whole
         coordinate and the numbers sit on it. */
      const cw = G.stepX * sx, ch = G.stepY * sy, lw = P.lineW;
      // measured from the corner of the view, not the corner of the board
      const left = (G.originX + P.gxFrom * G.stepX - V.x) * sx;
      const top  = (G.originY - P.gyTo   * G.stepY - V.y) * sy;
      const gs = el.gridImg.style;
      gs.left   = (left - lw / 2) + 'px';
      gs.top    = (top  - lw / 2) + 'px';
      gs.width  = ((P.gxTo - P.gxFrom) * cw + lw) + 'px';
      gs.height = ((P.gyTo - P.gyFrom) * ch + lw) + 'px';
      gs.setProperty('--cw', cw + 'px');
      gs.setProperty('--ch', ch + 'px');
      gs.setProperty('--lw', lw + 'px');
      gs.setProperty('--gridline', P.line);

      /* Keep the lines off the frame, if they reach it at all. Clipped
         rather than shrunk: the gradient's phase is measured from this
         element's own origin, so moving or resizing it slides every
         line off its coordinate, while a clip leaves them exactly
         where they fall.

         The ruling is now cut to whole cells inside the cream, so
         normally there is nothing to trim — and the clip has to go
         away entirely when that is so. Left on, its rounded corner was
         still being applied to the ruling's OWN corners: a 26px radius
         on an 83px cell, which took the corner out of the outermost
         square and left the two boundary lines stopping short of each
         other instead of meeting. */
      const inset = (P.frameW + P.hiW) * fs;
      const gw = (P.gxTo - P.gxFrom) * cw + lw, gh = (P.gyTo - P.gyFrom) * ch + lw;
      const cl = Math.max(0, inset - (left - lw / 2));
      const ct = Math.max(0, inset - (top  - lw / 2));
      const cr = Math.max(0, (left - lw / 2 + gw) - (box.w - inset));
      const cb = Math.max(0, (top  - lw / 2 + gh) - (box.h - inset));
      gs.clipPath = (cl || ct || cr || cb)
        ? 'inset(' + ct + 'px ' + cr + 'px ' + cb + 'px ' + cl +
          'px round ' + Math.max(0, P.radius * fs - inset) + 'px)'
        : 'none';

      el.gridAxes.setAttribute('viewBox', V.x + ' ' + V.y + ' ' + V.w + ' ' + V.h);
      /* Pushed in, the board runs on past the window — the parts of it
         outside the view are still drawn, just off the side of the
         panel, and #gridAxes is overflow:visible, so they would paint
         over the frame and out across the field. Clipped to the cream,
         exactly where the ruling is clipped, they are simply out of
         shot. Left alone when there is no view, so nothing that has
         always been drawn at the very edge is shaved. */
      /* Pushed in, everything inside the viewBox is magnified — the type
         with it, which left the coordinates shouting at nearly twice the
         size they were drawn at. So the type is SET smaller in the same
         proportion rather than scaled: a transform on an SVG <text> is
         the one thing this board will not do (see the axis numbers), and
         a size is a size wherever the camera is. */
      const tk = Math.min(1, V.w / G.w) * (this.textScale || 1);
      const gs2 = el.gridAxes.style, SGt = G.segment, LGt = G.leg;
      gs2.setProperty('--coordFs', (SGt.coordSize * tk) + 'px');
      gs2.setProperty('--nameFs',  (SGt.nameSize  * tk) + 'px');
      gs2.setProperty('--lenFs',   (LGt.lenSize   * tk) + 'px');
      /* From the config, like its three neighbours above. It was a 34
         written here, which no other label's size is, and which the
         code that PLACES these labels never saw — it reads resSize and
         got coordSize's 26 instead. */
      gs2.setProperty('--resFs',   ((SGt.resSize || SGt.coordSize) * tk) + 'px');

      el.gridAxes.style.clipPath = this.view
        ? 'inset(' + inset + 'px round ' + Math.max(0, P.radius * fs - inset) + 'px)'
        : 'none';
      el.gridAxes.setAttribute('preserveAspectRatio', 'none');
      el.gridAxes.style.width = box.w + 'px';
      el.gridAxes.style.height = box.h + 'px';
      this.fitArrows(V, sx, sy, inset);
      /* Anything drawn OVER the board rather than in it has to follow
         the box the same way the ruling does. The board does not know
         what that is; it only says that it moved. */
      if (this.onPlaced) this.onPlaced();
    },

    /* Pushed in, the board is clipped to the cream — and an arrowhead
       the clip runs through was drawn cut in half against the frame
       (30c's x-axis, with the table open). So an arrowhead the edge of
       the window would cut is not drawn, and its half of the axis runs
       on to its tip instead: a plain line out to the edge. One wholly in
       the window keeps its arrow; one wholly outside needs nothing, its
       line already running off the edge. Worked out in board units from
       the arrow's own points, so the pop that brings it in (a scale from
       nothing) cannot fool it; run on every placing, so it holds through
       the camera's move. */
    fitArrows: function (V, sx, sy, inset) {
      if (!this.arrows || !this.arrows.length || !this.lines) return;
      const x0 = V.x + inset / sx, x1 = V.x + V.w - inset / sx;
      const y0 = V.y + inset / sy, y1 = V.y + V.h - inset / sy;
      const halves = [this.axisX && this.axisX[0], this.axisX && this.axisX[1],
                      this.axisY && this.axisY[0], this.axisY && this.axisY[1]];
      const framed = !!this.view;
      this.arrows.forEach(function (a, i) {
        if (!a._pts) {
          a._pts = (a.getAttribute('points') || '').trim().split(/\s+/).map(function (q) {
            const xy = q.split(','); return { x: +xy[0], y: +xy[1] };
          });
        }
        const P = a._pts;
        if (P.length < 3) return;
        const l = Math.min(P[0].x, P[1].x, P[2].x), r = Math.max(P[0].x, P[1].x, P[2].x);
        const t = Math.min(P[0].y, P[1].y, P[2].y), b = Math.max(P[0].y, P[1].y, P[2].y);
        const inside = l >= x0 && r <= x1 && t >= y0 && b <= y1;
        const outside = r <= x0 || l >= x1 || b <= y0 || t >= y1;
        const cut = framed && !inside && !outside;
        if (a._cut === cut) return;
        a._cut = cut;
        a.classList.toggle('cut', cut);
        const line = halves[i];
        if (!line) return;
        if (!line._base) line._base = { x: +line.getAttribute('x2'), y: +line.getAttribute('y2') };
        const end = cut ? P[0] : line._base;             // the tip, or the arrow's base
        line.setAttribute('x2', end.x); line.setAttribute('y2', end.y);
        const len = Math.hypot(end.x - +line.getAttribute('x1'), end.y - +line.getAttribute('y1'));
        /* Drawn, it stays drawn at its new length; still drawing, the
           sweep carries on and the next placing settles it. */
        const drawn = Math.abs(parseFloat(getComputedStyle(line).strokeDashoffset) || 0) < 1;
        line._len = len;
        if (drawn) windBack(line, len, true);
      });
    },

    /* How big the type on the board actually is, against what the
       config says. Pushed in, the whole viewBox is magnified and the
       type is SET smaller in the same proportion so it stays the size
       it was drawn at — which means a label measured at its config
       size is measured at nearly twice the size it will be, and every
       offset worked out from that measure puts it half a cell from the
       point it names. Anything typographic — the ink of a label, the
       air between it and its dot — is worked out at this size. The
       drawing itself is not: a point is part of the picture and is
       meant to come closer when the board does. */
    typeScale: function () {
      const G = C.GRID, V = this.viewRect ? this.viewRect() : null;
      return (V ? Math.min(1, V.w / G.w) : 1) * (this.textScale || 1);
    },

    /* Every label on the board set smaller by `k` (a screen's
       `textScale`) — for the busy boards, a town with pictures standing
       on it, where full-size coordinates crowd each other. Applied at
       once, sizes and places both, so what is measured is what is
       drawn. */
    setTextScale: function (k) {
      k = k || 1;
      if (Math.abs((this.textScale || 1) - k) < 1e-6) return;
      this.textScale = k;
      if (!this.built || !this.box) return;
      this.place(this.box);              // the type sizes, at the new scale
      if (this.lastPlotted) this.relabel();   // and every label placed again at them
    },

    /* The sides labels are placed against: the whole shape a screen is
       building (`shape`), or failing that the sides drawn so far. Known
       from the start, every label is placed once, clear of sides that
       are not drawn yet — it used to be placed against what was up,
       and moved every time a side arrived. */
    labelLegs: function () {
      return (this.shapeLegs && this.shapeLegs.length) ? this.shapeLegs : (this.legPlaced || []);
    },

    /* What one cell measures on the stage. The board is stretched to
       its box rather than fitted, so the two axes come out different —
       which is why anything sized in cells has to ask for both. */
    cellSize: function () {
      const G = C.GRID, b = this.box || G.box;
      return { w: G.stepX * (b.w / G.w), h: G.stepY * (b.h / G.h) };
    },

    setDots: function (on) {
      if (!this.dotGroup) return;
      this.dotGroup.classList.toggle('on', !!on);
      /* Marked points are NOT cleared here any more: the second locate
         screen turns the highlighters back on, and doing it here rubbed
         out the point they had just found. They go when the board is
         rebuilt or a question plots its own segment instead. */
    },

    /* Where a point on the BOARD — in the board's own drawing units,
       which is what every label's x/y is in — sits on the stage. The
       view is part of it: pushed in, the same board point is somewhere
       else on the stage, and a flight that ignored that would leave
       from beside the label rather than out of it. */
    boardToStage: function (bx, by) {
      const G = C.GRID, b = this.box || G.box, V = this.viewRect();
      return { x: b.x + (bx - V.x) * (b.w / V.w),
               y: b.y + (by - V.y) * (b.h / V.h),
               k: b.w / V.w };
    },

    /* Where a grid point sits in stage coordinates, for effects that
       live outside the SVG. */
    stagePos: function (gx, gy) {
      const G = C.GRID, b = this.box || G.box;
      return {
        x: b.x + (G.originX + gx * G.stepX) * (b.w / G.w),
        y: b.y + (G.originY - gy * G.stepY) * (b.h / G.h)
      };
    },

    /* Writes a finished draw down, so nothing can take it away again.

       `drawOut` ends at stroke-dashoffset 0 and holds it there with
       `forwards` — the animation's FILL is the only thing keeping the
       line at full length. `animation` is one property, so anything
       that puts its own on the element replaces that fill and the line
       springs back to the offset underneath, which is nothing at all.
       That is what emptied AC on the Pythagoras beats: the working
       lights the side it names, the highlight's animation displaced the
       draw's, and the side the whole screen is about went off the board
       under its own written length.

       Committing the offset the moment the draw lands ends the argument
       for good — a later animation may do as it likes, the line is
       drawn because its own style says so, not because an animation is
       still holding it. */
    commitDraw: function (node) {
      if (!node || node.__committed) return;
      node.__committed = true;
      node.addEventListener('animationend', function (e) {
        if (e.animationName !== 'drawOut') return;
        node.style.strokeDashoffset = 0;
        node.classList.remove('inking');     // square-ended again: windBack
      });
    },

    /* Where a thing on the board sits on the STAGE — measured off what
       is painted rather than worked out from attributes, so a length
       that has been turned on its side is found where it is read and
       the camera's push-in is already in it. */
    spotOf: function (node) {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      const s = el.stage.getBoundingClientRect();
      const k = C.STAGE_W / (s.width || C.STAGE_W);
      return { x: (r.left + r.width / 2 - s.left) * k,
               y: (r.top + r.height / 2 - s.top) * k };
    },

    /* The number they have just found, wherever the board wrote it:
       against a leg, along the segment, or on the board's own label.
       Null if nothing was written — a screen that counts without
       writing a total has nothing for this to point at. */
    totalSpot: function (leg) {
      const shown = function (n) {
        if (!n || !n.textContent) return null;
        if (n.style.display === 'none') return null;
        return (+getComputedStyle(n).opacity > .05) ? n : null;
      };
      const L = (leg != null && this.legSlots) ? this.legSlots[leg] : null;
      return this.spotOf(shown(L && L.len) || shown(this.unitLabel) ||
                         shown(this.segRes));
    },

    /* Brings back pairs that were finished with screens ago, in the
       segment's own order — the two points, the line that joins them,
       their coordinates, then what the child measured. It runs under
       her line rather than before it, the way the worked subtraction
       does, so a recall never costs the screen a silent pause. */
    /* `base` is which slot the first of them goes into, so a screen can
       draw one recalled pair now and another later without the second
       landing on top of the first. */
    runExamples: function (list, later, done, base) {
      const self = this, EX = C.GRID.example;
      if (!list || !list.length || !this.exSlots || !this.exSlots.length) {
        if (done) done(); return;
      }
      let t = 0;
      list.forEach(function (spec, i) {
        const slot = self.exSlots[(base || 0) + i];
        if (!slot) return;
        /* Placed by placeSegment itself, so the labels fall exactly
           where they fell on the screen this pair came from — beside a
           wide row's points, above and below a column's. */
        self.placeSegment(spec, slot);
        slot.g.classList.add('on');
        later(function () { slot.segParts.a.dot.classList.add('pop'); SFX.tick(0); }, t + EX.dotAMs);
        later(function () { slot.segParts.b.dot.classList.add('pop'); SFX.tick(2); }, t + EX.dotBMs);
        later(function () { slot.segLine.classList.add('draw'); SFX.draw(); }, t + EX.lineMs);
        ['a', 'b'].forEach(function (k, n) {
          later(function () {
            slot.segParts[k].coord.classList.add('pop'); SFX.tick(n + 3);
          }, t + EX.coordMs + n * EX.coordStep);
        });
        if (spec.result) later(function () {
          const R = spec.result;
          self.showSegResult(spec, R.text, R.dy, R.dx, slot);
          SFX.chime();
        }, t + EX.resultMs);
        t += EX.stagger;
      });
      later(function () { if (done) done(); }, t + EX.resultMs + 300);
    },

    clearExamples: function () {
      (this.exSlots || []).forEach(function (s) {
        s.g.classList.remove('on');
        s.segLine.classList.remove('draw', 'lit');
        s.segRes.classList.remove('pop');
        if (s.segResTurn) s.segResTurn.classList.remove('blinking');
        ['a', 'b'].forEach(function (k) {
          ['dot', 'coord', 'name'].forEach(function (n) {
            s.segParts[k][n].classList.remove('pop', 'set');
          });
        });
      });
    },

    /* Shades the face of the triangle the two legs and the segment
       close. Only when all three are actually on the board — a wash
       over two lines and a gap is not a shape. */
    showTriangle: function () {
      const G = C.GRID, sp = this.lastPlotted, L = this.legPlaced || [];
      if (!this.triFill || !sp || !sp.a || !L[0] || !L[1]) return;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const corner = L[0].to;
      this.triFill.setAttribute('points',
        [sp.a, corner, sp.b].map(function (p) { return px(p.x) + ',' + py(p.y); }).join(' '));
      this.triFill.classList.toggle('park', !!this.park);
      /* The grass is set on the element, not in the stylesheet: a
         reference to something in the page, written in a stylesheet in
         another folder, is not one every browser finds — and a fill that
         cannot be found is no fill. The stylesheet's plain green stays
         under it for the browser that still misses it. */
      this.triFill.style.fill = this.park ? 'url(#parkGrass) #CFE9B2' : '';
      this.triFill.classList.add('on');
      this.plantPark([sp.a, corner, sp.b].map(function (p) { return { x: px(p.x), y: py(p.y) }; }));
    },

    /* A few trees in the park — the middle of the triangle and part of
       the way towards each corner, where no label or length is written
       (they all keep out of the face). Only on the park's screens. */
    plantPark: function (pts) {
      const NS = 'http://www.w3.org/2000/svg', G = C.GRID;
      if (!this.parkTrees) {
        this.parkTrees = document.createElementNS(NS, 'g');
        this.parkTrees.setAttribute('class', 'parktrees');
        this.triFill.parentNode.insertBefore(this.parkTrees, this.triFill.nextSibling);
      }
      const g = this.parkTrees;
      while (g.firstChild) g.removeChild(g.firstChild);
      g.classList.toggle('on', !!this.park);
      if (!this.park || !pts) return;
      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3, cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const r = G.stepX * 0.34;
      const spots = [{ x: cx, y: cy }].concat(pts.map(function (p) {
        return { x: cx + (p.x - cx) * 0.42, y: cy + (p.y - cy) * 0.42 };
      }));
      spots.forEach(function (q) {
        const t = document.createElementNS(NS, 'g');
        t.setAttribute('class', 'parktree');
        t.innerHTML =
          '<rect x="' + (q.x - r * 0.14) + '" y="' + (q.y + r * 0.35) + '" width="' + (r * 0.28) +
          '" height="' + (r * 0.75) + '" rx="' + (r * 0.08) + '" fill="#8A6A3A"/>' +
          '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + r + '" fill="#6FB24F" stroke="#4E8E34" stroke-width="' + (r * 0.12) + '"/>' +
          '<circle cx="' + (q.x - r * 0.3) + '" cy="' + (q.y - r * 0.3) + '" r="' + (r * 0.32) + '" fill="#8DCB6A"/>';
        g.appendChild(t);
      });
    },

    /* Whether the triangle is drawn as a park (a screen's `park`). */
    setPark: function (on) {
      this.park = !!on;
      if (this.triFill) {
        this.triFill.classList.toggle('park', this.park);
        this.triFill.style.fill = this.park ? 'url(#parkGrass) #CFE9B2' : '';
      }
      if (this.parkTrees) this.parkTrees.classList.toggle('on', this.park &&
        !!this.triFill && this.triFill.classList.contains('on'));
    },

    /* Does what is drawn run over an axis?

       The axes are the paper and the drawing is the subject, and where
       they meet the paper gives way. A side crossing a 7px axis of the
       same colour family, at the same weight, leaves nothing in the
       picture saying which of the two is the shape.

       Every side counts — the pair's own line and both legs — because
       all of them are the drawing. A side crosses when its two ends sit
       on opposite sides of an axis, and a corner ON one counts as well:
       a point at x = 0 has the y-axis running straight through it. */
    crossesAxis: function () {
      const on = (g) => g && g.classList && g.classList.contains('on');
      const sides = [];
      if (this.lastPlotted && this.lastPlotted.a && on(this.segGroup)) {
        sides.push([this.lastPlotted.a, this.lastPlotted.b]);
      }
      (this.legPlaced || []).forEach(function (s, i) {
        const L = this.legSlots && this.legSlots[i];
        if (s && s.from && s.to && on(L && L.g)) sides.push([s.from, s.to]);
      }, this);
      return sides.some(function (s) {
        const a = s[0], b = s[1];
        return (a.x <= 0 && b.x >= 0) || (a.x >= 0 && b.x <= 0) ||
               (a.y <= 0 && b.y >= 0) || (a.y >= 0 && b.y <= 0);
      });
    },

    /* And the class that says so. Called wherever the drawing changes,
       not only on a screen change: a beat whose legs arrive after its
       line starts not crossing and ends crossing. */
    markCrossing: function () {
      if (!el.gridPanel) return;
      el.gridPanel.classList.toggle('crossed', this.shown && this.crossesAxis());
    },

    clearLegs: function () {
      this.measLayer();          // out of a side's layer before it goes
      this.rightAngle(false);
      if (this.triFill) this.triFill.classList.remove('on');
      if (this.parkTrees) this.parkTrees.classList.remove('on');
      this.legPlaced = [];
      this.labelFace = null;
      this.markCrossing();
      if (!this.legSlots) return;
      this.legSlots.forEach(function (L) {
        L.g.classList.remove('on');
        /* `set` goes too: left on, the next side to be drawn here arrived
           already drawn instead of drawing itself. */
        L.line.classList.remove('draw', 'set');
        if (L.dashG) L.dashG.classList.remove('draw', 'set');
        ['dot', 'coord', 'name', 'len'].forEach(function (k) {
          L[k].classList.remove('pop', 'on', 'set');
        });
      });
      if (this.triFill) this.triFill.classList.remove('set');
    },

    /* Seats one leg. `spec.mark` puts a labelled corner at its far
       end; `spec.length` writes how long it is alongside it. */
    /* The row the x-axis owns: the line itself, and the numbers tucked
       under it, with a little air either side. A coordinate written
       into this band lands on one or the other, which is what happens
       to any point sitting one square above the axis. */
    /* How much room a string will actually take at a given size, used
       to decide where a label can go. getBBox would be exact but is
       only good once the text is laid out, and these decisions are made
       while placing it — so the same font is measured on a canvas
       instead, which needs nothing drawn.

       It used to be one character at 0.58 of the type size. That is
       fine for "-6" and half again too wide for "(-2,\u00A03)", where
       the brackets, the comma and the space are all narrow — and a
       label pushed off its own point by half of an over-wide measure
       floats a clear third of a cell away from the thing it names.
       Every coordinate written beside its point was doing that.

       Both metrics carry the halo the labels are painted with, so what
       is measured is what is seen. The estimate stays as the fallback
       for anywhere there is no canvas to measure on. */
    textMetrics: function (t, size) {
      const s = String(t), key = size + '\u0000' + s;
      const M = this._tm || (this._tm = {});
      if (M[key]) return M[key];
      let ctx = this._tmCtx;
      if (ctx === undefined) {
        const cv = (typeof document !== 'undefined' && document.createElement)
                 ? document.createElement('canvas') : null;
        ctx = this._tmCtx = (cv && cv.getContext) ? cv.getContext('2d') : null;
      }
      /* The halo is stroked outside the glyphs, so it widens and heightens
         what is painted by half its width on every side. */
      const halo = C.GRID.segment.haloW || 0;
      let w = 0, up = 0, down = 0;
      if (ctx) {
        ctx.font = '600 ' + size + 'px Nunito, system-ui, sans-serif';
        const m = ctx.measureText(s);
        w = m.width;
        /* The canvas measures from the alphabetic baseline; the labels
           are set `dominant-baseline: middle`, whose anchor sits half
           an x-height above it. So the two are squared up before the
           ink is reported, or a word with no descenders — "5 units" —
           comes out claiming to be centred on something it sits above. */
        const half = ctx.measureText('x').actualBoundingBoxAscent / 2;
        up = m.actualBoundingBoxAscent - half;
        down = m.actualBoundingBoxDescent + half;
      }
      if (!w) w = s.length * size * 0.58;
      /* Older engines report no ink box, and so does the test harness.
         Bracketed coordinates are the tallest thing written on the
         board, and this is about their extent either side. */
      if (!(up > 0)) { up = size * 0.37; down = size * 0.31; }
      const r = { w: w + halo, h: up + down + halo, up: up + halo / 2, down: down + halo / 2 };
      M[key] = r;
      return r;
    },

    /* The row the x numbers occupy and the column the y numbers do, by
       their INK.

       One place decides where a number goes and these two say where it
       went, so everything that has to keep clear of the numbering is
       asking the same question the placer answered. They used to be six
       separate restatements of the old placement arithmetic, which is
       how a run could be moved and the things that dodge it left
       pointing at where it had been. */
    numRow: function () {
      const G = C.GRID, m = this.textMetrics('0', G.labelSize);
      const top = G.originY + G.axisWidth / 2 + G.numGap;
      return { top: top, bot: top + m.up + m.down };
    },
    numCol: function () {
      const G = C.GRID;
      const right = G.originX - G.axisWidth / 2 - G.numGap;
      /* The widest thing the column will hold — a negative, since the
         minus is a digit wide. */
      const wide = Math.max(this.textW(numText(G.yFrom), G.labelSize),
                            this.textW(numText(G.yTo), G.labelSize));
      return { right: right, left: right - wide };
    },

    textW: function (t, size) { return this.textMetrics(t, size).w; },

    /* Measured before the webfont arrives, every label is sized to the
       fallback's metrics and stays that way. Called once the real face
       is in. */
    forgetTextMetrics: function () { this._tm = null; },

    /* Everything that was placed by measuring type, placed again: the
       axis numbers (the range's own rebuild, which is the one path that
       lays them out from scratch) and whatever pair and sides are up. */
    remeasure: function () {
      this.rebuildAxes();
      this.relabel();
    },

    /* The column the y-axis owns: the line, and its numbers down the
       left of it. */
    onYAxisCol: function (cx, w) {
      const G = C.GRID, pad = 5;
      const left = this.numCol().left - pad;
      const right = G.originX + G.axisWidth / 2 + pad;
      return cx + w / 2 > left && cx - w / 2 < right;
    },

    /* Slides a label sideways until the drawn line is no longer running
       through it, whichever way is the shorter move.

    /* Slides a label sideways until it is off the y-axis and clear of
       the numbers beside it, whichever way is the shorter move. */
    clearOfYAxis: function (cx, w) {
      if (!this.onYAxisCol(cx, w)) return cx;
      const G = C.GRID, pad = 5, air = 6;
      const left = this.numCol().left - pad - w / 2 - air;
      const right = G.originX + G.axisWidth / 2 + pad + w / 2 + air;
      return (cx - left) < (right - cx) ? left : right;
    },

    /* Keeps a label on the cream. Every offset that places one is
       measured from its own point, so the outermost column's labels
       walk off the right-hand frame as soon as the cells grow — which
       is exactly what happened when a cell went from 59px to 78px.
       Clamping here means no cell size can push one off, whatever
       offset asked for it. */
    /* What is in shot, in board units, with the frame's own thickness
       taken off every side.

       The window is the VIEW, not the paper. With no view set the two
       are the same thing and this is what it always was; pushed in they
       are not, and a label held off the paper's edge is held off a line
       the child cannot see while the edge they CAN see cuts through it.
       The frame is a fixed thickness on the stage, so the further in
       the board comes the thinner it is in board units. */
    window: function (air) {
      const G = C.GRID, P = G.paper, V = this.viewRect();
      const k = V.w / G.w;
      const edge = (P.frameW + P.hiW + air) * k;
      return { lo: V.x + edge, hi: V.x + V.w - edge,
               top: V.y + edge, bot: V.y + V.h - edge };
    },

    clampX: function (cx, w) {
      const W = this.window(8);
      return Math.max(W.lo + w / 2, Math.min(W.hi - w / 2, cx));
    },
    /* Coordinate labels get a tighter margin than everything else.
       clampX keeps 8 units of air inside the frame, which is right for
       text that is free to sit anywhere — but a coordinate is not: it
       belongs over its own point, and the widest of them at x = 6 needs
       6 of those 8 to stay centred there. Nudging it in instead left
       the two labels of one pair sitting differently against their own
       dots, and moved the label when a located point was taken over by
       a segment. Every one of them clears the frame at this margin. */
    /* ============ one way of labelling =========================
       Everything the board writes is a box that has to go somewhere
       near the thing it names and on top of nothing else. Three pieces
       do that for all of it: what is on the board already
       (`obstacles`), where a box may go (`placeBlock`), and a point's
       letter-over-coordinate stack as one box (`placePointLabel`).
       ============================================================ */

    /* Everything already inked, in board units. Rebuilt for each pass
       and grown as each label is placed, so a label never lands on one
       placed before it — and so the same screen always comes out the
       same, because the order they are placed in is fixed. */
    startLabelPass: function () {
      const G = C.GRID, self = this;
      const list = [];
      const push = function (l, t, r, b, what) {
        if (r > l && b > t) list.push({ l: l, t: t, r: r, b: b, what: what });
      };
      /* The two runs of axis numbers — taken from the numbers
         THEMSELVES rather than from a band drawn where they ought to
         be. The band started exactly at the axis and the glyphs do
         not: they are centred a little below it and reach above its
         line, so a label could sit on the top of a 5 while clearing
         the band that was supposed to describe it. */
      const nh = G.labelSize;
      let anyNum = false;
      (this.labels || []).forEach(function (n) {
        if (!n || !n.textContent) return;
        const x = parseFloat(n.getAttribute('x')), y = parseFloat(n.getAttribute('y'));
        if (!isFinite(x) || !isFinite(y)) return;
        const w = self.textW(n.textContent, nh);
        push(x - w / 2 - 2, y - nh * 0.62, x + w / 2 + 2, y + nh * 0.62, 'a number');
        anyNum = true;
      });
      if (!anyNum) {
        /* Before they exist, the bands they will occupy. */
        push(0, G.originY, G.w, self.numRow().bot, 'x numbers');
        push(self.numCol().left, 0, G.originX, G.h, 'y numbers');
      }
      /* And the two letters that name the axes — which nothing has ever
         kept clear of, and which is what `(6, 1)` was written into. */
      (this.axisNames || []).forEach(function (n) {
        if (!n) return;
        const x = parseFloat(n.getAttribute('x')), y = parseFloat(n.getAttribute('y'));
        const w = self.textW(n.textContent, G.axisName.size);
        push(x - w / 2, y - G.axisName.size / 2, x + w / 2, y + G.axisName.size / 2,
             'the ' + n.textContent);
      });
      /* The town, when one is standing on the board. Five pictures with
         their name pills, which are the biggest things on the paper and
         were the only ones the placer could not see. */
      (this.townInk || []).forEach(function (o) {
        push(o.l, o.t, o.r, o.b, o.what);
      });
      this.inked = list;
      this.inkLines = [];
      /* The two axes. `inkLine` has only ever been called for the pair
         and for the legs, so the two strongest strokes on the paper —
         heavier than anything drawn on it — were invisible to the rule
         that keeps labels off things, and a coordinate could be
         written straight across one. */
      (this.lines || []).forEach(function (l, i) {
        const x1 = parseFloat(l.getAttribute('x1')), y1 = parseFloat(l.getAttribute('y1'));
        const x2 = parseFloat(l.getAttribute('x2')), y2 = parseFloat(l.getAttribute('y2'));
        if (isFinite(x1) && isFinite(x2)) {
          self.inkLines.push({ x1: x1, y1: y1, x2: x2, y2: y2, what: 'an axis' });
        }
      });
      /* And the one obstacle that is never overridden: the inside of
         the shape. Worked out once for the pass, like the rest. */
      this.labelFace = this.shapeFace();
      /* The lengths go in BEFORE any label is placed. A length belongs
         to a side and has almost nowhere else to go; a label has eight
         directions and can be asked to move. So the length is the one
         that gets its place first and the label reads it as an
         obstacle — which is the whole of why "C" and "3 units" were
         being written through each other. */
      this.inkLengths();
      return list;
    },

    /* Every length the board is showing right now, as a box. Called at
       the top of a pass, and again whenever one lands. */
    /* The box a side's length covers, turned or not. A length set up
       its side (a column, a slant) is recorded as the words lying flat
       otherwise — a wide, short box across the paper it does not cover,
       with the strip it does cover left open. */
    lenBox: function (L) {
      const LG = C.GRID.leg, tk = this.typeScale();
      const x = parseFloat(L.len.getAttribute('x'));
      const y = parseFloat(L.len.getAttribute('y'));
      if (!isFinite(x) || !isFinite(y)) return null;
      const w = this.textW(L.len.textContent, LG.lenSize * tk);
      const h = LG.lenSize * tk;
      const m = /rotate\((-?[\d.]+)/.exec((L.lenTurn && L.lenTurn.getAttribute('transform')) || '');
      const a = m ? parseFloat(m[1]) * Math.PI / 180 : 0;
      const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
      const bw = w * ca + h * sa, bh = w * sa + h * ca;
      return { l: x - bw / 2, t: y - bh / 2, r: x + bw / 2, b: y + bh / 2 };
    },

    inkLengths: function () {
      const G = C.GRID, SG = G.segment, self = this;
      const tk = this.typeScale();
      (this.legSlots || []).forEach(function (L, i) {
        if (!L || !L.len || !L.len.textContent) return;
        if (L.len.style.display === 'none') return;
        const b = self.lenBox(L);
        if (b) self.inkBox(b.l, b.t, b.r, b.b, 'leg ' + i + ' length', L.len);
      });
      const R = this.segRes;
      if (R && R.textContent && R.classList.contains('pop')) {
        const x = parseFloat(R.getAttribute('x')), y = parseFloat(R.getAttribute('y'));
        if (isFinite(x) && isFinite(y)) {
          const size = (SG.resSize || SG.coordSize) * tk;
          const w = this.textW(R.textContent, size);
          this.inkBox(x - w / 2, y - size / 2, x + w / 2, y + size / 2,
                      'the length', R);
        }
      }
    },

    /* What a box would cost where it is: the same reckoning placeBlock
       does, so "is this position free?" and "which position is best?"
       can never answer differently. */
    /* `skip(o)` leaves an obstacle out of the reckoning (seatLength). */
    costAt: function (box, skip) {
      const self = this;
      let over = 0;
      (this.inked || []).forEach(function (o) {
        if (o.owner && o.owner === box.owner) return;   // itself
        if (skip && skip(o)) return;
        const ox = Math.min(box.r, o.r) - Math.max(box.l, o.l);
        const oy = Math.min(box.b, o.b) - Math.max(box.t, o.t);
        if (ox > 0 && oy > 0) over += ox * oy;
      });
      (this.inkLines || []).forEach(function (L) {
        if (skip && skip(L)) return;
        if (self.boxHitsLine(box, L)) over += 400;
      });
      return over;
    },

    /* A length asks for the place its own arithmetic chose. If that is
       clear it keeps it — which is what leaves every length that reads
       properly today exactly where it is, the count-out's included.
       Only a blocked one is handed to the rule, from the middle of its
       own side and pointing out of the shape. */
    seatLength: function (node, X, Y, w, h, away, owner, mid, skip) {
      const box = { l: X - w / 2, t: Y - h / 2, r: X + w / 2, b: Y + h / 2,
                    owner: owner };
      let fx = X, fy = Y;
      if (this.costAt(box, skip)) {
        /* Blocked. The search starts from the MIDDLE OF ITS OWN SIDE,
           not from the place it was hoping for — a bad position is a
           bad place to look outward from, and starting there put the
           two legs' lengths on top of each other. From the middle, one
           gap out, pointing away from the shape, is where a length
           belongs. */
        const ax = (mid && mid.x != null) ? mid.x : X;
        const ay = (mid && mid.y != null) ? mid.y : Y;
        const at = this.placeBlock(w, h, ax, ay, Math.max(10, h * 0.55), away, null);
        fx = at.x; fy = at.y;
      }
      node.setAttribute('x', fx);
      node.setAttribute('y', fy);
      this.inkBox(fx - w / 2, fy - h / 2, fx + w / 2, fy + h / 2,
                  'a length', owner);
      return { x: fx, y: fy };
    },

    /* A line of the drawing: labels keep off these too. */
    inkLine: function (x1, y1, x2, y2, what) {
      (this.inkLines || []).push({ x1: x1, y1: y1, x2: x2, y2: y2, what: what });
    },
    /* `owner` is the thing the box belongs to — a label's own node.
       Given one, this REPLACES that owner's previous box rather than
       adding a second.

       A corner's label is placed twice: once as its leg is drawn, and
       again once every leg is down and the lengths are known. Without
       an owner the first box stays in the list, and the second pass
       then reads its own ghost as an obstacle and shoves the label out
       of the very place it had just chosen. That is why C's label sat
       above its point with clear paper underneath. */
    inkBox: function (l, t, r, b, what, owner) {
      if (!this.inked || r <= l || b <= t) return;
      if (owner) {
        for (let i = this.inked.length - 1; i >= 0; i--) {
          if (this.inked[i].owner === owner) this.inked.splice(i, 1);
        }
      }
      this.inked.push({ l: l, t: t, r: r, b: b, what: what, owner: owner });
    },

    /* Does a box cross a line segment? Cheap and exact enough: the
       segment is walked in steps no longer than the box is small. */
    boxHitsLine: function (B2, L) {
      const dx = L.x2 - L.x1, dy = L.y2 - L.y1;
      const n = Math.max(2, Math.ceil(Math.hypot(dx, dy) /
                Math.max(6, Math.min(B2.r - B2.l, B2.b - B2.t) / 2)));
      for (let i = 0; i <= n; i++) {
        const x = L.x1 + dx * i / n, y = L.y1 + dy * i / n;
        if (x > B2.l && x < B2.r && y > B2.t && y < B2.b) return true;
      }
      return false;
    },

    /* Where a block of this size sits so that its NEAREST INK is
       `gap` from the point, in this direction.

       It used to be `gap` on each axis at once, which is the right
       distance for the four cardinals and `gap × √2` — 41% too far —
       for the four diagonals. The diagonals are the ones a label
       reaches for first, because they are the ones that keep clear of
       the drawing, so every label placed the preferred way was placed
       the furthest way. Measured along the direction instead, all
       eight hug their point by the same amount. */
    blockAt: function (w, h, X, Y, d, gap) {
      const m = Math.hypot(d[0], d[1]) || 1;
      const cx = X + (d[0] / m) * gap + d[0] * w / 2;
      const cy = Y + (d[1] / m) * gap + d[1] * h / 2;
      return { x: cx, y: cy,
               box: { l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2 } };
    },

    /* The closed region the drawing encloses — the same three corners
       `showTriangle` washes in, whether or not it is actually shaded:
       a label in a triangle is in the triangle either way. Null while
       nothing is closed, because two points and a line enclose
       nothing. */
    shapeFace: function () {
      const G = C.GRID, sp = this.lastPlotted, L = this.labelLegs();
      if (!sp || !sp.a || !sp.b || !L[0] || !L[1] || !L[0].to) return null;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const poly = [sp.a, L[0].to, sp.b].map(function (p) {
        return { x: px(p.x), y: py(p.y) };
      });
      /* Three points on one line enclose nothing either. */
      const ar = (poly[1].x - poly[0].x) * (poly[2].y - poly[0].y) -
                 (poly[2].x - poly[0].x) * (poly[1].y - poly[0].y);
      return Math.abs(ar) < 1 ? null : poly;
    },

    inFace: function (x, y, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a.y > y) !== (b.y > y) &&
            x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    },

    /* Any part of this box in that face: a corner of the box inside it,
       a corner of it inside the box, or one of its sides crossing the
       box — which is the same as part of the box being inside. */
    boxHitsFace: function (B2, poly) {
      if (!poly || poly.length < 3) return false;
      const cs = [[B2.l, B2.t], [B2.r, B2.t], [B2.l, B2.b], [B2.r, B2.b]];
      for (let i = 0; i < cs.length; i++) {
        if (this.inFace(cs[i][0], cs[i][1], poly)) return true;
      }
      for (let i = 0; i < poly.length; i++) {
        const v = poly[i];
        if (v.x > B2.l && v.x < B2.r && v.y > B2.t && v.y < B2.b) return true;
        const u = poly[(i + 1) % poly.length];
        if (this.boxHitsLine(B2, { x1: v.x, y1: v.y, x2: u.x, y2: u.y })) return true;
      }
      return false;
    },

    /* Where a box of this size may sit beside this point. Eight places,
       sorted so the one pointing AWAY from the drawing comes first — a
       label belongs outside the shape it is labelling, never in its
       fill.

       Two rules, and only one of them bends. A label hugs its point:
       its nearest ink is `gap` off the dot, the same `gap` in all eight
       directions. And no label is ever inside a shape. So the search
       walks OUTWARD when it has to, and never inward: every step keeps
       clear of the face, including the least-bad one it settles for. A
       label pressed against the frame is untidy; a label in the fill is
       written on the thing it is annotating. */
    placeBlock: function (w, h, X, Y, gap, away, keep) {
      const self = this, W = this.window(2);
      const DIRS = [[1,-1],[-1,-1],[1,1],[-1,1],[0,-1],[0,1],[1,0],[-1,0]];
      const ax = away && (away.x || away.y) ? away : { x: 1, y: -1 };
      const aim = Math.atan2(-ax.y, ax.x);
      let order = DIRS.slice().sort(function (p, q) {
        const dp = Math.abs(Math.atan2(-p[1], p[0]) - aim);
        const dq = Math.abs(Math.atan2(-q[1], q[0]) - aim);
        const wp = Math.min(dp, Math.PI * 2 - dp), wq = Math.min(dq, Math.PI * 2 - dq);
        return wp - wq;
      });
      /* The side it is already on goes first. A push-in re-places every
         label on every frame, and a label that changes its mind between
         two equally good sides does it sixty times a second — which is
         what 402 frames of drift looked like. It only moves when the
         side it is on has stopped being clear. */
      if (keep) {
        order = [keep].concat(order.filter(function (d) {
          return d[0] !== keep[0] || d[1] !== keep[1];
        }));
      }
      const face = this.labelFace;
      const cost = function (box) {
        let over = 0;
        (self.inked || []).forEach(function (o) {
          const ox = Math.min(box.r, o.r) - Math.max(box.l, o.l);
          const oy = Math.min(box.b, o.b) - Math.max(box.t, o.t);
          if (ox > 0 && oy > 0) over += ox * oy;
        });
        (self.inkLines || []).forEach(function (L) {
          if (self.boxHitsLine(box, L)) over += 400;
        });
        return over;
      };
      /* Distance stretches; outside does not. Every direction at `gap`
         first, then the same eight walked out a step at a time, and
         only then the least bad of everything that was outside. */
      const OUT = [0, gap * 0.8, gap * 1.8, gap * 3.2, gap * 5.4];
      let best = null;
      for (let s = 0; s < OUT.length; s++) {
        for (let i = 0; i < order.length; i++) {
          const d = order[i];
          const at = this.blockAt(w, h, X, Y, d, gap + OUT[s]);
          const box = at.box;
          /* Off the paper is not a candidate at all. */
          if (box.l < W.lo || box.r > W.hi || box.t < W.top || box.b > W.bot) continue;
          /* Nor is inside the shape, however bad the alternatives. */
          if (face && this.boxHitsFace(box, face)) continue;
          const over = cost(box);
          /* A few square pixels is a graze, not a collision. The dots
             are inked at their radius plus four, so a label hugging
             its own point at the measured gap clips the NEXT point's
             box by a pixel or two — and demanding a dead-zero score
             threw away every direction over that, fell through to the
             least-bad, and put C's coordinates on the axis numbering
             with clear paper one step to the left. */
          if (over <= 12) return { x: at.x, y: at.y, box: box, dir: d };
          if (!best || over < best.over) {
            best = { x: at.x, y: at.y, box: box, over: over, dir: d };
          }
        }
      }
      if (best) return best;
      /* Nowhere on the paper at all: clamped where it was asked for —
         and still not into the face, which is the one thing that never
         gives. */
      for (let i = 0; i < order.length; i++) {
        const at = this.blockAt(w, h, X, Y, order[i], gap);
        const cx2 = this.clampLabel(at.x, w), cy2 = this.clampY(at.y, h);
        const box = { l: cx2 - w/2, t: cy2 - h/2, r: cx2 + w/2, b: cy2 + h/2 };
        if (face && this.boxHitsFace(box, face)) continue;
        return { x: cx2, y: cy2, box: box, dir: order[i] };
      }
      const cx = this.clampLabel(X + (ax.x >= 0 ? 1 : -1) * (gap + w / 2), w);
      const cy = this.clampY(Y - (gap + h / 2), h);
      return { x: cx, y: cy,
               box: { l: cx - w/2, t: cy - h/2, r: cx + w/2, b: cy + h/2 } };
    },

    /* A point's letter and its coordinate, as ONE thing: the letter
       over the coordinate, centred on each other, placed once and kept
       clear once. They are one fact about one point, and two labels on
       opposite sides of a dot is that fact taken to pieces. */
    placePointLabel: function (part, p, X, Y, opt) {
      const G = C.GRID, SG = G.segment, tk = this.typeScale();
      opt = opt || {};
      const ctext = opt.ctext || '';
      const ntext = (opt.ntext != null ? opt.ntext : p.name) || '';
      const cm = ctext ? this.textMetrics(ctext, SG.coordSize * tk) : null;
      const nm = ntext ? this.textMetrics(ntext, SG.nameSize * tk) : null;
      const cw = cm ? cm.w : 0, ch = cm ? (SG.coordSize * tk) : 0;
      const nw = nm ? nm.w : 0, nh = nm ? (SG.nameSize * tk) : 0;
      const lead = (cm && nm) ? SG.stackGap * tk : 0;
      const w = Math.max(cw, nw), h = nh + lead + ch;
      if (!w || !h) return null;
      const gap = SG.dotR + SG.dotStrokeW / 2 + SG.coordGap * tk;

      /* Which side of its point it is already on, so it keeps that side
         while the side is still clear — see `placeBlock`. */
      /* A point the child located already has a side — the one its
         mark used — and the pair it becomes keeps it, so the label does
         not shuffle the moment the two are joined. */
      const wasFound = (this.foundSide || {})[opt.at];
      /* A side the board was TOLD to use outranks both of those.

         The rule works out which way is "away" from the centroid of
         what is drawn, which is right nearly everywhere — but it reads
         `lastPlotted`, and on a screen that inherits its board the
         mark can be seated while that is still the previous screen's
         pair. The direction it picks then is frozen by heldDir, and
         nothing re-places a leg's mark once the camera has settled, so
         an early guess is final. Where that goes wrong the board can
         say where the label belongs and be believed. */
      const pin = opt.pin ? [opt.pin.x, opt.pin.y] : null;
      /* Its own last box out of the way first. Left in, a label placed
         a second time found its own ghost on the spot it had chosen and
         moved off it — C's label went left of C, then below-right of it,
         in the same frame, and on the next screen somewhere else again. */
      const mine = part.coord || part.name;
      if (mine && this.inked) {
        this.inked = this.inked.filter(function (o) { return o.owner !== mine; });
      }
      const at = this.placeBlock(w, h, X, Y, gap,
             pin ? opt.away : (part.heldDir ? opt.away : (wasFound ?
               { x: 0, y: -wasFound[1] } : opt.away)),
             pin || part.heldDir || wasFound);
      part.heldDir = at.dir;

      /* And now measured to the INK.

         `placeBlock` places a BOX, but the ink inside it is a narrow
         letter sitting over a wider coordinate — so the nearest glyph
         to the dot is hardly ever the box's own corner, and the gap
         the box keeps is not the gap anyone sees. That is what left A
         at 26.9px from its dot and C at 0.7, touching, off the same
         one number.

         So the block slides along the direction it already chose
         until the nearest of its two runs of ink is exactly `gap` from
         the point. It only ever moves along that direction, so a
         position the rule approved stays the position it approved.

         This is what `labels-hug-their-points` §2 asked for and could
         not have while the thing placed and the thing measured were
         different shapes. */
      if (at.dir) {
        const dm = Math.hypot(at.dir[0], at.dir[1]) || 1;
        const ux = at.dir[0] / dm, uy = at.dir[1] / dm;
        const inkNear = function (bx) {
          let best = Infinity;
          const runs = [];
          if (nm) runs.push({ l: bx.l + (w - nw) / 2, t: bx.t,
                              r: bx.l + (w + nw) / 2, b: bx.t + nh });
          if (cm) runs.push({ l: bx.l + (w - cw) / 2, t: bx.b - ch,
                              r: bx.l + (w + cw) / 2, b: bx.b });
          runs.forEach(function (r) {
            const dx = Math.max(r.l - X, 0, X - r.r);
            const dy = Math.max(r.t - Y, 0, Y - r.b);
            best = Math.min(best, Math.hypot(dx, dy));
          });
          return best;
        };
        const have = inkNear(at.box);
        const slide = have - gap;
        if (isFinite(have) && Math.abs(slide) > 0.5) {
          at.x -= ux * slide;
          at.y -= uy * slide;
          at.box = { l: at.x - w / 2, t: at.y - h / 2,
                     r: at.x + w / 2, b: at.y + h / 2 };
        }
      }
      /* Seated inside the block: letter on top, coordinate under it.
         No plate — the words carry their own paper halo and the panel
         behind the FORMULA is the only panel on this board. */
      if (nm) {
        part.name.setAttribute('x', at.x);
        part.name.setAttribute('y', at.box.t + nh / 2);
      }
      if (cm) {
        part.coord.setAttribute('x', at.x);
        part.coord.setAttribute('y', at.box.b - ch / 2);
      }
      /* Owned by this label's own coordinate node, so placing it again
         supersedes where it was rather than adding a second obstacle. */
      this.inkBox(at.box.l, at.box.t, at.box.r, at.box.b,
                  (ntext || ctext) + ' label', part.coord || part.name);
      return at;
    },

    clampLabel: function (cx, w) {
      const W = this.window(2);
      return Math.max(W.lo + w / 2, Math.min(W.hi - w / 2, cx));
    },

    clampY: function (cy, h) {
      const W = this.window(8);
      return Math.max(W.top + h / 2, Math.min(W.bot - h / 2, cy));
    },

    /* Whether the axes' numbers are on show: not on a board that has
       none (`numbers: false`, from 30 on), and not pushed in (`framed`),
       where they are faded out. */
    numbersShown: function () {
      return !el.gridPanel.classList.contains('unnumbered') &&
             !el.gridPanel.classList.contains('framed');
    },

    onXAxisRow: function (cy, h) {
      const G = C.GRID, pad = 5;
      const top = G.originY - G.axisWidth / 2 - pad;
      const bot = this.numRow().bot + pad;
      return cy + h / 2 > top && cy - h / 2 < bot;
    },

    placeLeg: function (i, spec) {
      const G = C.GRID, LG = G.leg, L = this.legSlots[i];
      /* Kept so the camera can frame what is actually drawn. */
      this.legPlaced = this.legPlaced || [];
      /* What was in this slot a moment ago, before it is overwritten:
         the same side, still on the board, is a side being HANDED OVER
         rather than one arriving. */
      const was = this.legPlaced[i];
      this.legPlaced[i] = spec;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const f = spec.from, t = spec.to;
      const x1 = px(f.x), y1 = py(f.y), x2 = px(t.x), y2 = py(t.y);
      // the size the camera is actually setting this leg's labels at

      /* Its own colour, by which way it runs — the length written
         beside it takes the same one, so the two read as one thing. */
      const side = (f.y === t.y) ? (LG.hColor || LG.color) : (LG.vColor || LG.color);
      L.line.setAttribute('stroke', side);
      L.len.setAttribute('fill', side);
      /* Its own colour as `color` too, so a glow can be drawn in it:
         one warm glow round all three reads on the navy diagonal and
         vanishes against the orange and the green. */
      L.line.style.color = side;
      if (L.dash) L.dash.style.color = side;

      /* Dotted while it is a guide, solid once it is known. Only one of
         the two is ever on the board. */
      if (L.dash) {
        /* Up to each point's ring and no further — so it reads as
           running on behind the point, the way the solid side does —
           with its dots spaced to fit, one against each ring. Its
           stroke does not scale, so its width is converted to board
           units before it is measured against the dots. */
        const k = this.hostScale();
        const cw = (+L.dash.getAttribute('stroke-width') || 0) / k;
        const e = inset(x1, y1, x2, y2, this.clearPoint(x1, y1, cw) - 4,
                        this.clearPoint(x2, y2, cw) - 4);
        L.dash.setAttribute('x1', e[0]); L.dash.setAttribute('y1', e[1]);
        L.dash.setAttribute('x2', e[2]); L.dash.setAttribute('y2', e[3]);
        L.dash.setAttribute('stroke-dasharray', evenDots(LG.dashArray || '2 14',
          Math.hypot(e[2] - e[0], e[3] - e[1]) * k));
        L.dash.setAttribute('stroke', side);
        L.dashG.style.transformOrigin = x1 + 'px ' + y1 + 'px';
        L.dashG.style.display = spec.dash ? '' : 'none';
        L.line.style.display = spec.dash ? 'none' : '';
      }

      /* A solid side meets each point at its white ring and stops —
         it does not run on to the centre. Every leg lives in a layer of
         its own, and a later layer paints over an earlier one's dots:
         CB was drawn straight across C's orange. Stopping at the ring
         kept the joint clean whatever order the layers were in. (The
         dotted guide above stops short with air; a solid line touches.)*/
      /* …and exactly TO it, with no paper between: stopped a cap's width
         short, the round end only touched the round ring at one spot and
         left a gap either side of it. The end is square now, its corners
         on the ring (meetPoint), and the point is drawn over it — every
         point is above every side (the second side's layer sits under
         the first's, so the corner C is on top of both). */
      const lw = +L.line.getAttribute('stroke-width') || LG.width || 0;
      const le = inset(x1, y1, x2, y2, this.meetPoint(x1, y1, lw),
                       this.meetPoint(x2, y2, lw));
      L.line.setAttribute('x1', le[0]); L.line.setAttribute('y1', le[1]);
      L.line.setAttribute('x2', le[2]); L.line.setAttribute('y2', le[3]);
      const len = Math.hypot(le[2] - le[0], le[3] - le[1]);
      /* Wound back to nothing, so the leg can draw itself on. A side
         the board is CARRYING OVER is already there and goes down at
         full length instead — and both that and the `set` mark are
         done here, in the one place that winds a leg back, because
         this runs again every time the board is laid out.

         `set` has to be taken OFF as well as put on. A leg slot is
         reused screen after screen: left on from the screen that
         carried the side over, it switched off the draw on the next
         screen that wanted one, and a side that should have been
         drawing sat wound back to nothing under its own written
         length. It follows the spec now, every time. */
      /* Wound back only if it has yet to be on the board at all.

         Three ways a side is already there. It says `settled`. Or it
         still carries `draw`, which means nothing has cleared this
         board since it drew — `clearLegs` is what takes that class off.
         Or the slot held this very side a moment ago and the group is
         still up: a dotted guide going solid, which is the same two
         points and the same span, drawn differently. That last one is
         what made CB vanish and draw itself again one screen after the
         guide had already shown the child where it ran — the hand-over
         from guide to found side should be a change of dress, not a
         second arrival. */
      const shownAlready = !!(was && was.from && was.to &&
        was.from.x === f.x && was.from.y === f.y &&
        was.to.x === t.x && was.to.y === t.y &&
        L.g.classList.contains('on') &&
        (L.line.classList.contains('draw') ||
         (L.dashG && L.dashG.classList.contains('draw'))));
      const held = !!spec.settled || L.line.classList.contains('draw') ||
                   shownAlready;
      windBack(L.line, len, held);
      const quietly = !!spec.settled || shownAlready;
      /* Read back by `placeLegs`, which decides whether this side
         arrives on a clock or is simply on. */
      L.handedOver = shownAlready;
      L.line.classList.toggle('set', quietly);
      if (L.dashG) L.dashG.classList.toggle('set', quietly);

      if (spec.mark) {
        L.dot.setAttribute('cx', x2); L.dot.setAttribute('cy', y2);
        // the corner can be drawn as a plotted point rather than a leg end
        L.dot.setAttribute('fill', spec.mark.fill || side);
        if (spec.mark.coordParts) {
          /* In parts, so a working can lift a half out of them — the same
             words either way, so nothing on the paper changes. */
          while (L.coord.firstChild) L.coord.removeChild(L.coord.firstChild);
          spec.mark.coordParts.forEach(function (f) {
            const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.textContent = f.t;
            if (f.glow) {
              ts.classList.add('glowable');
              if (typeof f.glow === 'string') ts.dataset.part = f.glow;
            }
            L.coord.appendChild(ts);
          });
        } else {
          L.coord.textContent = spec.mark.coordText ||
                                ('(' + numText(t.x) + ',\u00A0' + numText(t.y) + ')');
        }
        L.name.textContent = spec.mark.name || '';
        /* The corner's letter and its coordinate are one block, placed
           by the same rule every other point's are — out of the shape,
           clear of the axes, their numbers and their letters. It used
           to have three special cases of its own and still ended up
           floating in the middle of its own triangle. */
        const away = (function (self) {
          const drawn = self.lastPlotted;
          if (!drawn || !drawn.a) return { x: 1, y: -1 };
          const mx = (px(drawn.a.x) + px(drawn.b.x) + x2) / 3;
          const my = (py(drawn.a.y) + py(drawn.b.y) + y2) / 3;
          return { x: x2 - mx, y: y2 - my };
        })(this);
        /* `mark.away` is the board naming the side itself, for the
           corners where the worked-out one comes out wrong. */
        const pin = spec.mark.away || null;
        this.placePointLabel(
          L.markLabel || (L.markLabel = { coord: L.coord, name: L.name }),
          { name: spec.mark.name, coordText: L.coord.textContent },
          x2, y2, { ctext: L.coord.textContent, away: pin || away, pin: pin });
        L.dot.style.display = L.coord.style.display = L.name.style.display = '';
      } else {
        L.dot.style.display = L.coord.style.display = L.name.style.display = 'none';
      }

      if (spec.length) {
        /* How long the leg is, not how far round it. Every leg in this
           game used to run along a row or a column, where the two are
           the same number — and they stop being the same the moment a
           leg is a side of an ordinary triangle, where |dx| + |dy| gave
           21 for a side of length 15. Measured properly, an
           axis-parallel leg is unchanged: one of the two terms is zero
           and the root of the other squared is the other. */
        const d = Math.hypot(t.x - f.x, t.y - f.y);
        const n = Math.abs(d - Math.round(d)) < 1e-9
          ? Math.round(d) : Math.round(d * 100) / 100;
        /* A leg can name its length instead of measuring it — the
           general case labels it x2 - x1 rather than 10 units. */
        this.placeLegLength(i, f, t,
          spec.lengthText || (n + '\u00A0unit' + (n === 1 ? '' : 's')));
        L.len.style.display = '';
      } else {
        L.len.style.display = 'none';
      }
    },

    /* Where a leg writes how long it is.
       Its own, so the count-out can put a measured total in the very
       place the leg's label goes: one label, written once, which the
       next screen keeps rather than replacing with an identical one of
       its own — which is what made the length appear, vanish and come
       back a moment later in a different colour. */
    placeLegLength: function (i, f, t, txt) {
      const G = C.GRID, LG = G.leg, L = this.legSlots[i];
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const x1 = px(f.x), y1 = py(f.y), x2 = px(t.x), y2 = py(t.y);
      const tk = this.typeScale(), self2 = this;
      /* A length already on the board, saying the same thing about the
         same side at the same size, stays exactly where it is. Worked
         out again on every screen, it came out somewhere else whenever
         anything near it had changed — "2 units" jumped from beside C to
         above B as the table screen opened, and took C's label with it. */
      const norm = function (v) { return String(v || '').replace(/\u00A0/g, ' '); };
      const sideKey = [Math.min(f.x, t.x), Math.min(f.y, t.y), Math.max(f.x, t.x), Math.max(f.y, t.y)].join(',');
      const was = L.lenAt;
      if (was && L.len.classList.contains('pop') && L.len.style.display !== 'none' &&
          was.side === sideKey && norm(was.txt) === norm(txt) && Math.abs(was.tk - tk) < 1e-6 &&
          norm(L.len.textContent) === norm(txt)) {
        return;
      }
      L.lenAt = { side: sideKey, txt: txt, tk: tk };
      {
        const horiz = (f.y === t.y);
        /* Above a horizontal leg — inside the right angle, where the
           board is empty. Beside a vertical one, pushed along it
           towards the corner it starts from: the far end of that side
           carries the other point's coordinates.

           And beside it on the side the rest of the drawing is on —
           inside the shape, not out in the margin. Always taking the
           right-hand side put the outermost column's length past the
           frame, and the clamp does not decline, it drags: it came back
           and landed along the leg it was measuring. */
        const towardCorner = y1 > y2 ? 1 : -1;
        /* Which side of this leg the rest of the drawing is on — and so
           which side the length may not have. A length is the one label
           that may sit along the side it belongs to, but not in the
           face: written there it is written on the very thing it is
           measuring. Both of these used to be aimed deliberately
           inward, so a triangle carried both its lengths in its own
           fill.

           Taken from the pair the legs hang off rather than from the
           closed face, so the answer is the same before and after the
           third side lands: the side that is going to be the inside is
           already the inside while the shape is still open, and a
           length the child has just counted does not jump when the
           triangle closes round it. */
        const drawn = this.lastPlotted;
        let inner = 1, vSide = 1;
        if (drawn && drawn.a && drawn.b) {
          const mx = (px(drawn.a.x) + px(drawn.b.x)) / 2;
          const my = (py(drawn.a.y) + py(drawn.b.y)) / 2;
          if (horiz) vSide = (my <= y1) ? -1 : 1;   // pair above it: write below
          else inner = (mx <= x1) ? 1 : -1;         // pair to its left: write right
        }
        /* A side that runs neither along a row nor down a column.

           Every leg in this lesson was one or the other, so there were
           two cases and "not horizontal" meant vertical. The closing
           triangle has an ordinary diagonal for its third side, and it
           went through the vertical branch: turned on its end and set
           against x1 — which is the column the OTHER side runs down.
           So the park's 15 units was written up the same line as its
           14, two lengths stacked on one side and neither of them
           beside the side it measures.

           A diagonal is written along itself, the way a vertical one
           is, but at its own angle: laid on the midpoint, turned to
           the line, and pushed off it along the normal that points
           away from the rest of the drawing. */
        const vert = (f.x === t.x);
        const diag = !horiz && !vert;
        let ang = 0, nx = 0, ny = 0;
        if (diag) {
          const ux = x2 - x1, uy = y2 - y1, m = Math.hypot(ux, uy) || 1;
          ang = Math.atan2(uy, ux) * 180 / Math.PI;
          /* Never upside down: a label reads left to right whichever
             way its side happens to run. */
          if (ang > 90) ang -= 180;
          if (ang < -90) ang += 180;
          nx = -uy / m; ny = ux / m;
          if (drawn && drawn.a && drawn.b) {
            const cx0 = (px(drawn.a.x) + px(drawn.b.x)) / 2;
            const cy0 = (py(drawn.a.y) + py(drawn.b.y)) / 2;
            if (((x1 + x2) / 2 - cx0) * nx + ((y1 + y2) / 2 - cy0) * ny < 0) {
              nx = -nx; ny = -ny;
            }
          }
        }
        const face = this.shapeFace();
        /* A vertical leg's length is TURNED and set along its own
           line, just outside it. Laid across, "3 units" had to stand
           78px off the leg to clear it and still read as a caption
           floating beside the drawing; turned, it is a label ON the
           side it measures and sits a line's width away. */
        const turn = !horiz;
        const off = turn ? (LG.lenSize * tk * 0.62 + LG.width) : 0;
        let lx = horiz ? (x1 + x2) / 2 : (x1 + inner * off);
        let ly = horiz ? y1 + vSide * LG.lenGap * tk
                       : (y1 + y2) / 2 + towardCorner * LG.lenBiasV * tk;
        if (diag) {
          lx = (x1 + x2) / 2 + nx * off;
          ly = (y1 + y2) / 2 + ny * off;
        }
        /* A leg centred on the origin writes its length straight down
           the y-axis, so it slides along its own leg towards the corner
           until it is clear of the axis and the numbers beside it. */
        const lw2 = this.textW(txt, LG.lenSize * tk);
        /* Turned, its footprint is on its side: as wide as the type is
           tall, and as tall as the words are long. */
        const lh2 = LG.lenSize * tk;
        /* Turned, its footprint is on its side: as wide as the type is
           tall, and as tall as the words are long. At an angle it is
           neither, so it is measured as the box actually covers. */
        const ca = Math.abs(Math.cos(ang * Math.PI / 180));
        const sa = Math.abs(Math.sin(ang * Math.PI / 180));
        const bw = diag ? (lw2 * ca + lh2 * sa) : (turn ? lh2 : lw2);
        const bh = diag ? (lw2 * sa + lh2 * ca) : (turn ? lw2 : lh2);
        if (horiz) lx = this.clearOfYAxis(lx, lw2);
        else if (!diag && Math.abs(this.clampX(lx, lw2) - lx) > 0.5) {
          /* No room on that side after all: take the other one whole —
             unless the other one is the inside of the shape, which it
             may not have at any price. Then it comes in against the
             frame instead, which is untidy where the fill is wrong. */
          if (!face) lx = x1 - inner * LG.lenGapV * tk;
        }
        /* And a vertical leg whose middle is level with the x-axis
           writes its length across the axis numbering — "14 units" over
           the 3, 4 and 5. It slides along its own leg, towards the
           corner it starts from, until it is out of that row: the same
           courtesy showSegResult already does for a pair's own length,
           and the same row it measures against. */
        let lyOut = ly;
        /* Only where there are numbers to keep off. From 30 on the board
           carries none, and pushed in (framed) it hides them — then the
           row is only the axis line, which a turned length stands across
           and reads over on its paper halo, so it stays at the middle of
           its side ("6 units" on 30c, next to CB's middle). */
        if (!horiz && !diag && this.numbersShown()) {
          /* Turned, it stands as tall as its words are long, and that
             whole height has to clear the row, not the type's own. Tested
             against the type's height it stopped half across the axis
             and was handed to seatLength as blocked, which carried it a
             long way out from its side ("6 units" on 30c, 27 units off
             the line where every other length is 3 or 4). */
          const band = LG.lenSize * tk;
          let guard = 0;
          while (this.onXAxisRow(lyOut, bh) && guard++ < 16) {
            lyOut += towardCorner * band * 0.55;
          }
        }
        /* A vertical leg on the outermost column writes its length past
           the frame — 78px beside x=6 is off the cream once a cell is
           78px wide. */
        let fx = this.clampX(lx, bw), fy = this.clampY(lyOut, bh);
        /* And out of the face, which the outer side cannot always
           manage: beside the outermost column there are 53px of paper
           and "3 units" is 136 wide, so the clamp does not decline, it
           drags — and what it drags the length into is the shape it is
           measuring. Then it slides ALONG its own leg instead, the
           shorter way, until it is past the corner and out. Along the
           side is where a length belongs; inside the face is the one
           place beside that side it may not be. */
        /* Not a slanted one: it is set off its line along the normal that
           points away from the face, so its words cannot be in the face —
           and the upright box round slanted words always is, which slid
           it off along its side. */
        if (face && !diag) {
          const hw = bw / 2, hh = bh / 2;
          const hits = function (X, Y) {
            return self2.boxHitsFace({ l: X - hw, t: Y - hh, r: X + hw, b: Y + hh }, face);
          };
          if (hits(fx, fy)) {
            const ux = x2 - x1, uy = y2 - y1, m = Math.hypot(ux, uy) || 1;
            const step = Math.max(8, LG.lenSize * tk * 0.4);
            for (let n = 1; n <= 60; n++) {
              let done = false;
              for (let s2 = 1; s2 >= -1 && !done; s2 -= 2) {
                const X = this.clampX(fx + (ux / m) * step * n * s2, bw);
                const Y = this.clampY(fy + (uy / m) * step * n * s2, bh);
                if (!hits(X, Y)) { fx = X; fy = Y; done = true; }
              }
              if (done) break;
            }
          }
        }
        /* And then the one rule has the last word. Everything above
           says where this length would LIKE to be; `seatLength` keeps
           that place when it is free — which is every length that
           reads properly today, the count-out's included — and only
           hands a blocked one to the solver, out of the middle of its
           own side and away from the shape. It was this step's absence
           that let "3 units" be written across the x-axis letter and
           through the corner's own C. */
        /* A length written in letters — x₂ − x₁ — is three pieces, so
           it can be put together the way it is read (flyIntoLeg): the
           first term, the sign, the second term. The sign keeps its
           spaces unbreakable, or the text's own spacing rules would eat
           them at the join between two pieces. */
        const pieces = /^(\S+) ([\u2212-]) (\S+)$/.exec(txt);
        if (pieces) {
          L.len.textContent = '';
          [pieces[1], '\u00A0' + pieces[2] + '\u00A0', pieces[3]].forEach(function (t2) {
            const sp = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            sp.setAttribute('class', 'lpart');
            sp.textContent = t2;
            L.len.appendChild(sp);
          });
        } else L.len.textContent = txt;
        const outX = diag ? nx : (horiz ? 0 : (inner >= 0 ? 1 : -1));
        const outY = diag ? ny : (horiz ? (vSide >= 0 ? 1 : -1) : 0);
        /* An upright length on a board showing no numbers (see the slide
           above) does not count the numbers — laid out, but not shown —
           or the x-axis line it stands across as in its way: it stays by
           the middle of its side (30c's "6 units"). */
        const across = (!this.numbersShown() && !horiz && !diag)
          ? function (o) { return o.what === 'a number' || (o.what === 'an axis' && o.y1 === o.y2); }
          : null;
        /* A slanted side's length is set where it was put — just off its
           line, turned to it — as a slanted pair's is (showSegResult). The
           rule that seats a blocked label tests the upright box round the
           words, and round slanted words that box always crosses the very
           line they lie beside: every one was "blocked" and sent off, 59's
           "15 units" a hundred pixels out from the middle of CA. */
        let seat;
        if (diag) {
          L.len.setAttribute('x', fx);
          L.len.setAttribute('y', fy);
          this.inkBox(fx - bw / 2, fy - bh / 2, fx + bw / 2, fy + bh / 2, 'a length', L.len);
          seat = { x: fx, y: fy };
        } else {
          seat = this.seatLength(L.len, fx, fy, bw, bh,
                          { x: outX, y: outY }, L.len,
                          { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, across);
        }
        /* Turned about wherever it ended up, so the words run up the
           side rather than across it. */
        const tn = L.lenTurn;
        if (tn) {
          if (diag) tn.setAttribute('transform',
                      'rotate(' + ang.toFixed(2) + ' ' + seat.x + ' ' + seat.y + ')');
          else if (turn) tn.setAttribute('transform',
                      'rotate(-90 ' + seat.x + ' ' + seat.y + ')');
          else tn.removeAttribute('transform');
        }
      }
    },

    /* The total a count-out arrived at, written as the leg's own length
       — in the leg's colour, in the leg's place — instead of on the
       board's general label. The screen after keeps it untouched. */
    showLegTotal: function (i, units, from, to) {
      const L = this.legSlots && this.legSlots[i];
      /* The ends come from the count that has just been walked out —
         the very pair being measured — rather than from what the board
         last remembered placing. The two are the same leg, but only one
         of them is guaranteed to be there when the answer lands. */
      const spec = (from && to) ? { from: from, to: to } : (this.legPlaced || [])[i];
      if (!L || !spec || !spec.from) return false;
      this.placeLegLength(i, spec.from, spec.to,
        units + '\u00A0unit' + (units === 1 ? '' : 's'));
      L.len.style.display = '';
      L.len.classList.add('pop');
      return true;
    },

    /* Draws the legs a screen asks for: any already settled from the
       screen before simply appear, the rest animate in. */
    /* A corner's coordinates are placed knowing only the leg that
       arrives at it — the leg that leaves it has not been drawn yet.
       On the triangle that second leg rises straight up out of the
       corner, through the very space the label takes when the frame
       has left it nowhere to go but over the point. So once every leg
       is down, each corner's label is put clear of all of them, and of
       the segment they hang off. */
    clearMarksOfLines: function () {
      const G = C.GRID, self = this;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const placed = this.legPlaced || [];
      if (!placed.filter(Boolean).length) return;
      // measured at the size the camera is setting, like everything else

      /* A blocked corner used to be moved by hand: the coordinates
         dropped to a fixed offset under the point and the letter
         stepped sideways off whatever line was in the way. That offset
         is a distance to the label's MIDDLE, not to its ink, so it owed
         nothing to the gap every other label keeps — on screen 25 it
         put the corner's coordinates ON its own dot, 2px INSIDE the
         circle they belong to.

         There is one rule for this now and it already knows how to
         miss a line. The only thing it could not see was the lengths
         written beside the legs, because nothing inks those — so they
         go in, and then each corner is simply placed again. */
      (this.legSlots || []).forEach(function (L, n) {
        const s = placed[n];
        if (!s || !L.len || !L.len.textContent || L.len.style.display === 'none') return;
        const b = self.lenBox(L);
        if (b) self.inkBox(b.l, b.t, b.r, b.b, 'leg ' + n + ' length', L.len);
      });

      (this.legSlots || []).forEach(function (L, i) {
        const spec = placed[i];
        if (!spec || !spec.mark || !L.coord.textContent) return;
        const x2 = px(spec.to.x), y2 = py(spec.to.y);
        const drawn = self.lastPlotted;
        let away = { x: 1, y: -1 };
        if (drawn && drawn.a) {
          const mx = (px(drawn.a.x) + px(drawn.b.x) + x2) / 3;
          const my = (py(drawn.a.y) + py(drawn.b.y) + y2) / 3;
          away = { x: x2 - mx, y: y2 - my };
        }
        self.placePointLabel(
          L.markLabel || (L.markLabel = { coord: L.coord, name: L.name }),
          { name: spec.mark.name, coordText: L.coord.textContent },
          x2, y2, { ctext: L.coord.textContent, away: away });
      });
    },

    runLegs: function (specs, later, done) {
      const self = this;
      if (!specs || !specs.length) { done(); return; }

      /* Every side this screen is going to draw, recorded before the
         first of them is placed. A leg's length and a corner's label
         both have to keep out of the face the three sides close, and
         that face is not knowable from one leg — so the first leg used
         to be laid out as if there were no shape and then moved when
         the last one arrived, which is a length written twice in two
         places. */
      this.legPlaced = this.legPlaced || [];
      specs.forEach(function (s, i) { self.legPlaced[i] = s; });
      /* And only those. A screen that keeps its drawing keeps the
         record of it too, so a screen drawing one side after a screen
         that drew two inherited the second — and closed a face that is
         not on the paper. A screen's `legs` is always all of its
         sides: the ones carried over say `settled`, they are not left
         out. */
      this.legPlaced.length = specs.length;

      let delay = 0, closes = 220;
      specs.forEach(function (spec, i) {
        const L = self.legSlots[i];
        self.placeLeg(i, spec);
        L.g.classList.add('on');
        /* Every side is down now, so the face exists — and the pair's
           own two labels were placed before it did, when the only
           thing to keep out of was a line. Lay the board out again
           knowing the shape, then put the corners clear of the lines
           as before. */
        if (i === specs.length - 1) { self.relabel(); self.markCrossing(); }

        if (spec.settled) {
          /* Already on the board; only its length is new — so it goes
             down DRAWN, not drawing. `placeLeg` has just wound this
             line back to nothing (every leg is seated undrawn so the
             ones that do arrive can arrive), and adding `draw` alone
             set it animating from zero: the side the child had just
             measured came off the board and joined itself a second
             time, in front of them, one screen after they found it.
             `set` is the line's version of `.segdot.set` — the same
             hand-over, made invisible. It keeps `draw` so everything
             that asks what is on the board still counts it. */
          (spec.dash ? L.dashG : L.line).classList.add('draw');
          /* And this is the hand-over: the side the child measured is
             now drawn in its own colour with its own length, so the
             lit measuring line lying along it has been taken over and
             goes — faded into the side, which is already down under it,
             rather than snatched away. */
          Board.handOffMeasure();
          if (spec.mark) { L.dot.classList.add('pop'); L.coord.classList.add('pop'); L.name.classList.add('pop'); }
          if (spec.length) {
            const fly = self.flyIntoLeg(i, spec, later, delay + 200);
            later(function () { self.showLegLength(i); SFX.tick(2); },
                  delay + 200 + fly);
            delay += 520 + fly;
          }
          return;
        }

        const base = delay;
        /* The line first, then the point it arrives at, then what that
           point is called. A corner that appears before anything has
           reached it is just a dot on the grid; drawn this way round it
           is the line that puts it there, which is the whole story of
           where the third point comes from. The line takes 600ms, so
           the dot lands as it gets there. */
        /* Handed over rather than arriving: it goes on at once, with
           no stroke sound, because nothing is being drawn — the line
           the child is already looking at is simply solid now. */
        if (L.handedOver) {
          (spec.dash ? L.dashG : L.line).classList.add('draw', 'set');
        } else {
          later(function () {
            (spec.dash ? L.dashG : L.line).classList.add('draw');
            SFX.draw();
          }, base + 120);
        }
        /* The corner lands as the line reaches it: a solid side draws in
           600ms; a dotted one grows for 900ms (dashGrow), and its dots
           reach the far end only at the very end of that. */
        const lands = base + (spec.dash ? 1030 : 760);
        closes = Math.max(closes, lands);
        if (spec.mark) {
          later(function () { L.dot.classList.add('pop'); SFX.tick(1); }, lands);
          later(function () { L.coord.classList.add('pop'); SFX.tick(3); }, lands + 250);
          later(function () { L.name.classList.add('pop'); SFX.tick(4); }, lands + 390);
        }
        if (spec.length) later(function () { self.showLegLength(i); SFX.tick(5); }, base + 1330);
        delay = base + 1640;
      });

      /* Three sides make a shape, and the face is washed in once they
         have made it — when the last side being drawn reaches its end.
         It went in 220ms after the first side set off, so the triangle
         was shaded before two of its sides existed. Sides already on
         the board close it at once. */
      if (specs.length > 1) later(function () { self.showTriangle(); }, closes);
      later(done, delay + 260);
    },

    /* A point pulsing where it stands — a soft ring out of it, twice —
       for the moment it is being named. `name` is 'a' or 'b' (the pair)
       or 'c' (the corner the sides meet at). The dot itself is not
       touched, so nothing about how it arrived plays again. Measured
       when it fires, so a camera still settling puts it on the point. */
    /* `run` (ms) keeps it beating that long — through the sentence that
       names it — where a bare name rings twice. */
    beatPoint: function (name, later, at, run) {
      const self = this, G = C.GRID;
      const BEAT = 440, beats = Math.max(2, Math.round((run || 0) / BEAT));
      const ring = function () {
        const d = self.lastPlotted, L0 = (self.legPlaced || [])[0];
        const p = name === 'a' ? d && d.a : name === 'b' ? d && d.b : L0 && L0.to;
        if (!p) return;
        const s = self.boardToStage(G.originX + p.x * G.stepX, G.originY - p.y * G.stepY);
        const size = (G.segment.dotR || 12) * 5 * s.k;
        FX.ring(s.x, s.y, size, name === 'c' ? 'rgba(224, 123, 18, .7)' : 'rgba(46, 150, 108, .7)');
      };
      /* …and the point itself with them, a beat to each ring: its dot
         swells, and its letter and coordinates are highlighted — one soft
         yellow box behind the two, drawn under the dot so the dot stays
         whole, the words in the point's colour (`.beat-hl`, `.beat-lit`,
         style.css) swelling with it — so the whole point, "A (2, 1)", is
         what is named, not only the air round it. Lit for as long as it
         beats, and put back at once if the screen goes first. The swells
         are played over whatever the parts are already doing (Web
         Animations sit above CSS ones) and are gone when they end, so an
         arrival is never replayed. Calm: highlighted, nothing moving. */
      const swell = function () {
        const P = name === 'c' ? (self.legSlots || [])[0] : self.segParts && self.segParts[name];
        if (!P || !P.dot || !P.dot.animate) return;
        const still = document.documentElement.classList.contains('calm');
        const beat = { duration: BEAT, iterations: beats, easing: 'ease-in-out' };
        if (!still) P.dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.45)' },
                                   { transform: 'scale(1)' }], beat);
        const words = [P.name, P.coord].filter(function (t) { return t && t.textContent; });
        if (!words.length) return;
        // the box: round both words, with room for them to swell inside it
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        words.forEach(function (w) {
          const bb = w.getBBox();
          l = Math.min(l, bb.x); t = Math.min(t, bb.y);
          r = Math.max(r, bb.x + bb.width); b = Math.max(b, bb.y + bb.height);
        });
        const fs = parseFloat(getComputedStyle(words[words.length - 1]).fontSize) || 30;
        const hl = document.createElementNS(SVGNS, 'rect');
        hl.setAttribute('class', 'beat-hl');
        hl.setAttribute('x', l - 0.3 * fs);
        hl.setAttribute('y', t - 0.14 * fs);
        hl.setAttribute('width', r - l + 0.6 * fs);
        hl.setAttribute('height', b - t + 0.28 * fs);
        hl.setAttribute('rx', 0.32 * fs);
        P.dot.parentNode.insertBefore(hl, P.dot);
        void getComputedStyle(hl).opacity;         // seen clear first, so it fades in
        hl.classList.add('on');
        words.forEach(function (w) {
          w.classList.add('beat-lit');
          if (!still) w.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' },
                                 { transform: 'scale(1)' }], beat);
        });
        later(Game.hold(function () {
          words.forEach(function (w) { w.classList.remove('beat-lit'); });
          hl.classList.remove('on');
          setTimeout(function () { if (hl.parentNode) hl.parentNode.removeChild(hl); }, 260);
        }), beats * BEAT);
      };
      /* A corner still landing (`at`) writes its coordinates and then its
         letter after it (runLegs: .25s, .39s), so its highlight waits for
         both. */
      later(swell, (at || 0) + (name === 'c' && at ? 420 : 0));
      for (let n = 0; n < beats; n++) later(ring, (at || 0) + n * BEAT);
    },

    /* The pair's dotted guide, drawn now — for a screen that holds it back
       until she names the distance it stands for. */
    /* …and then the line itself, drawn out from A to B over the dots once
       they have grown in: the dotted line shows the way, the solid one
       is the side. AB used to stay dotted wherever it was the unknown
       (29 and every walk), and read as a line that was not there. The
       dots are taken away once the solid line lies on them. If the
       screen is left before the line has come, it is put up drawn, so
       the next screen never inherits a dotted AB. */
    drawGuide: function (later) {
      const self = this;
      if (this.segDashG && !this.segDashG.classList.contains('draw')) {
        this.segDashG.classList.add('draw');
        SFX.draw();
      }
      if (!later || !this.segLine || this.segLine.classList.contains('draw')) return;
      const GROW = 900, INK = 620;              // dashGrow, then drawOut (style.css)
      const solid = function () {
        if (!self.segLine.classList.contains('draw')) {
          self.segLine.style.strokeDashoffset = 0;
          self.segLine.classList.add('draw');
        }
        if (self.segDashG) self.segDashG.classList.remove('draw');
      };
      const release = Game.hold(solid);          // run now, or when the screen goes
      later(function () { self.segLine.classList.add('draw'); SFX.draw(); }, GROW + 60);
      later(release, GROW + 60 + INK + 80);      // drawn: the dots go
      /* When AB is finished, with a breath after — a line bringing the
         sides on waits for it (lightAfterLine), so one line is drawn at
         a time and C does not land while AB is still drawing. */
      this.guideUntil = performance.now() + GROW + 60 + INK + 150;
    },

    /* The three sides lit while she says what they make — A to C, C to
       B, B back to A, going round the shape the way it was built, and
       then all three held lit together for a beat so it reads as one
       triangle rather than three lines that happen to touch.

       It runs under her voice, not after it: the light is what she is
       talking about, and a shape that lights once she has stopped is
       illustrating a sentence that is already over.

       Whichever line a side is actually showing takes the pulse: a side
       still waiting to be measured is its dotted guide, not its solid
       line. The class is dropped and put back a frame later rather than
       forced through a reflow, which is the one way that works the same
       in a browser and in a test harness. */
    pulseSides: function (later, delay, keys, runMs) {
      if (!this.segLine || !this.legSlots) return 0;
      const pick = function (L) {
        if (!L) return null;
        return (L.dashG && L.dashG.style.display !== 'none') ? L.dashG : L.line;
      };
      /* 'h' the horizontal leg, 'v' the vertical, 'ab' the line between
         the two points. All three is the shape being named; one on its
         own is the side being asked about. */
      const of = { h: pick(this.legSlots[0]), v: pick(this.legSlots[1]), ab: this.segLine };
      const sides = (keys || ['h', 'v', 'ab']).map(function (k) { return of[k]; })
        .filter(Boolean);
      if (!sides.length) return 0;

      /* The corners, and the groups they and their sides live in. The
         geometry is spread across three groups — a group per leg and
         one for the segment — so rather than move it into a new one and
         break everything that addresses those, all three take the same
         float, with the same duration and no delay. Identical animation
         on every piece is what keeps the shape connected; one group
         floating on its own would pull it apart. */
      /* Lines only. The corners used to pulse with the whole shape —
         growing and glowing on every beat — and a pulsing dot pulls the
         eye to a point when what is being named is the side. They stay
         exactly as they are while the lines around them light. */

      /* Marked, then switched on from one place. `triangle-side` says
         which lines are in the highlight; the class on the board turns
         it on. Both go on in the same tick and one animation drives all
         of them, so there is no way for the three to drift apart or for
         a line to be caught between states — which is what the old
         per-line beats did, each taken off and put back a frame later.
         Nothing here is removed and re-added while it is running. */
      const start = delay || 0, run = runMs || 1600;
      /* The overlay copies whatever it is covering — the same two ends
         and the same colour — so it can never drift out of line with
         the real thing, and nothing has to know where the points are. */
      const srcOf = { h: this.legSlots[0] && this.legSlots[0].line,
                      v: this.legSlots[1] && this.legSlots[1].line,
                      ab: this.segLine };
      const srcs = (keys || ['h', 'v', 'ab']).map(function (k) { return srcOf[k]; })
        .filter(Boolean);
      const overlay = this.pulseLines || [];
      const self2 = this;

      /* The full side, point to point, behind the line. The glow now
         lies under every line and every dot, so it can run the whole
         length; it finishes just INSIDE each point — at the depth where
         its square corners are still covered by the dot — so it reads
         as passing behind the point with nothing showing past its rim,
         and never as a light on the point itself. A side that already
         stops at its point's ring has its glow carried back in to meet
         the point. The dots are read at the moment of the pulse,
         because the camera resizes them as it pushes in. */
      const HALF = 7;                       // realStrokePulse peaks at 14px
      const ends = [self2.segParts && self2.segParts.a && self2.segParts.a.dot,
                    self2.segParts && self2.segParts.b && self2.segParts.b.dot]
        .concat((self2.legSlots || []).map(function (L) { return L && L.dot; }))
        .filter(Boolean);
      const inTo = function (x, y) {
        let best = null;
        ends.forEach(function (d) {
          if (d.style.display === 'none') return;
          const E = (+d.getAttribute('r') || 0) + (+d.getAttribute('stroke-width') || 0) / 2;
          const dist = Math.hypot(+d.getAttribute('cx') - x, +d.getAttribute('cy') - y);
          if (dist > E + 12 || (best && dist >= best.dist)) return;
          best = { dist: dist, t: Math.sqrt(Math.max(0, E * E - HALF * HALF)) - dist };
        });
        return best ? best.t : 0;
      };

      let release = null;
      const off = function () {
        el.gridAxes.classList.remove('triangle-question-active');
        overlay.forEach(function (l) { l.classList.remove('on'); });
      };
      later(function () {
        overlay.forEach(function (l, i) {
          const src = srcs[i];
          if (!src) { l.classList.remove('on'); return; }
          const x1 = +src.getAttribute('x1'), y1 = +src.getAttribute('y1');
          const x2 = +src.getAttribute('x2'), y2 = +src.getAttribute('y2');
          const e = inset(x1, y1, x2, y2, inTo(x1, y1), inTo(x2, y2));
          l.setAttribute('x1', e[0]); l.setAttribute('y1', e[1]);
          l.setAttribute('x2', e[2]); l.setAttribute('y2', e[3]);
          const col = src.getAttribute('stroke');
          l.setAttribute('stroke', col);
          l.style.color = col;                 // what the glow is drawn in
          l.classList.add('on');
        });
        el.gridAxes.classList.add('triangle-question-active');
        /* Switched off by the step below — or by leaving the screen, if
           that comes first (a quick Next here left the three sides
           pulsing through the whole of the next screen). */
        release = Game.hold(off);
        SFX.tick(3);
      }, start);
      later(function () { if (release) release(); else off(); }, start + run);
      return start + run;
    },

    /* Which side of the triangle the working is talking about: that one
       comes forward and the rest step back, so a child reading "4\u00B2"
       can see at once which line it means. `which` is 'h', 'v' or 'ab';
       anything else puts the board back the way it was. */
    /* The two ends of one side of the drawing, in grid coordinates.
       'ab' is the pair itself; 'h' and 'v' are the two legs, in the
       order the screen's `legs` gives them. */
    sideEnds: function (which) {
      if (which === 'ab') {
        const d = this.lastPlotted;
        return (d && d.a && d.b) ? { from: d.a, to: d.b } : null;
      }
      const i = which === 'h' ? 0 : which === 'v' ? 1 : -1;
      const L = (this.legPlaced || [])[i];
      return (L && L.from && L.to) ? { from: L.from, to: L.to } : null;
    },

    spotlightPart: function (which) {
      if (!this.segLine) return;
      const A = this.segParts && this.segParts.a;
      const B = this.segParts && this.segParts.b;
      const L0 = this.legSlots && this.legSlots[0];
      const L1 = this.legSlots && this.legSlots[1];
      /* A corner is its dot, its letter and its coordinate. They are
         one thing on the paper, so they light as one. `legSlots[0]`'s
         mark is the corner the two legs share — `rightAngle` reads it
         the same way. */
      const corner = function (o) { return o ? [o.dot, o.name, o.coord] : []; };
      /* The stroke of a side, and the length written along it. */
      const stroke = {
        ab: [this.segLine, this.segRes],
        h:  [L0 && L0.line, L0 && L0.len],
        v:  [L1 && L1.line, L1 && L1.len]
      };
      /* But a side is not a stroke. It is the stroke, its length, and
         the two corners it runs between — letters and coordinates and
         all. That is what the working means when it writes (AC)², and
         lighting only the line left the rest of the drawing at full
         strength while the child was being told to look at one side
         of it. */
      /* A pair still drawn as its dotted guide (AB is the unknown on
         29 and 30) shows through `segDashG`, not the solid line — so the
         guide belongs to AB's part too, or "fade AB" would leave the one
         AB anybody can see at full strength. It is in the part and not
         the stroke: it steps back and comes forward with AB, but never
         takes the glow or the swell, whose animation would replace the
         one that draws it out. */
      const part = {
        ab: stroke.ab.concat(corner(A), corner(B), [this.segDashG]),
        h:  stroke.h.concat(corner(A), corner(L0)),
        v:  stroke.v.concat(corner(L0), corner(B))
      };
      /* Nobody's own. The face the three sides close and the square in
         the corner belong to the shape rather than to any one side, so
         they step back whenever one is singled out and come back when
         nothing is.

         Unless the screen is ABOUT the square. Where she says "since
         it’s a right triangle", the marker is the reason she is giving,
         and a highlight on a side must not dim the evidence for the
         theorem at the moment the theorem is named. `keepMark` takes it
         out of the shape and puts it back at full strength. */
      const shape = this.keepMark ? [this.triFill] : [this.triFill, this.rightMark];
      if (this.keepMark && this.rightMark) this.rightMark.classList.remove('hush', 'spot');

      /* Only what is actually ON the board. `hush` now carries enough
         weight to beat the animation painting a label, which means it
         is also heavy enough to paint one that was never up: a leg
         with no mark, a length not yet written, a face on a screen
         with no triangle. Anything sitting at nothing stays at
         nothing. */
      const shown = function (n) {
        if (!n || n.style.display === 'none') return false;
        return +getComputedStyle(n).opacity > .05;
      };
      /* One side, or several at once. "We know AC and CB" is one fact
         about two things, and lit one after the other the second
         replaced the first, so the child never saw the two known sides
         together. A list lights their union; a single key behaves
         exactly as it always has, and nothing at all puts the board
         back. */
      const keys = [].concat(which == null ? [] : which)
        .filter(function (k) { return !!part[k]; });
      const any = keys.length > 0;
      const union = function (map) {
        const out = [];
        keys.forEach(function (k) {
          map[k].forEach(function (n) { if (shown(n) && out.indexOf(n) < 0) out.push(n); });
        });
        return out;
      };
      const lit = union(part);
      const all = [];
      const add = function (n) {
        if (shown(n) && all.indexOf(n) < 0) all.push(n);
      };
      Object.keys(part).forEach(function (k) { part[k].forEach(add); });
      shape.forEach(add);

      /* Union, not last-write. A corner belongs to whichever side is
         lit — C is on both legs — so it is hushed only when neither of
         them is. The old map walked one key after another and a shared
         node took whatever the last pass happened to say about it. */
      /* But only the side itself GLOWS — its stroke and the length
         written on it. Its two corners are part of it for hushing, so
         the line never runs between dimmed dots, and they stay at full
         strength; they just are not lit. A glowing dot says "this
         point", and the beat is about the distance between them. */
      const glows = union(stroke);
      all.forEach(function (n) {
        const on = lit.indexOf(n) >= 0;
        n.classList.toggle('spot', on && glows.indexOf(n) >= 0);
        n.classList.toggle('hush', any && !on);
      });

      /* The beat is the side swelling, so it goes on the stroke and its
         length and nothing else. On a dot or a letter it would name an
         animation on an element whose visibility IS the fill of another
         one, and take it off the board — the trap this file has fallen
         into four times already. */
      /* Lines only. A length is painted by its own pop animation, held
         at its last frame — and an element has one `animation`, so the
         beat REPLACED it: for the length of the beat the label fell back
         to its resting opacity of 0, and when the beat came off the pop
         played again from nothing. Every length on the board vanished
         and came back whenever a side was named. It keeps its steady
         glow (`spot`); only the line swells. */
      const beat = union(stroke).filter(function (n) { return n.tagName !== 'text'; });
      Object.keys(stroke).forEach(function (k) {
        stroke[k].forEach(function (n) { if (n) n.classList.remove('spotbeat'); });
      });
      beat.forEach(function (n) { n.classList.add('spotbeat'); });
      clearTimeout(this.beatOff);
      if (any) this.beatOff = setTimeout(function () {
        beat.forEach(function (n) { n.classList.remove('spotbeat'); });
      }, 720);
    },

    /* The square in the corner, drawn from the two legs rather than
       typed: which way each of them runs decides which of the four
       corners it goes in, so it is right whatever the pair is.

       It is the evidence for an answer, so it arrives with the answer.
       A marker already sitting there turns "what type of triangle is
       this?" into a reading exercise. */
    rightAngle: function (on) {
      const G = C.GRID, LG = G.leg;
      const m = this.rightMark;
      if (!m) return;
      const L = this.legPlaced || [];
      if (!on || !L[0] || !L[1]) { m.classList.remove('on', 'set'); return; }
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const c0 = L[0].to;                       // the corner the two share
      const s = (LG.rightAngle || 0.28) * G.stepX * this.typeScale();
      /* Inside the angle: one step back along the leg that arrives,
         one step along the leg that leaves. */
      const hx = Math.sign(px(L[0].from.x) - px(c0.x)) || -1;
      const vy = Math.sign(py(L[1].to.y) - py(c0.y)) || -1;
      const x0 = px(c0.x), y0 = py(c0.y);
      m.setAttribute('points',
        [ [x0 + hx * s, y0],
          [x0 + hx * s, y0 + vy * s],
          [x0,          y0 + vy * s] ].map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
      m.setAttribute('stroke-width', (LG.rightAngleW || 4) * this.typeScale());
      m.classList.add('on');
    },

    /* No plate to fit any more — the text carries its own paper halo,
       so it reads over the ruling without a box taking up the room. */
    showLegLength: function (i) {
      this.legSlots[i].len.classList.add('pop');
    },

    /* A leg whose length is written in the points' own letters — `AC =
       x2 - x1`, on the screens that name the general case. Those two
       symbols are read off the board, out of `(x2, y1)` and `(x1, y1)`,
       so they arrive from it.

       This is the screen where a child either sees that `x2` is an
       ADDRESS rather than a value, or does not, and the flight is the
       only thing on it that can say so. */
    flyIntoLeg: function (i, spec, later, at) {
      const L = this.legSlots && this.legSlots[i];
      const src = spec.lengthFrom;
      if (!L || !src || !src.length || !Game.flyInto) return 0;
      const F = C.GRID.fly, step = F.pickMs + F.ms;
      /* A length in letters is put together in the order it is read:
         the first term is lifted off its label and lands in its own
         place, the sign is written after it, and only then does the
         second term come — x₂, then −, then x₁. The label is up from
         the first landing, with its later pieces still waiting; they
         were all carried to the middle of it and the whole thing then
         popped in at once. */
      const parts = L.len.querySelectorAll('.lpart');
      if (parts.length === 3 && src.length === 2) {
        const sign = 380;
        later(function () {
          parts.forEach(function (sp) { sp.classList.add('wait'); });
          L.len.classList.add('pop', 'set');
          Game.flyInto({ from: src[0] }, parts[0]);
        }, at);
        later(function () { parts[0].classList.remove('wait'); }, at + step);
        later(function () { parts[1].classList.remove('wait'); SFX.tick(3); }, at + step + sign);
        later(function () { Game.flyInto({ from: src[1] }, parts[2]); }, at + step + 2 * sign);
        later(function () { parts[2].classList.remove('wait'); }, at + 2 * step + 2 * sign);
        return 2 * step + 2 * sign;
      }
      src.forEach(function (from, n) {
        later(function () { Game.flyInto({ from: from }, L.len); }, at + n * step);
      });
      return src.length * step;
    },

    /* A side's length written in when the question about it is
       answered (33, 34), not when the screen opens: recorded as shown,
       so a later layout keeps it, placed, and put together from the
       labels it is read off. Returns how long that takes. */
    writeLegLength: function (i, spec, later) {
      const L = this.legSlots && this.legSlots[i];
      if (!L || !spec) return 0;
      this.legPlaced = this.legPlaced || [];
      this.legPlaced[i] = Object.assign({}, this.legPlaced[i] || spec,
        { length: true, lengthText: spec.lengthText, lengthFrom: spec.lengthFrom });
      this.placeLegLength(i, spec.from, spec.to, spec.lengthText);
      L.len.style.display = '';
      const self = this, fly = this.flyIntoLeg(i, spec, later, 0);
      later(function () { self.showLegLength(i); }, fly);
      return fly;
    },

    clearUnits: function () {
      if (this.segGroup) this.segGroup.classList.remove('counting');
      if (el.gridAxes) el.gridAxes.classList.remove('counting');
      (this.countCells || []).forEach(function (c) {
        c.g.classList.remove('on');
        c.g.style.display = 'none';
      });
      if (this.unitLabel) this.unitLabel.classList.remove('on');
      this.clearEquation();
    },

    /* The worked sum, taken right off the board — text as well as
       classes, or a node still holding the last pair's digits would
       flash the moment the next one wrote its own. */
    clearEquation: function () {
      this.tweenSeq = (this.tweenSeq || 0) + 1;         // stops anything mid-journey
      (this.xParts || []).forEach(function (t) {
        t.classList.remove('on', 'lit', 'gone', 'drop');
        t.style.transform = ''; t.style.transformOrigin = '';
        t.textContent = '';
      });
      if (this.xGroup) this.xGroup.style.transform = '';
      if (this.xFly) { this.xFly.classList.remove('on', 'go'); this.xFly.textContent = ''; this.xFly.style.transform = ''; }
      if (this.xWord) { this.xWord.classList.remove('on'); this.xWord.textContent = ''; }
      if (this.xSweep) this.xSweep.classList.remove('draw');
    },

    /* Moves a piece of text by changing its own attributes, one frame at
       a time. Deliberately not a CSS transform: a transform on an SVG
       <text> is the one thing here that browsers disagree about — Safari
       has misplaced its origin, and a transition set in the same tick as
       its start never runs at all. x, y and font-size are attributes
       every browser has drawn the same way for twenty years.

       The caller pins the final values itself when the time is up, so
       the end state never depends on this having painted every frame. */
    tweenText: function (el, from, to, ms) {
      const self = this, start = performance.now();
      const token = this.tweenSeq = (this.tweenSeq || 0) + 1;
      /* cubic-bezier(.22, .61, .36, 1), solved for x by bisection */
      const ease = function (t) {
        let lo = 0, hi = 1, u = t;
        for (let i = 0; i < 14; i++) {
          u = (lo + hi) / 2;
          const x = 3 * (1 - u) * (1 - u) * u * 0.22 + 3 * (1 - u) * u * u * 0.36 + u * u * u;
          if (x < t) lo = u; else hi = u;
        }
        return 3 * (1 - u) * (1 - u) * u * 0.61 + 3 * (1 - u) * u * u + u * u * u;
      };
      const step = function () {
        if (token !== self.tweenSeq) return;             // the board was cleared
        const p = Math.min(1, (performance.now() - start) / ms), e = ease(p);
        el.setAttribute('x', from.x + (to.x - from.x) * e);
        el.setAttribute('y', from.y + (to.y - from.y) * e);
        el.setAttribute('font-size', from.size + (to.size - from.size) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    /* Ends a tween where it was meant to end. Cancelling first matters: a
       frame already queued when the landing fires would otherwise run
       after it and drag the text back a step. */
    pinText: function (el, at) {
      this.tweenSeq = (this.tweenSeq || 0) + 1;
      el.setAttribute('x', at.x); el.setAttribute('y', at.y); el.setAttribute('font-size', at.size);
    },

    /* Where one fragment of a coordinate label sits. The label is centred
       on its point, so a part's middle is the width of everything before
       it plus half of itself — worked out from the strings rather than
       measured off the page, which would need a layout the board may not
       have done yet.

       This is what lets a digit be lifted out of the label it lives in:
       without it there is no way to know where the "3" in "(3, 2)"
       begins. */
    partSpot: function (which, part) {
      const SG = C.GRID.segment, self = this;
      /* 'a' and 'b' are the pair; 'c' is the corner the sides meet at —
         its coordinates are written in parts too when a working carries
         numbers out of them (59). */
      const p = which === 'c'
        ? (this.legSlots && this.legSlots[0] ? { coord: this.legSlots[0].coord } : null)
        : (this.segParts && this.segParts[which]);
      if (!p || !p.coord) return null;
      const kids = p.coord.children || [];
      if (!kids.length) return null;
      const size = parseFloat(p.coord.getAttribute('font-size')) || SG.coordSize;
      const widths = Array.prototype.map.call(kids, function (ts) {
        return self.textW(ts.textContent, size);
      });
      const total = widths.reduce(function (t, n) { return t + n; }, 0);
      const left = parseFloat(p.coord.getAttribute('x')) - total / 2;
      let run = 0, spot = null;
      Array.prototype.forEach.call(kids, function (ts, n) {
        if (!spot && ts.dataset && ts.dataset.part === part) {
          spot = { x: left + run + widths[n] / 2,
                   y: parseFloat(p.coord.getAttribute('y')),
                   size: size, text: ts.textContent, node: ts };
        }
        run += widths[n];
      });
      return spot;
    },

    /* Counts the segment out in unit squares, one at a time, then
       writes the total above it. Only used when a child answers
       wrongly — seeing the units is the whole point of the exercise. */
    /* The answer being made, one unit at a time.

       The child dials a number and presses Check; this counts that
       number out for them. The line grows a unit of length per beat,
       each unit it covers lights the square underneath it, and the
       total lands at the end. Nothing is drawn while the number is
       being chosen — the point of pressing Check is that this is when
       you find out, and a line that had already crept out to the
       answer would have given it away before the press.

       It is their number that gets counted, not the right one, so a
       guess that is too long walks the line straight past the point.
       That overshoot is the feedback: you can see the extra unit. */
    countOut: function (from, to, units, later, done, leg, keep) {
      const G = C.GRID, U = G.unitBox, P = G.paper;
      const self = this;
      this.clearUnits();
      this.clearMeasure();

      /* The count always runs the way it is read: left to right across
         a row, and bottom to top up a column. Which end is A and which
         is B is about naming the points, not about which way a
         measurement should travel — counting a column downwards had the
         line walking away from the origin while the numbers beside it
         climbed. */
      if (to.x < from.x || (to.x === from.x && to.y < from.y)) {
        const swap = from; from = to; to = swap;
      }

      const dx = to.x - from.x, dy = to.y - from.y;
      const span = Math.hypot(dx, dy);
      if (!span || units <= 0) { later(done, 200); return; }
      const ux = dx / span, uy = dy / span;

      /* However far past the point they go, the line stops at the edge
         of the ruled paper rather than leaving it. Solved along the
         line rather than per axis: clamping x and y separately would
         bend a diagonal off its own segment. */
      let reach = Infinity;
      if (ux > 0) reach = Math.min(reach, (P.gxTo - from.x) / ux);
      if (ux < 0) reach = Math.min(reach, (P.gxFrom - from.x) / ux);
      if (uy > 0) reach = Math.min(reach, (P.gyTo - from.y) / uy);
      if (uy < 0) reach = Math.min(reach, (P.gyFrom - from.y) / uy);
      const steps = Math.max(1, Math.min(units, Math.floor(reach + 1e-9)));

      /* Their number is walked out, right or wrong. The line IS the
         answer they gave: short of the point, on it, or a unit past
         it, and seeing where it stops is the whole of the feedback.
         Taking it away the moment it was wrong read as the board
         deleting their answer. */
      for (let n = 1; n <= steps; n++) {
        (function (k) {
          later(function () {
            self.drawMeasure(from, from.x + ux * k, from.y + uy * k);
            SFX.tick(k);
          }, (k - 1) * U.stepMs);
        })(n);
      }

      /* And a wrong one LETS GO. It is held at the length that was
         given, long enough to be read against the point it was meant
         to reach, and then it fades where it stands.

         It used to walk home, unit by unit, the way it had come. That
         reads as the board taking the answer back — the same gesture
         as giving it, run in reverse, so the eye follows the line all
         the way to the start and the wrong length is the last thing it
         was still being shown. Fading leaves the length where it was
         drawn and simply stops showing it, which is the difference
         between withdrawing an answer and letting one go.

         The number is never written either way: the line may show a
         wrong length, but the board must not assert one. */
      if (!keep) {
        const out = steps * U.stepMs;
        const hold = U.missHoldMs == null ? 620 : U.missHoldMs;
        const fade = U.missFadeMs == null ? 380 : U.missFadeMs;
        later(function () { self.fadeMeasure(fade); }, out + hold);
        /* Cleared only once it is invisible: clearMeasure takes the
           fade off with everything else, and taking it off early would
           snap the line back to full strength for a frame. */
        later(function () { self.clearMeasure(); done(); }, out + hold + fade + 90);
        return;
      }

      later(function () {
        /* Measuring a leg? Then the total IS that leg's length, and it
           belongs on the leg rather than on the board's own label —
           written once, where it stays.

           Only when the number is right. The line walking past the
           point is the feedback for a guess that is too long and it
           costs nothing; a NUMBER written on a side of the drawing is
           the board asserting a length, and the board must never
           assert a wrong one. "2 units" used to go against a leg that
           is 4 long, in the leg's own colour, in the place a correct
           length goes. */
        if (keep) {
          if (leg == null || !self.showLegTotal(leg, units, from, to)) {
            self.showUnitTotal(from, ux, uy, steps, units);
          }
          SFX.chime();
        }
        done();
      }, steps * U.stepMs + 140);
    },

    /* "N units", where N is the number they chose. Above a horizontal
       count, above the top of a vertical column, and out to the free
       side of a diagonal — never on an axis. */
    /* Every line actually drawn on the board right now, with the width
       it is drawn at. A measurement written across another side reads as
       belonging to that side, so this is what a total has to keep off. */
    drawnLines: function () {
      const out = [], LG = C.GRID.leg;
      const get = function (n, w) {
        return { x1: +n.getAttribute('x1'), y1: +n.getAttribute('y1'),
                 x2: +n.getAttribute('x2'), y2: +n.getAttribute('y2'), w: w };
      };
      if (this.segGroup && this.segGroup.classList.contains('on') &&
          this.segLine.classList.contains('draw'))
        out.push(get(this.segLine, C.GRID.segment.lineWidth));
      (this.legSlots || []).forEach(function (L) {
        if (!L.g.classList.contains('on')) return;
        const dashed = L.dashG && L.dashG.style.display !== 'none';
        const node = dashed ? L.dashG : L.line;
        if (node.classList.contains('draw')) out.push(get(dashed ? L.dash : L.line, LG.width));
      });
      return out;
    },

    /* Does any of them pass through this box? The segment is clipped
       against the box — Liang-Barsky — with the stroke's own half-width
       as a margin, so a line grazing an edge counts as crossing it. */
    onALine: function (cx, cy, w, h) {
      return this.drawnLines().some(function (L) {
        const m = L.w / 2 + 3;
        const l = cx - w/2 - m, r = cx + w/2 + m, t = cy - h/2 - m, b = cy + h/2 + m;
        let t0 = 0, t1 = 1;
        const dx = L.x2 - L.x1, dy = L.y2 - L.y1;
        const clip = function (p, q) {
          if (p === 0) return q >= 0;
          const u = q / p;
          if (p < 0) { if (u > t1) return false; if (u > t0) t0 = u; }
          else       { if (u < t0) return false; if (u < t1) t1 = u; }
          return true;
        };
        return clip(-dx, L.x1 - l) && clip(dx, r - L.x1) &&
               clip(-dy, L.y1 - t) && clip(dy, b - L.y1);
      });
    },

    /* The spot a total wants, or the nearest one to it that is not on a
       line. Tries where it was put, then the mirror of that across its
       own line, then walks both of those along the span — so it stays
       between the two points and near the line it belongs to either
       way. Gives the wanted spot back if nothing is clear, because a
       total somewhere is better than none. */
    clearOfLines: function (mx, my, ox, oy, w, h) {
      const G = C.GRID;
      const ax = -oy, ay = ox;                       // along the line
      const n = Math.hypot(ax, ay) || 1;
      const sx = (ax / n) * G.stepX * 0.5, sy = (ay / n) * G.stepY * 0.5;
      const tries = [];
      [1, -1].forEach(function (side) {
        for (let k = 0; k <= 2; k++) {
          tries.push([mx + ox * side + sx * k, my + oy * side + sy * k]);
          if (k) tries.push([mx + ox * side - sx * k, my + oy * side - sy * k]);
        }
      });
      for (let i = 0; i < tries.length; i++) {
        if (!this.onALine(tries[i][0], tries[i][1], w, h)) return tries[i];
      }
      return [mx + ox, my + oy];
    },

    /* The two coordinate labels, as boxes, for anything that has to
       keep out of their way. They sit close to their own points on
       purpose, so they are the fixed thing here and whatever else wants
       that space is what gives. */
    coordBoxes: function () {
      const SG = C.GRID.segment, self = this;
      if (!this.segParts) return [];
      return ['a', 'b'].map(function (k) {
        const c = self.segParts[k] && self.segParts[k].coord;
        if (!c || !(c.textContent || '').trim()) return null;
        const w = self.textW(c.textContent, SG.coordSize);
        const x = parseFloat(c.getAttribute('x')), y = parseFloat(c.getAttribute('y'));
        if (!isFinite(x) || !isFinite(y)) return null;
        return { l: x - w/2, r: x + w/2, t: y - SG.coordSize/2, b: y + SG.coordSize/2 };
      }).filter(Boolean);
    },

    /* A length written along a span, moved off the coordinates if it
       has landed on them. A short span is the case: three units apart
       leaves less room between the two labels than "3 units" needs, so
       there is no height above the line where all three fit.

       It tries the far side of the line first — the coordinates are
       over the points, so under them is clear — and only steps further
       out if that is taken too. Both keep it square to the span and the
       same distance along it. */
    clearOfCoords: function (lx, ly, mx, my, w, h) {
      const boxes = this.coordBoxes();
      if (!boxes.length) return [lx, ly];
      const air = 6;
      const hits = function (x, y) {
        return boxes.some(function (b) {
          return x - w/2 < b.r + air && x + w/2 > b.l - air &&
                 y - h/2 < b.b + air && y + h/2 > b.t - air;
        });
      };
      if (!hits(lx, ly)) return [lx, ly];
      const dx = lx - mx, dy = ly - my;
      if (!hits(mx - dx, my - dy)) return [mx - dx, my - dy];   // the far side
      const len = Math.hypot(dx, dy) || 1;
      for (let i = 1; i <= 8; i++) {
        const x = lx + (dx/len) * 14 * i, y = ly + (dy/len) * 14 * i;
        if (!hits(x, y)) return [x, y];
      }
      return [lx, ly];
    },

    showUnitTotal: function (from, ux, uy, steps, units, quiet) {
      const G = C.GRID, U = G.unitBox, P = G.paper;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const txt = units + '\u00A0unit' + (units === 1 ? '' : 's');
      const end = { x: from.x + ux * steps, y: from.y + uy * steps };
      let lx, ly;
      if (ux && uy) {            // a diagonal
        /* Beside the middle of the line, on the side away from the
           right-angled corner — the other side is where its two legs
           and their own labels are. */
        const sx = px(from.x), sy = py(from.y), ex = px(end.x), ey = py(end.y);
        const len = Math.hypot(ex - sx, ey - sy) || 1;
        const nx = -(ey - sy) / len, ny = (ex - sx) / len;
        const mx = (sx + ex) / 2, my = (sy + ey) / 2;
        const corner = { x: px(end.x), y: py(from.y) };
        const away = ((corner.x - mx) * nx + (corner.y - my) * ny) > 0 ? -1 : 1;
        let gap = U.diagGap;
        /* A segment whose middle falls on the x-axis puts its total in
           the row of numbers under it at the ordinary offset; pushed
           twice as far along the same perpendicular it clears them
           without crossing to the legs' side. */
        if (this.onXAxisRow(my + ny * away * gap, U.labelSize)) gap *= 2;
        lx = mx + nx * away * gap;
        ly = my + ny * away * gap;
      } else if (ux) {           // along a row
        lx = (px(from.x) + px(end.x)) / 2;
        ly = py(from.y) + U.labelDy;
      } else {                   // down a column
        /* Beside the middle of the span, not stranded above the top of
           it. A vertical answer written level with the highest point
           reads as belonging to that point rather than to the distance
           between the two.

           Which side is decided by what fits, not by a rule: cleared by
           its own half-width so it never crosses the line, on the far
           side from the y-axis where there is room, and on the near
           side where there is not — a column out at x=6 has nothing to
           its right. */
        const uw0 = this.textW(txt, U.labelSize);
        const gap = uw0 / 2 + G.stepX * 0.24;
        const edge = (P.frameW + P.hiW) + 10;
        const fits = function (c) { return (c - uw0 / 2) >= edge && (c + uw0 / 2) <= G.w - edge; };
        const out = from.x >= 0 ? 1 : -1;
        const away = px(from.x) + out * gap, back = px(from.x) - out * gap;
        lx = fits(away) ? away : back;
        ly = (py(from.y) + py(end.y)) / 2;
        /* A column that straddles the x-axis has its middle in the row
           the axis numbers live in — (1,-3) to (1,2) is centred on
           y=-0.5. Step it clear, a cell at a time; it stays beside the
           line either way. */
        let guard = 0;
        while (this.onXAxisRow(ly, U.labelSize) && guard++ < 3) ly -= G.stepY;
      }
      const uw = this.textW(txt, U.labelSize);
      /* Nowhere near a line that is already drawn. mx,my is the point on
         its own line this was measured from; lx,ly is where it wanted to
         go, so the difference is the offset to try the other way. */
      const mid = (ux && uy)
        ? [(px(from.x) + px(end.x)) / 2, (py(from.y) + py(end.y)) / 2]
        : (ux ? [(px(from.x) + px(end.x)) / 2, py(from.y)]
              : [px(from.x), (py(from.y) + py(end.y)) / 2]);
      const spot = this.clearOfLines(mid[0], mid[1], lx - mid[0], ly - mid[1],
                                     uw, U.labelSize);
      lx = spot[0]; ly = spot[1];
      const free = this.clearOfCoords(lx, ly, mid[0], mid[1], uw, U.labelSize);
      lx = free[0]; ly = free[1];
      const X0 = this.clampX(this.clearOfYAxis(lx, uw), uw);
      const Y0 = this.clampY(ly, U.labelSize);
      /* `quiet` works the spot out without writing anything there, so a
         length arrived at by working and one counted out land in exactly
         the same place on the very same pair. */
      if (quiet) return { x: X0, y: Y0, text: txt, w: uw };
      this.unitLabel.setAttribute('x', X0);
      this.unitLabel.setAttribute('y', Y0);
      this.unitLabel.textContent = txt;
      this.unitLabel.classList.add('on');
      return { x: X0, y: Y0, text: txt, w: uw };
    },

    /* The guided count, for a child who has missed twice: the unit
       squares between the two points light one at a time, each with how
       many there are so far written under it, and then the whole thing
       clears and plays again. It is the answer to "count the spaces",
       shown at the speed you would count them out loud. */
    countUnits: function (from, to, later) {
      const G = C.GRID, U = G.unitBox, UC = U.count;
      if (!this.countCells || !this.countCells.length) return 0;
      /* Counted the way it is read — left to right across a row, bottom
         to top up a column — which is the rule `countOut` states and
         follows for the measuring line, and which this had never been
         given. It is handed the pair as the screen names it, and on a
         column named top-down it laid its squares out downward and
         numbered them 1 to 5 going DOWN, while the line measuring the
         same span walked up. Nobody had noticed because the only sign
         of it was which end the numbering started at; the arrows made
         it plain. */
      if (to.x < from.x || (to.x === from.x && to.y < from.y)) {
        const swap = from; from = to; to = swap;
      }
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const self = this;
      const row = from.y === to.y;
      const n = Math.min(UC.slots,
        row ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y));
      if (!n) return 0;

      /* On the side the child counts against — the one facing the axis
         the pair runs along, which is also the side that cannot run off
         the board. The same rule the single band used. */
      const step = row ? (to.x > from.x ? 1 : -1) : (to.y > from.y ? 1 : -1);
      /* A row ON the x-axis faces neither way. It went above, off the
         axis numbers — but from 30 on the board carries none, and above
         is where the points' own labels are: the count's numbers were
         written over "(−5, 0)" and "(0, 0)". With no numbers under the
         axis, it goes under. */
      const bare = el.gridPanel.classList.contains('unnumbered');
      const down = row ? (from.y > 0 ? 1 : from.y < 0 ? -1 : (bare ? 1 : -1)) : 0;
      const side = row ? 0 : (from.x > 0 ? -1 : 1);

      /* The coordinates hang under their points, which is exactly where
         the squares are — so while the spaces are being counted they
         step back out of them. They are the context, not the thing
         being counted. */
      if (this.segGroup) this.segGroup.classList.add('counting');
      /* And the corner's, which is a side's label rather than the pair's
         and so was left at full strength over the count. */
      el.gridAxes.classList.add('counting');

      this.countCells.forEach(function (c, i) {
        if (i >= n) { c.g.classList.remove('on', 'num'); c.g.style.display = 'none'; return; }
        c.g.style.display = '';
        c.g.classList.remove('on', 'num');
        let L, T, W, H, nx, ny;
        if (row) {
          const a = from.x + step * i, b = a + step;
          L = Math.min(px(a), px(b)); W = Math.abs(px(b) - px(a));
          T = Math.min(py(from.y), py(from.y - down)); H = G.stepY;
        } else {
          const a = from.y + step * i, b = a + step;
          T = Math.min(py(a), py(b)); H = Math.abs(py(b) - py(a));
          L = Math.min(px(from.x), px(from.x + side)); W = G.stepX;
        }
        /* In the square, not beside it. A number hung outside the box
           is a label on it; a number in it is the count of it, which
           is the whole of what "count the spaces" asks for.

           And above the number, the step itself: an arrow pointing the
           way the count runs. The square says there is a space here;
           the arrow says this is the move across it. */
        const A = UC.arrow;
        /* The arrow beside the line it is counting along, and its
           number on the far side of it: line, mark, label, in that
           order outward. A horizontal count's squares hang below or
           above the line, so that order runs down or up; a vertical
           count's stand to its left or right, so it runs across — the
           same rule turned on its side, rather than a mark and a
           number stacked in the middle of a square one column wide.
           Which way is worked out from where the line actually is, so
           a pair below the axis puts its arrows against its line as
           well as a pair above it does. */
        const lineAt = row ? py(from.y) : px(from.x);
        const lo = row ? T : L, span = row ? H : W;
        const into = (lo + span / 2) >= lineAt ? 1 : -1;
        const across = function (frac) { return lineAt + into * span * frac; };
        const mid = row ? L + W / 2 : T + H / 2;     // the square's middle, along the count
        c.num.textContent = String(i + 1);
        if (A) {
          /* The number just past its arrow, on the side away from the
             line: out from the arrow by the arrowheads' own reach (the
             barbs and half the stroke), then the clear gap, then the
             number's own half — its ink and its paper halo, measured, so
             it can sit close without ever touching. Under a sideways
             arrow, beside an upright one. */
          const ahalf = (Math.min(W, H) * A.len - A.w) / 2;
          const reach = ahalf * 2 * A.head * 0.62 + A.w / 2;
          const m = self.textMetrics(String(i + 1), UC.numSize);
          const segHalo = (G.segment.haloW || 0) / 2, ownHalo = 3;   // .ucell-n's stroke is 6
          const up = m.up - segHalo + ownHalo, down = m.down - segHalo + ownHalo;
          const wHalf = (m.w - 2 * segHalo) / 2 + ownHalo;
          const aAt = across(A.near), gap = A.numGap || 0;
          if (row) { nx = mid; ny = aAt + into * (reach + gap + (into > 0 ? up : down)); }
          else     { ny = mid; nx = aAt + into * (reach + gap + wHalf); }
        } else { nx = L + W / 2; ny = T + H / 2; }
        c.num.setAttribute('x', nx); c.num.setAttribute('y', ny);

        if (A && c.arrow) {
          /* Which way, on the SCREEN. Along the row as the count runs;
             up the column when the count climbs, because the board's y
             grows upward and the screen's grows down. */
          const dx = row ? step : 0, dy = row ? 0 : -step;
          /* Edge to edge: the arrow spans the whole square, less its
             own stroke, so the round caps land exactly on the grid
             lines and the marks in neighbouring squares meet tip to
             tip — a chain of units, the way a run of dimensions is
             drawn. */
          const half = (Math.min(W, H) * A.len - A.w) / 2;
          const ax = row ? mid : across(A.near), ay = row ? across(A.near) : mid;
          const tipX = ax + dx * half, tipY = ay + dy * half;
          const tailX = ax - dx * half, tailY = ay - dy * half;
          /* The barbs: back along the shaft and out to either side —
             at BOTH ends. A head at one end says "move this way"; a
             head at each says "from here to here", which is what a
             square being counted is: one unit, edge to edge. It is how
             a dimension is marked on any drawing, and it stops the
             count reading as a direction to travel in when what is
             being counted is a distance. */
          const b = half * 2 * A.head, sx = -dy, sy = dx;
          const barbs = function (x, y, back) {
            return 'M' + f(x - back * dx * b + sx * b * 0.62) + ' ' +
                         f(y - back * dy * b + sy * b * 0.62) +
                   'L' + f(x) + ' ' + f(y) +
                   'L' + f(x - back * dx * b - sx * b * 0.62) + ' ' +
                         f(y - back * dy * b - sy * b * 0.62);
          };
          const f = function (v) { return v.toFixed(1); };
          c.arrow.setAttribute('d',
            'M' + f(tailX) + ' ' + f(tailY) + 'L' + f(tipX) + ' ' + f(tipY) +
            barbs(tipX, tipY, 1) + barbs(tailX, tailY, -1));
        }
      });

      /* Played more than once on purpose: the first time through says
         what is happening, the second is the one they count along with. */
      /* Each pass: the squares one by one, then the finished count held
         (holdMs, from the moment the last number is up) before it goes. */
      const held = (n - 1) * UC.stepMs + (UC.numMs || 0) + (UC.holdMs || UC.readMs);
      const cycle = held + UC.gapMs;
      let t = 0;
      for (let pass = 0; pass < UC.passes; pass++) {
        /* One square at a time, and one thing at a time in each: its
           arrow, and then — a beat later — its number. The number is the
           count of the step the arrow has just made, so it comes after
           it; the two arriving together read as a label, not a count. */
        for (let k = 0; k < n; k++) {
          (function (k) {
            later(function () {
              self.countCells[k].g.classList.add('on');
              SFX.tick(k);
            }, t + k * UC.stepMs);
            later(function () {
              self.countCells[k].g.classList.add('num');
            }, t + k * UC.stepMs + (UC.numMs || 0));
          })(k);
        }
        later(function () {
          self.countCells.forEach(function (c) { c.g.classList.remove('on', 'num'); });
        }, t + held);
        t += cycle;
      }
      /* When the last hold ends — the moment the caller writes the total. */
      return t - UC.gapMs;
    },

    /* Seats a segment's two points, its line and its four labels. */
    /* `into` names which set of nodes to write into. Left out, it is the
       board's own pair — every caller in the game. Given an example slot,
       the very same placement runs against that slot's nodes instead,
       which is the point: a pair recalled on a later screen is laid out
       by the code that laid it out the first time, so it cannot drift
       from how the child saw it. */
    placeSegment: function (spec, into) {
      const G = C.GRID, SG = G.segment;
      /* The paper is ordinarily made by the first screen that shows it,
         and every screen after inherits it. The picker breaks that: a
         jump from the title beat straight into the middle of the lesson
         asks for a pair to be drawn on paper nobody has made yet. Make
         it — `build` only ever runs once. */
      if (!into) this.build();
      const T = into || this;
      if (!T.segLine) return;
      /* A fresh pass over what is inked. Only for the board's own pair:
         an example slot is a small picture of its own and is laid out
         against nothing. */
      if (!into) {
        this.startLabelPass();
        const GG = C.GRID;
        const qx = function (v) { return GG.originX + v * GG.stepX; };
        const qy = function (v) { return GG.originY - v * GG.stepY; };
        this.inkLine(qx(spec.a.x), qy(spec.a.y), qx(spec.b.x), qy(spec.b.y), 'the pair');
        this.labelLegs().forEach(function (L, i) {
          if (L) this.inkLine(qx(L.from.x), qy(L.from.y), qx(L.to.x), qy(L.to.y), 'leg ' + i);
        }, this);
        const dr = C.GRID.segment.dotR + 4;
        [spec.a, spec.b].concat(this.labelLegs().filter(Boolean).map(function (L) { return L.to; }))
          .forEach(function (pt) {
            this.inkBox(qx(pt.x) - dr, qy(pt.y) - dr, qx(pt.x) + dr, qy(pt.y) + dr, 'a point');
          }, this);
      }
      /* A length written on the last pair does not belong to this one.
         Screens that keep their segment never come through here, so a
         measurement stays up across the beats that talk about it and
         goes the moment the points change.

         Unless this IS the pair that is already up — `relabel` puts the
         same spec back through here on every frame of a push-in, and a
         length wiped sixty times a second is a length nobody sees. */
      if (T.segRes && spec !== this.lastPlotted) {
        T.segRes.classList.remove('pop');
        T.segRes.textContent = '';
      }
      const NS2 = 'http://www.w3.org/2000/svg';
      const a = spec.a, b = spec.b;
      /* The pair currently drawn. The beat that argues about a segment
         inherits it rather than declaring one, so this is the only way
         it can find out what it is arguing about. */
      /* Only the board's own pair is the one the game is about; an
         example is a picture of a pair that was settled screens ago. */
      /* A new pair forgets which side the last one's labels were on —
         the side is held so a label does not hop during a push-in, and
         holding it across a change of pair would carry one pair's
         layout onto another. */
      if (!into && spec !== this.lastPlotted) {
        ['a', 'b'].forEach(function (k) { if (T.segParts[k]) T.segParts[k].heldDir = null; });
      }
      if (!into) { this.lastPlotted = spec; this.markCrossing(); }
      // a screen can recolour the segment — red once it closes a triangle
      /* On the park (55–61) all three sides are its fence, in one green:
         AB takes the green its two other sides already have, and so does
         the length written on it. */
      const parkSide = !into && this.park ? G.leg.vColor : null;
      const segCol = spec.color || parkSide || SG.lineColor;
      T.segLine.setAttribute('stroke', segCol);
      T.segLine.style.color = segCol;   // for its own glow
      if (T.segRes) T.segRes.setAttribute('fill', parkSide || G.ink);
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const self = this;
      /* Everything typographic is worked out at the size the camera is
         actually setting it, not at the size the config names. */

      /* Up to each point's white ring and no further, like every side
         of the drawing (placeLeg). It ran to the middle of each point,
         under the dot — invisible while the dot was at full strength,
         and plainly there, running into the middle of A, whenever the
         dot was faded: a highlight on another side, or the dot still
         fading in. */
      /* …and exactly TO it, with no paper between: square ends, their
         corners on the ring, the point drawn over the rest — the join
         every side makes (placeLeg, meetPoint). Stopped a cap's width
         short, the round end only touched the ring at one spot and left
         a gap either side of it. */
      {
        const lw = +T.segLine.getAttribute('stroke-width') || SG.lineWidth || 0;
        const R = SG.dotR + (SG.dotStrokeW || 0) / 2;
        const r = Math.sqrt(Math.max(0, R * R - lw * lw / 4));
        const e = inset(px(a.x), py(a.y), px(b.x), py(b.y), r, r);
        T.segLine.setAttribute('x1', e[0]); T.segLine.setAttribute('y1', e[1]);
        T.segLine.setAttribute('x2', e[2]); T.segLine.setAttribute('y2', e[3]);
      }

      /* Same two ends for the dashed guide; it grows out of A, so the
         group's origin is pinned there. */
      /* An example carries no guide: it is only ever shown finished. */
      if (T.segDash) {
      {
        /* To each point's ring, dots spaced to fit — see the leg's
           dotted guide in placeLeg. */
        const k = this.hostScale();
        const cw = (+T.segDash.getAttribute('stroke-width') || 0) / k;
        const r = SG.dotR + (SG.dotStrokeW || 0) / 2 + cw / 2;
        const e = inset(px(a.x), py(a.y), px(b.x), py(b.y), r, r);
        T.segDash.setAttribute('x1', e[0]); T.segDash.setAttribute('y1', e[1]);
        T.segDash.setAttribute('x2', e[2]); T.segDash.setAttribute('y2', e[3]);
        T.segDash.setAttribute('stroke-dasharray', evenDots(SG.dashArray,
          Math.hypot(e[2] - e[0], e[3] - e[1]) * k));
      }
      /* It grows from the left-hand end, so the guide always reads left
         to right — the order the pair is read in — rather than from
         whichever point the screen happened to call `a`. A column has
         no left and right, so that one grows upward from its lower
         point. */
      const from = (a.x === b.x) ? (a.y <= b.y ? a : b) : (a.x <= b.x ? a : b);
      T.segDashG.style.transformOrigin = px(from.x) + 'px ' + py(from.y) + 'px';
      }
      const len = Math.hypot(+T.segLine.getAttribute('x2') - +T.segLine.getAttribute('x1'),
                             +T.segLine.getAttribute('y2') - +T.segLine.getAttribute('y1'));
      windBack(T.segLine, len, false);

      /* A vertical segment stacks its points, so labels above and
         below would collide with each other. Those go to the sides. */
      const vertical = (a.x === b.x);
      // face the labels away from the y-axis, or they sit on its numbers

      /* Where a row's labels go is decided once, for the pair — never
         once per point. A label with no room beside its own point used
         to drop under it on its own, which left the two points on one
         board labelled two different ways: one level, one below. The
         child reads that as the two points meaning different things.
         So if either of them cannot take its own side, both go over
         their points instead, and they stay a matched pair.

         Over, not under: it is where the labels already are when the
         child taps the points out, so a pair carried onto the distance
         question does not shuffle, and it keeps the space beneath the
         line free for the count-out to hang its squares in. */
      const label = function (p) {
        return p.coordParts ? p.coordParts.map(function (f) { return f.t; }).join('')
                            : (p.coordText || ('(' + numText(p.x) + ',\u00A0' + numText(p.y) + ')'));
      };
      let stacked = false;
      if (!vertical && spec.coordSide) {
        /* A screen can say which side of the points its coordinates go.
           The beats that work the subtraction want them under, because
           the space above the line is where the working happens and the
           length it produces is written. */
        stacked = spec.coordSide;
      } else if (!vertical && spec.coordDy == null) {
        stacked = [a, b].some(function (p) {
          const mate = (p === a) ? b : a;
          const w = self.textW(label(p), SG.coordSize * self.typeScale());
          const want = px(p.x) + (p.x < mate.x ? -1 : 1) *
                       (SG.dotR + SG.coordFit + w / 2);
          return Math.abs(self.clampX(want, w) - want) > 0.5;   // had to be pulled back
        });
        /* And if over the point is where the x-axis numbering is, the
           pair goes under instead — again together. */
        if (stacked && [a, b].some(function (p) {
          return self.onXAxisRow(py(p.y) + G.found.labelDy, SG.coordSize * self.typeScale());
        })) stacked = 'under';
      }

      [['a', a], ['b', b]].forEach(function (pair) {
        const key = pair[0], p = pair[1], part = T.segParts[key];
        const X = px(p.x), Y = py(p.y);
        part.dot.setAttribute('cx', X);  part.dot.setAttribute('cy', Y);

        /* A point something else on the board already names. Two lines
           that share an end — the two walks out of Maya's house — each
           want to label it, and the second lands exactly on the first.
           The dot is drawn (it is an end of this line too, and it is
           the same dot in the same place), and nothing is written. */
        if (p.quiet) {
          part.coord.textContent = '';
          part.name.textContent = '';
          return;
        }

        /* What this label will say, worked out before it is placed
           rather than read off the node — which still holds the last
           screen's words at this point. */
        const ctext = p.coordParts
          ? p.coordParts.map(function (f) { return f.t; }).join('')
          : (p.coordText || ('(' + numText(p.x) + ',\u00A0' + numText(p.y) + ')'));

        /* The words go in before the block is placed, so what is
           measured is what will be read.

           Only when they have actually changed: rebuilding the label
           rewrites its fragments, and a fragment lit by `glowPart` is a
           node — rebuild it under the highlight and the light goes
           out. */
        if (part.coord.textContent === ctext) { /* the same words, still there */ }
        else {
          while (part.coord.firstChild) part.coord.removeChild(part.coord.firstChild);
          if (p.coordParts) {
            p.coordParts.forEach(function (f) {
              const ts = document.createElementNS(NS2, 'tspan');
              ts.textContent = f.t;
              /* `glow` may be true, or the name of the part it is — 'x'
                 or 'y' — so a screen can light the y halves of both
                 labels and then the x halves, which is the whole of the
                 argument that the distance is one minus the other. */
              if (f.glow) {
                ts.classList.add('glowable');
                if (typeof f.glow === 'string') ts.dataset.part = f.glow;
              }
              part.coord.appendChild(ts);
            });
          } else {
            part.coord.textContent = ctext;
          }
        }
        /* Its own if it has one, else whatever the board was told to
           call it while this same pair was already up. */
        const ntxt = p.name || (!into && self.namedAs ? (self.namedAs[key] || '') : '');
        part.name.textContent = ntxt;

        /* Away from the drawing: the direction from the middle of what
           is drawn, out through this point. A label that goes that way
           is outside the shape rather than in its fill, which is the
           whole of why a corner's letter used to float in the middle of
           its own triangle. */
        let away = { x: X - (px(a.x) + px(b.x)) / 2, y: Y - (py(a.y) + py(b.y)) / 2 };
        const legs = self.legPlaced || [];
        if (legs[0] && legs[1]) {
          const mx = (px(a.x) + px(b.x) + px(legs[0].to.x)) / 3;
          const my = (py(a.y) + py(b.y) + py(legs[0].to.y)) / 3;
          away = { x: X - mx, y: Y - my };
        }
        if (!away.x && !away.y) away = { x: 1, y: -1 };

        /* No hand-placed exceptions any more. The one that was left
           pushed the rescue vehicle's coordinates two and a half cells
           off their own point, because the rule could not then see the
           axis letters and would have written (0, 0) into the y. It can
           see them now, so the rule does it — and a screen that still
           reads better by hand is a fault in the rule to go and find. */
        self.placePointLabel(part, p, X, Y,
                             { ctext: ctext, ntext: ntxt, away: away,
                               at: p.x + ',' + p.y });
      });
    },

    /* The subtraction, worked on the board out of the coordinates it
       comes from — and then handed back to the line as its length.

       The order is the lesson. The two y-halves light first and let go,
       because they match and so play no part. Then the smaller x is
       lifted out of its own label into the back of the sum, then the
       larger into the front; only once both are up does the operator
       appear between them, then the equals, then the answer. Finally the
       answer leaves the sum and comes down to the middle of the span,
       where the word "units" is written after it.

       Nothing here moves an original, and nothing on the grid or the
       axes is touched. Each digit is copied into a travelling node that
       is discarded the moment the sum's own part takes over, so the
       coordinates are untouched from beginning to end. */
    runEquation: function (later, done) {
      const G = C.GRID, X = G.xeq, U = G.unitBox, SG = G.segment, self = this;
      const sp = this.lastPlotted;
      if (!this.xParts || !sp || !sp.a || !sp.b) { if (done) later(done, 0); return 0; }
      this.clearEquation();
      /* The beat before leaves both x-halves lit, and a sequence whose
         first move is "these two match" cannot open on a board where
         everything is already glowing. */
      this.glowPart(null, false);

      const row = sp.a.y === sp.b.y;
      const part = row ? 'x' : 'y';
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };

      const va = row ? sp.a.x : sp.a.y, vb = row ? sp.b.x : sp.b.y;
      const bigger = va >= vb ? 'a' : 'b', smaller = va >= vb ? 'b' : 'a';
      /* Taken in the order the sum is read — and said. "Six minus three"
         fetches the six first, so the front of the sum fills before the
         back, and the child hears the order they are watching. It is not
         the order the points sit in: on this row the six is the
         right-hand point. On a column the two happen to agree, the
         larger y being the upper point.

         The board is still read left to right and top to bottom, and the
         sweep below keeps to that — what is drawn along the pair is
         about the pair, not about the sum. */
      const firstRead = row ? (sp.a.x <= sp.b.x ? 'a' : 'b')
                            : (sp.a.y >= sp.b.y ? 'a' : 'b');
      const secondRead = firstRead === 'a' ? 'b' : 'a';
      const slotOf = function (which) { return which === bigger ? 0 : 2; };
      const hi = Math.max(va, vb), lo = Math.min(va, vb);
      const units = Math.abs(hi - lo);

      /* Laid out in full before anything is shown, so every part knows
         where it is going and nothing reflows as the sum is assembled. */
      /* A negative is bracketed in the sum, so it reads "2 − (-3)" and
         never "2 − -3". The copy that travels out of the label carries
         just the number; the brackets are the sum's own and appear when
         it lands. */
      const loTxt = lo < 0 ? '(' + numText(lo) + ')' : numText(lo);
      const text = [numText(hi), '\u2212', loTxt, '=', numText(units)];
      /* textW's flat width per character is fine for digits, but brackets
         and the minus are narrow glyphs — at a flat width "(-3)" claims
         half again the room it fills and the sum reads with holes round
         it. Weighed glyph by glyph here, so the parts sit evenly. */
      const glyphW = function (t) {
        return Array.prototype.reduce.call(String(t), function (acc, ch) {
          return acc + (/[()]/.test(ch) ? 0.33 : /[-\u2212=]/.test(ch) ? 0.5 : 0.58);
        }, 0) * X.size;
      };
      const w = text.map(glyphW);
      const whole = w.reduce(function (t, n) { return t + n; }, 0) + X.gap * 4;
      const midX = (px(sp.a.x) + px(sp.b.x)) / 2;
      let left, stageY;
      if (row) {
        /* Centred on the pair, but pushed off the y-axis where the pair
           sits beside it — a row whose middle falls on the axis would
           otherwise lay the sum straight across its numbering. */
        left = this.clampX(this.clearOfYAxis(midX, whole), whole) - whole / 2;
        /* And above whatever is up there — the higher point, or its
           coordinates if they are written over it. The row writes its
           coordinates under its points, so the sum comes down into the
           space they left. */
        let topY = Math.min(py(sp.a.y), py(sp.b.y));
        ['a', 'b'].forEach(function (k) {
          const c = self.segParts && self.segParts[k] && self.segParts[k].coord;
          if (!c || !c.textContent) return;
          const cy = parseFloat(c.getAttribute('y'));
          if (isFinite(cy)) topY = Math.min(topY, cy - SG.coordSize / 2);
        });
        stageY = this.clampY(topY - G.stepY * X.stageUp, X.size);
      } else {
        /* A column is worked below the x-axis instead: down past the
           axis and the numbers under it, and off to the side the column
           is not on. Over the top of a column the sum is a long way from
           the pair and hard against the frame; under the axis it sits in
           the quarter of the board a column always leaves empty. */
        const numbers = this.numRow().bot - G.originY;
        stageY = this.clampY(py(0) + numbers + G.stepY * X.underDown, X.size);
        /* Clear of the column itself, on whichever side has the room. */
        const gapX = G.stepX * X.underGap;
        const colX = px(sp.a.x);
        const toRight = colX + gapX;
        const toLeft = colX - gapX - whole;
        left = (toRight + whole <= G.w - 8) ? toRight : toLeft;
        left = this.clampX(left + whole / 2, whole) - whole / 2;
      }

      let run = 0;
      const at = w.map(function (width) {
        const cx = left + run + width / 2;
        run += width + X.gap;
        return cx;
      });
      this.xParts.forEach(function (t, n) {
        t.setAttribute('x', at[n]);
        t.setAttribute('y', stageY);
        t.setAttribute('font-size', X.size);   // the answer came down smaller last time
        t.textContent = text[n];
      });

      /* Where the finished length belongs: the very spot the count-out
         writes its total, which already keeps clear of the coordinate
         labels and of everything drawn. */
      const ux = row ? (sp.b.x > sp.a.x ? 1 : -1) : 0;
      const uy = row ? 0 : (sp.b.y > sp.a.y ? 1 : -1);
      const spot = this.showUnitTotal(sp.a, ux, uy, units, units, true);
      const wNum = this.textW(String(units), U.labelSize);
      const wWord = this.textW('units', U.labelSize);
      const both = wNum + X.gap + wWord;
      const numCx = spot.x - both / 2 + wNum / 2;
      this.xWord.setAttribute('x', spot.x - both / 2 + wNum + X.gap);
      this.xWord.setAttribute('y', spot.y);
      this.xWord.style.setProperty('--pen', X.wordMs + 'ms');
      this.xWord.textContent = 'units';

      /* the sweep, lying along the pair but drawn separately */
      const l2r = sp[firstRead], r2l = sp[secondRead];
      const len = Math.hypot(px(r2l.x) - px(l2r.x), py(r2l.y) - py(l2r.y));
      this.xSweep.setAttribute('x1', px(l2r.x)); this.xSweep.setAttribute('y1', py(l2r.y));
      this.xSweep.setAttribute('x2', px(r2l.x)); this.xSweep.setAttribute('y2', py(r2l.y));
      windBack(this.xSweep, len, false);
      this.xSweep.style.setProperty('--sweep', X.sweepMs + 'ms');

      /* Carries a copy of one digit out of its label and up into the sum,
         then hands over to the sum's own part and gets out of the way. */
      const lift = function (which, slot, t0) {
        const from = self.partSpot(which, part);
        later(function () {
          /* Everything off first: handing straight from one digit to the
             next left both lit for the frame they crossed on. */
          self.glowPart(null, false);
          self.glowPart(part, true, which);
          SFX.tick(2);
        }, t0);
        later(function () {
          if (!from) { self.xParts[slot].classList.add('on'); return; }
          const f = self.xFly;
          f.textContent = from.text;
          /* It starts life exactly over the digit it was copied from, at
             that digit's size, and is carried to its slot by moving its
             own x, y and font-size — no CSS transform anywhere, so there
             is nothing for a browser to misplace or fail to start. */
          f.setAttribute('x', from.x);
          f.setAttribute('y', from.y);
          f.setAttribute('font-size', from.size);
          f.classList.add('on');
          self.tweenText(f, { x: from.x, y: from.y, size: from.size },
                            { x: at[slot], y: stageY, size: X.size }, X.flyMs);
        }, t0 + X.pickMs);
        later(function () {
          const f = self.xFly;                 // pin the end, whatever was painted
          self.pinText(f, { x: at[slot], y: stageY, size: X.size });
          self.xParts[slot].classList.add('on', 'lit');
          f.classList.remove('on');
          self.glowPart(part, false, which);
          SFX.blip();
        }, t0 + X.pickMs + X.flyMs);
      };

      let t = 0;
      /* 1 — nothing. The halves that match were lit two beats ago, on
         the screen whose whole line was "the y-coordinates are the
         same", and lighting them again here said it a third time and
         made the child look back at something already settled. A
         highlight that is finished with does not come back; the board
         opens on the beat that is actually new. */

      /* 2 and 3 — the smaller first, into the back of the sum, then the
         larger into the front. Taken in the order they are read off the
         board; assembled in the order the sum is read. */
      lift(bigger, slotOf(bigger), t);
      t += X.pickMs + X.flyMs;
      lift(smaller, slotOf(smaller), t);
      t += X.pickMs + X.flyMs + X.settleMs;

      // 4 — the sum assembled between them, a piece at a time
      later(function () { self.xParts[1].classList.add('on'); SFX.tick(3); }, t);
      t += X.opMs;
      later(function () { self.xParts[3].classList.add('on'); SFX.tick(4); }, t);
      t += X.eqMs;
      later(function () { self.xParts[4].classList.add('on', 'lit'); SFX.chime(); }, t);
      t += X.resMs + X.readMs;

      // 5 — and what it measures, lit from one end of the pair to the other
      later(function () { self.xSweep.classList.add('draw'); SFX.draw(); }, t);
      t += X.sweepMs + X.holdMs;

      /* 6 — the answer leaves the sum and comes down to the line. The
         same node the child watched being worked out, not a second one
         fading in; the rest of the sum goes with it, because "6 - 3 ="
         left hanging without its answer reads as broken. */
      later(function () {
        const a = self.xParts[4];
        a.classList.add('drop');
        self.tweenText(a, { x: at[4], y: stageY, size: X.size },
                          { x: numCx, y: spot.y, size: U.labelSize }, X.dropMs);
        [0, 1, 2, 3].forEach(function (n) { self.xParts[n].classList.add('gone'); });
        SFX.blip();
      }, t);
      t += X.dropMs;

      // 7 — landed, pinned, and the word is written after it
      later(function () {
        const a = self.xParts[4];
        self.pinText(a, { x: numCx, y: spot.y, size: U.labelSize });
        self.xWord.classList.add('on'); SFX.draw();
      }, t);
      t += X.wordMs;
      later(function () { if (done) done(); }, t + 200);
      return t + 200;
    },

    /* Lights the fragments named `part` — of one point, or of both.
       Passing no name lights every glowable fragment, which is what the
       axis cases want. */
    glowPart: function (part, on, which) {
      const self = this;
      (which ? [which] : ['a', 'b']).forEach(function (k) {
        /* 'c' is the corner, whose label is the first side's (33, 34:
           x₂ and y₁ are read off C). */
        const c = k === 'c'
          ? (self.legSlots && self.legSlots[0] && self.legSlots[0].coord)
          : (self.segParts[k] && self.segParts[k].coord);
        if (!c) return;
        Array.prototype.forEach.call(c.children, function (ts) {
          if (!ts.classList || !ts.classList.contains('glowable')) return;
          if (part && ts.dataset && ts.dataset.part !== part) return;
          ts.classList.toggle('glow', !!on);
        });
      });
    },

    /* Makes the y-parts of both coordinate labels glow. */
    glowCoords: function (on) {
      const self = this;
      ['a', 'b'].forEach(function (k) {
        const c = self.segParts[k].coord;
        Array.prototype.forEach.call(c.children, function (ts) {
          if (ts.classList && ts.classList.contains('glowable')) {
            ts.classList.toggle('glow', !!on);
          }
        });
      });
    },

    /* Highlights the segment and writes the answer on it. */
    /* dx slides the plate along the segment: a segment centred on the
       origin would otherwise drop its answer straight onto the y-axis
       and the -1 beside it. */
    /* How long the pair is, written on the pair.

       Its place is not a decision a screen should have to make. A
       length belongs in the middle of the span it measures — that is
       what tells the child it is the distance between those two points
       and not a remark about one of them — so unless a caller says
       otherwise that is where it goes: square in the middle, out to the
       side by the same air a coordinate keeps from its dot, and then
       slid along its own line only as far as it takes to get off the
       other axis' numbering. Never past the points: a length that has
       left the span it measures has stopped measuring it. */
    showSegResult: function (spec, text, dy, dx, into) {
      const G = C.GRID, SG = G.segment, T = into || this;
      if (!T.segLine) return;             // no paper yet; see placeSegment
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      /* The total simply appears — nothing on the drawing pulses with
         it. It used to switch on the line's endless glow as well, so the
         line (and the points it runs into) seemed to go off again just
         as the answer was written. */
      const ax = px(spec.a.x), ay = py(spec.a.y);
      const bx = px(spec.b.x), by = py(spec.b.y);
      let X = (ax + bx) / 2, Y = (ay + by) / 2;
      /* A slanted pair has its length written ALONG it, turned to the
         line's own angle (never upside down) and a clear gap above it —
         the way a slanted side's length already is (placeLegLength).
         Laid flat over the middle, "√40 units" was written across the
         very line it measures. */
      const upright = (ax === bx);
      const diag = !upright && (ay !== by);
      let ang = 0, nx = 0, ny = -1;
      if (diag) {
        const ux = bx - ax, uy = by - ay, ml = Math.hypot(ux, uy) || 1;
        ang = Math.atan2(uy, ux) * 180 / Math.PI;
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        nx = -uy / ml; ny = ux / ml;
        if (ny > 0) { nx = -nx; ny = -ny; }          // the side above it
      }
      const ca = Math.abs(Math.cos(ang * Math.PI / 180));
      const sa = Math.abs(Math.sin(ang * Math.PI / 180));
      if (dx == null && dy == null) {
        const size = (SG.resSize || SG.coordSize) * this.typeScale();
        const m = this.textMetrics(text, size);
        /* Ink is the right measure of the air between this and the
           things it is written beside — a dot, a line. It is the wrong
           measure of whether it has landed on the axis numbering: a
           word with no descenders would claim to clear a band it is
           sitting in, so that question is asked of the whole band a
           label of this size occupies. */
        const band = Math.max(m.h, size);
        const vertical = (ax === bx);
        const gap = SG.lineWidth / 2 + SG.resGap * this.typeScale();
        /* How far it may travel along the line before it is no longer
           between the two points. */
        const half = (vertical ? Math.abs(ay - by) : Math.abs(ax - bx)) / 2;
        const room = Math.max(0, half - (vertical ? Math.max(m.up, m.down) : m.w / 2) - SG.resInset);
        if (vertical) {
          // the side away from the y-axis, where its numbers are not
          X += (spec.a.x >= 0 ? 1 : -1) * (gap + m.w / 2);
          /* A column that straddles the x-axis has its own middle in
             the row the axis numbers live in. It steps off it, along
             its own line, away from the axis. */
          const away = (Y <= G.originY) ? -1 : 1;
          let moved = 0, guard = 0;
          while (this.onXAxisRow(Y, band) && moved < room && guard++ < 60) {
            Y += away * 6; moved += 6;
          }
        } else if (diag) {
          /* Its middle a clear gap off the line: half the line, the air
             every length keeps, and half the type's own height. */
          const off = gap + band / 2 + 5;
          X += nx * off;
          Y += ny * off;
        } else {
          Y -= gap + m.down;
          // over the line, unless over the line is the x-axis numbering
          if (this.onXAxisRow(Y, band)) Y = (ay + by) / 2 + gap + m.up;
          /* And a row whose middle falls on the y-axis steps aside,
             along its own line, by as much as that takes. */
          const want = this.clearOfYAxis(X, m.w);
          X += Math.max(-room, Math.min(room, want - X));
        }
        const cw0 = diag ? (m.w * ca + band * sa) : m.w;
        const ch0 = diag ? (m.w * sa + band * ca) : band;
        X = this.clampX(X, cw0);
        Y = this.clampY(Y, ch0);
      } else { X += (dx || 0); Y += (dy || 0); }
      T.segRes.textContent = text;
      /* The pair's own length goes through the rule too. An example
         slot is a picture of its own and is laid out against nothing,
         so only the board's own is seated. */
      /* A column's length is TURNED and set along its own line, the
         way a vertical leg's is. Laid across, "5 units" is written
         through the very line it measures — which is what the second
         picture shows, on the board's own pair AND on the example
         beside it. An example is laid out against nothing, so it needs
         this more than the board's own does, not less. */
      const size2 = (SG.resSize || SG.coordSize) * this.typeScale();
      const m2 = this.textMetrics(text, size2);
      const band2 = Math.max(m2.h, size2);
      const bw2 = upright ? band2 : diag ? (m2.w * ca + band2 * sa) : m2.w;
      const bh2 = upright ? m2.w : diag ? (m2.w * sa + band2 * ca) : band2;
      if (upright) {
        /* Beside the line, a line's width out, on the side away from
           the y-axis so it does not land on the numbering. */
        X = ax + (spec.a.x >= 0 ? 1 : -1) * (SG.lineWidth / 2 + bw2 * 0.62);
        Y = (ay + by) / 2;
      }
      let seat2 = { x: X, y: Y };
      if (!into && diag) {
        /* Where it was put, always: just above its own line, turned to
           it. The rule that seats a blocked label tests the upright box
           round the words — and round slanted words that box always
           crosses the line they lie beside, so every slanted length was
           "blocked" and sent off somewhere else: one above its line, the
           next below, one hard against it and one far away. */
        T.segRes.setAttribute('x', X);
        T.segRes.setAttribute('y', Y);
        this.inkBox(X - bw2 / 2, Y - bh2 / 2, X + bw2 / 2, Y + bh2 / 2, 'the length', T.segRes);
      } else if (!into) {
        const perp = upright ? { x: (spec.a.x >= 0 ? 1 : -1), y: 0 } : { x: 0, y: -1 };
        seat2 = this.seatLength(T.segRes, X, Y, bw2, bh2,
                        perp, T.segRes, { x: (ax + bx) / 2, y: (ay + by) / 2 });
      } else {
        T.segRes.setAttribute('x', X);
        T.segRes.setAttribute('y', Y);
      }
      const tw = T.segResTurn;
      if (tw) {
        if (upright) tw.setAttribute('transform',
                       'rotate(-90 ' + seat2.x + ' ' + seat2.y + ')');
        else if (diag) tw.setAttribute('transform',
                       'rotate(' + ang.toFixed(2) + ' ' + seat2.x + ' ' + seat2.y + ')');
        else tw.removeAttribute('transform');
      }
      T.segRes.classList.add('pop');
      /* No plate behind it: the text carries its own paper halo, the
         same as every other measurement written on the board. A drawn
         box round this one made it read as a different kind of thing
         from the leg lengths beside it. */
    },

    /* Empties every label the board can write, text and all. The
       ordinary clears only drop the classes that show a label, so its
       words survive — invisible, but still there. That is fine between
       screens, where the next one overwrites them, and wrong on a
       replay: the board came back carrying the last run's coordinates
       under a group that had simply been switched off. */
    blankLabels: function () {
      const self = this;
      if (this.segParts) ['a', 'b'].forEach(function (k) {
        const p = self.segParts[k];
        if (p && p.coord) p.coord.textContent = '';
        if (p && p.name)  p.name.textContent = '';
      });
      if (this.segRes) this.segRes.textContent = '';
      (this.exSlots || []).forEach(function (s) {
        s.segRes.textContent = '';
        ['a', 'b'].forEach(function (k) {
          s.segParts[k].coord.textContent = '';
          s.segParts[k].name.textContent = '';
        });
      });
      if (this.legSlots) this.legSlots.forEach(function (L) {
        ['coord', 'name', 'len'].forEach(function (k) {
          if (L[k]) L[k].textContent = '';
        });
      });
      if (this.unitLabel) this.unitLabel.textContent = '';
      if (this.foundLabel) this.foundLabel.textContent = '';
    },

    /* Is the pair on the paper this one? What "keeping" a drawing
       means is that the beat before left the right thing there — true
       of every route through the script, and false the moment the
       picker drops a child in from somewhere else. Every screen that
       keeps asks this first. */
    /* Where the number of a side's length actually sits: the digits of
       "4 units", not the middle of the whole label, in stage pixels —
       with its size and its slant, since a vertical side writes its
       length turned on end. Read through the text's own screen
       transform, so whatever rotation or camera the label is under,
       the copy made from this starts exactly on top of the digit. */
    digitSpot: function (i, whole) {
      const L = this.legSlots && this.legSlots[i];
      const t = L && L.len;
      if (!t || !(t.textContent || '').trim()) return null;
      /* The number a length starts with ("4" of "4 units"), or — for a
         length written in letters — the whole of it ("x₂ − x₁"). */
      const num = whole ? (t.textContent || '') : (t.textContent || '').split('\u00A0')[0];
      return this.textSpot(t, num);
    },

    /* Where the first `num.length` characters of a text on the board
       are on the STAGE: their middle, the size they are set at there and
       the angle they are turned to — what a copy flying off them, or
       onto them, needs. */
    textSpot: function (t, num) {
      if (!t || !num) return null;
      /* The text's frame relative to the BOARD's, not to the screen: the
         product of the two screen transforms, so whatever both include
         above the board cancels out. Safari (and Firefox before 126)
         leaves the stage's own scale out of getScreenCTM where Chrome
         puts it in, and read against the screen the copy of the "4"
         started 100–200px from the real one there. */
      const svgM = el.gridAxes.getScreenCTM && el.gridAxes.getScreenCTM();
      const txtM = t.getScreenCTM && t.getScreenCTM();
      if (!svgM || !txtM || !num) return null;
      const m = svgM.inverse().multiply(txtM);
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      try {
        for (let c = 0; c < num.length; c++) {
          const b = t.getExtentOfChar(c);
          x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
          x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
        }
      } catch (e) { return null; }
      const pt = el.gridAxes.createSVGPoint();
      pt.x = (x1 + x2) / 2; pt.y = (y1 + y2) / 2;
      const b = pt.matrixTransform(m);            // board units
      const s = this.boardToStage(b.x, b.y);      // stage pixels
      const fs = parseFloat(getComputedStyle(t).fontSize) || C.GRID.leg.lenSize;
      return { x: s.x, y: s.y,
               size: fs * Math.hypot(m.a, m.b) * s.k,
               rot: Math.atan2(m.b, m.a) * 180 / Math.PI,
               text: num, color: t.getAttribute('fill') };
    },

    /* Screen pixels per board unit. The camera zooms by moving the
       viewBox, so this is one number for the whole board — and it is
       what a line drawn with `vector-effect: non-scaling-stroke` is
       measured in: its width and its dashes are pixels, not board
       units. Worked out from the box and the view rather than asked of
       the DOM, so it is right on a hidden board and mid-push alike. */
    hostScale: function () {
      const b = this.box, V = this.viewRect();
      if (!b || !V || !V.w || !V.h) return 1;
      return Math.min(b.w / V.w, b.h / V.h) || 1;
    },

    /* How far short of a point a line must stop to clear it: the
       dot, its white ring, and the line's own round cap, with a little
       air. A dotted line run centre to centre lays its last dot on the
       point it is arriving at — on C's orange, and against B's ring.
       Which dot is there is worked out, not assumed: the pair's own
       points are bigger than the corner a leg drops to. */
    /* Is there a point drawn at (gx, gy), in grid units — one of the
       pair, or a corner the sides run between? */
    isPoint: function (gx, gy) {
      const near = function (p) {
        return !!p && Math.abs(p.x - gx) < 1e-6 && Math.abs(p.y - gy) < 1e-6;
      };
      const d = this.lastPlotted;
      if (d && (near(d.a) || near(d.b))) return true;
      return (this.legPlaced || []).some(function (L) {
        return L && (near(L.from) || near(L.to));
      });
    },

    clearPoint: function (x, y, capW) {
      return this.ringR(x, y) + (capW || 0) / 2 + 4;
    },

    /* The outside of the white ring of the point at board (x, y): one of
       the pair's, or the corner's. */
    ringR: function (x, y) {
      const G = C.GRID, SG = G.segment, LG = G.leg;
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      const d = this.lastPlotted;
      const onPair = !!(d && d.a && d.b && [d.a, d.b].some(function (p) {
        return Math.abs(px(p.x) - x) < 1 && Math.abs(py(p.y) - y) < 1;
      }));
      return onPair ? SG.dotR + (SG.dotStrokeW || 0) / 2
                    : LG.dotR + 3 / 2;             // the corner's 3px ring
    },

    /* How far from a point's middle a solid line `w` wide stops: where
       the two corners of its square end land on the ring's outside. So
       the line meets the point across its whole width — no paper either
       side of the join — and goes under the ring only in the middle, by
       less than a pixel; the point is drawn over it. */
    meetPoint: function (x, y, w) {
      const R = this.ringR(x, y), h = (w || 0) / 2;
      return Math.sqrt(Math.max(0, R * R - h * h));
    },

    /* Which layer the measuring line lies in. Its own is the pair's
       group: over the pair's guide and line, which it is laid along on
       the pair screens, and under the pair's two points. But the corner
       C is drawn in the first side's layer, under the pair's group, and
       a line over C runs on over its ring — so while a measurement from
       `from` to (ex, ey) touches C, at an end or on the way past, it
       goes into that layer instead, just under C's dot: still over both
       sides and their guides, under the corner. With no measurement it
       goes home. */
    measLayer: function (from, ex, ey) {
      const ml = this.measLine, mc = this.measCap;
      if (!ml || !this.segGroup) return;
      const L0 = this.legSlots && this.legSlots[0];
      const corner = (this.legPlaced || [])[0];
      const c = corner && corner.mark ? corner.to : null;
      let underC = false;
      if (from && c && L0 && L0.g.classList.contains('on')) {
        const sx = ex - from.x, sy = ey - from.y, s = Math.hypot(sx, sy);
        const qx = c.x - from.x, qy = c.y - from.y;
        const along = s ? (qx * sx + qy * sy) / (s * s) : 0;
        const off = s ? Math.abs(qx * sy - qy * sx) / s : Math.hypot(qx, qy);
        underC = off < 1e-6 && along > -1e-6 && along < 1 + 1e-6;
      }
      const host = underC ? L0.g : this.segGroup;
      if (ml.parentNode === host) return;
      const before = underC ? L0.dot : this.segParts.a.dot;
      host.insertBefore(ml, before);
      host.insertBefore(mc, before);
    },

    /* The pair, finished.

       `settleFurniture` does this for the axes: a screen that INHERITS
       a drawing rather than making one cannot depend on every class
       surviving the journey, and the board would rather assert what
       should be there than hope. A pair that is placed but wound back
       is a pair nobody can see — which is how the hypotenuse came to
       be missing from the beat whose whole subject is the triangle.

       It adds nothing that is not already meant to be there: the ends
       are wherever the pair was last placed, and a label with no words
       in it is left alone. */
    settlePair: function () {
      if (!this.segLine || !this.lastPlotted) return;
      this.segGroup.classList.add('on');
      this.segLine.classList.add('draw');
      this.segLine.style.strokeDashoffset = 0;
      this.segLine.classList.remove('inking');        // drawn: see windBack
      const p = this.segParts;
      if (!p) return;
      ['a', 'b'].forEach(function (k) {
        if (!p[k]) return;
        p[k].dot.classList.add('pop');
        if ((p[k].coord.textContent || '').trim()) p[k].coord.classList.add('pop');
        if ((p[k].name.textContent || '').trim()) { p[k].name.classList.add('pop'); p[k].name.classList.remove('faded'); }
      });
    },

    /* A drawing put up already finished: what a screen reached some other
       way than from the one before it — the picker, Back — expects to
       find on the paper. Every piece goes on `set`, drawn with nothing
       arriving, because in play it was already there when this screen
       began. `want` is Game.drawingBefore's account of it. */
    seed: function (want) {
      const self = this;
      const now = function (fn) { fn(); }, nothing = function () {};
      this.clearFound();
      this.clearSegment();       // the last drawing, whole: sides, lengths, marker, result
      const spec = want.pair;
      this.placeSegment(spec);
      this.segGroup.classList.add('on');
      ['a', 'b'].forEach(function (k) {
        const part = self.segParts[k];
        part.dot.classList.add('pop', 'set');
        if ((part.coord.textContent || '').trim()) part.coord.classList.add('pop', 'set');
        if ((part.name.textContent || '').trim()) { part.name.classList.add('pop', 'set'); part.name.classList.remove('faded'); }
      });
      if (want.joined) {
        this.segLine.classList.add('draw', 'set');
        this.segLine.style.strokeDashoffset = 0;
        this.segLine.classList.remove('inking');      // drawn: see windBack
      }
      /* The dotted guide is its own thing: a pair can carry both (29b,
         29c, 51–53 show the line and the guide along it). */
      if (want.dash && this.segDashG) this.segDashG.classList.add('draw', 'set');
      /* Written the way the screen writes them: a town's places at the
         pair's size and in any spot they name (markPlaces), anything else
         as a located point. */
      const SGm = C.GRID.segment, tkm = this.typeScale();
      const town = (C.SCRIPT[Game.index] || {}).town;
      (want.marks || []).forEach(function (m) {
        if (town) self.solve(m.x, m.y, { size: SGm.coordSize * tkm,
                                         under: SGm.dotR + 6 + SGm.coordSize * tkm * 0.62 });
        else self.solve(m.x, m.y);
        const g = self.foundMarks[self.foundMarks.length - 1];
        if (g) g.classList.add('set');
      });
      if ((want.legs || []).length) {
        /* Their own drawing code, on a clock that fires at once, with
           nothing flown in: a length read off the board has already
           been carried there, on a screen this child did not watch. */
        this.runLegs(want.legs.map(function (l) {
          return Object.assign({}, l, { settled: true, lengthFrom: null });
        }), now, nothing);
        (this.legSlots || []).forEach(function (L) {
          if (!L.g.classList.contains('on')) return;
          /* Only what is drawn is marked drawn: a solid line marked while
             its guide was the one showing would, when it is later drawn,
             appear already there instead of drawing itself. */
          if (L.line.classList.contains('draw')) L.line.classList.add('set');
          if (L.dashG && L.dashG.classList.contains('draw')) L.dashG.classList.add('set');
          ['dot', 'coord', 'name', 'len'].forEach(function (k) {
            if (L[k].classList.contains('pop')) L[k].classList.add('set');
          });
        });
        if (this.triFill) this.triFill.classList.add('set');
      }
      if (want.marker) {
        this.rightAngle(true);
        if (this.rightMark) this.rightMark.classList.add('set');
      }
      if (want.result) {
        this.showSegResult(spec, want.result.text, want.result.dy, want.result.dx);
        if (this.segRes) this.segRes.classList.add('set');
      }
      this.markCrossing();
    },

    /* Whether what is on the paper is already the drawing `want` says —
       the same pair, the same sides with the same lengths showing, the
       marker and the result as they should be. True on every step of
       the way through the script, which is why a screen played up to is
       never re-seeded. */
    holdsDrawing: function (want) {
      if (!want || !want.pair) return true;
      if (!this.showing(want.pair)) return false;
      const self = this, placed = this.legPlaced || [];
      const up = [];
      placed.forEach(function (sp, i) {
        const L = self.legSlots && self.legSlots[i];
        if (sp && L && L.g.classList.contains('on')) up.push({ sp: sp, L: L });
      });
      if (up.length !== want.legs.length) return false;
      const at = function (p, q) { return p && q && p.x === q.x && p.y === q.y; };
      for (let k = 0; k < up.length; k++) {
        const w = want.legs[k], h = up[k];
        if (!at(w.from, h.sp.from) || !at(w.to, h.sp.to)) return false;
        if (!!w.length !== h.L.len.classList.contains('pop')) return false;
      }
      const marker = !!(this.rightMark && this.rightMark.classList.contains('on'));
      if (marker !== !!want.marker) return false;
      const result = !!(this.segRes && this.segRes.classList.contains('pop'));
      if (result !== !!want.result) return false;
      return true;
    },

    /* Whether this pair is the one already up — the same two points, in
       either order. A screen that names them the other way round is
       still talking about the drawing the child is looking at: 15 lists
       14's pair as (1, −3), (1, 2), and read in order it counted as a
       new pair, so the points were taken away and plotted again. */
    showing: function (spec) {
      const k = this.lastPlotted;
      if (!(spec && spec.a && spec.b && k && k.a && k.b)) return false;
      /* ON the board, not merely remembered. A cleared pair keeps its
         coordinates here, and asked about it later this said "yes, it
         is up" — so a screen that keeps its drawing drew nothing, over
         an empty board ("Did you notice?" reached with the picker). */
      if (!this.segGroup || !this.segGroup.classList.contains('on')) return false;
      const at = function (p, q) { return p.x === q.x && p.y === q.y; };
      return (at(k.a, spec.a) && at(k.b, spec.b)) || (at(k.a, spec.b) && at(k.b, spec.a));
    },

    /* The board's own name for a point — 'a' or 'b' of the pair that is
       up — found by where it is, not by what a screen calls it. */
    keyAt: function (p) {
      const k = this.lastPlotted;
      if (!p || !k) return null;
      if (k.a && k.a.x === p.x && k.a.y === p.y) return 'a';
      if (k.b && k.b.x === p.x && k.b.y === p.y) return 'b';
      return null;
    },

    /* A kept pair, carried into this screen's form with no arrival: the
       points stay exactly where they are, nothing pops, nothing draws.
       What can change is only how it is written — its coordinates built
       in parts a later beat can light, and a dotted guide (the distance
       still being asked) becoming the solid line it now is, already
       drawn. The measuring line that lay along it is the screen's to
       clear, as it always has been. */
    carryOn: function (spec, solid) {
      if (!spec || !this.segParts || !this.lastPlotted) return;
      const self = this, NS2 = 'http://www.w3.org/2000/svg';
      let k = this.lastPlotted, changed = false;
      [spec.a, spec.b].forEach(function (p) {
        if (!p || !p.coordParts) return;
        const key = self.keyAt(p);
        if (!key) return;
        const node = self.segParts[key].coord;
        if (!node.querySelector('tspan.glowable')) {
          while (node.firstChild) node.removeChild(node.firstChild);
          p.coordParts.forEach(function (f) {
            const ts = document.createElementNS(NS2, 'tspan');
            ts.textContent = f.t;
            if (f.glow) {
              ts.classList.add('glowable');
              if (typeof f.glow === 'string') ts.dataset.part = f.glow;
            }
            node.appendChild(ts);
          });
        }
        /* Remembered on a copy of the pair — never on the screen's own
           spec, which a later visit reads fresh — so the next lay-out
           of this pair keeps its parts. */
        const next = Object.assign({}, k);
        next[key] = Object.assign({}, k[key], { coordParts: p.coordParts });
        k = next; changed = true;
      });
      if (changed) this.lastPlotted = k;
      /* Only a screen that asks for it. Every kept pair passes through
         here, and a guide that another screen means to leave as a guide
         must not be turned solid on the way. */
      if (solid && !spec.dash && this.segLine) {
        if (this.segDashG) this.segDashG.classList.remove('draw');
        this.segLine.classList.add('draw', 'set');
        this.segLine.style.strokeDashoffset = 0;
        this.segLine.classList.remove('inking');      // drawn: see windBack
      }
    },

    clearSegment: function () {
      this.namedAs = null;          // this pair's letters go with it
      this.clearUnits();
      this.clearLegs();
      this.clearExamples();
      this.clearMeasure();
      if (!this.segGroup) return;
      this.glowCoords(false);
      if (this.segRes) this.segRes.classList.remove('pop', 'set');
      if (this.segResTurn) this.segResTurn.classList.remove('blinking');
      if (this.segLine) this.segLine.classList.remove('lit', 'good');
      this.segGroup.classList.remove('on');
      this.markCrossing();
      const parts = this.segParts;
      if (parts) ['a', 'b'].forEach(function (k) {
      });
      (this.pulseLines || []).forEach(function (l) { l.classList.remove('on'); });
      /* `set` with it: a line turned solid in place (carryOn, on 9 and
         15) kept it, so the next pair drawn on this board — 22's —
         appeared already drawn when it was played up to, and drew
         itself when it was jumped to. */
      this.segLine.classList.remove('draw', 'set');
      /* The dashed guide has to be reset too, or once one screen draws
         it every screen after inherits it — already complete, so it
         never reads as arriving at the end of the plot. */
      if (this.segDashG) this.segDashG.classList.remove('draw', 'set');
      const self = this;
      ['a', 'b'].forEach(function (k) {
        const p = self.segParts[k];
        p.dot.classList.remove('pop', 'set');
        p.coord.classList.remove('pop', 'set');
        p.name.classList.remove('pop', 'set', 'faded');
      });
    },

    /* points first, then the line joins them, then the labels */
    /* The opening of a distance question: the two points arrive one at
       a time, then their coordinates, then their letters.

       `withLine` says whether to join them. A question asking about
       this very pair leaves them unjoined — the line is the answer,
       and the player draws it with the slider. A question asking about
       a leg dropped from them draws the pair's own line, because there
       it is the shape being reasoned about, not the answer. */
    runPoints: function (spec, later, done, withLine) {
      const self = this;
      /* When the pair being plotted is the pair the child has just
         tapped out, those points are already on the board — same place,
         same size, same colour. Taking them away and plotting them
         again makes the child watch two points they put there
         themselves be rebuilt in front of them, which reads as a new
         board rather than as the same one being asked a question about.
         So they are adopted: the segment's own dots go up settled, the
         located marks fade off them, and the points never move. What
         follows is only what is genuinely new — the coordinates sliding
         out to make room, then the guide drawn along the span, and then
         she asks. */
      const carried = this.carriesFound(spec);
      /* Otherwise this screen plots its own points, so anything located
         on an earlier one goes. A locate screen plots nothing and keeps
         what is already there — that is how the first point stays put
         while the second is being found. */
      if (!carried) this.clearFound();
      this.placeSegment(spec);
      this.clearSegment();
      this.segGroup.classList.add('on');
      this.markCrossing();

      if (carried) {
        /* Nothing here is new, so nothing here moves. The segment's own
           dots and coordinates are put up settled at exactly the places
           the located marks already have them — same point, same label,
           same size — and those marks come away in the same frame. The
           swap is invisible because there is nothing to see: the board
           the child built simply carries on into the question. */
        ['a', 'b'].forEach(function (k) {
          const part = self.segParts[k];
          part.dot.classList.add('set');
          part.coord.classList.add('set');
          if (part.name.textContent) part.name.classList.add('set');
        });
        this.clearFound();

        /* The guide is the one thing that is actually new, so it is the
           one thing that is drawn. */
        let t = 260;
        if (withLine) {
          later(function () { self.segLine.classList.add('draw'); SFX.draw(); }, t);
          t += 180;
        }
        if (spec.dash) {
          later(function () { self.segDashG.classList.add('draw'); SFX.draw(); }, t);
          later(done, t + 1180);
        } else later(done, t + 320);
        return;
      }

      later(function () { self.segParts.a.dot.classList.add('pop'); SFX.pop(); }, 220);
      later(function () { self.segParts.b.dot.classList.add('pop'); SFX.pop(); }, 720);
      if (withLine) {
        later(function () { self.segLine.classList.add('draw'); SFX.draw(); }, 980);
      }
      later(function () { self.segParts.a.coord.classList.add('pop'); SFX.tick(2); }, 1260);
      later(function () { self.segParts.b.coord.classList.add('pop'); SFX.tick(3); }, 1530);
      ['a', 'b'].forEach(function (k) { self.segParts[k].name.classList.remove('faded'); });
      later(function () { self.segParts.a.name.classList.add('pop'); SFX.tick(4); }, 1880);
      later(function () { self.segParts.b.name.classList.add('pop'); SFX.tick(5); }, 2150);
      if (spec.dash) {
        later(function () { self.segDashG.classList.add('draw'); SFX.draw(); }, 2420);
        later(done, 3320);
      } else later(done, 2560);
    },

    /* The letters, written onto points that are already on the board.
       A screen keeping its segment never replots it, so the names it
       declares would otherwise never appear — and they have to appear
       exactly then, because that is the screen where the third point
       joins. Two points need no telling apart; three do. */
    nameSegment: function (spec, later) {
      const self = this;
      if (!spec || !this.segParts) return false;
      let any = false;
      this.namedAs = this.namedAs || {};
      ['a', 'b'].forEach(function (k0) {
        const p = spec[k0], k = self.keyAt(p) || k0, part = self.segParts[k];
        if (!p || !p.name || part.name.textContent === p.name) return;
        part.name.textContent = p.name;
        /* Remembered, not only written. The pair on the paper was drawn
           from a spec that did not name its points, so every later
           lay-out of that pair reads a nameless spec — and a letter put
           straight onto the node went out again the next time anything
           asked the board to arrange itself. */
        self.namedAs[k] = p.name;
        any = true;
      });
      if (!any) return false;
      /* A letter is half of its point's block. Now that the point has
         two halves, the block is laid out again — otherwise the letter
         stays wherever the screen before it left one. The line between
         them stays as it is. */
      this.relayPair();
      ['a', 'b'].forEach(function (k, i) {
        later(function () {
          self.segParts[k].name.classList.add('pop');
          self.segParts[k].name.classList.remove('faded');
          SFX.tick(4 + i);
        }, 200 + i * 260);
      });
      return true;
    },

    /* The line itself, from a point to a point. Everything that lays it
       down goes through here so there is one place it is drawn. */
    drawMeasure: function (from, ex, ey) {
      const G = C.GRID, LG = G.leg;
      /* In the colour of the side it is measuring. It was always the
         measure's own blue, so walking out CB — a green side — drew a
         blue line along it and the change of colour read as a second,
         different connection arriving. A measurement is the side being
         found, not a thing of its own. */
      const horiz = Math.abs(ey - from.y) < 1e-6;
      const vert = Math.abs(ex - from.x) < 1e-6;
      const col = horiz ? (LG.hColor || LG.color)
                : vert ? (LG.vColor || LG.color)
                : G.measure.color;
      if (this.measLine) {
        this.measLine.setAttribute('stroke', col);
        this.measLine.style.color = col;
      }
      if (this.measCap) this.measCap.setAttribute('fill', col);
      const px = function (v) { return G.originX + v * G.stepX; };
      const py = function (v) { return G.originY - v * G.stepY; };
      /* Out of the ring of the point it sets off from, never its middle,
         and into the ring of a point it arrives at — the joint every side
         of the drawing makes (placeLeg). It ran from the middle of C and
         was drawn over it, so the whole walk took C's orange away, and
         the side that took over at the end stopped at the ring: one side
         drawn two ways, the dot there or not depending on the moment.
         Between points its round head leads the way; on a point the
         point is the head, and the head is not drawn over it. */
      const x1 = px(from.x), y1 = py(from.y), x2 = px(ex), y2 = py(ey);
      const w = +this.measLine.getAttribute('stroke-width') || G.measure.width || 0;
      const lands = this.isPoint(ex, ey);
      /* Square ends with their corners on the rings, as every side meets
         a point (meetPoint) — and laid under the point at each end, C
         included (measLayer), so nothing of it shows over one. */
      const e = inset(x1, y1, x2, y2,
                      this.isPoint(from.x, from.y) ? this.meetPoint(x1, y1, w) : 0,
                      lands ? this.meetPoint(x2, y2, w) : 0);
      this.measLayer(from, ex, ey);
      this.measLine.setAttribute('x1', e[0]);
      this.measLine.setAttribute('y1', e[1]);
      this.measLine.setAttribute('x2', e[2]);
      this.measLine.setAttribute('y2', e[3]);
      this.measCap.setAttribute('cx', x2);
      this.measCap.setAttribute('cy', y2);
      this.measCap.style.display = lands ? 'none' : '';
      /* A line being drawn is never a line going out: whatever the
         last guess left fading, this one starts solid — and a hand-over
         still waiting to clear the old one is called off. */
      this.measTok = (this.measTok || 0) + 1;
      this.measLine.classList.remove('fade');
      this.measCap.classList.remove('fade');
      this.measLine.classList.add('on');
      this.measCap.classList.add('on');
    },

    /* The measured line handing over to the line that takes its place —
       the side drawn in its own colour, the pair's solid line. It stays
       until that line is down under it, then fades into it, instead of
       going the instant the screen changed. */
    handOffMeasure: function (ms) {
      if (!this.measLine || !this.measLine.classList.contains('on')) return;
      const self = this, t = ms || 450;
      this.fadeMeasure(t);
      const tok = this.measTok = (this.measTok || 0) + 1;
      setTimeout(function () { if (self.measTok === tok) self.clearMeasure(); }, t + 60);
    },

    /* A wrong guess lets go where it stands. */
    fadeMeasure: function (ms) {
      if (!this.measLine) return;
      const t = (ms || 380) + 'ms';
      this.measLine.style.setProperty('--measFade', t);
      this.measCap.style.setProperty('--measFade', t);
      this.measLine.classList.add('fade');
      this.measCap.classList.add('fade');
    },

    clearMeasure: function () {
      if (!this.measLine) return;
      this.measLine.classList.remove('on', 'lit', 'fade');
      this.measCap.classList.remove('on', 'fade');
    },

    // the guess landed: leave it on the board, lit
    litMeasure: function () {
      if (this.measLine) this.measLine.classList.add('lit');
    },

    /* Is what is on the board a side the child has already measured,
       rather than a stroke half-drawn on this screen? A found length
       stays; a working line does not. */
    measureIsLit: function () {
      return !!(this.measLine && this.measLine.classList.contains('lit'));
    },

    runSegment: function (spec, later, done) {
      const self = this;
      /* This screen plots its own points, so anything located on an
         earlier one goes. A locate screen plots nothing and keeps what
         is already there — that is how the first point stays put while
         the second is being found. */
      this.clearFound();
      this.placeSegment(spec);
      this.clearSegment();
      this.segGroup.classList.add('on');
      this.markCrossing();

      later(function () { self.segParts.a.dot.classList.add('pop'); SFX.tick(0); }, 120);
      later(function () { self.segParts.b.dot.classList.add('pop'); SFX.tick(2); }, 380);
      later(function () { self.segLine.classList.add('draw'); SFX.draw(); }, 680);
      later(function () {
        [['a', 'coord'], ['a', 'name'], ['b', 'coord'], ['b', 'name']]
          .forEach(function (pair, i) {
            later(function () {
              self.segParts[pair[0]][pair[1]].classList.add('pop');
              SFX.tick(i + 3);
            }, i * 130);
          });
      }, 1320);
      later(done, 1980);
    },

    /* Marks a point as found: the pulsing markers clear away and the
       point is left labelled with its coordinates. */
    /* A located point is marked, labelled with its coordinates, and left
       there. Each one gets its own marker rather than the single one
       being moved, so the first stays locked in place while the second
       is being found. */
    solve: function (gx, gy, opts) {
      const NS2 = 'http://www.w3.org/2000/svg';
      const G = C.GRID, F = G.found;
      const px = G.originX + gx * G.stepX, py = G.originY - gy * G.stepY;
      /* A place in the town is one of several plotted together, so it is
         written the way the pair beside it is — at the pair's own size
         and the pair's own distance under its point. At the size a
         located point is written, (−5, 1) came out a third bigger than
         the (1, 1) next to it. */
      const size = (opts && opts.size) || F.labelSize;
      const under = (opts && opts.under != null) ? opts.under : -F.labelDy;

      const g = document.createElementNS(NS2, 'g');
      g.setAttribute('class', 'found');
      const c = document.createElementNS(NS2, 'circle');
      c.setAttribute('cx', px); c.setAttribute('cy', py);
      c.setAttribute('r', F.r);
      c.setAttribute('fill', F.fill);
      c.setAttribute('stroke', F.stroke);
      c.setAttribute('stroke-width', F.strokeWidth);
      c.setAttribute('class', 'fdot');
      const t = document.createElementNS(NS2, 'text');
      /* Centred over its own point, and pulled back if that would take
         it off the board — at x = 6 the old fixed offset to the right
         hung a third of the label past the edge, where the SVG cut it
         off. Centred is also what a segment does with the pair later,
         so a point the child locates keeps its label exactly where they
         first saw it rather than shuffling when the pair is joined. */
      const ctext = '(' + numText(gx) + ',\u00A0' + numText(gy) + ')';
      const cw = this.textW(ctext, size);
      t.setAttribute('x', this.clampLabel(px, cw));
      /* And remembered, so the pair this point is about to become is
         labelled where the child already saw it. A located mark and the
         segment that joins it are the same point twice; its coordinates
         jumping between the two reads as two different pairs. */
      this.foundSide = this.foundSide || {};
      this.foundSide[gx + ',' + gy] = (F.side === 'under') ? [0, 1] : [0, -1];
      /* `labelDy` is the offset that puts a label OVER its point; the
         side is named separately, so a located mark can sit under the
         point it names without inverting every other label that reads
         the same number. Both have to agree: a pair tapped out with its
         coordinates under it and then joined with them over it looks
         like two different pairs. */
      t.setAttribute('y', py + (F.side === 'under' ? under : -under));
      t.setAttribute('fill', G.ink);
      t.setAttribute('font-size', size);
      g.dataset.at = gx + ',' + gy;
      t.setAttribute('class', 'flabel');
      t.textContent = ctext;
      g.appendChild(c); g.appendChild(t);
      el.gridAxes.appendChild(g);
      this.foundMarks.push(g);

      if (this.dotGroup) this.dotGroup.classList.remove('on');   // highlighters away
      void g.getBoundingClientRect();
      g.classList.add('on');
    },

    /* The other places on a town screen, each a point with its
       coordinates under it — so every place on the map can be read,
       not only the two a question is about. */
    markPlaces: function (list, later) {
      const self = this, SG = C.GRID.segment, tk = this.typeScale();
      const size = SG.coordSize * tk;
      const under = SG.dotR + 6 + size * 0.62;
      (list || []).forEach(function (m, n) {
        const at = self.dataAt(m.x, m.y);
        if (at) return;                            // already there
        later(function () {
          self.solve(m.x, m.y, { size: size, under: under });
          SFX.tick(n + 1);
        }, 260 + n * 220);
      });
    },

    /* Things on the board stepped back to nothing together, for a
       screen that changes the drawing in plain sight (no leaf sweep to
       hide it). The class outranks every animation that paints them. */
    fadeOut: function (nodes, later, then) {
      nodes = nodes.filter(Boolean);
      nodes.forEach(function (n) { n.classList.add('fading'); });
      const restore = Game.hold(function () {
        nodes.forEach(function (n) { n.classList.remove('fading'); });
      });
      later(function () { if (then) then(); restore(); }, 420);
    },

    /* The whole drawing — the pair, its sides, their labels and lengths,
       the face and its marker, the recalled pairs, the places' points —
       faded out and then cleared: a walk arriving after another's table
       (45). */
    fadeDrawing: function (later, then) {
      const self = this;
      this.fadeOut([this.segGroup, this.triFill, this.rightMark, this.parkTrees,
                    this.measLine, this.measCap, this.unitLabel]
        .concat((this.legSlots || []).map(function (L) { return L && L.g; }))
        .concat((this.exSlots || []).map(function (X) { return X && X.g; }))
        .concat((this.countCells || []).map(function (c) { return c && c.g; }))
        .concat(this.foundMarks || []), later, function () {
          self.clearSegment();
          self.clearFound();
          if (then) then();
        });
    },

    /* Only the sides — lengths, corner, face, marker — faded and then
       taken away, the pair left as it is: a comparison after a walk. */
    fadeLegs: function (later, then) {
      const self = this;
      this.measLayer();          // the pair's, not the sides': it stays
      this.fadeOut([this.triFill, this.rightMark, this.parkTrees]
        .concat((this.legSlots || []).map(function (L) { return L && L.g; })), later, function () {
          self.clearLegs();
          if (then) then();
        });
    },

    /* Maya walking out of her house along a line to a place, and in (46,
       when the closer cafe has been named) — out of its DOOR and in at
       the other one's. The house door swings open, and she is in the
       doorway, coming forward out of the dark: as tall as the door, since the
       buildings stand further back than the line she walks on. She steps
       down onto the line, growing to her own height as she comes
       forward, and the door shuts behind her. At the cafe its door opens
       as she gets there; she steps up into the doorway, shrinking back
       to its height, and is gone inside, and it shuts.

       She is drawn in the town's layer, over its pictures — under them
       she could only come out from behind a wall. Measured off the town
       again whenever it is re-placed, so she stays on her line and at
       her doors. A frame at a time out of her strip; turned to face the
       way she walks. */
    mayaWalk: function (from, to) {
      const M = C.GRID.maya, self = this;
      if (!M || !C.ART.mayaWalk || !Town || !Town.door ||
          document.documentElement.classList.contains('calm')) return 0;
      const out = Town.door(from.x, from.y), into = Town.door(to.x, to.y);
      if (!out || !into || !Town.spot(from.x, from.y)) return 0;
      const fig = Town.walker(C.ART.mayaWalk, M.w, M.h, M.frames);

      /* Where everything is: her two doors, the line between the two
         points, and the two places that line and the steps meet. */
      let placed = -1, g = null;
      const measure = function () {
        placed = Town.placed;
        const a = Town.door(from.x, from.y), b = Town.door(to.x, to.y);
        const A = Town.spot(from.x, from.y), B = Town.spot(to.x, to.y), cell = Town.cell();
        const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len, on = M.onLine * cell.w;
        const H = M.tall * cell.h;
        g = { p0: { x: a.x, y: a.y }, p1: { x: A.x + ux * on, y: A.y + uy * on },
              p2: { x: B.x - ux * on, y: B.y - uy * on }, p3: { x: b.x, y: b.y },
              s0: M.doorFit * a.h / H, s3: M.doorFit * b.h / H, H: H, cell: cell.w,
              walk: len - 2 * on };
        fig.size(H * M.w / M.h, H, M.feet / M.h);
      };
      measure();

      /* The timetable, in her own pace: each step starts (or ends) at
         her walking speed and averages half of it, so there is no jolt
         where a step meets the line. */
      const cells = function (a, b) { return Math.hypot(b.x - a.x, b.y - a.y) / g.cell; };
      const perCell = 1000 / M.speed;
      const D = C.TOWN.doorMs || 320;
      const tShow = D * 0.6;                                   // her door most of the way open
      const tStep = tShow + M.inMs;                             // out of the dark, in the doorway
      const tOut = tStep + 2 * cells(g.p0, g.p1) * perCell;    // down on the line
      const tArrive = tOut + (g.walk / g.cell) * perCell;       // at the foot of the cafe's step
      const tIn = tArrive + 2 * cells(g.p2, g.p3) * perCell;   // in its doorway
      const tGone = tIn + M.outMs;                              // inside
      const total = tGone + 120 + D;                            // and its door shut
      const right = g.p3.x > g.p0.x;
      const turned = right === !!M.facesLeft;

      const token = (this.mayaTok = (this.mayaTok || 0) + 1);
      const stop = function () {
        if (self.mayaTok === token) self.mayaTok++;
        fig.remove();
        out.shut(); into.shut();            // at once: the screen is going
      };
      const off = Game.hold(stop);          // gone with the screen, whenever it goes
      const lerp = function (a, b, u) { return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; };
      let doors = 0;
      const t0 = performance.now();
      const step = function () {
        if (self.mayaTok !== token) return;
        if (Town.placed !== placed) measure();
        const t = performance.now() - t0;
        // each door, once, when its moment comes
        if (!(doors & 1)) { doors |= 1; out.open(true); }
        if (!(doors & 2) && t >= tOut + 120) { doors |= 2; out.open(false); }
        if (!(doors & 4) && t >= Math.max(tOut, tArrive - D - 100)) { doors |= 4; into.open(true); }
        if (!(doors & 8) && t >= tGone + 120) { doors |= 8; into.open(false); }
        const f = Math.floor(t / M.frameMs) % M.frames;
        let p, s, o;
        if (t < tShow) {                     // still inside, the door opening
          p = g.p0; s = g.s0; o = 0;
        } else if (t < tStep) {              // coming out of the dark into the doorway
          const u = (t - tShow) / M.inMs;
          p = { x: g.p0.x, y: g.p0.y - 0.04 * g.H * (1 - u) }; s = g.s0 * (0.92 + 0.08 * u); o = u;
        } else if (t < tOut) {               // stepping out and down, coming forward
          const v = (t - tStep) / (tOut - tStep), u = v * v;
          p = lerp(g.p0, g.p1, u); s = g.s0 + (1 - g.s0) * u; o = 1;
        } else if (t < tArrive) {            // along the line
          p = lerp(g.p1, g.p2, (t - tOut) / (tArrive - tOut)); s = 1; o = 1;
        } else if (t < tIn) {                // up into the cafe's doorway, going back
          const v = (t - tArrive) / (tIn - tArrive), u = 1 - (1 - v) * (1 - v);
          p = lerp(g.p2, g.p3, u); s = 1 + (g.s3 - 1) * u; o = 1;
        } else {                             // and in
          const u = Math.min(1, (t - tIn) / M.outMs);
          p = { x: g.p3.x, y: g.p3.y - 0.04 * g.H * u }; s = g.s3 * (1 - 0.08 * u); o = 1 - u;
        }
        fig.at(p.x, p.y, s, f, turned, o);
        if (t < total) requestAnimationFrame(step);
        else off();
      };
      requestAnimationFrame(step);
      return total;
    },

    /* The fire engine answering the call (54, once the distance is
       found). It pulls off its spot and turns onto the line from B, and
       drives up it — ON it, like a road: turned to the line, its wheels
       on the stroke, lamp flashing, wheels turning, siren going. It
       brakes short of the fire, dipping its nose; its cannon swings
       round onto the burning school and the water arcs out along it
       until the flames die and the smoke is steam. Drawn in the town's
       layer over its pictures, a frame at a time out of its strip
       (CFG.GRID.engine); measured off the town again whenever it is
       re-placed, so it stays on its line. Returns how long it takes. */
    fireRescue: function (spec) {
      const E = C.GRID.engine, self = this, rad = Math.PI / 180;
      if (!E || !C.ART.fireEngine || !Town || !Town.mover || !spec) return 0;
      const F = E.frame, PV = E.pivot;
      const eng = Town.pin(spec.engine), fire = Town.pin(spec.fire);
      if (!eng || !fire || !Town.box(spec.engine) || !Town.box(spec.fire)) return 0;
      /* A calm screen: nothing drives. The fire simply goes out. */
      if (document.documentElement.classList.contains('calm')) {
        Town.douse(spec.fire, true);
        SFX.hiss();
        return E.outMs + 600;
      }
      const fig = Town.mover(C.ART.fireEngine, E.frames, 'cannon');
      const barrel = fig.el.querySelector('.barrel');
      const water = Town.water();

      /* A point of the strip (in its own pixels) where the engine is:
         standing on `p`, turned `rot` degrees about its foot. */
      let g = null, placed = -1;
      const where = function (p, rot, fx, fy) {
        const k = g.W / F.w, dx = (fx - E.mid * F.w) * k, dy = (fy - E.feet * F.h) * k;
        const c = Math.cos(rot * rad), s = Math.sin(rot * rad);
        return { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c };
      };
      const turn = function (a) { a %= 360; return a > 180 ? a - 360 : (a <= -180 ? a + 360 : a); };
      const measure = function () {
        placed = Town.placed;
        const B = Town.spot(eng.x, eng.y), A = Town.spot(fire.x, fire.y), cell = Town.cell();
        const vb = Town.box(spec.engine), fb = Town.box(spec.fire);
        if (!A || !B || !cell || !vb || !fb) return;
        // the strip drawn at the town's own size for the van
        const H = vb.h / E.van.h, W = H * F.w / F.h;
        const len = Math.hypot(A.x - B.x, A.y - B.y) || 1;
        const ux = (A.x - B.x) / len, uy = (A.y - B.y) / len;
        g = { W: W, H: H, cell: cell.w,
              // the line's own heading: the way the engine faces on it
              line: Math.atan2(uy, ux) / rad,
              // where it stands now, in its picture's own place
              p0: { x: vb.x - E.van.x * W + E.mid * W, y: vb.y - E.van.y * H + E.feet * H },
              // onto the line, a little up it from B…
              p1: { x: B.x + ux * 0.9 * cell.w, y: B.y + uy * 0.9 * cell.w },
              // …and up it, to stop short of the fire
              p2: { x: A.x - ux * E.stopCells * cell.w, y: A.y - uy * E.stopCells * cell.w },
              // the water lands on the school, between its windows
              target: { x: fb.x + fb.w * 0.5, y: fb.y + fb.h * 0.44 } };
        g.run = Math.hypot(g.p2.x - g.p1.x, g.p2.y - g.p1.y);
        fig.size(W, H, E.mid, E.feet);
        /* The cannon, from its turret where the engine stops, aimed a
           little above the straight line to the fire — the water rises
           and falls onto it. `aim` is its turn on the turret. */
        const pv = where(g.p2, g.line, PV.x, PV.y);
        const up = Math.atan2(g.target.y - pv.y, g.target.x - pv.x) / rad - E.aimUp;
        g.aim = turn(up - g.line);
        const L = E.barrel * W / F.w;
        g.nozzle = { x: pv.x + L * Math.cos(up * rad), y: pv.y + L * Math.sin(up * rad) };
        water.aim(g.nozzle, g.target, 0.3 * cell.w, { x: Math.cos(up * rad), y: Math.sin(up * rad) });
      };
      measure();
      if (!g) { fig.remove(); water.remove(); return 0; }

      // the timetable
      const tPull = E.pullMs;
      const tDrive = tPull + Math.max(900, (g.run / g.cell) / E.speed * 1000);
      const tStop = tDrive + 300;             // settled back on its springs
      const tJet = tStop + E.turnMs + 120;    // the cannon round onto the fire first
      const tHit = tJet + E.waterMs;
      const tOff = tHit + E.sprayForMs;
      const tOut = tOff + E.waterMs;
      const total = tOut + 900;

      const token = (this.rescueTok = (this.rescueTok || 0) + 1);
      Game.hold(function () {                 // put back with the screen, whenever it goes
        if (self.rescueTok === token) self.rescueTok++;
        fig.remove(); water.remove();
        Town.leave(spec.engine, false);
        Town.douse(spec.fire, false);
      });
      const ease = function (v) { return (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, v)))) / 2; };
      const lerp = function (a, b, u) { return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; };
      let steps = 0;
      Town.leave(spec.engine, true);
      fig.moving(true);
      SFX.siren(tDrive / 1000);
      const t0 = performance.now();
      const step = function () {
        if (self.rescueTok !== token) return;
        if (Town.placed !== placed) measure();
        const t = performance.now() - t0;
        let p, rot;
        if (t < tPull) {                        // off its spot, turning onto the line
          const u = ease(t / tPull);
          p = lerp(g.p0, g.p1, u); rot = turn(g.line) * u;
        } else if (t < tDrive) {                // up the line, on it
          p = lerp(g.p1, g.p2, ease((t - tPull) / (tDrive - tPull))); rot = g.line;
        } else {                                 // braked: the nose dips, and it sits back
          const w = Math.min(1, (t - tDrive) / (tStop - tDrive));
          p = g.p2; rot = g.line + 2.4 * Math.sin(Math.PI * w) * (1 - w);
        }
        const f = t < tDrive ? Math.floor(t / E.driveMs) % 8 : 8 + Math.floor(t / E.parkMs) % 2;
        fig.at(p.x, p.y, f, rot);
        // the cannon: as the town draws it, then round onto the fire
        const a = E.restAim + (g.aim - E.restAim) * ease((t - tStop) / E.turnMs);
        barrel.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + PV.x + ' ' + PV.y + ')');
        // each moment, once
        if (!(steps & 1) && t >= tStop) { steps |= 1; fig.moving(false); }
        if (!(steps & 2) && t >= tJet) {
          steps |= 2;
          water.grow(E.waterMs);
          fig.el.classList.add('spraying');
          SFX.spray((tOff - tJet) / 1000);
        }
        if (!(steps & 4) && t >= tHit) {
          steps |= 4;
          water.splash(true); water.flowing(true);
          Town.douse(spec.fire, true);
          Game.later(function () { SFX.hiss(); }, 500);
        }
        if (!(steps & 8) && t >= tOff) {
          steps |= 8;
          water.stop(E.waterMs); water.splash(false);
          fig.el.classList.remove('spraying');
        }
        if (!(steps & 16) && t >= tOut) {
          steps |= 16;
          const at = Board.stagePos(fire.x + 1.1, fire.y + 1.2);
          FX.sparkles(at.x, at.y, 14, 150);
          SFX.chime();
        }
        if (t < total) requestAnimationFrame(step);
        else water.remove();                    // the engine stays, parked
      };
      requestAnimationFrame(step);
      return total;
    },

    /* The two walks' lengths on the map (46, on a miss): written on
       their lines if they are not yet, and blinking a few times, so the
       child reads which is shorter off the board itself. Left up after. */
    blinkLengths: function () {
      const W = this.compared;
      if (!W || !W.main) return;
      const blink = function (g) {
        if (!g) return;
        g.classList.remove('blinking');
        void g.getBoundingClientRect();         // so it plays again on a second miss
        g.classList.add('blinking');
      };
      const R = W.main.result;
      if (R && this.segRes && !this.segRes.classList.contains('pop')) {
        this.showSegResult(W.main, R.text, R.dy, R.dx);
      }
      blink(this.segResTurn);
      const X = this.exSlots && this.exSlots[0], R2 = W.other && W.other.result;
      if (X && R2) {
        if (!X.segRes.classList.contains('pop')) this.showSegResult(W.other, R2.text, R2.dy, R2.dx, X);
        blink(X.segResTurn);
      }
      SFX.chime();
    },

    /* The pair's two letters stepped back, and nothing else moved: the
       comparison is about the places, and the A and B of the walk are
       done with. Put back whenever a letter is next written. */
    fadeNames: function () {
      ['a', 'b'].forEach(function (k) {
        const n = this.segParts && this.segParts[k] && this.segParts[k].name;
        if (n && (n.textContent || '').trim()) n.classList.add('faded');
      }, this);
    },
    dataAt: function (gx, gy) {
      return (this.foundMarks || []).filter(function (g) {
        return g.dataset.at === gx + ',' + gy;
      })[0] || null;
    },

    /* The places a town screen is about stay at full strength; every
       other place, and its point, steps back. Null puts them all back. */
    townFocus: function (keys) {
      const places = (C.TOWN.places || []);
      const dim = keys ? places.filter(function (p) { return keys.indexOf(p.key) < 0; }) : [];
      const dimAt = dim.map(function (p) { return p.x + ',' + p.y; });
      (this.foundMarks || []).forEach(function (g) {
        g.classList.toggle('dim', dimAt.indexOf(g.dataset.at) >= 0);
      });
      if (Town && Town.focus) Town.focus(dim.map(function (p) { return p.key; }));
    },

    clearFound: function () {
      if (this.foundGroup) this.foundGroup.classList.remove('on');
      (this.foundMarks || []).forEach(function (g) {
        if (g.parentNode) g.parentNode.removeChild(g);
      });
      this.foundMarks = [];
    },

    /* Is the pair this segment is about the pair the child has just
       located? Compared by where the marks actually sit, because that
       is the only thing that decides whether the segment's own dots can
       take over from them without anything appearing to move. */
    carriesFound: function (spec) {
      const marks = this.foundMarks || [];
      if (!spec || !spec.a || !spec.b || marks.length !== 2) return false;
      const G = C.GRID;
      const at = marks.map(function (g) {
        const c = g.querySelector('.fdot');
        return c ? { x: parseFloat(c.getAttribute('cx')),
                     y: parseFloat(c.getAttribute('cy')) } : null;
      });
      if (at.some(function (m) { return !m; })) return false;
      return [spec.a, spec.b].every(function (p) {
        const X = G.originX + p.x * G.stepX, Y = G.originY - p.y * G.stepY;
        return at.some(function (m) {
          return Math.abs(m.x - X) < 0.5 && Math.abs(m.y - Y) < 0.5;
        });
      });
    },


    /* A wrong tap: the point flashes red and settles back. */
    reject: function (node) {
      if (!node) return;
      node.classList.remove('wrong');
      /* CALLED: read without the brackets it was only the method, the
         restart never happened, and a second wrong tap on the same dot
         within 600ms showed no red. */
      void node.getBoundingClientRect();
      node.classList.add('wrong');
      setTimeout(function () { node.classList.remove('wrong'); }, 600);
    },

    /* Reset so a replay rebuilds the same entrance. */
    reset: function () {
      this.spotlightPart(null);
      /* Text as well as classes: every screen that reveals the board
         seats its own segment straight after, so there is nothing here
         worth keeping, and leaving it meant a replayed board came up
         still holding the last run's coordinates. */
      this.blankLabels();
      /* Wound back out of sight, not just un-drawn. The last screen's
         board had its axes drawn outright (settleFurniture sets their
         offset to nothing), and taking the class off left them drawn:
         a board being built showed its axes at once, before the paper
         had even arrived, and the sweep then had nothing to draw. */
      this.lines.forEach(function (l) {
        l.classList.remove('draw');
        if (l._len) windBack(l, l._len, false);
      });
      this.arrows.forEach(function (a) { a.classList.remove('pop'); });
      this.labels.forEach(function (t) { t.classList.remove('pop'); });
      this.clearFound();
      el.gridPanel.classList.add('hidden');
      el.gridPanel.classList.remove('magic-in');
      this.setDots(false);
    },

    /* panel -> x axis -> y axis -> arrowheads -> numbers */
    /* The axis, its arrowheads and every number, all the way on.
       Board.run sweeps them in one at a time through the same queue a
       tap on Skip empties, and the y-axis goes last — so a build cut
       short left a board with no arrowheads and only half its numbers,
       and it stayed that way, because a board already up is never
       rebuilt. Anything the sweep did not reach is put in place here. */
    settleFurniture: function () {
      if (!this.built) return;
      (this.lines || []).forEach(function (l) {
        /* The offset is inline, so the class alone will not shift it —
           a rule cannot outrank an inline style. Clearing it is what
           actually draws a half-axis the sweep never got to. */
        l.style.strokeDashoffset = 0;
        l.classList.add('draw');
      });
      (this.arrows || []).forEach(function (a) { a.classList.add('pop'); });
      (this.labels || []).forEach(function (t) { t.classList.add('pop'); });
    },

    run: function (later, done) {
      const self = this;
      const G = C.GRID;
      const b = this.box || G.box;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

      this.build();
      this.reset();
      this.shown = true;

      el.gridPanel.classList.remove('hidden');
      void el.gridPanel.offsetWidth;
      /* What stands on the board (a town) is measured by its laid-out
         size, and it was last measured while the board was hidden — at
         nothing. Measured again now it can be, before a single point is
         placed, so the labels keep clear of the pictures from the start
         instead of jumping away from them later. */
      if (this.onPlaced) this.onPlaced();
      el.gridPanel.classList.add('magic-in');
      // the ruling washes in under the axes, a beat behind the panel
      el.gridImg.classList.remove('ruling');
      void el.gridImg.offsetWidth;
      el.gridImg.classList.add('ruling');
      SFX.magic();
      FX.sparkles(cx, cy, 12, 380);

      /* The numbers are not written on afterwards: each one is revealed
         by the line that passes it, lighting as the sweep drawing its
         own axis reaches its place. The ruling and its labels arrive as
         one movement, out from the origin in both directions, instead
         of the board being drawn and then labelled. */
      const SWEEP = G.axisDrawMs, POP = 300;
      const X_AT = 760, Y_AT = 1020;
      const xReach = Math.max(Math.abs(G.xFrom), Math.abs(G.xTo)) + 1;
      const yReach = Math.max(Math.abs(G.yFrom), Math.abs(G.yTo)) + 1;

      const sweepAxis = function (which, at, reach, halves) {
        later(function () {
          halves.forEach(function (l) { l.classList.add('draw'); });
          SFX.draw();
        }, at);
        /* And once the sweep is over, drawn for good: the animation's
           last frame made the line's own state, so the axes stay drawn
           even where a browser lets go of that frame. */
        later(function () {
          halves.forEach(function (l) { l.style.strokeDashoffset = 0; });
        }, at + SWEEP + 60);
        self.axisLabels.forEach(function (L) {
          if (L.axis !== which) return;
          const d = Math.abs(L.v);
          later(function () {
            L.el.classList.add('pop');
            // one note per step outward, not two for the matching pair
            if (L.v >= 0) SFX.tick(d);
          }, at + (d / reach) * SWEEP);
        });
        // and the arrowheads land as their own line finishes
        halves.forEach(function (l, i) {
          const a = self.arrows[(which === 'x' ? 0 : 2) + i];
          if (a) later(function () { a.classList.add('pop'); SFX.tick(reach); }, at + SWEEP);
        });
      };
      sweepAxis('x', X_AT, xReach, this.axisX);
      sweepAxis('y', Y_AT, yReach, this.axisY);

      later(done, Y_AT + SWEEP + POP + 140);
    }
  };

  /* The radical sign, for the table's roots (below). */
  const Radical = (function () {
    const SVGNS = 'http://www.w3.org/2000/svg';

    /* The sign itself. Lilita One carries no radical, so typing one left
       the browser falling back to another face and the sign came out
       lighter than the type around it. Drawn here it takes the colour
       and weight of its line — and, stretched to the radicand's height,
       its apex lands on the bar by construction rather than by guessing
       at a glyph's metrics. */
    function sign() {
      const wrap = document.createElement('span');
      wrap.classList.add('rad-sign');
      wrap.setAttribute('aria-hidden', 'true');
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 50');
      svg.setAttribute('preserveAspectRatio', 'none');
      const pl = document.createElementNS(SVGNS, 'polyline');
      // the short left arm, down to the foot, up to the bar, and along it
      pl.setAttribute('points', '1.8,30 8,45.5 16.4,1.7 24,1.7');
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', 'currentColor');
      pl.setAttribute('stroke-width', '3.4');
      pl.setAttribute('stroke-linecap', 'round');
      pl.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(pl);
      wrap.appendChild(svg);
      return wrap;
    }

    return { sign: sign };
  })();

  /* A table's roots drawn whole: in an inline row, from a "√(" to the bracket that closes it — across
     any blanks in between — the sign is drawn, a bar runs over all of it
     and the two brackets go. "AB = √((y₂ − y₁)² + (x₂ − x₁)²)" was the
     sign typed and both brackets written round the whole of it. Each
     piece keeps its own node, so a blank inside a root is still the
     blank the table fills and the rows still show piece by piece. A
     root whose brackets do not open and close whole pieces is left as it
     was written. */
  function drawRoots(tableEl) {
    if (!tableEl) return;
    tableEl.querySelectorAll('.ft-inline').forEach(function (cell) {
      const kids = Array.prototype.slice.call(cell.children);
      const first = kids.findIndex(function (n) {
        return n.classList.contains('ft-text') && n.textContent.indexOf('\u221A(') >= 0;
      });
      if (first < 0) return;
      const t0 = kids[first].textContent, s0 = t0.indexOf('\u221A(');
      if (t0.slice(0, s0).trim()) return;
      let depth = 0, last = -1, cut = -1;
      for (let k = first; k < kids.length && last < 0; k++) {
        if (!kids[k].classList.contains('ft-text')) continue;
        const t = kids[k].textContent;
        for (let c = (k === first ? s0 + 1 : 0); c < t.length; c++) {
          if (t[c] === '(') depth++;
          else if (t[c] === ')' && --depth === 0) { last = k; cut = c; break; }
        }
      }
      if (last < 0 || kids[last].textContent.slice(cut + 1).trim()) return;
      if (first === last) kids[first].textContent = t0.slice(s0 + 2, cut);
      else {
        kids[first].textContent = t0.slice(s0 + 2);
        kids[last].textContent = kids[last].textContent.slice(0, cut);
      }
      const rad = document.createElement('span');
      rad.className = 'rad';
      /* In the colour of what it covers (AB's blue on 35), bar and all. */
      if (kids[first].style.color) rad.style.color = kids[first].style.color;
      const body = document.createElement('span');
      body.className = 'rad-body';
      cell.insertBefore(rad, kids[first]);
      rad.appendChild(Radical.sign());
      for (let k = first; k <= last; k++) body.appendChild(kids[k]);
      rad.appendChild(body);
    });
  }

  /* ---------------- screen flow ---------------- */
  const Game = {
    index: -1, state: 'start', busy: false, geom: null, task: null,
    flight: null, landFlight: null, raised: false,
    pending: [], entranceCancel: null,
    /* Everything switched on that a later step is meant to switch off —
       see hold(). */
    leaving: [],

    /* A screen is done: arm Skip and hand over by itself after a pause.
       The hand-over is held back while a question is still unanswered,
       and there is nothing to hand over to on the last screen. Because
       it is queued through later(), tapping Skip cancels it along with
       everything else the screen had pending. */
    settle: function (pause) {
      const self = this, i = this.index;
      this.state = 'waiting';
      el.nextBtn.classList.add('ready');

      if (i + 1 >= C.SCRIPT.length) {
        /* nothing follows: the lesson is over, after the breath a
           hand-over would have had */
        this.later(function () { if (self.index === i) self.ended(); }, pause || C.AUTO.afterLine);
        return;
      }
      const entry = C.SCRIPT[i] || {};
      /* A screen there to be looked at for as long as the child likes
         (`waitNext`: 37, the formula on its own) is handed on by the
         child, with Next — which is armed and nudging — and by nothing
         else. */
      if (entry.waitNext) return;
      if (entry.task && !(this.task && this.task.done)) {
        /* Nothing more will happen until they tap, so point the way —
           unless the screen has asked not to be helped. */
        if (entry.dots && entry.task.target && entry.hint !== false) {
          Hint.arm(entry.task.target);
        }
        return;
      }

      /* A working takes half a minute to write and it owns the screen
         while it does. The balloon that was still open when the ladder
         ran out finishes somewhere in the middle of it — and by then
         the task is done, so this would otherwise arm the hand-over and
         take the paper away mid-sentence. The working settles when it
         is finished; until then nothing else does. */
      if (this.writing) return;

      this.later(function () {
        if (self.index !== i) return;        // something got there first
        const to = self.nextIndex();
        if (to >= C.SCRIPT.length) return;   // nothing follows this
        self.goTo(to);
      }, pause || C.AUTO.afterLine);
    },

    /* Where the next step goes. Ordinarily the screen after this one.
       A beat that teaches a child who has missed twice sets it to the
       beat that does the teaching, and a child who got it right sets it
       past them — so the guided path exists for whoever needs it and
       does not exist for whoever does not.

       Read once and cleared, so a branch can never outlive the answer
       that set it. */
    branch: null,
    nextIndex: function () {
      const to = this.branch;
      /* A right answer on the last question steps over the beats that
         exist to teach a child who got it wrong — and there is nothing
         after those, so where it steps to is off the end. Both Next and
         the hand-over below already stop there.

         And it stays the end. It was read once and forgotten, so the
         first press of Next did nothing and the second walked a child
         who had just got it right into "Oops! Let's check the sides." */
      if (to === 'end') return C.SCRIPT.length;
      this.branch = null;
      if (to == null) return this.index + 1;
      const k = C.SCRIPT.findIndex(function (s) { return s.id === to; });
      return k < 0 ? this.index + 1 : k;
    },

    /* Everything in flight, stopped. The queued steps are this object's
       own; a leaf sweep is not — it runs on plain timeouts of its own,
       and left alone it dresses and plots the screen being left onto
       the board of the screen just arrived at. */
    stopSweep: function () {
      if (FX && FX.leaves && FX.leaves.cancel) FX.leaves.cancel();
    },

    /* The board travelling to a new box on its slide (.62s), and off the
       slide once it is there — or as the screen is left, if that comes
       first: left on, every later placing of the board glided across
       the frame instead of being put there. */
    slideBoard: function (box) {
      const g = el.gridPanel, B0 = Board.box;
      const same = B0 && Math.abs(B0.w - box.w) < 0.5 && Math.abs(B0.h - box.h) < 0.5;
      /* A board that changes size on the way glides its corner the way it
         always has — its size is not something a slide can carry. */
      if (!same || g.classList.contains('hidden')) {
        g.classList.add('sliding');
        Board.place(box);
        this.later(this.hold(function () { g.classList.remove('sliding'); }), 700);
        return;
      }
      /* Otherwise it is CARRIED: put where it is going, then drawn back
         at where it was and let go — the same path, the same .62s, the
         same easing, but moved as one painted layer rather than laid out
         and repainted on every frame, which a laptop without much of a
         graphics chip shows as a stutter. The arrival's own animation
         has long finished by now; its last frame is the board at rest,
         and left on it would hold the board's transform against this. */
      g.classList.remove('magic-in');
      const k = (el.stage.getBoundingClientRect().width / C.STAGE_W) || 1;
      const was = g.getBoundingClientRect();
      Board.place(box);
      const now = g.getBoundingClientRect();
      const dx = (was.left - now.left) / k, dy = (was.top - now.top) / k;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      g.style.transition = 'none';
      g.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      void g.offsetWidth;
      g.style.transition = 'transform .62s cubic-bezier(.3, .85, .35, 1)';
      g.style.transform = '';
      this.later(this.hold(function () { g.style.transition = ''; g.style.transform = ''; }), 700);
    },

    /* Every queued step goes through here so a skip can cancel it. */
    later: function (fn, ms) {
      const self = this;
      const id = setTimeout(function () {
        self.pending = self.pending.filter(function (x) { return x !== id; });
        fn();
      }, ms);
      this.pending.push(id);
      return id;
    },

    /* Something switched on that a later step switches off — a pulse, a
       glow, a dimmed drawing, the board sliding, the music dipped under
       her. That later step is a queued one, and leaving the screen
       cancels every queued step, so the "off" never came: the triangle
       went on pulsing through the next screen's table, the next
       triangle came up dimmed, the music stayed quiet for the rest of
       the game.

       So whoever switches something on registers how to switch it off,
       and gets back the one function to call when its own moment comes.
       Leaving the screen runs every switch-off still waiting — the
       change itself puts things back, not a step it has just cancelled.

       Things a screen deliberately hands on to the next (a side left
       lit for the next line to clear) never pass through here, so they
       are carried as before. */
    hold: function (off) {
      const self = this;
      let done = false;
      const release = function () {
        if (done) return;
        done = true;
        self.leaving = self.leaving.filter(function (f) { return f !== release; });
        off();
      };
      this.leaving.push(release);
      return release;
    },

    clearPending: function () {
      this.pending.forEach(clearTimeout);
      this.pending = [];
      /* Every switch-off still waiting, run now — see hold(). */
      this.leaving.slice().forEach(function (release) { release(); });
      this.leaving = [];
      /* Her line, whatever state it is in: not typing any more, and not
         going to hand anything on to the screen being arrived at. */
      Bubble.cancel();
      /* And the music back up. Every dip is paired with its lift, so
         this only ever catches one that was stranded. */
      if (SFX.duckReset) SFX.duckReset();
      /* Whatever was being written is not being written any more —
         Next, Back and the picker all come through here, and a screen
         left mid-working must not hand the flag to the next one. */
      this.writing = false;
      this.stopSweep();
      if (FX && FX.landAll) FX.landAll();   // nothing left in the air
      if (this.entranceCancel) { this.entranceCancel(); this.entranceCancel = null; }
      // a skip mid-flight sets her down rather than leaving her airborne
      if (this.landFlight) this.landFlight(true);
    },

    begin: function () {
      const self = this;
      /* Not before every file is here and Play is offered: a key pressed
         while the bar is still filling is simply not a start yet. */
      if (!startReady) return;
      if (this.busy) return;
      this.busy = true;

      SFX.pop();
      SFX.sparkle();
      el.playBtn.classList.add('pressed');

      const P = C.PLAY.box;
      FX.ring(P.cx, P.cy, 120, 'rgba(120,200,255,.95)');
      FX.starBurst(P.cx, P.cy, 18, 230);

      setTimeout(function () {
        SFX.whoosh();
        el.startScreen.classList.add('fade-out');
        el.scene.classList.remove('hidden');
        void el.scene.offsetWidth;
        el.scene.classList.add('fade-in');
      }, 260);

      setTimeout(function () {
        el.startScreen.classList.add('hidden');
        stopWeather.splice(0).forEach(function (f) { f(); });
        FX.motes(18);
        self.busy = false;
        self.goTo(0);
      }, 900);
    },

    /* What a screen expects to find already drawn.

       Most screens that keep a drawing say `keepSegment` and go on
       arguing about whatever the screens before them left on the paper.
       That holds for every route through the script and stops holding
       the moment the picker drops a child in from somewhere else, or
       Back brings them in from the screen after — so such a screen is
       given the drawing it would have inherited (drawingBefore), put up
       finished through the board's own drawing code on a clock that
       fires at once (Board.seed), its sides `settled` because they were
       drawn on a screen this child did not watch. */
    /* What the board holds when screen `i` begins, as it is when the
       script is played up to it — worked out from the script alone, so
       it can be put up for a screen reached any other way.

       A screen that keeps its drawing inherits the whole run of screens
       back to the last one that drew from nothing: the pair it drew,
       any sides (not those held back for a working, not after a screen
       that drops them), the lengths written on them — declared, or
       found by a question on the way — places marked on a map, the
       right-angle marker once something has put it up, and a result
       written on the line. */
    drawingBefore: function (i) {
      const S = C.SCRIPT;
      let r = i;
      while (r > 0 && (S[r] || {}).keepSegment) r--;
      const want = { pair: null, joined: false, dash: false, legs: [], marks: [],
                     marker: false, result: null };
      const same = function (a, b) {
        const at = function (p, q) { return p && q && p.x === q.x && p.y === q.y; };
        return (at(a.a, b.a) && at(a.b, b.b)) || (at(a.a, b.b) && at(a.b, b.a));
      };
      for (let j = r; j < i; j++) {
        const e = S[j] || {}, t = e.task || {};
        const measure = e.intro === 'measure';
        if (e.segment) {
          if (want.pair && !same(want.pair, e.segment)) {
            // a different pair is a different drawing
            want.joined = false; want.dash = false; want.legs = []; want.result = null; want.marker = false;
          }
          /* Only the screen that PLOTS the pair decides whether it is
             joined — the first of the run, or one bringing a different
             pair. A screen keeping the same pair draws no line of its
             own (the table after a walk, "Oops" after a question). */
          const plots = j === r || !want.pair || !same(want.pair, e.segment);
          want.pair = e.segment;
          /* Joined by the screen that plots it, unless the question is
             about the pair itself (then the line is the answer, and the
             child lays it down), or it is only asking which pair, or AB
             is the unknown of a walk (only its dotted guide is drawn). */
          if (plots && !measure && !e.pointsOnly) want.joined = true;
          if (plots && measure && t.measureLeg != null && !e.guideOnLine) want.joined = true;
          if (e.segment.dash && !want.joined) want.dash = true;
          /* A length written on the pair: said by a screen that draws it,
             or by a question screen that keeps a pair already carrying it
             (58, 59 carry 57's "13 units"). */
          if (e.segment.result && (!measure || e.keepSegment)) want.result = e.segment.result;
        }
        // …or a line of the screen draws it (22)
        if ((e.lineLights || []).some(function (L) { return L && L.join; })) want.joined = true;
        /* …or its dotted guide, drawn on a word, turns into the line (29,
           every walk: drawGuide) — solid from then on, the dots gone. */
        if ((e.wordCues || []).some(function (c) { return c && c.guide; })) {
          want.joined = true; want.dash = false;
        }
        if (e.solidLine) { want.joined = true; want.dash = false; }
        if (e.legs) {
          /* Every setting a side carries (where its length is written,
             what it says), with only its state brought up to date. */
          want.legs = e.legs.map(function (l) {
            return Object.assign({}, l, { dash: !!l.dash && !l.length, length: !!l.length,
                                          settled: true });
          });
        }
        /* A side asked about and answered has its length written on it,
           and is solid from then on. */
        if (measure && t.measureLeg != null && want.legs[t.measureLeg]) {
          const L = want.legs[t.measureLeg];
          L.length = true; L.dash = false;
        }
        /* So does a side whose length she writes as she names it (33,
           34 — the `leg` word cue). Left out, the board
           the next screen expected had no such length, the one it was
           holding did not match, and it was put up again without it:
           the label blinked out and came back. */
        /* And a question about the pair itself that keeps its answer
           (57's AB): the length it came to stays on the pair, right or
           worked out — the screens after compare all three. */
        if (measure && t.keepLength && t.measureLeg == null && t.answer != null) {
          want.result = { text: t.answer + '\u00A0unit' + (t.answer === 1 ? '' : 's') };
        }
        (e.wordCues || []).forEach(function (c) {
          if (c && c.leg != null && want.legs[c.leg]) {
            want.legs[c.leg].length = true; want.legs[c.leg].dash = false;
          }
        });
        if (e.dropLegs) want.legs = [];
        if (e.mark) want.marks = e.mark.slice();
        if (e.rightAngle ||
            (e.wordCues || []).some(function (c) { return c && c.mark; })) want.marker = true;
      }
      return want;
    },

    /* A screen reached some other way than from the one before it — the
       picker, Back, a Next that skips — gets the drawing it would have
       inherited, put up already finished, before it dresses. Played in
       order this never does anything: the board is already holding
       exactly that (Board.holdsDrawing), and the first thing asked is
       whether it is.

       What it replaced only ever seeded a screen that carried no pair of
       its own, and gave up whenever any pair at all was showing — so a
       screen jumped to over an empty board drew nothing, and a screen
       come back to with Back kept the next screen's drawing: 12 wrote
       its subtraction against 13's points, 28's table sat beside 29's
       triangle, 26 asked what kind of triangle it was with the answer
       already in the corner. */
    /* Whether the board carries its numbers on screen i. `numbers` is
       said once, on the screen where it changes, and holds for every
       screen after it until one says otherwise — so a jump from the
       picker, or Back, arrives at the same board a straight run does. */
    numbersAt: function (i) {
      for (let k = i; k >= 0; k--) {
        const s = C.SCRIPT[k];
        if (s && s.numbers != null) return !!s.numbers;
      }
      return true;
    },

    /* The board without its numbers, or with them back. The numbers
       stay laid out — every label keeps the place it has always had —
       and are only kept from showing (style.css, `unnumbered`); the
       sweep still runs, the axes still draw, the letters still land. */
    numberBoard: function (i) {
      el.gridPanel.classList.toggle('unnumbered', !this.numbersAt(i));
    },

    /* And the table, for a screen that sums up the one the screen before
       wrote (37: `keepTable`), reached without it — a jump, or Back from
       further on: put up as that screen left it, every line written and
       every blank filled, where it stood. */
    seedTable: function (i) {
      const entry = C.SCRIPT[i] || {};
      if (!entry.keepTable || !Table || !Table.el.classList.contains('hidden')) return;
      let j = i - 1;
      while (j >= 0 && ((C.SCRIPT[j] || {}).task || {}).kind !== 'table') j--;
      const src = C.SCRIPT[j];
      if (!src) return;
      const lines = src.task.formula || [], T = C.GRID.table;
      const left = T.board.x + T.board.w - T.tuck;
      Table.setColours(this.sideColours());
      Table.build(lines);
      drawRoots(Table.el);
      Table.el.style.setProperty('--ft-size', (src.task.tableSize || T.size) + 'px');
      Table.place({ x: left, w: C.STAGE_W - T.margin - left, cy: T.pickCy });
      Table.fit();
      lines.forEach(function (row, r) {
        Table.writeRow(r);
        (row.parts || []).forEach(function (p, k) {
          if (p.offer) Table.fill(r, k, p.answer != null ? p.answer : String(p.t).trim());
        });
      });
      Table.open();
      Table.markRow(lines.length - 1);
    },

    seedDrawing: function (i) {
      const entry = C.SCRIPT[i] || {};
      if (!entry.keepSegment) return;            // it draws its own, from nothing
      /* A comparison is reached two ways — after the second walk's table,
         or straight from its question answered right — so the drawing
         before it is not one thing. Holding either of its two walks is
         holding what it needs; only with neither up is anything put up. */
      if (entry.compare && entry.compare.some(function (w) { return Board.showing(w); })) return;
      const want = this.drawingBefore(i);
      if (!want.pair) return;
      /* On the plane this screen is taught on: seeded on the last one's
         and then re-ruled, every point would sit a cell-size off. (The
         screen asks for the same plane again straight after, which then
         changes nothing.) */
      Board.setRange(entry.board || 'close');
      if (Board.built && Board.shown && Board.holdsDrawing(want)) return;
      /* The paper first, and the furniture on it: axes, arrowheads,
         numbering — a board seeded on blank paper had none of them. */
      Board.build();
      Board.settleFurniture();
      /* The panel up and placed, with the town this drawing stands in put
         down on it, before anything is seeded. A label keeps clear of the
         town's pictures only if it can measure them, and seeded into a
         hidden panel they measured as nothing: a jump to 46 wrote the
         house's own coordinates under the house. */
      Board.shown = true;
      el.gridPanel.classList.remove('hidden');
      if (entry.town && Town) Town.set(townPlaces(entry));
      const g = geomFor(i);
      Board.place(g.panelBox || C.GRID.box);
      /* The camera already where it would be. A view is framed once, by
         the screen that first pushes in on the drawing — and it frames
         the pair alone, before any side is down — and a screen that
         finds its own view's name up never frames again. So the frame
         is worked out from the pair alone here too; framed round the
         finished drawing, lengths and all, a jump to 26 came up wider
         than 26 does when it is played. */
      const v = entry.view || null;
      Board.seed({ pair: want.pair, joined: want.joined, dash: want.dash,
                   legs: [], marks: [], marker: false, result: null });
      const frame = v ? Board.viewFor(v) : null;
      Board.seed(want);
      Board.viewName = v;
      Board.viewTo(frame, 0);
      (this.seeds = this.seeds || []).push(entry.id);
    },

    goTo: function (i) {
      /* A branch belongs to the answer that set it and to nothing
         else: arriving anywhere clears it, so Back and Next can never
         carry one into a screen that did not ask for it. */
      this.branch = null;
      const self = this;
      this.clearPending();
      Hint.clear();
      /* Over the panel (37, 39, 41), she goes back down behind it, and
         the Next in the corner goes with her. */
      const peeked = Peek.up;
      Peek.leave();
      GoOn.hide();
      /* A beat that speaks without a balloon, or works its own sum, must
         not open wearing the last one's. Both are inherited, so both go
         here — at the change — rather than a third of a second later when
         the beat gets round to its own business. */
      const next = C.SCRIPT[i] || {};
      /* The shape this screen's labels are placed against, and the size
         they are set at — before anything on it is drawn. */
      Board.shapeLegs = next.shape || null;
      Board.setPark(!!next.park);
      if (next.transition !== 'leaves') Board.setTextScale(next.textScale || 1);
      if (next.xEquation && Board.segRes) Board.segRes.classList.remove('pop');
      /* A screen carrying more than one pair lets the ruling, the axes
         and their numbers fall back, so the pairs themselves come
         forward. Set at the change and faded by the stylesheet, so the
         board settles into it rather than snapping — and cleared the
         same way by every screen that does not ask for it. */
      el.gridPanel.classList.toggle('quiet', !!next.quietBoard);
      /* Whether a highlight may dim the right-angle marker on this
         screen — see `shape` in spotlightPart. */
      Board.keepMark = !!next.keepMark;
      /* And the other reason a board steps back, which no screen asks
         for because the board can see it: the drawing runs over an
         axis. It fades the axes and their numbers and leaves the ruling
         alone — the one beat that asks a child to count squares over an
         axis still needs the squares. */
      Board.markCrossing();
      /* The board's camera. A beat that names a view pushes in to it; one
         that names none pulls back out; one that wants the view it
         already has does nothing at all. Given a beat to settle first so
         the push comes with her line rather than under the change, and
         queued through later() so a skip cancels it with everything
         else. */
      /* Unless the screen pushes its own camera. A board that builds
         itself from nothing wants the three in order — the paper
         arrives, the camera comes in, and only THEN do the points land
         in a frame that has already settled — and the queued push
         below cannot do that: it fires on a fixed delay, 260ms in,
         while the paper is still being drawn, and frames whatever
         happens to be on it. Claiming the name here, synchronously, is
         what makes the push below stand aside for it. */
      const framesItself = next.rebuild ||
        (next.intro === 'measure' && next.view && next.segment && !next.keepSegment);
      if (framesItself) Board.viewName = next.view || null;
      this.later(function () {
        /* "The view it already has" is compared by NAME, not by the
           rect the name works out to. The rect is derived from what is
           written on the board, and what is written moves with the
           camera — the type is set smaller as the board comes in — so
           two asks for the same view come back a few pixels apart and
           the board re-pushes to chase itself. The name does not move. */
        if (next.view && Board.viewName === next.view) return;
        Board.viewName = next.view || null;
        Board.viewTo(Board.viewFor(next.view), C.GRID.zoom.ms);
      }, C.GRID.zoom.delayMs);
      this.index = i;
      this.state = 'entering';
      el.nextBtn.classList.remove('ready');
      this.syncNav();
      /* Whatever the last screen's board sweep did not get to, finish
         now — before this screen draws anything of its own on it. */
      if (Board.shown) Board.settleFurniture();

      const entry = C.SCRIPT[i];
      /* Before anything is dressed: if this screen expects a drawing to
         already be there and there is none, put up the one it would
         have inherited. Nothing to do on the way through the script. */
      if (next.transition !== 'leaves') { this.numberBoard(i); this.seedDrawing(i); this.seedTable(i); }
      /* And a screen that rests on the right angle has its marker up
         from the first frame. It is normally switched on by answering
         26 — on a timer, which a quick tap on Next cancels — and a jump
         never passes 26 at all; either way the screen would open
         without it and fade it in late. Here, the drawing is already
         in place, so it simply is there. (`after` asserts it again,
         which costs nothing.) */
      if (entry.rightAngle) Board.rightAngle(true);
      /* A question that follows straight on from one answered on the
         control keeps the whole arrangement: she stays up on the panel,
         the control stays under her, and only the board changes. Taking
         them both away and bringing them both back — with her flying
         down and up again in between — for what is the same question
         about two new points read as the screen restarting. */
      /* `askFirst` gives a screen its question back: the control is
         taken away while she puts it, and comes in once she has. A
         screen that asks something new about what is already drawn
         needs the board watched, not a panel of answers sitting under
         it waiting to be pressed. */
      /* Which thing she would be standing on. Keeping a control means
         the one already under her is the one this screen wants — the
         reel or the answers. A screen that assumed it had inherited the
         reel when the beat before put the answers up came up with no
         control at all. */
      const kindOf = function (e) {
        if (!e) return null;
        if (e.options) return 'options';
        if (e.distance || e.entry) return 'lock';
        return null;
      };
      const wantKind = kindOf(entry);
      const keepsControl = (entry.intro === 'measure' || entry.layout === 'board') &&
                           !!wantKind &&
                           entry.transition !== 'leaves' && !entry.askFirst &&
                           this.raised && Board.shown &&
                           this.controlKind === wantKind;
      this.raised = keepsControl;
      this.controlKind = wantKind;
      const geom = keepsControl ? controlGeom(wantKind) : geomFor(i);
      /* A walk that follows another's table with no leaf sweep (45,
         `flyBack`): she is standing under that table, and the new screen
         has her in her own column. Rather than jump there, she flies off
         from where she stands and back in to ask — so the rig is not
         moved to the new place until she has gone (runMeasure). Or she
         was over the panel (40, after 39): she has gone down behind it,
         and the table and board go the same way after her. */
      const flyBack = !!entry.flyBack && entry.transition !== 'leaves' && Board.shown &&
                      (!el.standSwifty.classList.contains('hidden') ||
                       !el.birdWin.classList.contains('hidden') || peeked);
      this.geom = flyBack ? (this.geom || geom) : geom;
      standPose = !!this.geom.stand;
      /* Reseating the rig also resizes the speech bubble, and a screen
         with nobody in shot sizes it to nothing — so behind a leaf
         sweep this waits for the cover too, or the last screen's
         bubble collapses in plain sight. */
      /* The box belongs to her: it goes the moment a screen has no line
         for her to say, rather than lingering over a frame she has
         already flown out of. A board screen puts its question in the
         banner instead, so that counts as having no line either. A leaf
         sweep closes it inside dress(), under the cover.

         A distance screen has a line but does not say it here: the
         board builds and the points go up first, and she only flies in
         seconds later, so its box is closed now and runMeasure() opens
         it when she lands. Screens where she is already standing are
         left alone — there the next line is 140ms away, and closing
         would blink the box between two sentences of the same breath. */
      const speaks = !!(entry.line || (entry.lines || []).length) &&
                     !geom.bare && entry.intro !== 'measure';
      if (entry.transition !== 'leaves') {
        if (!speaks) Bubble.close();
        if (!flyBack) applyGeom(geom);
      }

      const AX = axisOf(entry);
      const onBoard = entry.layout === 'grid' || entry.layout === 'board' || !!AX;
      /* A screen behind a leaf sweep strips the last one inside
         dress(), while the frame is covered. Doing it here as well
         would pop the board and the panels out a beat early, in plain
         sight, before a single leaf had arrived. */
      if (entry.transition !== 'leaves') {
        // the board only exists on its own screens
        /* …but on a fly-back screen it goes with the table, faded once she
           has flown off it (40) — see the fly-back below — not in a frame. */
        if (!onBoard && !flyBack) {
          el.gridPanel.classList.add('hidden');
          el.standSwifty.classList.add('hidden');
          Board.shown = false;
          Board.setDots(false);
        }
        if (!entry.segment && !entry.keepSegment && !(entry.fadeOld && Board.shown) &&
            !(flyBack && !onBoard)) Board.clearSegment();
        /* Not from under her: on a fly-back screen she may be standing
           on it, and it goes once she has. */
        if (Opts && !entry.options && !flyBack) Opts.hide();
        if (Sel && !(entry.distance || entry.entry) && !flyBack) Sel.hide();
      }

      /* What happens once she has arrived: speak her line, hand over
         on its own if the screen has none, or simply wait. */
      /* A screen with a task waits for the player rather than for a
         tap on Next. */
      this.task = entry.task
        ? { target: entry.task.target, spec: entry.task, wrong: 0, done: false }
        : null;

      /* Back to the first beat is a replay, and a replay starts on an
         empty board. The ordinary clears only switch labels off, which
         is right between screens — the next one writes over them — and
         wrong here: the board is put away holding the last run's
         coordinates, and `reset` does not run again until it is next
         built. So the words go now, while nothing is looking at them. */
      if (i === 0) Board.blankLabels();

      /* Which plane this screen is taught on, before anything is
         measured against it. Nearly every screen wants the one the
         lesson has always used; a pair that does not fit on it asks
         for the wide one by name. */
      Board.setRange(entry.board || 'close');

      /* Both kinds of numeric question are answered on the same
         control; only a distance one lays a line down as it changes. */
      if (Sel) {
        const numeric = entry.task && (entry.task.kind === 'distance' || entry.task.kind === 'entry');
        const NS = window.NumberSelector;
        const r = entry.range || { min: NS.MIN, max: NS.MAX };
        let hi = r.max;
        if (numeric && entry.task.kind === 'distance') {
          const fits = self.paperSteps();
          if (fits != null) hi = Math.min(hi, fits);
        }
        Sel.setRange(r.min, hi, r.start);
        /* Nothing is drawn while the number is being chosen. Pressing
           Check is the moment you find out, and a line creeping out to
           the answer beforehand gave it away before the press. */
        Sel.onCheck(!numeric ? null : function (v) {
          if (entry.task.kind === 'distance') self.checkDistance(v);
          else self.checkEntry(v);
        });
      }
      // a choice task is answered on the options panel
      if (Opts) {
        const choice = entry.task && entry.task.kind === 'choice';
        // each screen brings its own three answers
        /* Not rewritten under the child's eyes: a panel still up from the
           last screen (42's two buttons, before 46's cards) goes first,
           unless this screen is keeping it. */
        if (Array.isArray(entry.options) && !keepsControl) Opts.hide();
        if (Array.isArray(entry.options)) Opts.setChoices(entry.options);
        Opts.setAnswer(choice ? entry.task.answer : null);
        Opts.onAnswer(choice ? function (key, right) { self.checkChoice(right); } : null);
      }

      /* A screen that puts its answers up before she arrives brings
         them in itself, so nothing may bring them in again after. */
      const withControl = entry.options && entry.intro !== 'measure';

      /* A screen can point at part of what is already drawn while she
         talks about it: the y halves of both labels, then the x halves,
         then one x at a time in the order the subtraction reads. The
         board is already up, so this is the whole of the screen's
         work — it lights what her line is about. */
      /* Returns how long the light runs — the caller waits it out
         before the next sentence, so a light never plays under one. */
      const lit = entry.lineLights
        ? function (n) { return self.lightAfterLine(entry, n); } : null;

      const spotlight = function () {
        /* One side held forward for as long as the beat lasts, rather
           than lit and let go. The beat that asks for CB has to leave
           AC on the board — the child needs to see they now have two
           measured sides — while the one being asked for is the loud
           one. */
        if (entry.focus) self.later(function () {
          Board.spotlightPart(entry.focus);
        }, 300);

        const h = entry.highlight;
        /* The beats that do the pointing inherit the board rather than
           replotting it, so they carry no segment of their own — what
           matters is that one is drawn, not that this screen drew it. */
        if (!h || !Board.segParts) return;
        Board.glowPart(null, false);              // whatever the last screen lit
        const steps = h.order || [null];
        steps.forEach(function (which, n) {
          self.later(function () {
            Board.glowPart(h.part, true, which);
            SFX.tick(n);
          }, (h.delay != null ? h.delay : 260) + n * (h.stagger || 0));
        });
      };

      /* One beat works its subtraction on the board out of the axis it is
         measured along, instead of stating it in a balloon. It runs on the
         board this screen inherited, so it waits for nothing. */
      const buildEquation = function () {
        if (!entry.xEquation) return;
        self.later(function () { Board.runEquation(self.later.bind(self)); }, 260);
      };


      /* A beat that states a derivation rather than asking for one.
         Every working in this game plays because an answer was given —
         right, or the ladder spent. A screen that simply shows the
         method has no such trigger, so its own line is the trigger:
         she finishes, and the working begins. */
      const derive = function (next) {
        if (!entry.derive) { if (next) next(); return; }
        self.later(function () {
          self.workThrough({ spec: entry.derive, done: true },
                           function () { self.settle(C.AUTO.afterLine); });
        }, 420);
      };

      const after = function () {
        /* The marker, asserted rather than inherited. It is switched on
           by answering "what kind of triangle is this?" and off by
           `clearLegs`, so a child who jumps straight here from the
           picker would arrive without the one mark the theorem rests
           on. The same idea as settlePair and settleFurniture. */
        if (entry.rightAngle) Board.rightAngle(true);
        spotlight();
        /* A table question has no control to bring: the table comes
           instead, once she has said her lines. */
        const tableAsk = entry.task && entry.task.kind === 'table';
        const bring = tableAsk ? function () { self.runTable(entry); }
          : (withControl && !keepsControl ? function () { revealControl(entry); } : null);
        const gated = bring;
        buildEquation();
        /* A beat that states a derivation says its lines and then hands
           over to the working — which settles the screen itself once it
           has finished writing. Nothing else may settle in between. */
        if (entry.derive) {
          self.armWordCues(entry);
          self.sayLines(entry.lines || [entry.line, entry.line2].filter(Boolean), function () {
            if (gated) gated();
            derive();
          }, lit);
        }
        /* More than two sentences on one board. `sayLines` has always
           been able to — it waits for each line's light to finish
           before starting the next, and hands each one's index to the
           lights — but only `derive` could reach it. A beat that has
           three things to say in one breath should not have to be cut
           into two screens to say them.

           It settles nothing of its own, which is right for a
           derivation whose last act is writing; an ordinary screen has
           to be handed on, so that is done here. */
        else if ((entry.lines || []).length) {
          self.armWordCues(entry);
          self.sayLines(entry.lines, function () {
            if (gated) gated();
            self.settle(entry.hold != null ? entry.hold : C.AUTO.afterLine);
          }, lit);
        }
        else if (entry.line && entry.line2) {
          self.speakBoth(entry.line, entry.line2, gated, lit);
        }
        else if (entry.line) {
          self.speak(entry.line, function () { if (lit) lit(0); if (gated) gated(); });
        }
        else if (entry.auto && i + 1 < C.SCRIPT.length) {
          self.later(function () { self.goTo(i + 1); }, 160);
        } else {
          /* A screen that draws something to be read, rather than just
             moving a piece into place, can name its own pause. */
          self.settle(entry.hold != null ? entry.hold : C.AUTO.afterSilent);
        }
      };

      const arrive = function () {
        if (entry.entrance === 'fly') self.flyIn(after);
        else if (entry.entrance === 'flyOut') self.flyOut(after);
        /* Nobody to bring on — because she is already standing where
           the screen before left her. That is true on the way through
           and false after a jump, which arrives with her still in the
           flying rig she was drawn in on the title screen. `stay` was
           given this job once already, for the same reason, and this
           is the branch that skips it: so if the rig is what is up,
           put the standing artwork up instead, with no flight. She was
           meant to have been here all along. */
        else if (entry.entrance === 'none') { self.assertStanding(); after(); }
        /* Off the stage, and staying off (37: the formula is left on its
           own) — flown away first if she is still standing there. */
        else if (entry.entrance === 'away') {
          if (self.birdAway()) after(); else self.flyOut(after);
        }
        else self.stay(after);
      };

      /* Plot the segment, then any leg dropped from it, before asking
         about either. */
      const plotThen = function (next) {
        const afterSeg = function () {
          /* Places on the board that are not one of the pair — the
             third corner of a town. Plotted and labelled exactly as
             the pair is, because they are the same kind of thing. */
          if (entry.town) Board.markPlaces(entry.mark, self.later.bind(self));
          else (entry.mark || []).forEach(function (m, n) {
            self.later(function () { Board.solve(m.x, m.y); SFX.tick(n + 1); },
                       260 + n * 220);
          });
          if (entry.town) self.later(function () { Board.townFocus(entry.townFocus || null); }, 900);
          /* A pair that has already been measured says so on its own
             line, the way an axis case writes its answer there. */
          const R = entry.segment && entry.segment.result;
          if (R) self.later(function () {
            Board.showSegResult(entry.segment, R.text, R.dy, R.dx);
            SFX.chime();
          }, 260);
          /* Pairs recalled beside this one come up under her line, not
             before it — the screen is no slower for carrying them. */
          /* Unless a line has claimed them — see lightAfterLine. Then
             they belong to that sentence, not to the board arriving. */
          const linedUp = (entry.lineLights || []).some(function (L) {
            return L && L.examples;
          }) || ((entry.wordCues || []).some(function (c) {
            return c && c.example != null;
          }));
          if (entry.examples && !linedUp) {
            Board.runExamples(entry.examples, self.later.bind(self));
          }
          const legsOnLine = (entry.lineLights || []).some(function (L) {
            return L && L.legs;
          }) || (entry.wordCues || []).some(function (c) { return c && c.legs; });
          if (entry.legs && !legsOnLine) {
            Board.runLegs(entry.legs, self.later.bind(self), next);
          } else next();
        };
        /* A screen that keeps what it inherited does not replot the
           segment — only whatever is new gets drawn.

           Unless what it inherited is not its pair. Keeping is what
           lets a run of beats argue about one drawing without redrawing
           it between each; it assumes the beat before left the right
           thing there, which is true of every route through the script
           and false the moment the picker drops a child in from
           somewhere else. So the pair it declares wins over the pair
           that happens to be up. */
        /* A comparison keeps whichever of its two walks is up (see
           compareWalks); with neither up, the first is drawn. */
        if (entry.compare) {
          const held = entry.compare.filter(function (w) { return Board.showing(w); })[0];
          if (held) { self.compareWalks(entry, held); afterSeg(); }
          else {
            Board.clearSegment();
            Board.runSegment(entry.compare[0], self.later.bind(self), function () {
              self.compareWalks(entry, entry.compare[0]);
              afterSeg();
            });
          }
          return;
        }
        const samePair = Board.showing(entry.segment);
        /* Redrawing over the top of the wrong pair leaves the wrong
           pair's labels and lengths underneath it, so the paper is
           wiped first: this is not "keeping" anything, it is drawing
           this screen from nothing. */
        if (entry.segment && entry.keepSegment && !samePair) Board.clearSegment();
        if (entry.segment && (!entry.keepSegment || !samePair)) {
          /* Plotted, but not joined. A line drawn between two of three
             places says which pair is being asked about, so a screen
             whose whole question is "which pair?" puts the points up
             and leaves them apart. */
          if (entry.pointsOnly) {
            Board.runPoints(entry.segment, self.later.bind(self), afterSeg, false);
          } else {
            Board.runSegment(entry.segment, self.later.bind(self), afterSeg);
          }
        } else {
          // kept, but this screen may be the one that names the points
          if (entry.segment) Board.nameSegment(entry.segment, self.later.bind(self));
          /* …or writes them in parts, or turns the guide solid — in
             place, with nothing arriving again. */
          if (entry.segment) Board.carryOn(entry.segment, !!entry.solidLine);
          afterSeg();
        }
      };

      /* Everything a screen needs in place, applied behind whatever is
         covering the frame. Layout-driven rather than hard-coded, so a
         leaf sweep can land on the board layout or back on the field
         one equally well. */
      const dress = function () {
        /* Behind the leaves, a screen that keeps its drawing is given it
           here, under the cover, rather than in plain sight before the
           sweep arrives. */
        if (entry.transition === 'leaves') {
          Board.setTextScale(entry.textScale || 1);
          self.numberBoard(i); self.seedDrawing(i);
        }
        Bubble.close();
        applyGeom(geom);
        el.standSwifty.classList.add('hidden');
        el.birdWin.classList.add('hidden');
        el.shadow.classList.add('lifted');
        /* A screen that keeps its drawing keeps it through the sweep
           too — only the count-out squares go. */
        if (entry.keepSegment) Board.clearUnits();
        else Board.clearSegment();
        /* A working written on the paper belongs to the screen that
           wrote it. The one after gets clean paper — and no table. */
        if (Table) Table.hide();
        /* The player's own measuring line is left lit when they get it
           right — on the screen they drew it, where it is the answer.
           It must not travel: it is 9px of light blue lying exactly
           along a 7px leg, drawn after it, so every screen after the
           counting showed that leg in the measure's colour instead of
           its own, and anything done to the leg happened underneath. */
        if (!entry.distance && !entry.entry) Board.clearMeasure();

        /* Only a board screen brings the board through the sweep; the
           field screens leave it behind entirely. */
        /* A distance question arrives with the frame empty and brings
           the board, the question and the controls in itself, in that
           order — so the sweep must not put any of them up early. */
        const holds = entry.intro === 'measure' ||
                      (!!AX && !!entry.task && entry.task.kind === 'table');
        if (onBoard && !holds) {
          /* Up without being built in front of anyone — so built here,
             axes and all. Reached from the picker, a screen behind the
             leaves put the paper up with no axes on it: they are only
             ever drawn by the sweep of a screen that builds the board. */
          Board.build();
          Board.settleFurniture();
          Board.place(geom.panelBox || C.GRID.box);
          el.gridPanel.classList.remove('hidden');
          Board.shown = true;
          Board.setDots(!!entry.dots);
        } else {
          el.gridPanel.classList.add('hidden');
          Board.shown = false;
          Board.setDots(false);
          Board.clearSegment();
        }

        if (Sel) {
          if ((entry.distance || entry.entry) && !holds) { Sel.reset(); Sel.show(); }
          else Sel.hide();
        }
        if (Opts && !entry.options) Opts.hide();   // shown by revealControl
        dressTown(entry);
      };

      /* The map over the board, and the two things that sit with it in
         the control column. All three belong to the screen rather than
         to the component, and all three have to be taken away again by
         the screens that do not want them — a town left standing on the
         screen after is a town on the wrong board. */
      const dressTown = function (e, soft) {
        if (Town) {
          /* `town: true` is every place; a list names the ones this
             screen is about — the cafés and the house, or the school,
             the park and the house. A place that has nothing to do with
             the question is not on the map. */
          if (e.town) {
            Town.set(townPlaces(e));
            Board.onPlaced();
            /* A question that builds its board from nothing puts the town
               up with its points (runMeasure), not over a grid still
               being ruled — the pictures stood on bare paper while the
               axes were drawing out under them. */
            const builds = e.intro === 'measure' && !(e.transition !== 'leaves' && Board.shown);
            if (builds) Town.hide(); else Town.show();
            Board.townFocus(e.townFocus || null);
          }
          /* A town that has gone takes its footprint with it, or the
             next board keeps its labels clear of buildings that are no
             longer standing there. */
          else { Town.hide(); Board.townInk = null; }
        }
        if (Opts) Opts.setRow(!!e.optionRow);
        if (Opts && Opts.setTrio) Opts.setTrio(!!e.optionTrio);
        if (Opts && Opts.setWide) Opts.setWide(!!e.optionWide);
        if (Hints) {
          if (e.hint) { Hints.set(e.hint); Hints.show(); } else Hints.hide();
        }
        /* And a triangle that was the working's own scaffolding does
           not belong to the screen after it — faded away in plain sight,
           or simply gone behind the leaves. */
        if (e.dropLegs) { if (soft) Board.fadeLegs(self.later.bind(self)); else Board.clearLegs(); }
        if (e.dropNames) Board.fadeNames();
      };

      /* An axis case: plot the segment, then narrow the formula a step
         at a time until only the one difference that matters is left.
         Which axis it is lives entirely in the config passed in. */
      /* The axis case as the child's own go (39, 41): the board builds in
         the middle of an empty frame with the two points on it and moves
         across to its side; she flies in and says what the case is; then
         she goes, the board comes back to make room, and the table opens
         out of its right edge for the child to fill — both y's (or x's)
         are 0, the zero term goes, and the child picks what is left. The
         working is theirs: nothing is carried across for them. */
      const runAxisPick = function (X) {
        const spec = { a: X.a, b: X.b, color: C.GRID.leg.color, coordDy: X.coordDy };
        self.state = 'entering';
        el.nextBtn.classList.remove('ready');
        /* `noIntro` (39): she does not come in to name the case. The grid
           builds in the middle, moves to its side and the table opens.
           Reached without the leaves she is still up from the screen
           before, so she flies off as the grid comes, not blinks out. */
        if (entry.noIntro) {
          Bubble.close();
          if (!self.birdAway()) self.flyOut(function () {});
        } else {
          el.standSwifty.classList.add('hidden');
          el.birdWin.classList.add('hidden');
        }
        Board.viewName = null;
        Board.viewTo(null, 0);
        Board.place(C.GRID.centre);
        Board.run(self.later.bind(self), function () {
          Board.runSegment(spec, self.later.bind(self), function () {
            if (entry.noIntro) {
              self.later(function () { self.runTable(entry); }, 600);
              return;
            }
            self.slideBoard(geom.panelBox);
            self.later(function () {
              self.flyIn(function () {
                const g = self.geom || {};
                const aim = g.aim || { x: C.ANCHOR.x, y: C.ANCHOR.y - 200 * C.CHAR_SCALE };
                self.state = 'speaking';
                FX.sparkles(aim.x, aim.y, 7, 170 * (g.scale || C.CHAR_SCALE));
                Bubble.open(entry.line, function () {
                  self.later(function () { self.runTable(entry); }, Bubble.voiceTail + 700);
                });
              });
            }, 760);
          });
        });
      };

      /* A distance question, from an empty frame: the board arrives on
         its own and draws its axes, the two points and their labels
         pop in one at a time with no line between them, Swifty flies
         in to put the question and leaves again, and only then does
         the board move aside for the banner and the slider. */
      const runMeasure = function () {
        self.state = 'entering';
        if (flyBack) {
          Bubble.close();
          self.flyOut(function () {
            self.geom = geom;
            standPose = !!geom.stand;
            applyGeom(geom);
            el.standSwifty.classList.add('hidden');
            el.birdWin.classList.add('hidden');
            /* Then the last walk's table folds back into the board, its
               drawing fades, and this walk is drawn on the board as it
               slides back into place. */
            if (Table) Table.close();
            if (Opts && !entry.options) Opts.hide();
            dressTown(entry, true);
            Board.fadeDrawing(self.later.bind(self), measure);
          });
          return;
        }
        measure();
      };
      const measure = function () {
        /* Kept: emptied for the new question rather than taken away, and
           live from the moment the points are down, so a child who is
           ahead of her can answer while she is still asking. */
        if (Sel) { if (keepsControl) Sel.reset(); else Sel.hide(); }
        /* And the last screen's answers — this one brings its own, once it
           has asked (a screen after one answered on the buttons). */
        if (Opts && !keepsControl) Opts.hide();

        /* A screen that follows straight on from the one before keeps
           the board it inherited, and her with it: no sweep, no
           rebuild, no slide. The points simply appear on the board
           already in front of them, which is the whole difference
           between this and a fresh question. */
        const inherited = entry.transition !== 'leaves' && Board.shown;
        if (!inherited) {
          el.gridPanel.classList.add('hidden');
          el.standSwifty.classList.add('hidden');
          el.birdWin.classList.add('hidden');
          Board.shown = false;
        }
        /* Points that have not changed stay exactly where they are.
           Taking them away and plotting them again — dots, then
           coordinates, then letters — makes a screen that is carrying
           straight on from the last one look like a new one, and the
           child watches the board they were already reading be rebuilt
           in front of them. Only what is new gets drawn. */
        /* And keeping is only keeping when what is up is this screen's
           own pair — see Board.showing. */
        const holds = !!entry.keepSegment && Board.shown &&
                      (!entry.segment || Board.showing(entry.segment));
        Board.setDots(false);
        if (holds) Board.clearUnits(); else Board.clearSegment();

        const plot = function () {
          Board.shown = true;

          /* 2. the points, then their coordinates, then their letters,
             then the dashed guide along the span being asked about.
             The solid line is still held back — that is the answer. */
          const measuringLeg = entry.task && entry.task.measureLeg != null;
          const laid = function (done) {
            if (holds) {
              // already on the board — but its letters may be new
              Board.nameSegment(entry.segment, self.later.bind(self));
              /* …and its coordinates may now be written in parts, for a
                 working to carry numbers out of (44 keeps 43's pair). */
              if (entry.segment) Board.carryOn(entry.segment, false);
              done();
              return;
            }
            /* A screen can hold the dotted guide back for the word that
               names the distance it stands for (guideOnLine + a `guide`
               cue): the points go up now, the guide with her line. */
            const spec = entry.guideOnLine ? Object.assign({}, entry.segment, { dash: false })
                                           : entry.segment;
            /* And no solid AB with the points on such a screen: a side
               question draws the pair's line along with its points, but
               where AB is the unknown (29, every walk) it arrives with
               the guide instead — dotted first, then drawn solid over
               the dots (drawGuide). */
            Board.runPoints(spec, self.later.bind(self), done,
                            measuringLeg && !entry.guideOnLine);
          };
          laid(function () {
            /* The town's other places, plotted like the pair, and the
               ones this walk is not about stepped back. */
            if (entry.town && Town && !Town.shown) Town.show();
            if (entry.town) {
              Board.markPlaces(entry.mark, self.later.bind(self));
              self.later(function () { Board.townFocus(entry.townFocus || null); }, 700);
            }
            const asks = function () {
              /* A screen resting on the right angle has its marker up
                 once its sides are — the measuring intro speaks through
                 here rather than `after`, which is where every other
                 screen asserts it. */
              if (entry.rightAngle) Board.rightAngle(true);
              /* She puts the question and stays, line and all — the
                 control arrives below her rather than in her place, so
                 there is no reason for her to leave. */
              /* A measure screen says its own line here rather than
                 through `after`, so a second line and its lights are
                 honoured here too, and in the same order as everywhere
                 else: each light waits for the sentence that introduces
                 it, and the control waits for the last of them rather
                 than landing on top of the thing being pointed at. */
              const speak = function () {
                /* The side this question is about, held forward while she
                   asks it and after (57: "First, find AB." — AB at full
                   strength, the rest stepped back). It was only ever read
                   on screens that ask nothing, so on these it never came. */
                if (entry.focus) {
                  Board.spotlightPart(entry.focus);
                  self.hold(function () { Board.spotlightPart(null); });
                }
                FX.sparkles(geom.aim.x, geom.aim.y, 7, 170 * geom.scale);
                /* Its words can carry cues like any other screen's. */
                self.armWordCues(entry);
                const lines = [entry.line, entry.line2].filter(Boolean);
                const step = function (n) {
                  if (n >= lines.length) return;
                  Bubble.open(lines[n], function () {
                    const run = self.lightAfterLine(entry, n);
                    const last = n + 1 >= lines.length;
                    /* Either way, the light finishes before anything
                       else begins — the next sentence, or the control. */
                    self.later(last ? opens : function () { step(n + 1); },
                               Math.max(last ? 700 : C.AUTO.betweenLines, run + 260));
                  });
                };
                step(0);
              };

              if (inherited && !flyBack) {
                // already standing here from the screen before
                self.stay(speak);
                return;
              }

              /* Otherwise the board moves aside as she arrives — the
                 same slide the grid screens use, and for the same
                 reason: there is someone to share the frame with now. */
              self.slideBoard(geom.panelBox);
              self.flyIn(speak);
            };
            /* A leg question draws the other legs, but not the one it
               is about: that side is what the player lays down with the
               control, so drawing it first both gives the answer away
               and leaves the far half of it sitting there in the leg's
               own colour while the measuring line covers the near half.
               Its corner and coordinates still go up — the question is
               how far, not where to. */
            /* Every leg is drawn, the measured one included, and the
               question comes after. The side being asked about used to
               be held back so the player laid it down themselves with
               the control — but the line reaching the corner is what
               names that corner and gives the question something to
               point at, so it goes down first and the counting happens
               along a side that is already there. */
            /* A screen can hold its legs back for the working. On the
               closing beat the triangle is not what is being asked
               about — the distance is — and a right-angled triangle
               already drawn round the line would be answering the
               question the working exists to answer. */
            /* Unless a line draws them — the corner arriving because she
               has said what she is going to find, not with the screen —
               or a word in one does (29, every walk: C comes with her
               question). */
            const legsOnLine = (entry.lineLights || []).some(function (L) {
              return L && L.legs;
            }) || (entry.wordCues || []).some(function (c) { return c && c.legs; });
            if (entry.legs && !legsOnLine) {
              /* The side being asked about goes down dotted: the count
                 lays a solid stroke along it, and a solid guide under a
                 solid stroke reads as one thick line rather than as
                 something being measured. */
              const drawn = entry.legs.map(function (l, i) {
                if (i !== (entry.task && entry.task.measureLeg)) return l;
                return Object.assign({}, l, { dash: true });
              });
              Board.runLegs(drawn, self.later.bind(self), asks);
            } else asks();
          });
        };

        /* A new drawing that asks for a view is framed between the
           grid and the points: the whole grid fills first, the camera
           comes in on where the triangle is going to be, and only then
           is a point drawn — the order screen 22 has, and for the same
           reason. Everything else plots as it always has. */
        const frames = !!entry.view && !!entry.segment && !holds;
        const framed = function () {
          if (!frames) { plot(); return; }
          self.later(plot, self.frameDrawing(entry));
        };
        if (inherited && flyBack) {
          /* Back from where the table pushed it, sliding rather than
             jumping, and only then the new points. */
          self.slideBoard(geom.panelBox);
          self.later(framed, 760);
        } else if (inherited) {
          Board.place(geom.panelBox);
          framed();
        } else {
          /* The board builds itself in the middle of an empty frame —
             and at its full size: a camera still pushed in on the last
             screen's triangle would build this grid in the wrong corner
             of the paper. */
          if (frames) Board.viewTo(null, 0);
          Board.place(C.GRID.centre);
          Board.run(self.later.bind(self), framed);
        }
      };

      /* 4. the controls arrive. The board does not move: she is still
         standing there with the question in her bubble, and the control
         comes in under her. */
      const opens = function () {
        self.later(function () {
          if (keepsControl) {
            // nothing to bring on; it never left, and it was reset above
          } else {
            revealControl(entry);      // she flies up, the control follows
            /* But not over a side they have already measured. AC is
               found on 24 and left lit along its own leg, which is
               correct; bringing 25's control on wiped it, and a moment
               later 25 redrew the same side as a settled leg — so it
               appeared, went, and came back. A length that has been
               found stays on the board, and the settled leg takes it
               over without a frame of nothing in between. */
            if (!Board.measureIsLit()) Board.clearMeasure();
          }
          self.settle();
        }, 240);
      };

      /* The board's own arrival, in the order a child reads it: built
         in the middle of an empty frame, moved aside to make room for
         her, the camera brought in on where the drawing is going to
         be, and only then the points — with her arriving last, to talk
         about something that is already there.

         It lives here because BOTH ways into a screen need it. A leaf
         sweep hands straight to `plotThen` and returns before the grid
         branch below is ever reached, so a screen behind leaves used
         to inherit the last screen's board and skip its own arrival
         entirely — which is how the one screen that asks for a build
         got none. */
      const buildThenPlot = function () {
        /* She is coming, so the board starts in the middle and only
           moves aside once she is on her way — until then there is
           nobody to share the frame with. */
        const slides = entry.entrance === 'fly';
        if (slides) Board.place(C.GRID.centre);
        Board.run(self.later.bind(self), function () {
          Board.setDots(!!entry.dots);
          if (slides) {
            self.slideBoard(C.GRID.box);
          }
          /* The camera before the points, not under them. The pair is
             PLACED and not drawn: `viewFor` reads where the drawing
             is, not what can be seen of it, so the push knows where
             the triangle will be while the board is still empty. */
          if (entry.view) {
            self.later(function () { plotThen(arrive); }, self.frameDrawing(entry));
          } else plotThen(arrive);
        });
      };

      /* And a working written on the paper goes with the screen that
         wrote it, however the next one is arrived at — unless the screen
         is the one that sums it up (`keepTable`: 37 says what 35's table
         has just shown, with the table still there). */
      /* Behind the leaves, under the cover (dress), rather than popping
         out in plain sight before a single leaf has arrived. */
      if (Table && !entry.keepTable && entry.transition !== 'leaves' && !flyBack) Table.hide();

      /* The picker is told where the game went, however it got there —
         her own hand-over, Back, Next, or a jump from the picker
         itself. */
      if (Jump) { Jump.close(); Jump.sync(); }

      /* Behind the leaves where there are leaves — dress() does it —
         and straight away where there are not. Either way it happens
         before anything is drawn, never after, or the town flashes up
         on the board the screen before was using. */
      if (entry.transition !== 'leaves' && !flyBack) dressTown(entry);

      if (entry.transition === 'leaves') {
        this.state = 'entering';
        SFX.wind(FX.leaves.seconds);
        /* Points and lines are drawn before anyone speaks, so the
           child sees what is being talked about. */
        FX.leaves(el.leafLayer, dress, function () {
          if (AX) runAxisPick(AX);
          else if (entry.intro === 'measure') runMeasure();
          else if (entry.rebuild) buildThenPlot();
          else plotThen(arrive);
        });
        return;
      }

      /* An axis case with no leaf sweep before it (39): the frame is
         cleared here, as dress() would have done under the cover — the
         case builds its own board in the middle of it — and the case is
         run. It used to be run only at the end of a sweep. */
      if (AX) {
        this.state = 'entering';
        Board.setTextScale(entry.textScale || 1);
        this.numberBoard(i);
        Board.clearSegment();
        Board.clearMeasure();
        if (Table) Table.hide();
        el.gridPanel.classList.add('hidden');
        Board.shown = false;
        Board.setDots(false);
        if (Sel) Sel.hide();
        if (Opts) Opts.hide();
        runAxisPick(AX);
        return;
      }

      // a distance question rebuilds from an empty frame, every time
      if (entry.intro === 'measure') { runMeasure(); return; }

      /* The board screen itself: placed, its drawing kept or cleared, then
         plotted and arrived at. Run at once, or after a fly-back. */
      const settleIn = function () {
      if (geom.panelBox) Board.place(geom.panelBox);
      else Board.place(C.GRID.box);
      /* A screen about the table the one before wrote (37: "that gives us
         the distance between any two points!") gives it the room: the
         board steps back, a little smaller, against its left edge, and
         the table comes out into the space and grows. Scaled rather than
         re-laid, so nothing on either moves inside it; undone when the
         screen goes. */
      /* Or the table is folded down to the one line it ended on first
         (`tableOnly: 'last'`: 37 — the formula and nothing else), and
         grown once it has closed up round it. */
      let growAt = 300;
      if (entry.keepTable && entry.tableOnly === 'last' && Table && Table.only) {
        growAt = Table.only(Table.rowCount() - 1) + 80;
      }
      if (entry.keepTable && entry.tableGrow && Table && Table.el) {
        /* Grown, and she comes up from behind it to say what it gives. */
        self.growTable(entry.tableGrow, geom.panelBox || C.GRID.table.board, growAt,
                       entry.peek ? function () { self.peekUp(entry); } : null);
      }

      /* Screens 9-11 stay on the board they inherited: no leaves, no
         rebuild — just clear the last segment and plot the next. */
      if (entry.layout === 'board' && entry.transition !== 'leaves') {
        // and here too, for the same reason — see dress()
        if (!Board.shown) { Board.build(); Board.settleFurniture(); }
        el.gridPanel.classList.remove('hidden');
        /* The last screen's drawing, faded out rather than wiped in one
           frame, where the screen asks (20: 19's pair and its length go,
           and the board is clear for what this screen reveals). */
        const fading = entry.fadeOld && Board.shown && !entry.keepSegment;
        Board.shown = true;
        if (fading) Board.fadeDrawing(self.later.bind(self));
        else if (!entry.keepSegment) Board.clearSegment();
        else Board.clearUnits();   // keep the drawing, drop any count-out
        if (!entry.distance && !entry.entry) Board.handOffMeasure();
        /* A control that revealControl is going to bring in must not be
           up already: it rises into the space under her once she has
           asked the question, not before she has opened her mouth. */
        const brought = withControl && !!entry.line && !keepsControl;
        if (Sel && (entry.distance || entry.entry) && !brought) { Sel.reset(); Sel.show(); }
        if (Opts && entry.options && !brought) { Opts.reset(); Opts.show(); }
        /* And one the screen before left standing has to go. Not showing
           it is only half of "must not be up already" — it was already
           there, so the screen has to take it away. */
        if (brought) { if (Sel) Sel.hide(); if (Opts) Opts.hide(); }
      }

      /* A grid screen builds the board in first — but only if it is
         not already standing from the screen before, so screen 6
         carries straight on from 5 instead of rebuilding it. */
      /* Plot the segment before asking about it, on any screen that
         has one. */
      if (entry.layout === 'grid' && (entry.rebuild || !Board.shown)) {
        buildThenPlot();
      } else {
        Board.setDots(!!entry.dots);
        plotThen(arrive);
      }
      };

      /* A board screen after a table with no leaf sweep (46, 48): she
         flies off from where she stands, the table folds back into the
         board as it slides back into place, the working's triangle fades,
         and only then is the screen drawn and she flies back in. */
      if (flyBack) {
        this.state = 'entering';
        Bubble.close();
        /* Down behind the panel is how she left if she was over it
           (Peek.leave, above) — nothing to fly off from. */
        const away = peeked ? function (then) { self.later(then, 360); }
                            : this.flyOut.bind(this);
        away(function () {
          self.geom = geom;
          standPose = !!geom.stand;
          applyGeom(geom);
          el.standSwifty.classList.add('hidden');
          el.birdWin.classList.add('hidden');
          if (Table) Table.close();
          if (Opts && !entry.options) Opts.hide();
          if (Sel && !(entry.distance || entry.entry)) Sel.hide();
          dressTown(entry, true);
          if (onBoard) {
            self.slideBoard(geom.panelBox || C.GRID.box);
            self.later(settleIn, 760);
            return;
          }
          /* A screen with no board (40, after 39's table): the board goes
             too — faded where it stands once the table has folded into
             it — and she comes back in to an empty field. */
          self.later(function () {
            el.gridPanel.classList.add('leaving');
            self.later(function () {
              el.gridPanel.classList.add('hidden');
              el.gridPanel.classList.remove('leaving');
              Board.clearSegment();
              Board.shown = false;
              settleIn();
            }, 540);
          }, 700);
        });
        return;
      }
      settleIn();
    },

    /* Swifty flies in from off-stage on the fly sheet, then lands. */
    flyIn: function (done) {
      const self = this;
      el.birdWin.classList.remove('hidden');
      el.standSwifty.classList.add('hidden');
      Sprite.play('fly', true);
      // Same frame: drop the hold and start the arc. The animation's 0%
      // keyframe is off-stage at opacity 0, so there is no flash of her
      // standing at the landing spot.
      el.birdRig.classList.remove('pre-entrance');
      el.birdRig.classList.add('fly-in');
      el.shadow.classList.add('lifted');      // no shadow while airborne

      // one wing-beat sound per pair of frames during the approach
      let beats = 0;
      const flapper = setInterval(function () {
        SFX.flap();
        if (++beats > 11) clearInterval(flapper);
      }, 155);

      let settled = false;
      /* Only her own flight ends it — not an animation on something
         inside the rig. */
      const ended = function (e) { if (e.target === el.birdRig) onEnd(); };
      /* Tear-down shared by a normal landing and a skip, so tapping
         Next mid-flight cannot leave her stuck in the air. */
      const groundHer = function () {
        settled = true;
        el.birdRig.removeEventListener('animationend', ended);
        clearInterval(flapper);
        el.birdRig.classList.remove('fly-in');
        el.shadow.classList.remove('lifted'); // shadow settles under her
        Sprite.stopAt('talk', 0);
      };
      const onEnd = function () {
        if (settled) return;
        groundHer();
        self.entranceCancel = null;
        // On the board screen she settles into the standing artwork,
        // which is drawn at the same size the sheet lands at.
        if (self.geom && self.geom.stand) {
          el.birdWin.classList.add('hidden');
          el.standSwifty.classList.remove('hidden', 'land-in');
          void el.standSwifty.offsetWidth;
          el.standSwifty.classList.add('land-in');
          /* Once, for the landing. Left on, it played again every time
             she stopped talking — the standing drawing is shown again
             out of display: none, which restarts its animation — and
             she blinked out and faded back in after every line. */
          const s = el.standSwifty;
          const settle = function (e) {
            if (e && e.animationName !== 'standIn') return;
            s.removeEventListener('animationend', settle);
            clearTimeout(s._landT);
            s.classList.remove('land-in');
          };
          clearTimeout(s._landT);
          s.addEventListener('animationend', settle);
          s._landT = setTimeout(settle, 300 + 200);
        }
        SFX.land();
        const g = self.geom || { anchor: C.ANCHOR, feetY: C.ANCHOR.y + C.FEET_DY };
        FX.puff(g.anchor.x - 10, g.feetY);
        FX.sparkles(g.anchor.x, g.anchor.y - 120 * C.CHAR_SCALE, 12, 190 * C.CHAR_SCALE);
        SFX.sparkle();
        self.later(done, 320);
      };
      this.entranceCancel = groundHer;
      el.birdRig.addEventListener('animationend', ended);
      /* A flight that never reports its end (a hidden tab, a dropped
         frame) lands anyway, a beat after it should have. */
      this.later(onEnd, 2100 + 500);
    },

    /* She flies on out to the right, carrying straight on past where
       she landed, and the screen hands over once she is gone. */
    /* Is she off the stage: hidden, or flown off and waiting to come
       back in? */
    birdAway: function () {
      if (!el.standSwifty.classList.contains('hidden')) return false;   // standing
      return el.birdWin.classList.contains('hidden') ||
             el.birdRig.classList.contains('pre-entrance');
    },

    flyOut: function (done) {
      const self = this;
      el.birdWin.classList.remove('hidden');
      el.standSwifty.classList.add('hidden');
      Sprite.play('fly', true);
      el.birdRig.classList.remove('fly-in', 'pre-entrance');
      void el.birdRig.offsetWidth;
      el.birdRig.classList.add('fly-out');
      el.shadow.classList.add('lifted');
      const g = this.geom || { anchor: C.ANCHOR, feetY: C.ANCHOR.y + C.FEET_DY };
      FX.puff(g.anchor.x - 10, g.feetY);
      SFX.flap();

      let beats = 0;
      const flapper = setInterval(function () {
        SFX.flap();
        if (++beats > 8) clearInterval(flapper);
      }, 165);

      let gone = false;
      const ended = function (e) { if (e.target === el.birdRig) finish(); };
      const finish = function () {
        if (gone) return;
        gone = true;
        el.birdRig.removeEventListener('animationend', ended);
        clearInterval(flapper);
        el.birdRig.classList.remove('fly-out');
        el.birdRig.classList.add('pre-entrance');   // off-stage again
        Sprite.stopAt('talk', 0);
        self.entranceCancel = null;
        self.later(done, 120);
      };
      this.entranceCancel = function () {
        gone = true;
        el.birdRig.removeEventListener('animationend', ended);
        clearInterval(flapper);
        el.birdRig.classList.remove('fly-out');
        el.birdRig.classList.add('pre-entrance');
        Sprite.stopAt('talk', 0);
      };
      /* Her own flight only, and a fallback for one that never reports. */
      el.birdRig.addEventListener('animationend', ended);
      this.later(finish, 1500 + 500);
    },

    /* Her standing artwork, put up without a flight.

       Only when the flying rig is what is showing — which is the state
       a jump arrives in, and never the state a screen reaches on the
       way through. If she is fully hidden she is meant to be off the
       screen, and a beat that has sent her away is not second-guessed
       here. */
    assertStanding: function () {
      if (!this.geom || !this.geom.stand) return;
      if (!el.standSwifty.classList.contains('hidden')) return;
      if (el.birdWin.classList.contains('hidden')) return;
      el.birdRig.classList.remove('fly-in', 'pre-entrance');
      el.shadow.classList.remove('lifted');
      el.birdWin.classList.add('hidden');
      el.standSwifty.classList.remove('hidden');
    },

    /* Talking only: she is already standing where she landed, so the
       fly sheet is not touched — just settle on the talking pose and
       let the next bubble come up. */
    stay: function (done) {
      el.birdRig.classList.remove('fly-in', 'pre-entrance');
      el.shadow.classList.remove('lifted');
      if (this.geom && this.geom.stand) {
        /* Assert the standing artwork rather than assuming the screen
           before left it up — skipping screen 5 mid-build would
           otherwise land here with no Swifty at all. */
        el.birdWin.classList.add('hidden');
        el.standSwifty.classList.remove('hidden');
      } else {
        el.birdWin.classList.remove('hidden');
        Sprite.stopAt('talk', 0);
      }
      this.later(done, 140);
    },

    /* `then` runs once the line has finished — a screen with a control
       uses it to move her aside and bring the control in, so the two
       happen after she has spoken rather than while she is speaking. */
    /* What a screen hangs on the words of its line.

       `wordCues: [{ word: 'horizontally', example: 0 }, ...]` draws that
       recalled pair as that word goes up. A beat whose sentence names
       two things in turn can then show each as it is named, inside one
       line, rather than splitting the sentence across two screens to
       get two moments out of it.

       Matched on the word with its punctuation and case taken off, so
       "vertically." at the end of a sentence is still "vertically", and
       fired once: the cue is spent when it goes, whether the words
       arrived at their own pace or a tap brought them all at once. */
    armWordCues: function (entry) {
      const self = this, cues = (entry && entry.wordCues) || null;
      if (!cues || !cues.length) { Bubble.onWord = null; return; }
      const spent = [];
      Bubble.onWord = function (w) {
        const bare = String(w || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const caps = String(w || '').replace(/[^A-Za-z0-9]/g, '');
        cues.forEach(function (c, n) {
          /* The cue's word is read the way the balloon's is — so a word
             with an apostrophe in it ("Let’s") can be a cue as written.
             A point's name (A, B, AB) is read as a capital, or "There's a
             fire at A" would light A on its "a". */
          const name = /^[A-Z]{1,3}$/.test(c.word || '');
          if (spent[n] || (name ? caps !== c.word
                                : bare !== String(c.word || '').toLowerCase().replace(/[^a-z0-9]/g, ''))) return;
          /* A cue can belong to one line (`in`: words from it), so the
             same word in an earlier sentence does not set it off. */
          if (c.in && String(Bubble.full || '').indexOf(c.in) < 0) return;
          spent[n] = 1;
          if (c.example != null && (entry.examples || [])[c.example]) {
            Board.runExamples([entry.examples[c.example]],
                              self.later.bind(self), null, c.example);
          }
          /* Or the screen's own sides — which is how a third point
             arrives ON the word that goes looking for it, rather than
             after the sentence containing it has finished. */
          if (c.legs && (entry.legs || []).length) {
            Board.runLegs(entry.legs, self.later.bind(self), function () {});
          }
          /* Or the whole shape, on the word that names it.

             Lights hang off the END of a line, which is right for a
             beat that asks for something and wrong for the one beat
             that IS the result: measured, she said "Look! We made a
             triangle" and then stood in front of two sides of one for
             another 2.25 seconds. The third arrives on the word now.

             The line's own `clear` stays as it was. Both of these are
             idempotent, so the one that gets there first does the work
             and the other finds it already done — which is what keeps
             the beat right when it is jumped into rather than played
             up to, and the balloon never types at all. */
          if (c.settle) { Board.settlePair(); Board.spotlightPart(null); }
          /* Or light one — on the word that names it, so "we still
             need AB" lights AB as she says it rather than after she has
             stopped. */
          /* Put back when the screen goes, if nothing has put it back
             before then: the next screen may draw a side of its own,
             and a side drawn into the hush arrives already faded. */
          if (c.spot) {
            /* A screen that keeps its right-angle square through every
               highlight (`keepMark`) can still let it step back with C
               for a side it has nothing to do with: "But we still need
               AB" is about the one side with no length, and a bright
               square beside a faded C read as part of what was lit. It
               is back at full strength when the light is put away. */
            const kept = Board.keepMark;
            if (c.hushMark) Board.keepMark = false;
            Board.spotlightPart(c.spot);
            Board.keepMark = kept;
            self.hold(function () { Board.spotlightPart(null); });
          }
          /* Or pulse sides on the word that names them — the overlay
             that swells round each one, for as long as the sentence
             runs. */
          /* 'triangle' is all three, as a screen's own `pulse` names it. */
          if (c.pulse) Board.pulseSides(self.later.bind(self), 0,
            c.pulse === 'triangle' ? null : [].concat(c.pulse), c.run || 1800);
          /* Or draw the dotted guide a screen held back, and pulse the
             points it runs between (29: "the distance between A and B"). */
          if (c.guide) Board.drawGuide(self.later.bind(self));
          /* The corner rings as it lands, when the same word draws the
             side out to it (runLegs: 1030ms along a dotted side). */
          if (c.beat) [].concat(c.beat).forEach(function (k) {
            const first = (entry.legs || [])[0];
            const at = (k === 'c' && c.legs && first) ? (first.dash ? 1030 : 760) : 0;
            Board.beatPoint(k, self.later.bind(self), at, c.run);
          });
          /* Or put up the right-angle marker, on the word that names the
             shape it belongs to. */
          if (c.mark) { Board.rightAngle(true); SFX.chime(); }
          /* Or light the town's pictures she names — the two towers, the
             fire, the fire engine — as she names them. */
          if (c.townGlow && Town && Town.glow) Town.glow([].concat(c.townGlow));
          /* Or write a side's length on it as she names the side — put
             together from the labels it is read off (33: "AC" — x₂,
             then the sign, then x₁ — as she says "x₂ minus x₁"). */
          if (c.leg != null && (entry.legs || [])[c.leg]) {
            Board.writeLegLength(c.leg, entry.legs[c.leg], self.later.bind(self));
          }
        });
      };
    },

    speak: function (line, then) {
      const self = this;
      this.armWordCues(C.SCRIPT[this.index] || {});
      this.state = 'speaking';
      /* Over her head wherever she is standing — the default anchor is
         only right on the screens she has not moved from. */
      const g = this.geom || {};
      const aim = g.aim || { x: C.ANCHOR.x, y: C.ANCHOR.y - 200 * C.CHAR_SCALE };
      FX.sparkles(aim.x, aim.y, 7, 170 * (g.scale || C.CHAR_SCALE));
      Bubble.open(line, function () {
        if (then) then();
        /* Longer after a right answer than after an ordinary line: the
           confetti is still coming down — and a screen that goes on
           drawing after she has stopped talking can name its own pause,
           or it is taken away mid-working. */
        const e = C.SCRIPT[self.index] || {};
        self.settle(e.hold != null ? e.hold
          : (self.task && self.task.done ? C.AUTO.afterCorrect : C.AUTO.afterLine));
      });
    },

    /* Lines said one after the other, and NOTHING settled at the end of
       them. `speak` hands the screen on when its balloon finishes,
       which is right for a beat whose last act is speaking — and wrong
       for one that goes on to write a derivation, because the screen
       would be carried off while the working was still being written.
       Whatever follows owns the hand-over. */
    sayLines: function (list, then, each) {
      const self = this;
      this.state = 'speaking';
      const g = this.geom || {};
      const aim = g.aim || { x: C.ANCHOR.x, y: C.ANCHOR.y - 200 * C.CHAR_SCALE };
      FX.sparkles(aim.x, aim.y, 7, 170 * (g.scale || C.CHAR_SCALE));
      const step = function (i) {
        if (i >= list.length) { if (then) then(); return; }
        Bubble.open(list[i], function () {
          /* Her line, then its light — and the NEXT line waits for that
             light to finish. Two sides lit one after the other take
             longer than the breath between two sentences, so the second
             of them landed under the sentence about the third side. A
             light belongs to the words that introduced it at both ends. */
          const run = each ? (each(i) || 0) : 0;
          self.later(function () { step(i + 1); },
                     Math.max(C.AUTO.betweenLines, run + 260));
        });
      };
      step(0);
    },

    /* Two things said on one beat, one after the other.

       `speak` settles the screen when its balloon finishes, which is
       right for a beat that says one thing and wrong for a beat that
       says two: the hand-over would be armed while she was still
       talking, and a short hold would carry the screen off mid-sentence.
       So the first line is opened rather than spoken, and only the
       second one settles. */
    speakBoth: function (a, b, then, each) {
      const self = this;
      this.state = 'speaking';
      const g = this.geom || {};
      const aim = g.aim || { x: C.ANCHOR.x, y: C.ANCHOR.y - 200 * C.CHAR_SCALE };
      FX.sparkles(aim.x, aim.y, 7, 170 * (g.scale || C.CHAR_SCALE));
      Bubble.open(a, function () {
        const run = each ? (each(0) || 0) : 0;
        self.later(function () {
          self.speak(b, function () { if (each) each(1); if (then) then(); });
        }, Math.max(C.AUTO.betweenLines, run + 260));
      });
    },

    /* She has said it, so the balloon goes. On a screen that stays open
       for another go it would otherwise sit there for the rest of the
       question — the child reading "Not quite! Try again!" over their
       second attempt, and their third. Called once she has finished
       typing, so it waits out whatever is left of her voice first.

       The balloon is only ever on screen while there are words being
       said in it; this is the wrong-answer half of that. */
    closeAfterLine: function (extra) {
      this.later(function () { Bubble.close(); },
                 Bubble.voiceTail + (extra != null ? extra : 420));
    },

    /* Heard, not read. The screen has already shown how it went — a red
       border, a dot lighting up — so the words would only be repeating
       it. She still says them; there is just nothing to read.

       Bubble.close() stops the voice, so it has to go first, and the
       hand-over is armed off the clip's own length because there is no
       balloon finishing to ride on. */
    /* `next`, if there is one, takes the place of the hand-over: a line
       to follow this one, which settles the screen itself. */
    sayOnly: function (line, then, next) {
      const self = this;
      this.state = 'speaking';
      Bubble.close();
      SFX.duck(true);                                  // dip the music under her
      mouthOpen();                                     // her beak still moves
      /* Lifted when she has said it — or when the screen is left first.
         A Next during this line used to leave the music quiet for the
         rest of the game. */
      const lift = this.hold(function () { SFX.duck(false); mouthShut(); });
      const ms = (window.Voice && window.Voice.say(line)) || 0;
      this.later(function () {
        lift();
        if (then) then();
        if (next) { next(); return; }
        /* A beat that names its own hold is honoured here too: without it
           a line said without a balloon takes the ordinary pause and the
           board is carried off mid-sequence. */
        const scr = C.SCRIPT[self.index] || {};
        self.settle(scr.hold != null ? scr.hold
          : (self.task && self.task.done ? C.AUTO.afterCorrect : C.AUTO.afterLine));
      }, (ms || 700) + 180);
    },

    /* Some moments need no words: the point lighting up under their
       finger says "right" better than the word does, and a child who
       has just tapped the wrong square can see that without being told.
       Where a screen carries no line for one of those, there is no
       bubble to finish — and the hand-over rides on the bubble
       finishing — so it has to be armed here instead, or the screen
       would sit there for ever with Next unarmed. */
    finishWith: function (line, pause, then) {
      if (line) { this.speak(line, then); return; }
      /* Nothing to say, so nothing to say it in: the balloon goes rather
         than sitting there holding the last thing she said. It is only
         on screen when there are words in it. */
      Bubble.close();
      if (then) then();
      /* `pause` is how long the board is left up to be read. It only
         applies to the wordless path — a line sets its own, by how long
         she takes to say it.

         A screen that names its own hold is honoured here too. Without
         that, a question answered right with nothing to say took the
         ordinary two seconds and the board was carried off in the
         middle of whatever it was still drawing. */
      const scr = C.SCRIPT[this.index] || {};
      this.settle(pause != null ? pause
        : scr.hold != null ? scr.hold
        : (this.task && this.task.done ? C.AUTO.afterCorrect : C.AUTO.afterLine));
    },

    /* A right answer: "That's correct!" — heard, not written
       (CFG.PRAISE). The board has already shown it, lit and in confetti,
       and a balloon over that only said it twice. Said on the first
       answers and the last question (CFG.PRAISE_AT); between them the
       chime and the confetti are the verdict, and the screen goes on
       after the beat a clip-less line takes (sayOnly), so the handing
       on is the same either way. */
    praise: function (then) {
      const id = String((C.SCRIPT[this.index] || {}).id);
      if ((C.PRAISE_AT || []).some(function (s) { return String(s) === id; })) {
        this.sayOnly(C.PRAISE, then);
        return;
      }
      const self = this;
      this.state = 'speaking';
      this.later(function () {
        if (then) then();
        const scr = C.SCRIPT[self.index] || {};
        self.settle(scr.hold != null ? scr.hold : C.AUTO.afterCorrect);
      }, 880);
    },

    /* A miss from 41b on: "Oops! Let's find it together." (`oopsLine`),
       said in her balloon — and then `then`, the finding it promises.
       Straight on where the screen has no such line. */
    oops: function (t, then) {
      const self = this, line = t && t.spec && t.spec.oopsLine;
      if (!line) { then(); return; }
      this.state = 'speaking';
      Bubble.open(line, function () {
        self.later(then, Bubble.voiceTail + 450);
      });
    },

    /* Up from behind the table: in the middle of what shows of it,
       right of the board, her balloon kept to the room there. `then`
       once her hands are on its edge — unless the screen has gone. */
    peekAt: function (then) {
      const self = this, i = this.index;
      const t = stageBox(Table.el), b = stageBox(el.gridPanel);
      this.state = 'speaking';
      Bubble.close();
      Peek.rise({ x: (Math.max(t.l, b.r) + t.r) / 2, y: t.t }, function () {
        if (self.index !== i) return;
        self.geom = Peek.geom(self.geom, { left: b.r + 18, right: C.STAGE_W - 24 });
        then();
      });
    },

    /* The formula done (37, 39, 41): she comes up from behind the panel
       it is written on and says what it gives (`peek.line`), and a Next
       comes up in the corner for the child to go on with when they are
       ready. */
    peekUp: function (entry) {
      const self = this, P = entry && entry.peek;
      if (!P || !Table || !Table.el || Table.el.classList.contains('hidden')) {
        this.settle();
        return;
      }
      this.peekAt(function () {
        Bubble.open(P.line, function () {
          self.settle();
          self.later(function () { GoOn.show(); }, Bubble.voiceTail + C.PEEK.nextMs);
        });
      });
    },

    /* The table given the room (37; 39 and 41 once worked): the board
       steps back, a little smaller, against its left edge, and the table
       comes out into the space and grows — and down, its top edge to
       `top`, where there is room over it for her. Scaled rather than
       re-laid, so nothing on either moves inside it. `then` when it has.
       Undone when the screen goes: back the way it came, not in a frame. */
    growTable: function (TG, B, at, then) {
      const T = C.GRID.table, gp = el.gridPanel, te = Table.el;
      const left = B.x + B.w * TG.board - T.tuck;
      const was = { left: te.style.left, top: te.style.top };
      this.later(function () {
        clearTimeout(te._growT);
        gp.classList.add('stepping');
        te.classList.add('growing');
        gp.style.transformOrigin = 'left center';
        gp.style.scale = String(TG.board);
        te.style.transformOrigin = 'left center';
        te.style.left = left + 'px';
        te.style.scale = String(TG.table);
        /* Its `top` is where its middle is before it grows — it is lifted
           half its height to centre it there — and it grows about that
           middle, so its top edge ends up (grown − ½) of its height over
           it. */
        if (TG.top != null) te.style.top = (TG.top + (TG.table - 0.5) * te.offsetHeight) + 'px';
      }, at);
      if (then) this.later(then, at + 700 + 350);
      this.hold(function () {
        gp.style.scale = ''; te.style.scale = '';
        te.style.left = was.left; te.style.top = was.top;
        clearTimeout(te._growT);
        te._growT = setTimeout(function () {
          gp.classList.remove('stepping');
          te.classList.remove('growing');
          gp.style.transformOrigin = ''; te.style.transformOrigin = '';
        }, 760);
      });
    },

    /* ---------------- numbers come from somewhere ----------------

       A working does not invent its numbers. The ones that could have
       been read off the board arrive by leaving the board: a copy lifts
       out of the coordinate half or the leg length it was read from,
       carries across the screen, and lands in the slot that needed it.
       The ones that were worked out — the squares, the sums — simply
       appear, because that is what they are: arithmetic, not reading.

       That distinction is the whole teaching. `(x2 - x1)` is not hard
       arithmetic, it is hard REFERENCE: the child has to hold that x2
       is an address on the board rather than a value, and a formula
       that writes itself out of thin air hides exactly that. */

    /* Where a part says it was read from, as a place on the stage.
       `from: { p: 'a'|'b', half: 'x'|'y' }` — a half of a coordinate
       label; `from: { leg: 0|1 }` — a leg's own written length. */
    sourceSpot: function (from) {
      if (!from) return null;
      /* A SIDE of the drawing, named rather than measured. It comes
         from the middle of its own span, because that is what the name
         refers to — not a number sitting at one end of it but the
         whole run from one corner to the other. */
      if (from.side) {
        const ends = Board.sideEnds(from.side);
        if (!ends) return null;
        const G = C.GRID;
        const mx = G.originX + (ends.from.x + ends.to.x) / 2 * G.stepX;
        const my = G.originY - (ends.from.y + ends.to.y) / 2 * G.stepY;
        const s = Board.boardToStage(mx, my);
        return { x: s.x, y: s.y,
                 size: C.GRID.segment.nameSize * Board.typeScale() * s.k,
                 side: from.side };
      }
      if (from.leg != null) {
        const L = Board.legSlots && Board.legSlots[from.leg];
        if (!L || !L.len || !L.len.textContent) return null;
        if (!L.len.classList.contains('pop')) return null;   // not up yet
        const x = parseFloat(L.len.getAttribute('x')),
              y = parseFloat(L.len.getAttribute('y'));
        if (!isFinite(x) || !isFinite(y)) return null;
        const s = Board.boardToStage(x, y);
        return { x: s.x, y: s.y,
                 size: C.GRID.leg.lenSize * Board.typeScale() * s.k,
                 text: (L.len.textContent || '').split('\u00A0')[0] };
      }
      /* A coordinate half. It can only be found where the label was
         built in parts — a plain label is one run of text with no
         halves to point at — so a screen that wants this says so in
         its own `coordParts`. */
      const spot = Board.partSpot(from.p, from.half);
      if (!spot) return null;
      const s = Board.boardToStage(spot.x, spot.y);
      return { x: s.x, y: s.y, size: spot.size * s.k, text: spot.text,
               p: from.p, half: from.half };
    },

    /* Carries one number out of the board and into the slot waiting for
       it. Lights where it came from as it leaves, and lets go as it
       lands — the original never moves, never empties, never resizes. */
    flyInto: function (part, node) {
      const src = this.sourceSpot(part.from);
      /* No source on the board — the label was never built in parts, or
         the leg is not up yet. The number simply appears, which is what
         every working did before this existed. */
      if (!src || !node) return 0;
      /* A side brings no text of its own, so it carries what is written
         in the slot it is flying into, with the brackets and the square
         left behind: `(AB)²` flies as `AB`, the same way a leg's
         `4 units` flies as `4`. Taken from the part rather than read
         off the corners so the glyph can never say one thing while the
         slot it lands in says another. */
      if (!src.text) {
        const t = (part.t || '').replace(/\u00A0/g, ' ');
        const inner = t.match(/\(([^)]*)\)/);
        src.text = inner ? inner[1] : t.replace(/[\u00B2\u00B3\s]+$/, '');
      }
      const F = C.GRID.fly;
      const st = el.stage.getBoundingClientRect();
      const k = st.width / C.STAGE_W || 1;
      const r = node.getBoundingClientRect();
      const to = { x: (r.x + r.width / 2 - st.x) / k,
                   y: (r.y + r.height / 2 - st.y) / k,
                   size: parseFloat(getComputedStyle(node).fontSize) / 1 || 34 };
      /* Lit WHERE IT IS, before it moves. For a coordinate half that is
         the half glowing; for a side it is the side coming forward and
         the rest of the drawing stepping back — which is the answer to
         "where did that come from", given before the question. */
      /* The glow goes out when the copy lands — or when the screen is
         left mid-flight, which lands the copy without running its end. */
      const unglow = src.p ? this.hold(function () { Board.glowPart(src.half, false, src.p); })
                           : function () {};
      if (src.p) Board.glowPart(src.half, true, src.p);
      else if (src.side) Board.spotlightPart(src.side);
      SFX.tick(2);
      this.later(function () {
        FX.flyGlyph(src.text, src, to, F.ms, function () {
          unglow();
          SFX.blip();
        });
      }, F.pickMs);
      return F.pickMs + F.ms;
    },

    /* And the other direction: the answer leaving the working and
       landing on the thing it measures.

    /* The Check button on the distance panel. */
    /* The two points a distance question is about: a named leg, or the
       segment itself. Read from the board rather than typed into the
       task, so a moved point can never leave a stale answer behind.
       Both the slider's line and the grading go through here, so the
       two can never disagree about what is being measured. */
    measurePair: function () {
      const entry = C.SCRIPT[this.index] || {};
      const t = this.task;
      const sg = entry.segment;
      let from = sg ? sg.a : null, to = sg ? sg.b : null;
      if (t && t.spec.measureLeg != null && entry.legs && entry.legs[t.spec.measureLeg]) {
        const L = entry.legs[t.spec.measureLeg];
        from = L.from; to = L.to;
      }
      if (!from || !to) return null;
      /* Always measured left to right, and top to bottom on a vertical
         pair, whichever order the script happens to list the two points
         in — otherwise the line grows backwards on the screens whose
         first point is the right-hand or lower one. The answer is the
         same either way, since it is a distance. */
      const backwards = (to.x < from.x) || (to.x === from.x && to.y > from.y);
      return backwards ? { from: to, to: from } : { from: from, to: to };
    },

    /* How many whole units the ruled paper allows from where the count
       sets off — the same reach countOut clamps to, worked out from the
       same normalised direction. The control must not offer a number
       the board cannot draw: picking 8 where only four units of paper
       lie past the start drew four and then wrote "8 units" under it,
       which is the label telling the child something untrue. */
    paperSteps: function () {
      const pair = this.measurePair();
      if (!pair) return null;
      let from = pair.from, to = pair.to;
      if (to.x < from.x || (to.x === from.x && to.y < from.y)) {
        const swap = from; from = to; to = swap;
      }
      const dx = to.x - from.x, dy = to.y - from.y, span = Math.hypot(dx, dy);
      if (!span) return null;
      const ux = dx / span, uy = dy / span, P = C.GRID.paper;
      let reach = Infinity;
      if (ux > 0) reach = Math.min(reach, (P.gxTo   - from.x) / ux);
      if (ux < 0) reach = Math.min(reach, (P.gxFrom - from.x) / ux);
      if (uy > 0) reach = Math.min(reach, (P.gyTo   - from.y) / uy);
      if (uy < 0) reach = Math.min(reach, (P.gyFrom - from.y) / uy);
      return Math.max(1, Math.floor(reach + 1e-9));
    },

    /* Both numeric questions answer the same way now: the control
       closes, their number is counted out on the board, and only then
       does the verdict land. Split out because the two used to say the
       same thing twice with slightly different timing. */
    revealAnswer: function (v, right) {
      const t = this.task, self = this;
      const pair = this.measurePair();
      if (!pair) return;
      this.state = 'showing';
      if (Sel) Sel.lock();          // nothing to fiddle while it counts

      /* The verdict lands when the count does — and the count only
         sets off once she has finished asking for it. */
      const verdict = function () {
        if (right) {
          t.done = true;
          self.state = 'waiting';
          SFX.correct();
          /* Past the beats that teach it: they are for a child who did
             not get here. The choice path has had this since the café
             beat; a numeric question can want it just as much. */
          if (t.spec.rightAt != null) self.branch = t.spec.rightAt;
          /* A length they worked out, written on the side it belongs to
             and left there. A beat that measures three sides one at a
             time has to keep the ones already found — the board filling
             up in front of them IS the argument the last screen makes,
             and a length that arrives and leaves has made none of it. */
          if (t.spec.keepLength) self.writeLength(t);
          if (Sel) Sel.markCorrect();
          // nothing was walked out on the Pythagoras screens, so there
          // is no line from A to B to leave lit
          if (!t.spec.noCount) Board.litMeasure();
          /* Out of the number they just found. It used to come out of
             the far point — the end of the line — which is where the
             drawing finishes, not where the answer is: the child is
             looking at "4 units", and that is the thing that was got
             right. Worked out inside the beat rather than before it,
             so a length still arriving has landed by the time the
             confetti comes out of it; a screen that writes no total
             still gets the far point. */
          self.later(function () {
            const at = Board.totalSpot(t.spec.measureLeg) ||
                       Board.stagePos(pair.to.x, pair.to.y);
            SFX.cheer();
            SFX.confettiPop();
            FX.pop(at.x, at.y, 18);
            /* The praise — "That's correct!", heard where it is said. */
            /* And a found distance that is a journey: the fire engine goes. */
            self.rescue(t, 700);
            self.praise();
          }, 260);
          return;
        }
        /* Wrong: the count they asked for is on the board, so the miss
           is there to be seen — short of the point, or a unit past it.
           She says so, it is left up to be read, and then the board is
           handed back empty. */
        t.wrong++;
        SFX.wrong();
        FX.missGlow();
        if (Sel) Sel.markWrong();
        self.state = 'waiting';
        // the ladder is read after the count, not before: feedbackFor
        // indexes on how many have been got wrong, this one included
        /* Two misses in is where a child needs showing rather than
           telling: she names what is about to happen and the units
           between the points are laid out to be counted. The question
           stays theirs — the band is the help, not the answer. */
        const fb = self.feedbackFor(t);

        /* Or, once the ladder is spent, to the table the child fills
           (screen 30): she goes, the table comes out of the board's
           edge, and the working becomes theirs to do, one blank at a
           time — the question is answered when its last blank is. A
           screen with no ladder goes on its first miss; 30 says "try
           again" once, and goes on its second. */
        /* From 41b on it opens with "Oops! Let's find it together."
           (`oopsLine`), and the table is what it promises. */
        if (t.spec.tableOnMiss && Table && fb.exhausted) {
          if (Sel) Sel.lock();
          self.later(function () {
            self.oops(t, function () { self.runTable(C.SCRIPT[self.index] || {}); });
          }, 700);
          return;
        }

        /* Both hints spent. The answer is not asked for a fourth time,
           it is shown: the two sides measured on the board and then AB,
           which is the working itself rather than a sentence about it.
           The question is over, so nothing is cleared away after. */
        /* Out of hints, and the teaching is a beat of its own rather
           than a working written here. The asking stops and the screen
           hands over to it; she says so there, not here, because a
           child needs a moment to stop being wrong before they can
           start learning. */
        if (fb.exhausted && t.spec.teachAt != null) {
          t.done = true;
          self.state = 'waiting';
          if (Sel) Sel.lock();
          self.branch = t.spec.teachAt;
          self.later(function () { self.settle(C.AUTO.afterSilent); }, 520);
          return;
        }

        const helping = fb.exhausted && !!t.spec.countLine;
        const msg = helping ? t.spec.countLine : fb.msg;

        /* "Count carefully!" — and then they are counted. In that
           order.

           The count used to be started first and the sentence 320ms
           after it, so the first square was already lit while she was
           still asking for it, and the count played twice to make up
           for the words having arrived underneath the first pass.
           Nothing on the board moves until she has finished the
           sentence that introduces it.

           And then the beat is over. This was the only branch of a
           spent ladder that left the question armed, so a child who
           had just been shown the answer was asked for it again. */
        if (helping) {
          t.done = true;
          if (Sel) Sel.lock();
          self.later(function () {
            /* There is nothing left to press, so the reel and GO go as she
               says so — and she comes down off them onto the grass first,
               rather than being left standing on air. */
            self.later(function () { Bubble.open(msg, function () {
              self.closeAfterLine();
              self.later(function () {
                const counting =
                  Board.countUnits(pair.from, pair.to, self.later.bind(self));
                SFX.sparkle();
                self.later(function () {
                  /* The squares go first. Then, on the empty line, the
                     number they came to — so the count is read as a
                     count and its answer arrives as an answer, rather
                     than the two being on the board at once. */
                  Board.clearUnits();
                  Board.clearMeasure();
                  self.later(function () {
                    const real = Math.round(Math.hypot(
                      pair.to.x - pair.from.x, pair.to.y - pair.from.y));
                    const txt = real + '\u00A0unit' + (real === 1 ? '' : 's');
                    const ent = C.SCRIPT[self.index] || {};
                    if (t.spec.measureLeg != null) {
                      Board.showLegTotal(t.spec.measureLeg, real,
                                         pair.from, pair.to);
                    } else if (ent.segment) {
                      Board.showSegResult(ent.segment, txt);
                    }
                    SFX.chime();
                    /* And what it came to, said, once it is written: "So,
                       the distance is 3 units." (the horizontal and
                       vertical questions, 8-19) — her line then hands the
                       screen on. Otherwise it is left up to be read. */
                    if (t.spec.countedLine) {
                      self.later(function () { self.speak(t.spec.countedLine); }, 520);
                    } else {
                      self.later(function () { self.settle(C.AUTO.afterLine); },
                                 C.GRID.unitBox.holdMs);
                    }
                  }, 420);
                  /* The count has been held (count.holdMs) by the time this
                     runs: `counting` ends when its hold does. */
                }, counting);
              }, Bubble.voiceTail + 260);
            }); }, stowControl());
          }, 320);
          return;
        }

        self.later(function () {
          /* The count they asked for is on the board, short of the
             point or a unit past it, and that is the answer to what
             went wrong. Words or none, it is left up to be read and
             then taken away — the hold cannot ride on a line that may
             not exist, or the board would never clear and the control
             never come back. */
          self.finishWith(msg, C.AUTO.afterLine, function () {
            self.closeAfterLine();
            self.later(function () { self.clearWorking(); },
                       C.GRID.unitBox.holdMs);
          });
        }, 320);
      };

      /* Her line first, then the stroke. The two used to run together,
         so she was still saying "let's count the units" while the line
         was already two units along — the words described something
         that had already happened. Now the stroke sets off as she
         finishes, and the counting is the answer to what she just
         said. The short beat between is her voice tailing off.

         Queued through later(), so skipping the screen cancels the
         count along with everything else it had pending. */
      const run = function () {
        self.state = 'showing';
        /* A diagonal is the one length that cannot be counted off the
           grid, which is exactly what these screens are teaching. No
           line is walked out along AB; the verdict lands on its own. */
        if (t.spec.noCount) { verdict(); return; }
        Board.countOut(pair.from, pair.to, v, self.later.bind(self), verdict,
                       t.spec.measureLeg, right);
      };
      run();
    },

    /* The count goes and the control comes back, ready for another go. */
    clearWorking: function () {
      Board.clearUnits();
      Board.clearMeasure();
      if (Sel && !(this.task && this.task.done)) Sel.reset();
    },

    checkDistance: function (v) {
      const t = this.task;
      if (!t || t.done) return;

      /* How long the pair really is. It used to add the two steps, which
         is the length only along a row or a column (one of them is
         zero) — and 30 asks for a slanted AB outright, 6 across and 8
         down, which is 10, not 14. Whole, as the reel only has whole
         numbers. */
      const pair = this.measurePair();
      const d = pair ? Math.hypot(pair.to.x - pair.from.x, pair.to.y - pair.from.y) : null;
      const answer = t.spec.answer != null ? t.spec.answer
        : (d == null ? null : (Math.abs(d - Math.round(d)) < 1e-9 ? Math.round(d) : d));

      this.revealAnswer(v, v === answer);
    },

    /* A typed answer. The right answer is worked out from the board
       rather than trusted from config where it can be: the legs are
       measured off the two points, so a moved point cannot leave a
       stale answer behind. */
    checkEntry: function (v) {
      const t = this.task;
      if (!t || t.done) return;
      const entry = C.SCRIPT[this.index] || {};

      let answer = t.spec.answer;
      /* Which two points the question is about. Ordinarily the pair
         itself; on a screen that asks for one SIDE of a triangle, that
         side — or every side of a three-sided shape would be checked
         against the length of the one the board happens to call its
         segment. */
      const leg = t.spec.measureLeg != null && (entry.legs || [])[t.spec.measureLeg];
      const ends = leg ? { a: leg.from, b: leg.to } : entry.segment;
      if (ends) {
        const a = ends.a, b = ends.b;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        // only whole answers are asked for, so a clean one wins
        if (Math.abs(d - Math.round(d)) < 1e-9) answer = Math.round(d);
      }

      this.revealAnswer(v, v === answer);
    },

    /* The measured length, written on the side it measures and left
       there. A leg keeps it in its own colour beside itself; the pair's
       own line writes it the way every other answered pair does. */
    writeLength: function (t) {
      const entry = C.SCRIPT[this.index] || {};
      const k = t.spec.measureLeg;
      if (k != null && (entry.legs || [])[k]) {
        /* placeLeg works the length out from the leg's own two ends, so
           it cannot disagree with what was just answered. */
        Board.placeLeg(k, Object.assign({}, entry.legs[k], { length: true }));
        Board.showLegLength(k);
        SFX.chime();
        return;
      }
      if (!entry.segment) return;
      const s = entry.segment;
      const d = Math.round(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
      Board.showSegResult(s, d + '\u00A0units');
      SFX.chime();
    },

    /* Nothing on the board starts until the sentence that introduces
       it has finished.

       A screen lists one entry per line it says, and each is played
       the moment that line is done. What this replaces is three
       parallel clocks: a count started 320ms before the sentence that
       asks for it, two sides lit at a flat 700 and 1600ms whatever she
       happened to be saying, and a third side timed off the length of
       the FIRST line — so on the Pythagoras beat AB lit 324ms into "we
       already know two of its sides", which is the sentence about the
       other two. A light read off the sentence it belongs to cannot
       land on a different one.

       Returns how long the light runs, so whatever comes next can wait
       it out rather than landing on top of it. */
    lightAfterLine: function (entry, n) {
      const L = ((entry || {}).lineLights || [])[n];
      if (!L) return 0;
      /* A light — and so the sentence after it — waits for AB to finish
         drawing over its dotted guide (drawGuide): AB first, then C and
         its side, one line at a time. Everything it sets going moves back
         by the wait, and so does whatever waits on it. */
      const self = this;
      /* Or her words put away first, and the light after them (22: "Let's
         explore." said, the balloon gone, and only then the dotted side
         out to C), so the drawing is watched rather than read over. Shut
         once the recording has finished rather than when its last word
         lands — closing stops her voice — and the light waits out the
         balloon's pop-out (.26s) and a breath after it. */
      const shut = L.closeFirst ? Bubble.voiceTail + 200 : 0;
      if (L.closeFirst) this.later(function () { Bubble.close(); }, shut);
      const wait = Math.max(0, (Board.guideUntil || 0) - performance.now(),
                            L.closeFirst ? shut + 260 + 180 : 0);
      const later = wait ? function (fn, t) { self.later(fn, (t || 0) + wait); }
                         : this.later.bind(this);
      const run = L.run || 1700;
      let ms = 0;
      /* A line can draw the screen's own SIDES, which is how a
         third point arrives because somebody said they would look for
         one rather than because the screen opened. The board's plotting
         step stands aside when a line has claimed them. */
      if (L.legs && (entry.legs || []).length) {
        Board.runLegs(entry.legs, later, function () {});
        ms = Math.max(ms, entry.legs.length * 1640);
      }
      /* There is no way to light a POINT here, on purpose: a beat
         names a side, and the side is what lights. `after` holds a
         side's light back for a beat that needs it. */
      /* The pair's own line, drawn now: a screen that puts up only the
         points (22) draws the line between them on the sentence about
         their distance. */
      if (L.join && Board.segLine && !Board.segLine.classList.contains('draw')) {
        later(function () { Board.segLine.classList.add('draw'); SFX.draw(); }, L.joinAt || 0);
        ms = Math.max(ms, (L.joinAt || 0) + 700);
      }
      /* `pulseAt` holds the glow back — until the line it glows round
         has been drawn, when the same light draws it. */
      if (L.pulse) ms = Math.max(ms, Board.pulseSides(later, L.pulseAt || 0, [].concat(L.pulse), run));
      /* Or a line that puts the board BACK — nothing singled out, so
         nothing stepped back either, and the whole drawing reads at
         once. `spotlightPart` hushes only when it is given a side to
         light, so handing it nothing is the way to say "all of it".

         This is not the same as lighting the third side: lighting AB
         would push the two legs the child just measured into the
         hush, and the point of that beat is the shape they add up to. */
      if (L.clear) {
        const at = L.after || 0;
        later(function () {
          /* And whatever the pair needed to be on the board, it has.
             This beat is the one that inherits the most — two measured
             legs and a pair drawn four screens ago — so it asserts
             rather than hopes. */
          Board.settlePair();
          Board.spotlightPart(null);
        }, at);
        ms = Math.max(ms, at + 420);
      }
      /* Or put the highlight away and nothing else — `clear` also
         asserts the pair, which would draw a dotted AB out solid. */
      if (L.unspot) {
        const at = L.after || 0;
        later(function () { Board.spotlightPart(null); }, at);
        ms = Math.max(ms, at + 420);
      }
      /* A line that asks a question and then waits. Nothing on the
         board moves; the beat simply stays open, because a question
         answered in the same breath was not a question. */
      if (L.hold) ms = Math.max(ms, L.hold);
      return ms + wait;
    },

    /* The feedback ladder: each wrong attempt gets the next message,
       and once they run out the worked solution is shown rather than
       leaving a child guessing. A task with a single tryAgainLine
       behaves as a one-rung ladder. */
    feedbackFor: function (t) {
      const list = t.spec.feedback ||
                   (t.spec.tryAgainLine ? [t.spec.tryAgainLine] : []);
      return { list: list, msg: list[Math.min(t.wrong - 1, list.length - 1)],
               exhausted: t.wrong > list.length };
    },

    /* The table the CHILD fills (screen 29c). The same table as 28's —
       she flies out, the board slides left, the table opens out of its
       right edge — but this time nothing is carried in: the theorem is
       written, and every blank after it is theirs. One at a time, in
       reading order: tap it, two numbers drop down, pick one. Right
       settles it and moves on; wrong gives the red glow and shakes the
       tile it was, which stays — both numbers are there to choose from
       again. The triangle is left exactly alone throughout. */
    runTable: function (entry) {
      const self = this, T = C.GRID.table;
      if (!this.task || !Table) return;
      const lines = entry.task.formula || [];
      Bubble.close();
      /* She flies off first — unless she is not here to (39). */
      const leave = function (then) { if (self.birdAway()) then(); else self.flyOut(then); };
      this.later(function () {
        leave(function () {
          /* A question answered on the control first (30) has the
             control up: it goes with her. */
          if (Opts) Opts.hide();
          if (Sel) Sel.hide();
          /* A walk across the town keeps its town: the places and their
             points stay on the map while the working is done beside it. */
          if (Town && !entry.town) Town.hide();
          if (!entry.town) Board.clearFound();
          self.later(function () {
            self.slideBoard(T.board);
            self.later(function () {
              const B = T.board, left = B.x + B.w - T.tuck;
              /* Each side's name and numbers in that side's own colour,
                 read off the drawing: the first side of a walk is not
                 always the level one (the school walk goes down first). */
              Table.setColours(self.sideColours());
              Table.build(lines);
              drawRoots(Table.el);
              /* A table of letters (the general triangle) is wider than
                 one of numbers, and can ask for smaller type. */
              Table.el.style.setProperty('--ft-size', (entry.task.tableSize || T.size) + 'px');
              /* Higher than 28's, so there is room under it for her to
                 come back to and her balloon above her. Or its top edge
                 where the screen says (`tableTop`: 39, 41 — down the
                 middle of the room, for her to stand on). */
              Table.place({ x: left, w: C.STAGE_W - T.margin - left, cy: T.pickCy });
              Table.fit();
              Table.open();
              const topAt = entry.task.tableTop;
              if (topAt != null) Table.el.style.top = (topAt + Table.el.offsetHeight / 2) + 'px';
              SFX.sparkle();
              self.later(function () {
                /* The theorem: given. Written whole where its names say
                   nothing of where they come from (29c); carried in off
                   the triangle, a copy at a time, where they do (30) —
                   the way 28 wrote it. */
                const lead = lines[0] || {};
                const writeLead = function () {
                  let at = T.rowMs;
                  if (carries(lead)) at = self.carryRow(lead, 0, 0);
                  else { Table.writeRow(0); SFX.draw(); }
                  self.tableRow = 0;
                  return at;
                };
                const begin = function (at) {
                  const blanks = Table.blanks();
                  self.later(function () { self.nextBlank(lines, blanks, 0); }, at + 300);
                };
                const said = entry.task.tableLine;
                if (!said) { begin(writeLead()); return; }
                /* Or she comes back to the table to say what its first
                   line is (39, 41: "The distance between any two points
                   is:") — the line written as she gets to her last
                   word — and goes again, leaving the rest to the child. */
                const speakIt = function (away) {
                  let wrote = 0, done = false;
                  const once = function () { if (!done) { done = true; wrote = writeLead(); } };
                  self.state = 'speaking';
                  Bubble.onWord = function (w, n) {
                    if (n >= Bubble.words.length - 1) once();
                  };
                  Bubble.open(said, function () {
                    Bubble.onWord = null;
                    once();
                    self.later(function () {
                      Bubble.close();
                      away(function () { begin(0); });
                    }, Math.max(wrote, Bubble.voiceTail + 900));
                  });
                };
                /* Where she is only seen over the table (`peek`: 39, 41),
                   up from behind it, and back down after. */
                if (entry.peek) {
                  self.peekAt(function () {
                    speakIt(function (then) { Peek.leave(); self.later(then, 360); });
                  });
                  return;
                }
                const g = standGeom(C.BOARD.tableStand, {});
                self.geom = g;
                self.raised = false;
                standPose = !!g.stand;
                applyGeom(g);
                self.flyIn(function () {
                  FX.sparkles(g.aim.x, g.aim.y, 7, 170 * (g.scale || C.CHAR_SCALE));
                  speakIt(leave);
                });
              }, T.openMs);
            }, 760);
          }, 300);
        });
      }, 500);
    },

    /* One blank: its row comes up if it is not up yet, and it waits for
       the child. The right number is the one written in the part. */
    nextBlank: function (lines, blanks, n) {
      const self = this, t = this.task;
      if (!t) return;
      if (n >= blanks.length) {
        /* Rows after the last blank have nothing to ask — the square
           root the working ends on — so they are written in, carried
           where they carry something, and then the table is done. */
        const from = (this.tableRow || 0) + 1;
        let at = 0;
        for (let r2 = from; r2 < lines.length; r2++) {
          if (carries(lines[r2])) at = this.carryRow(lines[r2], r2, at);
          else {
            (function (row) { self.later(function () { Table.writeRow(row); SFX.draw(); }, at); })(r2);
            at += C.GRID.table.rowMs + 300;
          }
        }
        this.later(function () { self.tableDone(); }, at);
        return;
      }
      const r = blanks[n][0];
      /* A row's first blank brings the row — and any row before it that
         asks nothing (the axis cases write two lines of working between
         their blanks). Each is written whole, or — where a part in it
         says where it comes from, like the result's "AB" — as its
         skeleton with that part carried in off the triangle; and only
         then the blank. */
      if (r > (this.tableRow || 0)) {
        let at = 0;
        for (let r2 = (this.tableRow || 0) + 1; r2 <= r; r2++) {
          if (carries(lines[r2])) at = this.carryRow(lines[r2], r2, at);
          else {
            (function (row, when) {
              self.later(function () { Table.writeRow(row); SFX.draw(); }, when);
            })(r2, at);
            if (r2 < r) at += C.GRID.table.rowMs + 400;
          }
        }
        this.tableRow = r;
        if (at) { this.later(function () { self.askBlank(lines, blanks, n); }, at); return; }
      }
      this.askBlank(lines, blanks, n);
    },

    /* The blank itself: it waits for the child. The right number is the
       one written in the part. */
    askBlank: function (lines, blanks, n) {
      const self = this, T = C.GRID.table, t = this.task;
      if (!t) return;
      const r = blanks[n][0], k = blanks[n][1];
      const part = (lines[r].parts || [])[k] || {};
      /* The number written in the part — or, where the answer is not a
         number, the text the part names as its `answer`. */
      const m = String(part.t || '').match(/-?\d+(?:\.\d+)?/);
      const answer = part.answer != null ? String(part.answer) : (m ? parseFloat(m[0]) : NaN);
      Table.activate(r, k, function (v, tile) {
        if (t.done || self.task !== t) return;
        if (typeof answer === 'number' ? +v === answer : String(v) === answer) {
          Table.fill(r, k, v);
          SFX.tick(3);
          self.later(function () { self.nextBlank(lines, blanks, n + 1); }, T.restMs + 500);
        } else {
          t.wrong++;
          SFX.wrong();
          FX.missGlow();
          Table.reject(tile);
        }
      });
    },

    /* The last blank is in: she comes back, under the table, and says
       so — and the screen hands on as any answered question does. */
    tableDone: function () {
      const self = this, t = this.task;
      if (!t) return;
      t.done = true;
      /* A walk can hand on past the screens after it (the towers' table
         goes on to the station). */
      if (t.spec.rightAt != null) this.branch = t.spec.rightAt;
      /* An axis case ends on its answer shown as the answer: the last
         blank goes green, so does the line it measures, and both points
         sparkle as she says so. */
      /* The line it ends on, on the green — the whole of it, "d =" and
         all, on every table (it was the last blank alone, and only on
         the axis cases). */
      const lastRow = (t.spec.formula || []).length - 1;
      if (Table && lastRow >= 0) Table.markRow(lastRow);
      const AXd = axisOf(C.SCRIPT[this.index] || {});
      if (AXd) {
        if (Board.segLine) Board.segLine.classList.add('good');
        [AXd.a, AXd.b].forEach(function (p, n) {
          self.later(function () {
            const at = Board.stagePos(p.x, p.y);
            FX.sparkles(at.x, at.y, 10, 90);
            SFX.sparkle();
          }, 500 + n * 260);
        });
      }
      const scr = C.SCRIPT[this.index] || {};
      if (!scr.peek) {
        const g = standGeom(C.BOARD.tableStand, {});
        this.geom = g;
        this.raised = false;
        standPose = !!g.stand;
        applyGeom(g);
      }
      /* What it came to goes onto AB first; then she comes in to say so.
         Or she comes up from behind the table to say what it gives (the
         axis cases, `peek`). Or, where the table says nothing
         (`correctLine: false` — 35), it is left to be read for a moment,
         green, and handed on without her. */
      this.flyResultOut(t.spec.formula, function () {
        self.later(function () {
          /* Its answer alone, grown into the room (`peek.grow`), and then
             her — after a moment on the green. */
          if (scr.peek) {
            self.later(function () {
              const G = scr.peek.grow;
              if (!G || !Table) { self.peekUp(scr); return; }
              const at = Table.only(lastRow, scr.peek.name) + 80;
              self.growTable(G, C.GRID.table.board, at, function () { self.peekUp(scr); });
            }, 900);
            return;
          }
          if (t.spec.correctLine === false) {
            self.settle(scr.hold != null ? scr.hold : C.AUTO.afterCorrect);
            return;
          }
          /* A walk worked on the table after a miss ends on the answer
             put back into its story (`workedLine`: "So, the fire engine
             needs to travel 13 units."), and otherwise on the praise
             (heard only where CFG.PRAISE_AT says). */
          self.flyIn(function () {
            if (t.spec.workedLine) self.speak(t.spec.workedLine, function () { self.rescue(t, 250); });
            else self.praise(function () { self.rescue(t, 250); });
          });
        }, 200);
      });
    },

    /* The rescue (54): the fire engine drives the line the child has
       just measured and puts the fire out (Board.fireRescue). The screen
       is the engine's until it has finished — `writing` holds the hand-
       over, as a working does — and then it moves on. */
    rescue: function (t, delay) {
      const self = this;
      if (!t || !t.spec.rescue) return false;
      this.writing = true;
      this.later(function () {
        const ms = Board.fireRescue(t.spec.rescue);
        self.later(function () {
          self.writing = false;
          self.settle(C.AUTO.afterLine);
        }, ms + 200);
      }, delay || 0);
      return true;
    },

    /* The camera, on a drawing this screen is ABOUT to make — after the
       grid has filled, before a single point is drawn. The pair is
       PLACED and not drawn: `viewFor` reads where the drawing will be,
       not what can be seen of it, so the push frames the whole new
       triangle rather than whatever the last screen left on the board.

       Pushed outright, never by name. Two screens can ask for the same
       view of two different triangles, and the name-based "already
       there" in goTo would leave the second framed on the first — which
       is how 29 opened on 28's corner of the paper with its own point A
       cut off at the board's edge. Returns how long to wait before
       drawing into it. */
    frameDrawing: function (entry) {
      if (!entry || !entry.view) return 0;
      if (entry.segment) Board.placeSegment(entry.segment);
      Board.viewName = entry.view;
      Board.viewTo(Board.viewFor(entry.view), C.GRID.zoom.ms);
      return C.GRID.zoom.ms + 140;
    },

    /* The working as a TABLE, for a screen whose triangle is to be
       left exactly as the child built it.

       She goes, as she does before any working. Then the board slides
       to the left — not to the middle — and the table opens out of its
       right edge like a drawer, so the paper reads as extended to the
       right. Then one thing at a time: a row's skeleton comes in, each
       name and number in it is lifted off the triangle as a copy and
       carried slowly to its slot, and what was worked out is written in
       place. Nothing on the triangle is lit, stepped back or moved. The
       answer stays in the table, and a copy of it is carried onto the
       side it measures (flyResultOut). */
    workAsTable: function (t, then) {
      const self = this, G = C.GRID, T = G.table;
      const lines = t.spec.formula || [];
      this.writing = true;                   // the screen is the working's now
      Bubble.close();
      if (Sel) Sel.lock();
      if (Opts) Opts.lock();

      this.later(function () {
        self.flyOut(function () {
          if (Opts) Opts.hide();
          if (Sel) Sel.hide();
          if (Town) Town.hide();
          Board.clearFound();
          /* 1 — the board to the left. */
          self.later(function () {
            self.slideBoard(T.board);
            /* 2 — the table out of its right edge. */
            self.later(function () {
              const B = T.board, left = B.x + B.w - T.tuck;
              Table.setColours(self.sideColours());
              Table.build(lines);
              drawRoots(Table.el);
              Table.el.style.setProperty('--ft-size', (t.spec.tableSize || T.size) + 'px');
              /* Up where 29c's sits when she is coming back under it
                 (35: she lands under it on the screen after). */
              Table.place({ x: left, w: C.STAGE_W - T.margin - left,
                            cy: t.spec.tableHigh ? T.pickCy : B.y + B.h / 2 });
              Table.fit();
              Table.open();
              SFX.sparkle();
              /* 3 — then the rows, one thing at a time. */
              self.later(function () { self.fillTable(lines, then); }, T.openMs);
            }, 760);
          }, 300);
        });
      }, 700);
    },

    /* The table's rows, in order: each row's skeleton, then each of its
       terms — a copy carried in from the triangle where the term was
       read off it, written in place where it was worked out. Strictly
       one after another; nothing overlaps. */
    fillTable: function (lines, then) {
      const self = this;
      let at = 0;
      lines.forEach(function (l, r) { at = self.carryRow(l, r, at); });
      /* Written, and then what it came to is carried onto the side it
         measures (flyResultOut) before the screen is handed on — its line
         on the green first, as a child's own answer's is. */
      self.later(function () {
        if (Table && lines.length) Table.markRow(lines.length - 1);
        const t0 = performance.now();
        self.flyResultOut(lines, function () {
          self.later(function () {
            self.writing = false;            // written; it can be handed on
            if (then) then();
          }, Math.max(0, C.AUTO.afterWorking - (performance.now() - t0)));
        });
      }, at);
    },

    /* One row of a table, from `at`: its skeleton, then each term in
       turn — a copy carried in off the triangle where the term was read
       from it, written in place where it was worked out. A blank is
       left for the child. Returns when the row is done. */
    /* The colour each side is drawn in right now: 'h' is the first
       side, 'v' the second, whichever way each runs. */
    sideColours: function () {
      const LG = C.GRID.leg, S = Board.legSlots || [];
      /* A side's own colour where it is on the board — a slot left from
         an earlier drawing still carries that drawing's colour. */
      const of = function (i, dflt) {
        const L = S[i];
        return (L && L.g && L.g.classList.contains('on') && L.line.getAttribute('stroke')) || dflt;
      };
      /* And the distance formula's x's and y's (distanceTable): the
         orange of a level side and the green of an upright one, always. */
      return { h: of(0, LG.hColor), v: of(1, LG.vColor), ab: '#1F6FD0',
               x: LG.hColor, y: LG.vColor };
    },

    carryRow: function (l, r, at) {
      const self = this, T = C.GRID.table, FT = window.FormulaTable;
      const cols = this.sideColours();
      const colourOf = function (p) { return cols[p.lit] || cols.ab; };
      self.later(function () { Table.showRow(r); SFX.draw(); }, at);
      at += T.rowMs;
      (l.parts || []).forEach(function (p, k) {
        if (FT.isOp(p.t)) return;                  // part of the skeleton
        if (p.offer) return;                       // the child's to fill
        if (!p.from && l.inline) return;           // so is an inline row's text
        if (p.from) {
          self.later(function () { self.liftInto(r, k, p, colourOf(p)); }, at);
          at += T.appearMs + T.pulseMs + T.travelMs + T.restMs;
        } else {
          self.later(function () { Table.write(r, k); SFX.tick(2); }, at);
          at += T.writeMs;
        }
      });
      return at;
    },

    /* One term, carried in. Its source is the thing on the triangle it
       stands for: the digits of a side's length where they are written,
       or the middle of a side for that side's name. With no source on
       the board it simply lands — the table is never left with a gap. */
    liftInto: function (r, k, p, colour) {
      const T = C.GRID.table, node = Table.target(r, k);
      const src = (p.from.leg != null) ? Board.digitSpot(p.from.leg, !!p.from.whole)
                                       : this.sourceSpot(p.from);
      if (!src || !node) { Table.land(r, k); return; }
      const text = src.text || window.FormulaTable.split(p.t).inner.trim();
      const st = el.stage.getBoundingClientRect(), sk = st.width / C.STAGE_W || 1;
      const b = node.getBoundingClientRect();
      const to = { x: (b.x + b.width / 2 - st.x) / sk,
                   y: (b.y + b.height / 2 - st.y) / sk,
                   size: parseFloat(getComputedStyle(node).fontSize) || T.size };
      SFX.tick(2);
      FX.liftAndFly(text, { x: src.x, y: src.y, size: src.size, rot: src.rot || 0 }, to, {
        color: colour, appearMs: T.appearMs, pulseMs: T.pulseMs,
        travelMs: T.travelMs, lift: T.lift
      }, function () { Table.land(r, k); SFX.blip(); });
    },

    /* What a table worked out, carried out of it onto the side it
       measures. The answer stays in the table; a copy lifts off it and
       flies to the place that side's length is written — the middle of
       AB, or of the side a question was about (59: CA) — turning to the
       side and taking on the label's size and colour as it goes, and
       the length is written there as it lands. So the working ends on
       the drawing, the way every number in it began there.

       The length is the last thing in the table's last row with a
       number in it, read from its "=" onward: "5 units", "√40 units",
       "13 units" out of "√169 = 13 units". A last row with no number
       (a formula in letters: 35, 39, 41) sends nothing. `then` runs
       once it has landed — or at once, if there was nothing to send. */
    flyResultOut: function (lines, then) {
      const self = this, T = C.GRID.table, entry = C.SCRIPT[this.index] || {};
      const done = function () { if (then) then(); };
      const r = (lines || []).length - 1, row = r >= 0 ? lines[r] : null;
      let k = -1;
      if (row) (row.parts || []).forEach(function (p, i) { if (/\d/.test(p.t || '')) k = i; });
      let text = k >= 0 ? String(row.parts[k].t).split('=').pop().trim() : '';
      /* Or the line says what it came to in so many words (`result`), and
         from which of its parts on it is written (`resultFrom`): "5 units"
         is a blank and a word, "√40 units" a root and a word. */
      if (row && row.result) {
        text = row.result;
        if (row.resultFrom != null) k = row.resultFrom;
      }
      const node = (Table && k >= 0) ? Table.target(r, k) : null;
      if (!node || !/\d/.test(text)) { done(); return; }

      /* Where it goes: the side the question asked for, or the pair. */
      const t = entry.task || {}, leg = t.measureLeg;
      const pair = entry.segment || Board.lastPlotted;
      let label, place, show;
      if (leg != null && (entry.legs || [])[leg] && Board.legSlots) {
        label = Board.legSlots[leg].len;
        place = function () {
          Board.placeLeg(leg, Object.assign({}, entry.legs[leg], { length: true }));
        };
        show = function () { Board.showLegLength(leg); };
      } else if (pair && pair.a && pair.b && Board.segRes) {
        label = Board.segRes;
        place = function () {
          Board.showSegResult(pair, text);
          Board.segRes.classList.remove('pop');          // written, not yet shown
        };
        show = function () { Board.segRes.classList.add('pop'); };
      }
      if (!label || label.classList.contains('pop')) { done(); return; }
      if (this.task) this.task.flewHome = true;
      /* Written in place now, unseen, so the copy flies to exactly where
         it will be read — and put up at once if the screen is left
         before it lands. */
      place();
      const landed = this.hold(function () { show(); SFX.chime(); });

      /* After a breath: the answer has just gone in, and the paper the
         last blank's tiles took is still going back (0.38s + 0.3s). */
      this.later(function () {
        const to = Board.textSpot(label, label.textContent || '');
        if (!to) { landed(); self.later(done, 300); return; }
        /* Off the answer's own words where they are a run of text
           ("13 units" at the end of "√169 = 13 units"), else off its cell —
           or, for a line that names its result, off everything from the
           part it starts at to the end of the line, a part inside a drawn
           root standing for the whole root. */
        let b = node.getBoundingClientRect();
        const want = text.replace(/\u00A0/g, ' ');
        if (row.result) {
          let l = Infinity, tp = Infinity, rt = -Infinity, bt = -Infinity;
          for (let i = k; i < (row.parts || []).length; i++) {
            const e = Table.target(r, i);
            if (!e) continue;
            const q = ((e.closest && e.closest('.rad')) || e).getBoundingClientRect();
            if (!q.width && !q.height) continue;
            l = Math.min(l, q.left); tp = Math.min(tp, q.top);
            rt = Math.max(rt, q.right); bt = Math.max(bt, q.bottom);
          }
          if (isFinite(l)) b = { x: l, y: tp, width: rt - l, height: bt - tp };
        }
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let n = row.result ? null : walker.nextNode(); n; n = walker.nextNode()) {
          const at = n.textContent.replace(/\u00A0/g, ' ').lastIndexOf(want);
          if (at < 0) continue;
          const range = document.createRange();
          range.setStart(n, at); range.setEnd(n, at + want.length);
          const rb = range.getBoundingClientRect();
          if (rb.width) b = rb;
          break;
        }
        const st = el.stage.getBoundingClientRect(), sk = st.width / C.STAGE_W || 1;
        const from = { x: (b.x + b.width / 2 - st.x) / sk, y: (b.y + b.height / 2 - st.y) / sk,
                       size: parseFloat(getComputedStyle(node).fontSize) || T.size };
        /* In the colour its number is written in there (a blank takes
           its side's colour; the words round it may not). */
        let tint = ((node.closest && node.closest('.rad')) || node).querySelector('.ft-num') || node;
        if (tint === node) {
          const digits = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          for (let n = digits.nextNode(); n; n = digits.nextNode()) {
            const host = n.parentElement;
            if (host && host.classList.contains('ft-sizer')) continue;   // sizing only, unseen
            if (/\d/.test(n.textContent)) { tint = host || node; break; }
          }
        }
        SFX.tick(2);
        FX.liftAndFly(want, from, { x: to.x, y: to.y, size: to.size, rot: to.rot }, {
          color: getComputedStyle(tint).color, toColor: label.getAttribute('fill'),
          appearMs: T.appearMs, pulseMs: 0, travelMs: T.travelMs, lift: 0
        }, function () {
          landed();
          SFX.sparkle();
          self.later(done, 600);
        });
      }, 750);
    },

    /* A formula, worked as a table grown out of the board's edge, with
       every number in it lifted off the triangle — which is left
       exactly alone. */
    workThrough: function (t, then) {
      if (!t.spec.formula || !t.spec.table || !Table) { if (then) then(); return; }
      this.workAsTable(t, then);
    },

    /* One of the answer options was pressed. The panel has already
       played its own verdict; this decides what she says. */
    checkChoice: function (right) {
      const t = this.task;
      if (!t || t.done) return;
      const self = this;

      if (right) {
        t.done = true;
        this.state = 'waiting';
        if (Opts) Opts.lock();
        /* Past the beats that teach it: they are for a child who did
           not get here. */
        if (t.spec.rightAt != null) this.branch = t.spec.rightAt;
        /* The closer place named: Maya walks there (42, 46) — and the
           screen is hers until she is inside and the door has shut, as
           the fire engine's is (rescue). Handed on at the praise's own
           pause, the screen went while she was still on her way. */
        if (t.spec.walkOnRight) {
          this.writing = true;
          this.later(function () {
            const ms = Board.mayaWalk(t.spec.walkOnRight.from, t.spec.walkOnRight.to);
            self.later(function () {
              self.writing = false;
              self.settle(C.AUTO.afterLine);
            }, ms + 200);
          }, 500);
        }
        SFX.correct();
        const at = this.optionSpot(t.spec.answer);
        this.later(function () {
          SFX.cheer();
          SFX.confettiPop();
          FX.pop(at.x, at.y, 16);
          /* The praise, heard where it is said: the panel has already
             played its own verdict. */
          self.praise();
        }, 260);
      } else {
        t.wrong++;
        SFX.wrong();
        FX.missGlow();
        /* Which is shorter (46): the map answers it. "Oops! Let's find
           it together." (`oopsLine`), and the two lengths come up on
           their lines and blink, and the cards stay live for another go. */
        if (t.spec.blinkOnMiss) {
          this.later(function () {
            self.oops(t, function () {
              if (t.spec.oopsLine) self.closeAfterLine(0);
              Board.blinkLengths();
            });
          }, 300);
          return;
        }
        const fb = this.feedbackFor(t);

        /* Two misses on a two-answer question is not a question any
           more: the method is not there to be used, and a third go is
           asking a child to guess. The asking stops here and the beat
           that teaches it takes over — she says so on that screen, not
           on this one, because a child needs a moment to stop being
           wrong before they can start learning. */
        if (fb.exhausted && t.spec.teachAt != null) {
          t.done = true;
          this.state = 'waiting';
          if (Opts) Opts.lock();
          this.branch = t.spec.teachAt;
          this.later(function () { self.settle(C.AUTO.afterSilent); }, 520);
          return;
        }

        /* Spent, with nothing to show and nowhere to send them: the
           last rung would otherwise be said a second time and the
           buttons left live, which is the third ask this game does not
           make. She names it herself and the beat moves on — the
           marker above has already put the evidence in the corner, so
           what she says is about something they can see. */
        if (fb.exhausted) {
          t.done = true;
          this.state = 'waiting';
          /* Not just locked — answered. Three live-looking buttons
             under a bird who has just said which one it is reads as a
             third go, so the panel says it too. */
          /* "Oops! Let's find it together." first, where the screen says
             it (61), and the card is shown with the reason. */
          if (Opts) { if (t.spec.oopsLine) Opts.lock(); else Opts.reveal(); }
          const told = t.spec.spentLine;
          this.later(function () {
            self.oops(t, function () {
              if (Opts && t.spec.oopsLine) Opts.reveal();
              if (told) self.speak(told, function () { self.settle(C.AUTO.afterLine); });
              else self.settle(C.AUTO.afterSilent);
            });
            /* after the marker above, never under it: she is naming a
               square that has to already be in the corner. */
          }, 900);
          return;
        }

        this.later(function () {
          if (t.spec.voiceOnly) self.sayOnly(fb.msg); else self.speak(fb.msg);
        }, 320);
      }
    },

    /* The two walks of a comparison (46). Whichever of them the
       board is holding stays exactly as it is — the walk just worked, or
       the pair the question was asked on — and its line is drawn solid
       over its guide and its length written on it. The other is drawn
       beside it, its ends not named a second time where something on the
       board already names them. Nothing that is already up moves. */
    compareWalks: function (entry, main) {
      const later = this.later.bind(this);
      const other = (entry.compare || []).filter(function (w) { return w !== main; })[0];
      /* Kept for a miss to write their lengths on (blinkLengths). */
      Board.compared = { main: main, other: other };
      const L = Board.segLine;
      const drawn = !!L && L.classList.contains('draw') &&
                    (parseFloat(getComputedStyle(L).strokeDashoffset) || 0) < 1;
      let at = 0;
      if (L && !drawn) {
        later(function () { L.classList.add('draw'); SFX.draw(); }, 240);
        // the dots under it go once it has covered them
        later(function () { if (Board.segDashG) Board.segDashG.classList.remove('draw', 'set'); }, 240 + 720);
        at = 240 + 720;
      }
      const R = main.result;
      if (R) later(function () { Board.showSegResult(main, R.text, R.dy, R.dx); SFX.chime(); }, at + 120);
      if (other) {
        const named = function (p) { return !!Board.dataAt(p.x, p.y) || !!Board.keyAt(p); };
        const ex = Object.assign({}, other, {
          a: Object.assign({}, other.a, named(other.a) ? { quiet: true } : {}),
          b: Object.assign({}, other.b, named(other.b) ? { quiet: true } : {}) });
        later(function () { Board.runExamples([ex], later); }, at + 520);
      }
    },

    /* A point was tapped. Without a task running this is just a
       friendly blip; with one, it is an answer. */
    tapPoint: function (gx, gy, node) {
      const t = this.task;
      const at = Board.stagePos(gx, gy);
      Hint.clear();          // they are answering; the hint has done its job

      if (!t || t.done) {
        SFX.blip();
        FX.ring(at.x, at.y, 70, 'rgba(90,180,225,.95)');
        return;
      }
      /* One answer at a time: for as long as the last wrong tap's red is
         showing, another tap is the same tap again. Counted, a double tap
         on a wrong dot was both tries at once, and the screen answered
         itself. */
      if (performance.now() < (t.quietUntil || 0)) return;
      if (gx === t.target.x && gy === t.target.y) this.answerRight(gx, gy, at);
      else this.answerWrong(node);
    },

    answerRight: function (gx, gy, at) {
      const t = this.task;
      t.done = true;
      this.state = 'waiting';

      SFX.correct();
      Board.solve(gx, gy);                       // highlighters clear, point labelled
      FX.ring(at.x, at.y, 150, 'rgba(70,200,95,.95)');
      FX.starBurst(at.x, at.y, 12, 170);

      const self = this;
      this.later(function () {
        SFX.cheer();
        SFX.confettiPop();
        FX.pop(at.x, at.y, 18);
        self.praise();
      }, 260);
    },

    /* The middle of one of the answer buttons, worked out from the
       panel's own geometry rather than measured off the page: the
       buttons are a fixed stack, and this has to be right whether or
       not the browser has laid them out yet. */
    optionSpot: function (key) {
      /* Off the button itself where it is laid out — cards side by side
         (46) are not where a stack of buttons would put them. */
      const btn = Opts && Opts.el && Opts.el.querySelector('.triangle-option[data-key="' + key + '"]');
      if (btn) {
        const r = btn.getBoundingClientRect(), st = el.stage.getBoundingClientRect();
        const sk = st.width / C.STAGE_W || 1;
        if (r.width) return { x: (r.left + r.width / 2 - st.left) / sk, y: (r.top + r.height / 2 - st.top) / sk };
      }
      const O = C.BOARD.options, k = O.scale;
      const entry = C.SCRIPT[this.index] || {};
      const list = entry.options || [];
      let n = 0;
      for (let i = 0; i < list.length; i++) if (list[i].key === key) n = i;
      const BORDER = 9, PAD_TOP = 28, BTN = 108, GAP = 24;
      return {
        x: O.pos.x + (O.w / 2) * k,
        y: O.pos.y + (BORDER + PAD_TOP + n * (BTN + GAP) + BTN / 2) * k
      };
    },

    answerWrong: function (node) {
      const t = this.task;
      t.quietUntil = performance.now() + 600;   // the red flash
      t.wrong++;
      SFX.wrong();
      FX.missGlow();
      Board.reject(node);
      Hint.again();          // point it out again, from the top

      const self = this;
      if (t.wrong >= (t.spec.maxWrong || 2)) {
        // she shows the answer herself rather than letting them flounder
        t.done = true;
        this.later(function () {
          Board.solve(t.target.x, t.target.y);
          const at = Board.stagePos(t.target.x, t.target.y);
          FX.ring(at.x, at.y, 150, 'rgba(70,200,95,.9)');
          FX.sparkles(at.x, at.y, 8, 120);
          SFX.chime();
          /* Shown, not told. With no sentence pointing at it, the board
             has to stay up long enough to be read — which is the pause
             a worked solution gets, not the one a right answer gets. */
          self.finishWith(t.spec.revealLine, C.AUTO.afterReveal);
        }, 620);
      } else {
        this.later(function () {
          self.finishWith(t.spec.tryAgainLine, null,
                          function () { self.closeAfterLine(); });
        }, 260);
      }
    },

    /* Tapping the scene: first tap finishes the line, second moves on. */
    /* A tap on the field: finish the line she is saying, or move on.
       settle() puts every screen into `waiting`, including one whose
       question is still open — it only holds back the automatic hand-
       over — so a tap anywhere on the grass used to carry the player
       straight past the thing they had just been asked. The question
       belongs to them until they answer it; tapping the field is not an
       answer. Next still goes through, because that button is the
       deliberate way out and says so. */
    advance: function () {
      if (this.state === 'speaking') { Bubble.skip(); return; }
      if (this.state !== 'waiting') return;
      const entry = C.SCRIPT[this.index] || {};
      if (entry.task && !(this.task && this.task.done)) return;
      this.skipScreen();
    },

    /* Which way there is left to go. The first screen has nothing
       behind it and the last nothing ahead, and a button with nowhere
       to take you should say so rather than swallow the tap. */
    syncNav: function () {
      if (el.backBtn) el.backBtn.disabled = this.index <= 0 || this.state === 'start';
      if (el.nextBtn) el.nextBtn.disabled = this.index + 1 >= C.SCRIPT.length;
    },

    /* Back one screen, on the same footing as Next: whatever was in
       flight is cancelled and the screen is played again from the top.
       It replays rather than restores — a screen is a performance, not
       a saved state, and half of them are built by the one before. */
    /* The one way a person moves the game — Next, Back and the picker
       all come through here. One change at a time: while one is on its
       way (the beat in which the button pops and the balloon closes), a
       second is ignored rather than racing it — a pick made just after
       Next used to be overridden by Next's own timer. Where it is going
       is fixed when it is asked for, never read when the timer fires. */
    change: function (to, o) {
      const self = this;
      o = o || {};
      if (this.busy || this.state === 'start') return false;
      if (to == null || to < 0 || to >= C.SCRIPT.length) return false;
      this.busy = true;
      this.clearPending();                  // stop the entrance and any queued step
      el.nextBtn.classList.remove('ready');
      if (!o.quiet) { SFX.pop(); Bubble.close(); }
      setTimeout(function () {
        self.busy = false;
        self.goTo(to);
      }, o.delay != null ? o.delay : 280);
      return true;
    },

    /* Back lands on a screen that stays. A beat that moves on by itself
       (`auto` — 4, where she flies out) would carry Back straight back
       to the screen it was pressed on, and Back would seem to do
       nothing; it is stepped over. */
    backIndex: function () {
      let j = this.index - 1;
      while (j > 0 && (C.SCRIPT[j] || {}).auto) j--;
      return j;
    },

    backScreen: function () {
      if (this.busy || this.state === 'start') return;
      if (this.index <= 0) return;          // first screen: nothing behind it
      this.change(this.backIndex());
    },

    /* The Next button: always available, always jumps straight to the
       next screen — mid-flight or mid-sentence, it does not matter. */
    skipScreen: function () {
      if (this.busy || this.state === 'start') return;
      /* Whatever the answer branched to, Next goes there as well —
         pressing it must never walk a child who got it right into the
         beats that exist to teach a child who did not. */
      const to = this.nextIndex();
      if (to >= C.SCRIPT.length) { this.ended(); return; }   // nothing follows: over
      this.change(to);
    },

    /* The picker: the same guarded change, straight away and without
       the button's pop — it has its own. */
    jumpTo: function (i) { this.change(i, { delay: 0, quiet: true }); },

    /* The last screen has said its last line, or Next was pressed on it:
       the lesson is over. Said once, as an event on the window, for
       whatever the page sits inside to act on — js/embed.js passes it to
       the page around an <iframe> (the Climb Game, which opens the
       lesson at its first broken road). On its own the game simply
       rests on its last screen, as it always has. */
    over: false,
    ended: function () {
      if (this.over) return;
      this.over = true;
      window.dispatchEvent(new CustomEvent('lesson:end', { detail: { screens: C.SCRIPT.length } }));
    }
  };

  /* ---------------- input ---------------- */
  function bind() {
    // Any first touch unlocks audio (browsers block it until then).
    const unlock = function () { SFX.unlock(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    el.playBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      SFX.unlock();
      /* Inside the tap: the one moment every browser agrees sound is
         allowed, so her voice's player is started here (voice.js). */
      if (window.Voice && window.Voice.prime) window.Voice.prime();
      Game.begin();
    });
    el.playBtn.addEventListener('pointerenter', function () { SFX.blip(); });

    el.nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Game.skipScreen();
    });
    el.nextBtn.addEventListener('pointerenter', function () { SFX.blip(); });

    // the same way on, in the corner (37, 39, 41)
    el.goOn.addEventListener('click', function (e) {
      e.stopPropagation();
      Game.skipScreen();
    });
    el.goOn.addEventListener('pointerenter', function () { SFX.blip(); });

    el.backBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Game.backScreen();
    });
    el.backBtn.addEventListener('pointerenter', function () {
      if (!el.backBtn.disabled) SFX.blip();
    });

    // Tapping the scene skips typing or moves to the next line.
    el.scene.addEventListener('click', function () { Game.advance(); });
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (Game.state === 'start') {
          /* The key is the gesture that lets her speak, as the tap on
             Play is (voice.js). */
          if (startReady) { SFX.unlock(); if (window.Voice && window.Voice.prime) window.Voice.prime(); }
          Game.begin();
        } else Game.advance();
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        Game.backScreen();
      }
    });
  }

  /* ---------------- preload ----------------
     Everything the game shows or says is fetched before Play is offered
     (js/preload.js), and the bar in the Play button's place says how
     far it has got. The fonts are waited for by name as well: bubble
     text is sized by measurement, so the real face has to be in before
     anything gets measured. */
  let startReady = false;          // Play offered: every file fetched, she has landed
  function preload(done) {
    let fontsReady = false;
    /* And every label measured before the real face arrived was
       measured against the fallback's metrics, so those go. */
    const fontDone = function () {
      if (fontsReady) return;
      fontsReady = true;
      Board.forgetTextMetrics();
    };
    /* The three faces, asked for BY NAME. `document.fonts.ready` waits
       only for faces something on the page is already using, and at
       boot that is the title screen's alone: Nunito and Poppins were not
       even requested until her first line. The timeout is only there so
       a damaged file can never hold the game up. */
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('600 32px Nunito', 'Aa1√₁₂'),
        document.fonts.load('32px "Lilita One"', 'Aa1'),
        document.fonts.load('700 34px Poppins', 'Aa1')
      ]).then(fontDone, fontDone);
      setTimeout(fontDone, 4000);
      /* A face that turns up after the game has started — it should
         never happen with the files local, but if it does, nothing may
         stay measured in the face it replaced. */
      if (document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', function () {
          if (!fontsReady) return;       // the wait above is handling it
          Board.forgetTextMetrics();
          if (Board.built) Board.remeasure();
        });
      }
    } else { fontsReady = true; }
    /* Which copy of the game this is, where it can be read off before
       Play. */
    if (el.loadVer) el.loadVer.textContent = versionText();

    /* What the title screen needs first — the faces, its own picture,
       the Play button, Swifty's two flying sheets — and then everything
       else, which the loader takes smallest-first. Every address exactly
       as it will be asked for. */
    const A = C.ART, M = window.ASSET_MANIFEST || {};
    /* The faces, loaded by the page itself (css/fonts.css) and counted in
       as each arrives: which text to ask for, per file. */
    const FACE = {
      'lilita-one-latin': ['32px "Lilita One"', 'Aa1'],
      'nunito-600-latin': ['600 32px Nunito', 'Aa1'],
      'nunito-600-math': ['600 32px Nunito', '\u221A\u2081\u2082'],
      'poppins-700-latin': ['700 34px Poppins', 'Aa1'],
      'swifty-math': ['italic 32px "Swifty Math"', 'xyd\u2081\u2082']
    };
    const fonts = Object.keys(M).filter(function (f) { return /\.woff2$/.test(f); })
      .map(function (f) {
        const face = FACE[f.split('/').pop().replace(/\.woff2$/, '')];
        return { url: C.stamp(f), load: face && document.fonts && document.fonts.load
          ? function () { return document.fonts.load(face[0], face[1]); } : function () {} };
      });
    const first = fonts.concat([A.startScreen, A.playButton, A.swiftyFly, A.swiftyTalk]
      .map(function (u) { return { url: u, pic: true }; }));
    const rest = Object.keys(A).map(function (k) { return { url: A[k], pic: true }; })
      .concat((window.Voice ? window.Voice.urls() : []).map(function (u) { return { url: u }; }))
      .concat([{ url: C.AUDIO.musicSrc }]);
    const bar = function (f) {
      const pct = Math.floor(f * 100);
      el.loadFill.style.width = (f * 100).toFixed(1) + '%';
      el.loadPct.textContent = pct + '%';
      el.loadBar.setAttribute('aria-valuenow', String(pct));
    };
    Preload.start(first, rest, bar, function () {
      /* Arrived: what the game reads later reads the local copies, and
         the two pictures a stylesheet draws are pointed at them too —
         but only at a local copy. A blob: address is absolute; the
         ordinary one is not, and a relative url() in a custom property
         is resolved against the stylesheet that uses it (css/), not the
         page (see css/number-selector.css), so without a copy the
         stylesheets keep their own. */
      const local = function (prop, u) {
        const best = Preload.url(u);
        if (best !== u) document.documentElement.style.setProperty(prop, 'url("' + best + '")');
        return best;
      };
      A.buttons = local('--sheet', A.buttons);
      A.tile = local('--ft-tile', A.tile);
      Object.keys(A).forEach(function (k) { A[k] = Preload.url(A[k]); });
      C.TOWN.sheet.src = Preload.url(C.TOWN.sheet.src);
      const wait = function () {
        if (fontsReady) setTimeout(done, 240);
        else setTimeout(wait, 80);
      };
      wait();
    });
  }

  /* A control wants the bottom of her column, so she moves up out of
     its way as it arrives — she is not drawn in a different place, she
     travels there, which is why the move carries a transition and why
     her line has to be re-fitted afterwards (re-seating the rig resets
     the balloon to its default size). */
  /* She hops up to her raised spot on the wing rather than sliding
     there: the fly sheet, an arc that carries her up and out over the
     board before she settles back, and the standing artwork swapped
     back in the moment she lands. Driven frame by frame rather than by
     a CSS transition, because the sprite window is re-seated on every
     frame of the sheet and a transition on it would fight that. */
    /* The lift is what makes it a flight rather than a lift shaft: she
     has to rise past the perch and settle back onto it. */
  const FLIGHT_MS = 820, FLIGHT_BULGE = 230, FLIGHT_LIFT = 250;

  function flyTo(p0, p1, s0, s1) {
    if (Game.landFlight) Game.landFlight(true);

    el.standSwifty.classList.add('hidden');
    el.birdWin.classList.remove('hidden');
    el.birdRig.classList.remove('fly-in', 'pre-entrance', 'rising');
    el.shadow.classList.add('lifted');
    Sprite.play('fly', true);
    Sprite.setScale(s0);
    el.birdRig.style.left = p0.x + 'px';
    el.birdRig.style.top = p0.y + 'px';

    SFX.flap();
    const flapper = setInterval(SFX.flap, 165);

    /* A quadratic curve through a control point out to her right and
       above the straight line, so she leaves the ground on a proper arc
       instead of rising like a lift. */
    const cx = (p0.x + p1.x) / 2 + FLIGHT_BULGE;
    const cy = (p0.y + p1.y) / 2 - Math.max(FLIGHT_LIFT, Math.abs(p1.y - p0.y) * 0.9);
    const t0 = performance.now();

    const land = function (silent) {
      cancelAnimationFrame(Game.flight);
      clearInterval(flapper);
      Game.flight = null;
      Game.landFlight = null;
      Sprite.stopAt('talk', 0);
      Sprite.setScale(s1);
      el.birdRig.style.left = p1.x + 'px';
      el.birdRig.style.top = p1.y + 'px';
      el.birdWin.classList.add('hidden');
      el.standSwifty.classList.remove('hidden');
      if (!silent) SFX.land();
    };
    Game.landFlight = land;

    const step = function (now) {
      const t = Math.min(1, (now - t0) / FLIGHT_MS);
      // ease out: she pushes off hard and feathers into the landing
      const e = 1 - Math.pow(1 - t, 2.2), u = 1 - e;
      el.birdRig.style.left = (u * u * p0.x + 2 * u * e * cx + e * e * p1.x) + 'px';
      el.birdRig.style.top  = (u * u * p0.y + 2 * u * e * cy + e * e * p1.y) + 'px';
      Sprite.setScale(s0 + (s1 - s0) * e);
      if (t < 1) Game.flight = requestAnimationFrame(step);
      else land();
    };
    Game.flight = requestAnimationFrame(step);
    return land;
  }

  /* Where she stands once a control is up: on its top edge, a little
     smaller, with no ground shadow. A screen that inherits the control
     inherits this too, so it is written once. */
  function controlGeom(kind) {
    /* Whichever control is actually under her. They are not all built
       the same: the reel's painted top and the answers' are 30 units
       apart, so one seat for both left her standing inside one of
       them. A control that carries its own `stand` is trusted over
       the general one. */
    const own = kind && C.BOARD[kind] && C.BOARD[kind].stand;
    return standGeom(own || C.BOARD.standUp, {
      noShadow: true,        // she is standing on the control, not on grass
      panelBox: { x: C.BOARD.panel.pos.x, y: C.BOARD.panel.pos.y,
                  w: C.BOARD.panel.w, h: C.BOARD.panel.h }
    });
  }


  function revealControl(entry) {
    const g = controlGeom(entry && entry.options ? 'options' : null);
    /* Where she is now, before the new rig overwrites it: the flight
       starts from her feet rather than from wherever the last screen
       happened to leave the rig. */
    const from = Game.geom || {};
    const p0 = { x: parseFloat(el.birdRig.style.left) || 0,
                 y: parseFloat(el.birdRig.style.top) || 0 };
    const s0 = from.scale || C.CHAR_SCALE;
    Game.geom = g;
    Game.raised = true;

    /* Up on the wing before the new rig is seated: applyGeom() moves
       her standing artwork to where she is going, so it has to be off
       screen by then or it lands there a frame early.
       The balloon travels with her; her artwork does not — she flies. */
    flyTo(p0, { x: g.anchor.x, y: g.anchor.y }, s0, g.scale);
    el.bubble.classList.add('rising');
    applyGeom(g);
    /* Re-seating the rig resets the balloon to its default size, so the
       line is re-fitted — and then written back, because fitBox() blanks
       the line after measuring it (it normally runs just before the text
       is typed in, where leaving it empty is the point). */
    Bubble.fitBox(Bubble.full);
    /* She is carrying a line she has already said — put it back as it
       was, rather than letting it arrive again. */
    Bubble.restore(Bubble.full);
    /* Both steps belong to this screen: queued through later() so a
       screen change cancels them — as raw timers they went on to show
       or hide this screen's control on whichever screen came next — and
       the balloon's `rising` put back either way, or the next screen's
       balloon would glide across the frame to its seat. */
    Game.later(Game.hold(function () { el.bubble.classList.remove('rising'); }), 720);

    /* The control rises into the space she has just left and is settled
       before she comes down on it: it arrives, then she lands on it. */
    Game.later(function () {
      if (Sel) {
        if (entry.distance || entry.entry) {
          Sel.reset();
          Sel.show(true);        // rising, since she is coming down on it

        } else Sel.hide();
      }
      if (Opts) {
        if (entry.options) { Opts.reset(); Opts.show(true); } else Opts.hide();
      }
    }, 150);
  }

  /* revealControl the other way round: the control sinks away, and if
     she was standing on it she flies back down to the grass it stood
     on. Returns how long that takes, so whatever she says next waits
     for her to land. */
  function stowControl() {
    if (Sel) Sel.hide(true);                 // sinking
    if (!Game.raised) return 0;
    const g = geomFor(Game.index);
    const from = Game.geom || {};
    const p0 = { x: parseFloat(el.birdRig.style.left) || 0,
                 y: parseFloat(el.birdRig.style.top) || 0 };
    Game.geom = g;
    Game.raised = false;
    standPose = !!g.stand;
    flyTo(p0, { x: g.anchor.x, y: g.anchor.y }, from.scale || C.CHAR_SCALE, g.scale);
    el.bubble.classList.add('rising');
    applyGeom(g);
    Game.later(Game.hold(function () { el.bubble.classList.remove('rising'); }), 720);
    return FLIGHT_MS;
  }

  /* ---------------- the hint ----------------
     For a child who has stopped on a locate screen: the point they are
     looking for starts pulsing on its own a beat after she has finished
     asking, and keeps going until it is found. That is the whole of it
     — a hand used to come down and tap the point as well, which was
     more help than the moment needs and put a cursor on a screen the
     child is meant to be reading. */
  const Hint = {
    pulseT: null, nudgeT: null, dot: null, target: null, hand: null,

    /* The hand, built the first time it is wanted and kept after — it
       is one image that only ever moves. */
    palm: function () {
      if (this.hand) return this.hand;
      const D = C.GRID.dot;
      const img = document.createElement('img');
      img.id = 'nudge';
      Preload.adopt(img, C.ART.handNudge);
      img.alt = '';
      img.width = D.nudgeSize;
      img.height = D.nudgeSize;
      // the tap pivots on the fingertip, wherever that is in the file
      img.style.transformOrigin = (D.nudgeTip.x * 100).toFixed(1) + '% ' +
                                  (D.nudgeTip.y * 100).toFixed(1) + '%';
      el.scene.appendChild(img);
      this.hand = img;
      return img;
    },

    dropHand: function () {
      clearTimeout(this.nudgeT);
      this.nudgeT = null;
      if (this.hand) this.hand.classList.remove('on');
    },

    /* The rest of the board going still, or coming back to life. */
    hush: function (on) {
      if (Board.dotGroup) Board.dotGroup.classList.toggle('hushed', !!on);
    },

    clear: function () {
      clearTimeout(this.pulseT);
      this.pulseT = null;
      this.target = null;
      this.dropHand();
      this.hush(false);            // the others may breathe again
      if (this.dot) { this.dot.classList.remove('hint'); this.dot = null; }
    },

    /* Only screens with one right place to point at arm it. */
    arm: function (target) {
      const t = target || this.target;
      this.clear();
      if (!t) return;
      this.target = t;
      const self = this;

      this.pulseT = setTimeout(function () {
        const dot = Board.dots.filter(function (d) {
          return Number(d.dataset.gx) === t.x && Number(d.dataset.gy) === t.y;
        })[0];
        if (!dot) return;
        self.dot = dot;
        dot.classList.add('hint');
        self.hush(true);           // and everything else goes quiet
        SFX.blip();

        /* And a hand, for a moment. The image hangs from its fingertip,
           so the finger lands on the point and the rest of the hand
           falls away below and right of it, clear of what it is
           pointing at. */
        const D = C.GRID.dot, at = Board.stagePos(t.x, t.y);
        const hand = self.palm();
        hand.style.left = (at.x - D.nudgeSize * D.nudgeTip.x) + 'px';
        hand.style.top  = (at.y - D.nudgeSize * D.nudgeTip.y) + 'px';
        hand.classList.remove('on');
        void hand.offsetWidth;
        hand.classList.add('on');
        self.nudgeT = setTimeout(function () { self.dropHand(); }, D.nudgeMs);
      }, C.GRID.dot.hintAfter);
    },

    // after a wrong tap the point speaks up again, from the top
    again: function () { if (this.target) this.arm(this.target); }
  };

  /* ---------------- title screen ---------------- */
  /* Cancellers for the title screen's wind and leaves, run when the
     game starts: #startScreen is taken out of the layout then, and
     without this its weather would keep spawning into a hidden box. */
  const stopWeather = [];

  /* She flies in from off-stage left and perches on the rock before the
     Play button is offered. Runs silent on purpose: the audio context
     is still suspended until the first gesture, so anything scheduled
     here would either be dropped or land all at once the moment Play
     is pressed. */
  const StartBird = {
    arrivedSilent: false,

    /* Called the first time a gesture authorises audio. If she flew in
       unheard and is still sitting on the rock, she calls once now —
       not a replayed entrance, just the bird you watched land finally
       making a sound. */
    greetIfUnheard: function () {
      if (!this.arrivedSilent) return;
      if (el.startScreen.classList.contains('hidden')) return;
      this.arrivedSilent = false;
      setTimeout(function () { SFX.birdCall(0.9); }, 140);
    },

    setup: function () {
      const S = C.START;
      Preload.adopt(el.startFly, C.ART.swiftyFly);
      Preload.adopt(el.startTalk, C.ART.swiftyTalk);
      StartSprite.setup(el.startBirdWin,
        { fly: el.startFly, talk: el.startTalk }, S.scale);
      // the rig origin is her belly anchor; the flight moves it
      el.startBird.style.left = S.anchor.x + 'px';
      el.startBird.style.top = S.anchor.y + 'px';
      el.startShadow.style.width = S.shadow.w + 'px';
      el.startShadow.style.height = S.shadow.h + 'px';
      el.startShadow.style.left = (S.perch.cx - S.shadow.w / 2) + 'px';
      el.startShadow.style.top = (S.perch.feetY - S.shadow.h / 2) + 'px';
    },

    arrive: function (done) {
      const S = C.START;
      StartSprite.play('fly', true);
      el.startBird.classList.remove('pre-flight');
      el.startBird.classList.add('flying');

      // a wingbeat every few frames of the approach; she glides the last bit
      let beats = 0;
      const flapper = setInterval(function () {
        SFX.flap();
        if (++beats > 11) clearInterval(flapper);
      }, 175);
      /* She calls once on her way in — around the point the arc brings
         her into frame — and again as she settles on the rock. */
      const calls = [setTimeout(function () { SFX.birdCall(1); }, 640),
                     setTimeout(function () { SFX.birdCall(0.75); }, 1560)];

      let settled = false;
      const land = function () {
        if (settled) return;
        settled = true;
        el.startBird.removeEventListener('animationend', land);
        el.startScreen.removeEventListener('click', skip);
        clearInterval(flapper);
        calls.forEach(clearTimeout);        // a skipped flight loses its calls
        StartSprite.stopAt('talk', 0);      // wings in, standing pose
        el.startShadow.classList.add('down');
        /* Dust off the crown as she puts her feet down. Heavier than a
           hop in the game: she has just come out of a long glide, and
           this is the moment the flight stops being weightless. */
        FX.puff(S.perch.cx, S.perch.feetY - 6, 1.5);
        SFX.land();
        setTimeout(function () { SFX.birdCall(0.85); }, 260);
        /* A cold load has had no gesture yet, so the browser blocked
           all of that and her whole arrival was silent. Remember it, so
           the first moment sound is allowed she is at least heard. */
        StartBird.arrivedSilent = !SFX.armed;
        setTimeout(done, S.buttonDelay);
      };
      /* Tapping through the arrival puts her straight on the perch: the
         keyframes are offsets from where the rig already sits, so
         dropping the class leaves her exactly where the flight would
         have set her down. Nobody has to sit through it twice. */
      const skip = function () {
        el.startBird.classList.remove('flying');
        land();
      };
      el.startBird.addEventListener('animationend', land);
      el.startScreen.addEventListener('click', skip);
      /* animationend never arrives if the tab is backgrounded mid-flight,
         and the screen must not be left without a Play button. */
      setTimeout(land, S.flyMs + 600);
    }
  };

  /* ---------------- boot ---------------- */
  /* Calm or not, decided by the game (CFG.MOTION) — not by a setting on
     the laptop that nobody can see. Before anything moves, so the sky
     and the weather start the way they are going to stay. */
  function decideMotion() {
    const M = (C.MOTION && C.MOTION.calm) || 'off';
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const apply = function () {
      const calm = M === 'on' || (M === 'follow-laptop' && !!(mq && mq.matches));
      document.documentElement.classList.toggle('calm', calm);
    };
    apply();
    if (M === 'follow-laptop' && mq && mq.addEventListener) mq.addEventListener('change', apply);
  }

  function boot() {
    decideMotion();
    /* The loader first, before anything asks for a file of its own:
       everything is then handed its picture by the loader, from the copy
       it fetched, and nothing is downloaded twice. The title screen is up
       from the start, with the bar where Play will be. */
    preload(offerPlay);
    /* The full-frame pictures take their source from config rather than
       from the markup. They used to be hardcoded in the HTML, which meant
       a renamed file left ART pointing at the new name while the page
       still asked for the old one — and the background silently failed
       to load. */
    Preload.adopt(el.sceneArt, C.ART.background);
    Preload.adopt(el.startArt, C.ART.startScreen);
    Preload.adopt(el.flySheet, C.ART.swiftyFly);
    Preload.adopt(el.talkSheet, C.ART.swiftyTalk);
    Preload.adopt(el.standSwifty, C.ART.swiftyStand);
    Preload.adopt(el.playImg, C.ART.playButton);

    /* Browsers refuse audio before a gesture, so the title screen's
       wind, leaves and landing are silent on a cold load and every
       sound is a no-op rather than a queued burst. This tries anyway —
       it succeeds for a visitor the browser already trusts — and the
       first touch of anything arms it for the rest of the screen,
       including the tap that lands her early. */
    SFX.prime();
    const armAudio = function () {
      SFX.prime(true);           // from a gesture, so it takes effect at once
      StartBird.greetIfUnheard();
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        document.removeEventListener(ev, armAudio);
      });
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, armAudio, { passive: true });
    });

    FX.init(el.fxLayer);
    FX.clouds(el.skyLayer);
    FX.leafDrift(el.skyLayer);
    // the title screen blows its own weather, on its own layer
    stopWeather.push(FX.wind(el.startSky, C.START.wind),
                     FX.leafDrift(el.startSky, C.START.drift));
    declareStage();
    fitStage();
    Sprite.setup(el.birdWin, { fly: el.flySheet, talk: el.talkSheet }, C.CHAR_SCALE);
    StartBird.setup();  // must precede layout(): layout seats the rig
    layout();
    bind();
    requestAnimationFrame(loop);

  }

  /* Every file here: the bar goes, she flies in, and Play pops up where
     the bar was — offered only once she has flown in and settled. */
  function offerPlay() {
    el.loadBar.classList.add('done');
    setTimeout(function () { el.loadBar.classList.add('hidden'); }, 420);
    StartBird.arrive(function () {
      el.playBtn.disabled = false;   // also unreachable by keyboard until now
      el.playBtn.classList.remove('veiled');
      el.playBtn.classList.add('popping');
      setTimeout(function () {
        el.playBtn.classList.remove('popping');
        el.playBtn.classList.add('idle');
      }, 520);
      startReady = true;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
