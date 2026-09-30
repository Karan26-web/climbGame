/* =============================================================
   The town — self-contained.

   Buildings and their name pills, drawn in CSS over the board on the
   closing beat. It knows three things and nothing else: which places
   there are, where the board is putting them, and whether it is on.

   It does NOT draw the dots or the coordinate labels. Those are
   measured things and belong to the board, which already writes them
   the same way on every other screen; a second kind of coordinate
   label on the last screen of the game would be one kind too many.

   Mount it once and hand it a position function whenever the board
   moves:

       const town = TownMap.mount(parent);
       town.set(places);
       town.place(function (gx, gy) { ... }, cellW, cellH);
       town.show();

   Nothing here takes a tap: the layer sits over a board whose points
   are tappable, so it is `pointer-events: none` throughout.
   ============================================================= */
window.TownMap = (function () {
  'use strict';

  /* Drawings laid over a picture, in the picture's own pixels (the
     sprite's w x h), so they sit on it at any size. The sheet's style:
     flat colour, a dark edge. Each moving part is a <g> inside a placed
     <g>, so the placing (an SVG transform) and the moving (a CSS one)
     never overwrite each other. */
  const FLAME = 'M0 0 C-26 0 -40 -18 -38 -40 C-36 -58 -22 -64 -20 -84 ' +
                'C-10 -72 -6 -62 -6 -54 C0 -70 10 -86 6 -104 ' +
                'C26 -86 40 -64 38 -40 C36 -18 24 0 0 0 Z';
  /* `out` is when, once the water is on it, this flame dies — the ones
     the jet reaches first go first. */
  const flame = function (x, y, k, ms, delay, out) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
      '<g class="flame-life" style="--out:' + (out || 0) + 'ms">' +
      '<g class="flick" style="animation-duration:' + ms + 'ms;animation-delay:-' + delay + 'ms">' +
      '<path class="f-out" d="' + FLAME + '"/>' +
      '<path class="f-mid" transform="translate(0 -4) scale(.7)" d="' + FLAME + '"/>' +
      '<path class="f-in" transform="translate(0 -6) scale(.42)" d="' + FLAME + '"/>' +
      '</g></g></g>';
  };
  const puff = function (x, y, r, delay) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle class="puff" r="' + r +
           '" style="animation-delay:-' + delay + 'ms"/></g>';
  };
  const OVERLAY = {
    /* The fire engine's cannon barrel, for the engine that drives
       (Board.fireRescue): the same barrel the parked engine carries
       (`engine`, below), drawn over the turret in its strip — the strip's
       own pixels, 421 x 225, the pivot at (250, 25) — and pointing along
       +x inside `.barrel`, so the game can turn it onto the fire. A puff
       of spray at its mouth while it sprays. */
    cannon: function () {
      return '<svg class="town-overlay town-ladder town-cannon" viewBox="0 0 421 225" preserveAspectRatio="none" overflow="visible" aria-hidden="true">' +
        '<g class="barrel" transform="rotate(-34 250 25)">' +
        '<polygon class="cannon" points="250,19.8 284,21.4 284,28.6 250,30.2"/>' +
        '<circle class="cannon-tip" cx="284" cy="25" r="4.6"/>' +
        '<circle class="spray-mist" cx="293" cy="25" r="7"/>' +
        '</g>' +
        '<circle class="cannon-pivot" cx="250" cy="25" r="5.4"/>' +
        '</svg>';
    },
    /* The school drawing on fire: smoke going up from the roof, flames
       along both sides of it and out of the two windows, and the windows
       themselves lit from inside. */
    fire: function (sp) {
      return '<svg class="town-overlay town-flames" viewBox="0 0 ' + sp.w + ' ' + sp.h +
        '" preserveAspectRatio="none" overflow="visible" aria-hidden="true">' +
        '<rect class="lit" x="57" y="165" width="68" height="80" rx="6"/>' +
        '<rect class="lit" x="266" y="165" width="69" height="80" rx="6" style="animation-delay:-400ms"/>' +
        '<g class="smoke">' +
        puff(96, 20, 22, 0) + puff(120, 6, 18, 900) + puff(300, 24, 22, 450) + puff(276, 8, 17, 1500) +
        puff(200, -30, 20, 1150) +
        '</g>' +
        flame(62, 104, 0.95, 900, 0, 420) + flame(122, 88, 1.15, 1100, 350, 180) +
        flame(290, 96, 1.05, 1000, 600, 300) + flame(346, 110, 0.85, 850, 200, 560) +
        flame(90, 176, 0.55, 800, 450, 0) + flame(300, 176, 0.55, 950, 150, 120) +
        '</svg>';
    },
    /* The red van, made a fire engine: a ladder lying along its roof
       over the body, on two brackets, a lamp on the roof over the cab
       that flashes, and a water cannon on the front of the ladder — the
       same engine, drawn the same way, as the strip it drives off in
       (tools/fire-engine-sprite.py). */
    engine: function () {
      let rungs = '';
      for (let x = 46; x <= 206; x += 16) rungs += '<rect class="rung" x="' + x + '" y="-12" width="5" height="10"/>';
      return '<svg class="town-overlay town-ladder" viewBox="0 0 363 173" preserveAspectRatio="none" overflow="visible" aria-hidden="true">' +
        '<rect class="bracket" x="56" y="1" width="9" height="7"/><rect class="bracket" x="186" y="1" width="9" height="7"/>' +
        rungs +
        '<rect class="rail" x="36" y="-17" width="184" height="7" rx="3"/>' +
        '<rect class="rail" x="36" y="-5" width="184" height="7" rx="3"/>' +
        '<rect class="cannon-base" x="197" y="-25" width="20" height="9" rx="3"/>' +
        '<polygon class="cannon" points="208.9,-16.7 236.2,-37.0 232.2,-43.0 203.1,-25.3"/>' +
        '<circle class="cannon-tip" cx="234.2" cy="-40" r="4.6"/>' +
        '<circle class="cannon-pivot" cx="206" cy="-21" r="5.4"/>' +
        '<rect class="lamp-base" x="220" y="-2" width="30" height="6" rx="2"/>' +
        '<rect class="lamp" x="223" y="-12" width="24" height="11" rx="5"/>' +
        '</svg>';
    }
  };

  function mount(parent) {
    const root = document.createElement('div');
    root.id = 'townLayer';
    root.className = 'town-layer';
    parent.appendChild(root);

    let places = [];
    let built = '';
    const nodes = [];
    /* What the places cover, refreshed on every re-place. */
    let room$ = [];

    /* One place: its name pill, and a crop of the town sheet under it.

       These used to be drawn here in CSS — an awning of repeating
       stripes, a roof clipped out of a triangle, windows and a door
       per building. That is gone: one picture, cut by the rect its
       kind names. Deliberately still simple at the size it is shown —
       these are markers on a grid, and a storybook drawn at a cell and
       a half would swamp the ruling the child is meant to be counting
       on. */
    function draw(p) {
      const wrap = document.createElement('div');
      wrap.className = 'town-place town-' + p.kind;
      wrap.dataset.tone = p.tone || 'teal';

      const pill = document.createElement('div');
      pill.className = 'town-pill';
      pill.textContent = p.name;

      const b = document.createElement('div');
      b.className = 'town-build';
      const sheetSrc = window.Preload ? window.Preload.url(window.CFG.TOWN.sheet.src) : window.CFG.TOWN.sheet.src;
      b.style.backgroundImage = 'url("' + sheetSrc + '")';

      /* Its door, if its kind has one: laid exactly over the door in
         the picture. Shut, it shows nothing of its own — the drawing is
         the door. Opening, the doorway behind it goes dark and a leaf
         cut from the same sheet swings in on its hinge, so someone can
         come out of it, or go in (Maya, 46). */
      const sp = (window.CFG.TOWN.sprites || {})[p.kind];
      if (sp && sp.door) {
        const door = document.createElement('div');
        door.className = 'town-door';
        const leaf = document.createElement('div');
        leaf.className = 'town-door-leaf';
        leaf.style.backgroundImage = b.style.backgroundImage;
        door.appendChild(leaf);
        b.appendChild(door);
      }

      /* Or something drawn over the picture (`overlay`): flames and
         smoke for a building on fire, a ladder and a lamp that make the
         red van a fire engine. */
      if (sp && sp.overlay && OVERLAY[sp.overlay]) {
        b.insertAdjacentHTML('beforeend', OVERLAY[sp.overlay](sp));
      }

      wrap.appendChild(pill);
      wrap.appendChild(b);
      root.appendChild(wrap);
      return wrap;
    }

    /* Open or shut, swinging. Ajar is the doorway dark with the leaf
       over it, still shut: the moment the drawing hands over to the
       leaf, which looks like nothing happening at all. */
    function swing(d, open) {
      clearTimeout(d.swingT);
      if (open) {
        d.classList.add('ajar');
        void d.offsetWidth;                 // the leaf starts shut, then turns
        d.classList.add('open');
      } else if (d.classList.contains('ajar')) {
        d.classList.remove('open');
        d.swingT = setTimeout(function () { d.classList.remove('ajar'); },
                              window.CFG.TOWN.doorMs || 320);
      }
    }
    function shut(d) {
      clearTimeout(d.swingT);
      d.classList.remove('open', 'ajar');
    }

    /* A place by its key, and a box in this layer's own pixels, read off
       the layout — the stage may be drawn scaled. */
    function indexOf(key) {
      for (let i = 0; i < places.length; i++) if (places[i].key === key && nodes[i]) return i;
      return -1;
    }
    function boxIn(n) {
      const rr = root.getBoundingClientRect(), r = n.getBoundingClientRect();
      const kx = (rr.width / (root.offsetWidth || 1)) || 1;
      const ky = (rr.height / (root.offsetHeight || 1)) || 1;
      return { x: (r.left - rr.left) / kx, y: (r.top - rr.top) / ky, w: r.width / kx, h: r.height / ky };
    }

    /* The last place() — so a door, or a coordinate, can be asked
       where it is now — and how many there have been. */
    let atLast = null, cellLast = null, placedN = 0;

    function build(list) {
      const key = (list || []).map(function (p) {
        return p.key + ':' + p.x + ',' + p.y;
      }).join('|');
      if (key === built) return;
      built = key;
      /* The places only: anyone walking among them stays. */
      nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      nodes.length = 0;
      places = list || [];
      places.forEach(function (p) { nodes.push(draw(p)); });
    }

    return {
      set: function (list) { build(list); },

      /* Where the board is putting them. `at(gx, gy)` gives the stage
         point of a coordinate and `cw`/`ch` are what one cell measures
         there, so the town grows and shrinks with the board rather
         than with the stage — and a place stays on its coordinate
         whenever the panel moves. */
      place: function (at, cw, ch) {
        const T = window.CFG.TOWN;
        const room = [];
        places.forEach(function (p, i) {
          const n = nodes[i];
          if (!n) return;
          const s = at(p.x, p.y);
          /* Its foot sits a little above the dot, so neither the dot
             nor the coordinates written under it are ever covered.

             Or it HANGS from the point (`hang`) — a tower whose top is
             the point, with its name above: at the top of the paper a
             tower standing on its point would stand off the edge, and a
             side leaving the point downwards would run through it. */
          n.classList.toggle('hang', !!p.hang);
          /* Or it stands in the corner of the first quadrant beside its
             point (`corner`): the station is AT the origin, and standing
             on it, centred, it covered the point, the first unit counted
             out of it and both axes where they cross. */
          n.classList.toggle('q1', !!p.corner);
          /* Or its name beside the picture instead of over it (`tag:
             'right'`), for a place near the top of the paper. */
          n.classList.toggle('tag-right', p.tag === 'right');
          const lift = T.liftCells * ch;
          n.style.top = (p.hang ? (s.y + lift) : (s.y - lift)) + 'px';
          n.style.left = (p.corner ? (s.x + lift * 1.6) : s.x) + 'px';
          /* Sized by its own height in cells, with its width taken
             from its own drawing so nothing is squashed — and the
             sheet behind it scaled so exactly that drawing fills the
             box. */
          const sp = (T.sprites || {})[p.kind];
          const sheet = T.sheet;
          if (sp && sheet) {
            /* A place can be drawn bigger than its kind's default — on
               the wide board a cell is a third of the size. */
            const bh = (p.tall != null ? p.tall : (sp.tall != null ? sp.tall : T.hCells)) * ch;
            const bw = bh * (sp.w / sp.h);
            const k = bh / sp.h;
            n.style.setProperty('--w', bw + 'px');
            n.style.setProperty('--h', bh + 'px');
            const b = n.querySelector('.town-build');
            if (b) {
              b.style.backgroundSize = (sheet.w * k) + 'px ' + (sheet.h * k) + 'px';
              b.style.backgroundPosition = (-sp.x * k) + 'px ' + (-sp.y * k) + 'px';
            }
            /* The door over the drawing's door, and its leaf showing
               exactly the pixels it covers. */
            const d = n.querySelector('.town-door');
            if (d && sp.door) {
              const D = sp.door;
              d.style.left = (D.x * k) + 'px';
              d.style.top = (D.y * k) + 'px';
              d.style.width = (D.w * k) + 'px';
              d.style.height = (D.h * k) + 'px';
              d.style.setProperty('--door-p', (D.w * k * 3) + 'px');
              d.style.setProperty('--door-ms', (T.doorMs || 320) + 'ms');
              const leaf = d.firstChild;
              leaf.style.backgroundSize = (sheet.w * k) + 'px ' + (sheet.h * k) + 'px';
              leaf.style.backgroundPosition = (-(sp.x + D.x) * k) + 'px ' + (-(sp.y + D.y) * k) + 'px';
            }
          } else {
            n.style.setProperty('--w', (T.wCells * cw) + 'px');
            n.style.setProperty('--h', (T.hCells * ch) + 'px');
          }
          n.style.setProperty('--cell', ch + 'px');

          /* How much of the paper this place covers, in the panel's own
             pixels, so the board can keep its coordinate labels off it.

             The lift above already leaves room UNDER a building for the
             coordinate that belongs to it — but the board chooses which
             side of a dot to write on, and it was choosing blind: it
             knows about the axis numbers, the lines and the other
             labels, and knew nothing about the five pictures standing
             on top of them. So Cafe A's (5, 4) went up into the cafe
             and the park's (-3, 2) into the trees.

             Measured rather than worked out, because a name pill is as
             wide as its name — "Maya's House" is wider than the house —
             and only the layout knows that. The wrap is centred on the
             point and hangs upwards from its foot, which is where the
             translate(-50%, -100%) puts it. */
          const pill = n.querySelector('.town-pill');
          const foot = s.y - T.liftCells * ch;
          const wide = Math.max(n.offsetWidth || 0, pill ? pill.offsetWidth : 0);
          const tall = n.offsetHeight || 0;
          if (wide && tall && p.hang) {
            /* Hung: the picture just under the point, its name under the
               picture — nothing over the point or its coordinates. */
            const lift = T.liftCells * ch;
            room.push({ l: s.x - wide / 2, t: s.y + lift,
                        r: s.x + wide / 2, b: s.y + lift + tall,
                        what: p.name || p.kind });
          } else if (wide && tall && p.corner) {
            const lift = T.liftCells * ch;
            room.push({ l: s.x + lift * 1.6, t: foot - tall,
                        r: s.x + lift * 1.6 + wide, b: foot,
                        what: p.name || p.kind });
          } else if (wide && tall && p.tag === 'right') {
            /* The picture on its point, its name out to the right. */
            const bw = n.offsetWidth || 0, gap = 0.1 * ch;
            room.push({ l: s.x - bw / 2, t: foot - tall,
                        r: s.x + bw / 2 + gap + (pill ? pill.offsetWidth : 0), b: foot,
                        what: p.name || p.kind });
          } else if (wide && tall) {
            room.push({ l: s.x - wide / 2, t: foot - tall,
                        r: s.x + wide / 2, b: foot,
                        what: p.name || p.kind });
          }
        });
        room$ = room;
        atLast = at; cellLast = { w: cw, h: ch }; placedN++;
      },

      /* Where a coordinate is in this layer, one cell's size there, and
         how many times the places have been put down — something moving
         over them measures again when that changes. */
      spot: function (gx, gy) { return atLast ? atLast(gx, gy) : null; },
      cell: function () { return cellLast; },
      get placed() { return placedN; },

      /* The door of the place standing on (gx, gy), if it has one:
         the middle of its foot (its threshold), how wide and tall it
         is — all in this layer's pixels, read off the layout, so it is
         right whichever way the place is drawn — and a way to open it,
         shut it swinging, or shut it at once. */
      door: function (gx, gy) {
        let i = -1;
        places.forEach(function (p, j) { if (i < 0 && p.x === gx && p.y === gy && nodes[j] && nodes[j].querySelector('.town-door')) i = j; });
        if (i < 0) return null;
        const d = nodes[i].querySelector('.town-door');
        const rr = root.getBoundingClientRect(), dr = d.getBoundingClientRect();
        /* The stage may be drawn scaled; the layer's own pixels are
           what anything placed in it is placed in. */
        const kx = (rr.width / (root.offsetWidth || 1)) || 1;
        const ky = (rr.height / (root.offsetHeight || 1)) || 1;
        return {
          x: (dr.left + dr.width / 2 - rr.left) / kx,
          y: (dr.bottom - rr.top) / ky,
          w: dr.width / kx, h: dr.height / ky,
          open: function (on) { swing(d, on !== false); },
          shut: function () { shut(d); }
        };
      },

      /* Someone out among the places, over all of them: a strip of
         `frames` frames, each fw x fh, walked by whoever holds it —
         feet at (x, y) in this layer's pixels, `s` times its size,
         frame `f`, turned round or not, faded to `o`. */
      walker: function (src, fw, fh, frames) {
        const w = document.createElement('div');
        w.className = 'town-walker';
        const fig = document.createElement('div');
        fig.className = 'town-walker-fig';
        fig.style.backgroundImage = 'url("' + (window.Preload ? window.Preload.url(src) : src) + '")';
        w.appendChild(fig);
        root.appendChild(w);
        let W = 0, H = 0, feet = 1;
        return {
          size: function (width, height, feetAt) {
            W = width; H = height; feet = feetAt;
            w.style.width = W + 'px';
            w.style.height = H + 'px';
            w.style.transformOrigin = (W / 2) + 'px ' + (H * feet) + 'px';
            fig.style.backgroundSize = (W * frames) + 'px ' + H + 'px';
          },
          at: function (x, y, s, f, turned, o) {
            w.style.transform = 'translate(' + (x - W / 2).toFixed(2) + 'px,' + (y - H * feet).toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
            fig.style.backgroundPosition = (-f * W).toFixed(2) + 'px 0';
            fig.style.transform = turned ? 'scaleX(-1)' : '';
            w.style.opacity = o.toFixed(3);
          },
          remove: function () { if (w.parentNode) w.parentNode.removeChild(w); }
        };
      },

      /* A place's point on the grid, and its picture as a box in this
         layer's pixels. */
      pin: function (key) {
        const i = indexOf(key);
        return i < 0 ? null : { x: places[i].x, y: places[i].y };
      },
      box: function (key) {
        const i = indexOf(key), b = i < 0 ? null : nodes[i].querySelector('.town-build');
        return b ? boxIn(b) : null;
      },
      /* A place's picture gone from its spot — driven off, say — and its
         name with it, or both back. */
      leave: function (key, gone) {
        const i = indexOf(key);
        if (i >= 0) nodes[i].classList.toggle('left', gone !== false);
      },
      /* A fire put out (css/town.css: the flames die, the windows go
         dark, the smoke turns to steam and clears), or burning again. */
      douse: function (key, on) {
        const i = indexOf(key), f = i < 0 ? null : nodes[i].querySelector('.town-flames');
        if (f) f.classList.toggle('dousing', on !== false);
      },

      /* Something driven among the places, over all of them: a strip of
         `frames` frames, standing on (ax, ay) of a frame — its foot —
         at (x, y) in this layer's pixels, frame `f`, turned `rot` degrees
         about its foot. `moving` while it moves, so its layer is let go
         once it is standing. `over`, a drawing laid over the strip in its
         own pixels, that moves with it (`OVERLAY` names one: 'cannon'). */
      mover: function (src, frames, over) {
        const m = document.createElement('div');
        m.className = 'town-mover';
        const fig = document.createElement('div');
        fig.className = 'town-mover-fig';
        fig.style.backgroundImage = 'url("' + (window.Preload ? window.Preload.url(src) : src) + '")';
        m.appendChild(fig);
        if (over && OVERLAY[over]) m.insertAdjacentHTML('beforeend', OVERLAY[over]());
        root.appendChild(m);
        let W = 0, H = 0, ax = 0.5, ay = 1;
        return {
          el: m,
          size: function (w, h, anchorX, anchorY) {
            W = w; H = h; ax = anchorX; ay = anchorY;
            m.style.width = W + 'px';
            m.style.height = H + 'px';
            m.style.transformOrigin = (W * ax) + 'px ' + (H * ay) + 'px';
            fig.style.backgroundSize = (W * frames) + 'px ' + H + 'px';
          },
          at: function (x, y, f, rot) {
            m.style.transform = 'translate(' + (x - W * ax).toFixed(2) + 'px,' +
              (y - H * ay).toFixed(2) + 'px) rotate(' + (rot || 0).toFixed(2) + 'deg)';
            fig.style.backgroundPosition = (-f * W).toFixed(2) + 'px 0';
          },
          moving: function (on) { m.classList.toggle('moving', !!on); },
          remove: function () { if (m.parentNode) m.parentNode.removeChild(m); }
        };
      },

      /* Water in an arc from one point to another, in this layer's
         pixels — a fire engine's cannon on a fire. `aim` lays it (`w`
         the jet's width; `dir`, the way it leaves the nozzle, if the
         nozzle is pointing one), `grow` sends the water along it, `stop`
         lets the last of it run out along it, `splash` is the drops and
         the spray where it lands. */
      water: function () {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'town-water');
        svg.setAttribute('aria-hidden', 'true');
        const mk = function (tag, cls, parent) {
          const n = document.createElementNS(NS, tag);
          n.setAttribute('class', cls);
          (parent || svg).appendChild(n);
          return n;
        };
        const body = mk('path', 'jet'), core = mk('path', 'jet-core'), flow = mk('path', 'jet-flow');
        const hit = mk('g', 'splash');
        const mists = [0, 1, 2].map(function () { return mk('circle', 'mist', hit); });
        const drops = [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return mk('circle', 'drop', hit); });
        root.appendChild(svg);
        let L = 0;
        const jets = [body, core];
        /* Where the water is: not yet out, on the fire, or run out — so
           the jet can be aimed again (the camera moving) and stay what it
           was. */
        let now = 'off';
        const hold = function () {
          jets.forEach(function (p) {
            p.style.transition = 'none';
            p.style.strokeDasharray = L + ' ' + L;
            p.style.strokeDashoffset = now === 'off' ? L : now === 'on' ? 0 : -L;
          });
        };
        return {
          aim: function (n, t, w, dir) {
            const d = Math.hypot(t.x - n.x, t.y - n.y) || 1;
            /* Up and over, the way water from a hose goes: out along the
               nozzle, if it is pointing, and falling onto the fire; or
               with the arc's top above both of its ends. */
            const cx = dir ? n.x + dir.x * d * 0.5 : (n.x + t.x) / 2 - (t.y - n.y) * 0.08;
            const cy = dir ? n.y + dir.y * d * 0.5 : Math.min(n.y, t.y) - d * 0.34;
            const path = 'M' + n.x.toFixed(1) + ' ' + n.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' +
                         cy.toFixed(1) + ' ' + t.x.toFixed(1) + ' ' + t.y.toFixed(1);
            [body, core, flow].forEach(function (p) { p.setAttribute('d', path); });
            body.style.strokeWidth = w + 'px';
            core.style.strokeWidth = (w * 0.4) + 'px';
            flow.style.strokeWidth = (w * 0.28) + 'px';
            flow.style.strokeDasharray = (w * 0.9).toFixed(1) + ' ' + (w * 2.4).toFixed(1);
            flow.style.setProperty('--flow', (-w * 3.3).toFixed(1) + 'px');
            L = body.getTotalLength ? body.getTotalLength() : d * 1.25;
            hit.setAttribute('transform', 'translate(' + t.x.toFixed(1) + ' ' + t.y.toFixed(1) + ')');
            mists.forEach(function (m, i) {
              m.setAttribute('r', (w * (1.3 + i * 0.45)).toFixed(1));
              m.setAttribute('cx', ((i - 1) * w * 0.9).toFixed(1));
              m.setAttribute('cy', (-(i % 2) * w * 0.6).toFixed(1));
              m.style.animationDelay = (-i * 300) + 'ms';
            });
            drops.forEach(function (p, i) {
              /* Thrown up and out off the wall, then falling — each on
                 its own beat, so the splash never repeats as one. */
              const a = -Math.PI * (0.12 + 0.76 * (i / 7)), r = w * (2.2 + (i % 3) * 0.8);
              p.setAttribute('r', (w * (0.2 + (i % 2) * 0.09)).toFixed(2));
              p.style.setProperty('--dx', (Math.cos(a) * r).toFixed(1) + 'px');
              p.style.setProperty('--dy', (Math.sin(a) * r * 0.7 + w * 2.6).toFixed(1) + 'px');
              p.style.animationDelay = (-i * 95) + 'ms';
            });
            hold();
          },
          grow: function (ms) {
            now = 'off'; hold();
            now = 'on';
            jets.forEach(function (p) {
              void p.getBoundingClientRect();
              p.style.transition = 'stroke-dashoffset ' + ms + 'ms cubic-bezier(.3, .6, .45, 1)';
              p.style.strokeDashoffset = 0;
            });
            svg.classList.add('on');
          },
          flowing: function (on) { svg.classList.toggle('flowing', !!on); },
          stop: function (ms) {
            now = 'gone';
            svg.classList.remove('flowing');
            jets.forEach(function (p) {
              p.style.transition = 'stroke-dashoffset ' + ms + 'ms ease-in';
              p.style.strokeDashoffset = -L;
            });
          },
          splash: function (on) { svg.classList.toggle('splashing', !!on); },
          remove: function () { if (svg.parentNode) svg.parentNode.removeChild(svg); }
        };
      },

      /* The places, as boxes on the paper. Panel pixels — the board
         turns them into its own units, which is the only place that
         knows the two scales. */
      boxes: function () { return room$.slice(); },

      /* The places she is naming, lit for a moment — a swell and a
         glow, twice (the towers, the fire, the fire engine). */
      glow: function (keys) {
        places.forEach(function (p, i) {
          const n = nodes[i];
          if (!n || (keys || []).indexOf(p.key) < 0) return;
          clearTimeout(n._glow);
          n.classList.remove('glow');
          void n.offsetWidth;
          n.classList.add('glow');
          n._glow = setTimeout(function () { n.classList.remove('glow'); }, 2500);
        });
      },

      /* The places a screen is not about step back (`keys`), and
         come forward again with an empty list. */
      focus: function (keys) {
        places.forEach(function (p, i) {
          if (nodes[i]) nodes[i].classList.toggle('dim', (keys || []).indexOf(p.key) >= 0);
        });
      },

      show: function () { root.classList.add('on'); },
      hide: function () { root.classList.remove('on'); },
      get shown() { return root.classList.contains('on'); }
    };
  }

  return { mount: mount };
})();
