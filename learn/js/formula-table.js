/* =============================================================
   The formula table. A panel that opens out of the board's right
   edge, wearing the board's own frame so it reads as the grid panel
   extended, with the working set out as a table: every row hung from
   one column of equals signs, each term in a column of its own, so a
   row lines up under the one above it.

   It holds no numbers of its own to begin with. A row comes in as its
   skeleton — brackets, squares, equals and plus signs — with an empty
   slot wherever something is going to land, and the game fills each
   slot as the copy flown in from the triangle arrives (`land`). What
   was worked out rather than read off the drawing is written in place
   (`write`). The table only lays out and reveals; where things come
   from, and when, is the game's.
   ============================================================= */
window.FormulaTable = (function () {
  'use strict';

  /* '=' and '+' belong to the skeleton; everything else is a term. */
  function isOp(t) { const s = (t || '').trim(); return s === '=' || s === '+'; }

  /* "(AB)²" is a bracket, a name and a square; "4" is only the name.
     The slot is the name — the brackets and the square are the shape
     it goes into, so they are drawn with the skeleton. */
  function split(t) {
    const m = String(t || '').match(/^(\s*\(?)([^()²³]*?)(\)?[²³]?\s*)$/);
    return m ? { pre: m[1], inner: m[2], post: m[3] } : { pre: '', inner: t, post: '' };
  }

  function mount(parent, opts) {
    opts = opts || {};
    const root = document.createElement('div');
    root.id = opts.id || 'formulaTable';
    root.className = 'formula-table hidden';
    parent.insertBefore(root, opts.before || null);
    const grid = document.createElement('div');
    grid.className = 'ft-grid';
    root.appendChild(grid);

    let rows = [];
    let colours = { h: '#E07B12', v: '#2F8F6F', ab: '#1F6FD0' };

    /* Room at the foot of the panel for the tiles. A scroller hanging
       from the last rows reaches below the table — from "AB = □ units"
       the two tiles hung off the panel's edge, over the mountains. So
       when a scroller opens the panel grows down until the tiles are
       inside it, with as much paper under them as under a row; it
       keeps that room while blanks are left (growing and shrinking
       from one blank to the next would make it breathe), and gives it
       back when the last is filled. Its top edge stays where it is:
       see --room in the stylesheet. */
    let room = 0;
    const setRoom = function (px) {
      room = px;
      root.style.setProperty('--room', px + 'px');
    };
    const makeRoom = function (drop, box) {
      /* The stage is scaled: a length on screen over the same length
         laid out is the scale. The grid never animates, so it gives
         the ratio cleanly. */
      const g = grid.getBoundingClientRect();
      const k = (g.height / grid.offsetHeight) || 1;
      /* Where the tiles end once they are down — from the layout, not
         from the screen: they are still dropping (scaled to a fifth)
         as this is read. How far that is below the last row is the
         room they need. */
      const reach = (box.getBoundingClientRect().top - g.bottom) / k +
                    box.clientTop + drop.offsetTop + drop.offsetHeight;
      const need = Math.max(0, Math.ceil(reach));
      if (need > room) setRoom(need);
    };

    const mk = function (tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    return {
      el: root,

      setColours: function (c) { colours = Object.assign({}, colours, c || {}); },

      /* Rows and cells, all hidden. Columns: 0 the left-hand side, 1
         the equals sign, then term, operator, term... in the order the
         line gives them. */
      build: function (formula) {
        clearTimeout(root._close);
        clearTimeout(root._only);
        root.classList.remove('folding');
        root.style.height = '';
        grid.innerHTML = '';
        rows = [];
        setRoom(0);
        (formula || []).forEach(function (line, r) {
          const cells = [];
          /* An INLINE row: one expression rather than terms in columns
             — "d = √((x2 - x1)² + (y2 - y1)²)" has no terms that line up
             from row to row, so everything after its equals sign sits in
             one cell, written as it reads, with a slot wherever a piece
             is carried in. The left-hand side and the equals sign keep
             their columns, so the rows still hang from one = . */
          if (line.inline) {
            const lhs = mk('span', 'ft-cell ft-col0');
            const eq = mk('span', 'ft-cell ft-col1 ft-is-op', '=');
            const rhs = mk('span', 'ft-cell ft-col2 ft-inline');
            [lhs, eq, rhs].forEach(function (c) { c.style.gridRow = String(r + 1); });
            lhs.style.gridColumn = '1'; eq.style.gridColumn = '2'; rhs.style.gridColumn = '3 / -1';
            let side = lhs, seenEq = false;
            (line.parts || []).forEach(function (p, k) {
              const t = p.t || '';
              if (!seenEq && t.trim() === '=') { seenEq = true; side = rhs; cells[k] = { kind: 'op', el: eq }; return; }
              const colour = p.lit ? colours[p.lit] : null;
              /* A blank inside the expression (the axis cases): the same
                 box and scroller as a blank in a column, sitting in the
                 line where the term goes. Its part's text is the answer,
                 or `answer` names it. */
              if (p.offer) {
                const want = p.answer != null ? String(p.answer) : t.trim();
                const box = mk('span', 'ft-pick');
                const wide = p.offer.map(String).reduce(function (a, b) {
                  return b.length > a.length ? b : a; }, want);
                box.appendChild(mk('span', 'ft-sizer', wide));
                const shown = mk('span', 'ft-num');
                if (colour) shown.style.color = colour;
                box.appendChild(shown);
                side.appendChild(box);
                cells[k] = { kind: 'pick', el: box, box: box, num: shown,
                             answer: /^[-\u2212]?\d+(?:\.\d+)?$/.test(want) ? parseFloat(want.replace('\u2212', '-')) : want,
                             offer: p.offer.slice() };
                return;
              }
              if (p.from) {
                const slot = mk('span', 'ft-slot');
                const fill = mk('span', 'ft-fill', t.trim());
                if (colour) fill.style.color = colour;
                slot.appendChild(fill);
                side.appendChild(slot);
                cells[k] = { kind: 'slot', el: slot, fill: fill };
              } else {
                /* A letter on its own — the d the formula names — is a
                   letter of the algebra, and set as one (.mvar). */
                const sp = mk('span', /^[a-z]$/.test(t.trim()) ? 'ft-text mvar' : 'ft-text', t);
                if (colour) sp.style.color = colour;
                side.appendChild(sp);
                cells[k] = { kind: 'text', el: sp };
              }
            });
            [lhs, eq, rhs].forEach(function (c) { grid.appendChild(c); });
            rows.push({ cells: cells, boxes: [lhs, eq, rhs] });
            return;
          }
          let col = 0, next = 0;
          (line.parts || []).forEach(function (p, k) {
            const t = p.t || '';
            if (t.trim() === '=' && next < 2) { col = 1; next = 2; }
            else if (next < 2) col = 0;
            else col = next++;
            const cell = mk('span', 'ft-cell ft-col' + col);
            cell.style.gridRow = String(r + 1);
            cell.style.gridColumn = String(col + 1);
            const colour = p.lit ? colours[p.lit] : null;
            let kind, fill = null;
            if (isOp(t)) {
              kind = 'op';
              cell.textContent = t.trim();
            } else if (p.offer) {
              /* A blank the child fills: the number in the part is the
                 right one, `offer` is the two tiles in the order they
                 drop down. Whatever wraps the number — brackets and
                 square, or " units" — is the shape it goes into, drawn
                 with the skeleton. The box is held open at the width
                 of the widest tile so nothing moves when it fills. */
              kind = 'pick';
              /* The right answer is the number in the part — or, where
                 the answer is not a number (x₂ − x₁ on the general
                 triangle), the text the part names as its `answer`. */
              const m = p.answer != null ? null : t.match(/-?\d+(?:\.\d+)?/);
              const num = p.answer != null ? String(p.answer) : (m ? m[0] : '');
              const at = p.answer != null ? Math.max(0, t.indexOf(num)) : (m ? m.index : 0);
              const pre = t.slice(0, at).trim(), post = t.slice(at + num.length).replace(/^\s+/, ' ');
              if (pre) cell.appendChild(mk('span', 'ft-frame', pre));
              const box = mk('span', 'ft-pick');
              const wide = p.offer.map(String).reduce(function (a, b) { return b.length > a.length ? b : a; }, num);
              box.appendChild(mk('span', 'ft-sizer', wide));
              const shown = mk('span', 'ft-num');
              if (colour) shown.style.color = colour;
              box.appendChild(shown);
              cell.appendChild(box);
              if (post.trim()) cell.appendChild(mk('span', 'ft-frame', post));
              cells[k] = { kind: kind, el: cell, box: box, num: shown,
                           answer: p.answer != null ? num : parseFloat(num),
                           offer: p.offer.slice() };
              cell.classList.add('ft-pick-cell');
              grid.appendChild(cell);
              return;
            } else if (p.from) {
              /* Brackets and square with the skeleton; the name in a
                 slot that holds its width while it waits, so nothing
                 in the row moves when it lands. */
              kind = 'slot';
              const s = split(t);
              if (s.pre) cell.appendChild(mk('span', 'ft-frame', s.pre.trim()));
              const slot = mk('span', 'ft-slot');
              fill = mk('span', 'ft-fill', s.inner.replace(/ /g, ' '));
              if (colour) fill.style.color = colour;
              slot.appendChild(fill);
              cell.appendChild(slot);
              if (s.post) cell.appendChild(mk('span', 'ft-frame', s.post.trim()));
            } else {
              kind = 'write';
              cell.textContent = t.trim();
              if (colour) cell.style.color = colour;
            }
            /* The cell's KIND, under a prefix of its own. It was
               `'ft-' + kind`, which for a slot is `ft-slot` — the very
               class of the slot inside it — so every slot cell also
               drew the slot's dashed underline, across the whole term,
               and nothing ever took it away: the line stayed under
               "(AB)²" and "(4)²" after their numbers had landed. */
            cell.classList.add('ft-is-' + kind);
            grid.appendChild(cell);
            cells[k] = { kind: kind, el: cell, fill: fill };
          });
          rows.push({ cells: cells });
        });
      },

      /* Where it sits on the stage, out of the board's edge. Its height
         follows what is in it, and it is centred on `cy`. */
      place: function (box) {
        root.style.left = box.x + 'px';
        root.style.width = box.w + 'px';
        root.style.top = box.cy + 'px';
      },

      /* Its type made smaller, if it has to be, so the widest row fits
         inside the panel. A row wider than the panel was centred past
         both of its edges: its end ran over the frame and its start went
         under the board. Measured with every row laid out (they are only
         hidden, not taken out), so it is set once, before anything shows. */
      fit: function () {
        // measured as it will be drawn, the algebra in its own face
        if (window.MathText) window.MathText.set(grid);
        const cs = getComputedStyle(root);
        const avail = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const need = grid.scrollWidth;
        if (avail > 0 && need > avail) {
          const size = parseFloat(cs.fontSize) || 40;
          root.style.setProperty('--ft-size', Math.floor(size * (avail / need) * 0.97) + 'px');
        }
      },

      /* Back into the board's edge, the way it came out, and then gone —
         for a screen that moves on without a leaf sweep to hide it. */
      close: function (done) {
        clearTimeout(root._settle);
        clearTimeout(root._close);
        if (root.classList.contains('hidden')) { if (done) done(); return; }
        root.classList.remove('settled');       // the clip back on, to close with
        void root.offsetWidth;
        root.classList.remove('open');          // and it closes right to left
        root._close = setTimeout(function () {
          root.classList.add('hidden');
          grid.innerHTML = '';
          rows = [];
          setRoom(0);
          if (done) done();
        }, 740);
      },

      /* Out of the board's edge, like a drawer. */
      open: function () {
        clearTimeout(root._close);
        root.classList.remove('hidden');
        root.classList.remove('settled');
        void root.offsetWidth;
        root.classList.add('open');
        /* The drawer's clip is only for the opening; kept after it, a
           scroller dropping from the last row would be cut off at the
           table's edge. */
        /* Dropped when the drawer has actually finished opening, not on a
           guess at when it will have: on a slow frame the clip was taken
           away mid-slide and the drawer snapped open. */
        clearTimeout(root._settle);
        const settle = function (e) {
          if (e && (e.target !== root || e.propertyName !== 'clip-path')) return;
          root.removeEventListener('transitionend', settle);
          clearTimeout(root._settle);
          if (root.classList.contains('open')) root.classList.add('settled');
        };
        root.addEventListener('transitionend', settle);
        root._settle = setTimeout(settle, 700 + 400);
      },

      /* A row's skeleton: its signs, its brackets and its empty slots. */
      showRow: function (r) {
        const row = rows[r];
        if (!row) return;
        (row.boxes || []).forEach(function (b) { b.classList.add('in'); });
        row.cells.forEach(function (c) {
          if (c && c.kind !== 'write') c.el.classList.add('in');
        });
      },

      /* The node a copy flies to — the slot's name, laid out but not
         yet shown, so its box is exactly where the copy must land. */
      target: function (r, k) {
        const c = rows[r] && rows[r].cells[k];
        return c ? (c.fill || c.el) : null;
      },

      /* A copy has arrived: the slot holds it now. */
      land: function (r, k) {
        const c = rows[r] && rows[r].cells[k];
        if (!c) return;
        c.el.classList.add('in');
        if (c.fill) c.fill.parentNode.classList.add('landed');
      },

      /* A row written in whole — the theorem, which is given. */
      writeRow: function (r) {
        const row = rows[r];
        if (!row) return;
        (row.boxes || []).forEach(function (b) { b.classList.add('in'); });
        row.cells.forEach(function (c) { if (c) c.el.classList.add('in', 'landed'); });
      },

      /* Every blank the child fills, in reading order, as [row, part]. */
      blanks: function () {
        const out = [];
        rows.forEach(function (row, r) {
          row.cells.forEach(function (c, k) { if (c && c.kind === 'pick') out.push([r, k]); });
        });
        return out;
      },

      /* The blank the child fills next. It breathes and carries a small
         chevron; tapped, it drops a short scroller of two tiles, and a
         tapped tile is handed to `onPick(value, tile)` — the game
         decides whether it was right. Only this blank takes a tap. */
      activate: function (r, k, onPick) {
        const c = rows[r] && rows[r].cells[k];
        if (!c || c.kind !== 'pick') return false;
        c.el.classList.add('in');
        c.box.classList.add('active');
        const open = function () {
          if (c.drop) return;
          const drop = mk('span', 'ft-drop');
          /* A scroller that carries letters on any tile is set in the
             table's own face throughout: Lilita One has no ₁ or ₂, and a
             pair of tiles in two faces reads as a mistake. */
          /* A negative number is a number, whichever minus it is written with. */
          const words = c.offer.some(function (v) { return !/^[-\u2212]?\d+(?:\.\d+)?$/.test(String(v)); });
          c.offer.forEach(function (v) {
            const tile = mk('button', 'ft-tile', String(v));
            if (words) tile.classList.add('ft-word');
            tile.type = 'button';
            tile.setAttribute('aria-label', String(v));
            tile.addEventListener('click', function (e) {
              e.stopPropagation();
              /* One answer per blank: once it is filled the scroller is
                 folding away, and a second tap on either tile — a double
                 tap — must not be a second answer. Nor is a tap on a
                 tile still shaking from being wrong. */
              if (tile.disabled || tile.classList.contains('no') ||
                  c.box.classList.contains('filled')) return;
              onPick(v, tile);
            });
            drop.appendChild(tile);
          });
          c.box.appendChild(drop);
          c.drop = drop;
          void drop.offsetWidth;
          makeRoom(drop, c.box);
          drop.classList.add('open');
          c.box.classList.add('opened');
        };
        c.box.onclick = function (e) { e.stopPropagation(); open(); };
        c.open = open;
        return true;
      },

      /* Right: the scroller folds back into the blank and the number
         settles there, in its colour. */
      fill: function (r, k, v) {
        const c = rows[r] && rows[r].cells[k];
        if (!c) return;
        c.box.onclick = null;
        c.box.classList.remove('active', 'opened');
        c.num.textContent = String(v);
        c.box.classList.add('filled');
        c.box.querySelectorAll('.ft-tile').forEach(function (t) { t.disabled = true; });
        /* The last blank: the room goes back — once the tiles have
           folded up into it, or the panel's edge would pass them on the
           way. */
        const last = !rows.some(function (row) {
          return row.cells.some(function (x) {
            return x && x.kind === 'pick' && !x.box.classList.contains('filled');
          });
        });
        if (c.drop) {
          const d = c.drop;
          c.drop = null;
          d.classList.remove('open');
          d.classList.add('fold');
          setTimeout(function () {
            if (d.parentNode) d.parentNode.removeChild(d);
            if (last && rows.length) setRoom(0);
          }, 380);
        } else if (last) setRoom(0);
      },

      rowCount: function () { return rows.length; },

      /* One line and nothing else (37: the formula on its own; 39 and 41:
         what the working came to). The others fade out, then fold away,
         and the panel closes up round the line that is left — its green
         laid again where the line now sits. A line that hung from the one
         above ("= √((x₂ − x₁)²)") takes `name` as its left-hand side, now
         that it stands alone: "d = √((x₂ − x₁)²)". Returns how long all
         that takes. */
      only: function (r, name) {
        const els = function (row) {
          return row.boxes || row.cells.filter(Boolean).map(function (c) { return c.el; });
        };
        if (!rows[r]) return 0;
        const keep = els(rows[r]), others = [];
        rows.forEach(function (row, i) { if (i !== r) others.push.apply(others, els(row)); });
        if (!others.length) return 0;
        const FADE = 320, FOLD = 420, self = this;
        others.forEach(function (e) { e.classList.add('ft-going'); });
        clearTimeout(root._only);
        root._only = setTimeout(function () {
          const was = root.offsetHeight;
          others.forEach(function (e) { e.classList.add('ft-gone'); });
          keep.forEach(function (e) { e.style.gridRow = '1'; });
          const lhs = rows[r].boxes && rows[r].boxes[0];
          if (name && lhs && !lhs.textContent.trim()) {
            lhs.appendChild(mk('span', /^[a-z]$/.test(name) ? 'ft-text mvar' : 'ft-text', name));
            lhs.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease' });
          }
          root.style.height = '';
          const now = root.offsetHeight;
          root.style.height = was + 'px';
          void root.offsetWidth;
          root.classList.add('folding');
          root.style.height = now + 'px';
          if (grid.querySelector('.ft-answer')) self.markRow(r);
          root._only = setTimeout(function () { root.classList.remove('folding'); }, FOLD + 40);
        }, FADE);
        return FADE + FOLD;
      },

      /* …or the whole line it ends on, name and = and all: "d = |x₂ − x₁|"
         on one green, not the blank alone. Laid behind the words, over
         the box every piece of the row covers. */
      markRow: function (r) {
        const row = rows[r];
        if (!row) return;
        const els = (row.boxes && row.boxes.length) ? row.boxes
          : row.cells.filter(Boolean).map(function (c) { return c.el; });
        const g = grid.getBoundingClientRect();
        const k = g.width / (grid.offsetWidth || g.width || 1) || 1;   // the stage's scale
        let l = Infinity, t = Infinity, rt = -Infinity, b = -Infinity;
        els.forEach(function (e) {
          const q = e.getBoundingClientRect();
          if (!q.width && !q.height) return;
          l = Math.min(l, q.left); t = Math.min(t, q.top);
          rt = Math.max(rt, q.right); b = Math.max(b, q.bottom);
        });
        if (!isFinite(l)) return;
        const old = grid.querySelector('.ft-answer');
        if (old) old.parentNode.removeChild(old);
        const band = mk('span', 'ft-answer');
        band.style.left = ((l - g.left) / k) + 'px';
        band.style.top = ((t - g.top) / k) + 'px';
        band.style.width = ((rt - l) / k) + 'px';
        band.style.height = ((b - t) / k) + 'px';
        grid.insertBefore(band, grid.firstChild);
        void band.offsetWidth;
        band.classList.add('on');
      },

      /* Wrong: that tile shakes where it is, its number red while it
         shakes, and stays. Both numbers are still there — the child
         sees what they chose and that it was not it, and chooses again.
         It used to shake and fade away, leaving one tile under the
         blank: the answer, with nothing left to choose. */
      reject: function (tile) {
        if (!tile) return;
        clearTimeout(tile._noT);
        tile.classList.remove('no');
        void tile.offsetWidth;
        tile.classList.add('no');
        const off = function (e) {
          if (e && (e.target !== tile || e.animationName !== 'ftShake')) return;
          tile.removeEventListener('animationend', off);
          clearTimeout(tile._noT);
          tile.classList.remove('no');
        };
        tile.addEventListener('animationend', off);
        /* Calm has no shake, so no animationend: the red goes on time. */
        tile._noT = setTimeout(off, 700);
      },

      /* Worked out, not read off: written where it stands. */
      write: function (r, k) {
        const c = rows[r] && rows[r].cells[k];
        if (c) c.el.classList.add('in', 'landed');
      },

      hide: function () {
        clearTimeout(root._settle);
        clearTimeout(root._close);
        clearTimeout(root._only);
        root.style.height = '';
        root.classList.remove('open', 'settled', 'folding');
        root.classList.add('hidden');
        grid.innerHTML = '';
        rows = [];
        setRoom(0);
      }
    };
  }

  return { mount: mount, isOp: isOp, split: split };
})();
