/* =============================================================
   Number selector — a mechanical reel with an arrow built into each
   end of one gold housing, and Check under it.

   Self-contained: it owns its markup and its styles, exposes the same
   small surface the game already used (mount / show / hide / reset /
   set / setRange / markCorrect / markWrong / lock / onCheck), and
   knows nothing about what any answer should be — the
   game tells it whether a guess was right, it does not work that out.

   The reel is five cells, not three. Three would mean recycling a cell
   in plain sight — the one that has just slid off the middle is still
   on screen — so the two beyond the visible ones are kept as buffers
   under the arrows, and that is where a cell is moved and rewritten.
   ============================================================= */
window.NumberSelector = (function () {
  'use strict';

  /* The host sets a range per screen, but only two of its screens
     carry one: these are the fallback for all the rest, so they are
     the game's numbers rather than a component default. It opens on 0
     because nothing has been measured yet — and the back arrow is
     disabled there, which is the truth. */
  const MIN = 0, MAX = 8, START = 0;

  /* How far apart the barrels sit — read off the skin rather than
     fixed here, so the art and the travel can never drift apart. It is
     one third of the window, which puts three barrels across it and
     lets the next two run on behind the frame. */
  const OFFSETS = [-2, -1, 0, 1, 2];
  const SMALL = 1;          /* every barrel is the same size now: the
                               chosen one is told apart by its gold,
                               which is the art's own job */
  const SLIDE_MS = 280;
  const SINK_MS = 300;       // as long as ncSink runs

  function mount(parent, opts) {
    opts = opts || {};

    let min = opts.min != null ? opts.min : MIN;
    let max = opts.max != null ? opts.max : MAX;
    let startAt = opts.start != null ? opts.start : START;
    let current = startAt;
    let onCheck = null;

    const root = document.createElement('div');
    root.classList.add('number-control');
    root.id = opts.id || 'numberSelector';
    if (opts.x !== undefined) root.style.left = opts.x + 'px';
    if (opts.y !== undefined) root.style.top = opts.y + 'px';
    if (opts.scale) root.style.setProperty('--k', opts.scale);
    if (opts.hidden) root.classList.add('hidden');

    const mk = function (tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };

    const selector = mk('div', 'selector');

    const left = mk('button', 'side prev');
    left.type = 'button';
    left.setAttribute('aria-label', 'Previous number');
    left.appendChild(mk('span', 'chev'));

    const right = mk('button', 'side next');
    right.type = 'button';
    right.setAttribute('aria-label', 'Next number');
    right.appendChild(mk('span', 'chev'));

    const reel = mk('div', 'reel');
    const seat = mk('div', 'seat');
    const lane = mk('div', 'lane');
    reel.appendChild(seat);
    reel.appendChild(lane);

    /* One cell per offset. They are rotated rather than rebuilt, so a
       number keeps its element as it travels and the transition on it
       is never interrupted. */
    const cells = OFFSETS.map(function () {
      const c = mk('span', 'cell');
      lane.appendChild(c);
      return c;
    });

    const tick = mk('span', 'tick', '✓');
    /* The pointer over the chosen number. It was painted into the
       frame while the frame was a drawing; drawn in CSS it has to be
       a node of its own, so it can dip as a number locks in. */
    const pointer = mk('span', 'pointer');

    selector.appendChild(pointer);
    selector.appendChild(reel);
    selector.appendChild(tick);
    selector.appendChild(left);
    selector.appendChild(right);

    /* GO, and it says so. The word used to live in the artwork with
       the button's own text set to nothing, which left the label a
       screen reader read ("Check answer") saying something the button
       did not. */
    const check = mk('button', 'check', 'GO');
    check.type = 'button';
    check.setAttribute('aria-label', 'Go — check this answer');

    root.appendChild(selector);
    root.appendChild(check);
    parent.appendChild(root);

    /* The chosen number is announced, not the whole reel: the two
       beside it are there to show the run, not to be read. */
    seat.setAttribute('role', 'status');
    seat.setAttribute('aria-live', 'polite');

    /* The value in the middle of the window. Mostly the chosen one — but
       at either end of the range the window stops, rather than turning
       one drum further onto an empty one past the end, and the choice
       moves out to the end drum instead: its gold seat and its pointer
       go with it. So every drum in sight has a number on it, and the
       arrow on that side is the thing that says it is the end. */
    let centre = current;
    function middle() {
      if (max - min < 2) return current;          // too short a run to stop at
      return Math.min(max - 1, Math.max(min + 1, current));
    }

    /* The seat and the pointer over whichever drum is chosen. */
    function seatAt(jump) {
      const at = 'calc(50% + ' + (current - centre) + ' * var(--pitch))';
      [seat, pointer].forEach(function (n) {
        if (jump) n.style.transition = 'none';
        n.style.left = at;
        if (jump) { void n.offsetWidth; n.style.transition = ''; }
      });
    }

    /* Seats one cell at an offset from the middle. `jump` is for the
       two buffers, which are moved across the reel rather than along
       it and must not be seen doing it. */
    function seatCell(cell, off, jump) {
      const v = centre + off;
      const mid = v === current;
      const scale = mid ? 1 : SMALL;
      if (jump) cell.classList.add('jump');
      cell.textContent = (v < min || v > max) ? '' : String(v);
      cell.classList.toggle('empty', v < min || v > max);
      cell.classList.toggle('on', mid);
      cell.classList.toggle('off', !mid);
      /* Where the drum sits. Nothing but a slide along the trough.

         It used to carry `perspective(520px)` and turn the two either
         side by 7 degrees, so they curved away as the surface of a
         barrel does. That was right while a drum was a CSS gradient
         pretending to be round. The drum is a drawn TILE now, and
         turning a flat drawing in perspective does not round it — it
         makes a trapezoid of it, and the tile's own corners stop being
         the corners the artist drew. The position stays an inline
         transform because an inline transform wins, which is the whole
         reason it was written here. */
      cell.style.transform =
        'translate(calc(-50% + ' + off + ' * var(--pitch)), -50%)' +
        ' scale(' + scale + ')';
      if (jump) {
        void cell.offsetWidth;           // land it before transitions come back
        cell.classList.remove('jump');
      }
    }

    function paint(jumpAll) {
      centre = middle();
      cells.forEach(function (c, i) { seatCell(c, OFFSETS[i], jumpAll); });
      seatAt(jumpAll);
      seat.setAttribute('aria-label', String(current));
      left.disabled = current <= min;
      right.disabled = current >= max;
    }

    /* A press that shows on the button however it was triggered —
       :active only covers the mouse, and these are reachable by
       keyboard too. */
    function press(btn) {
      btn.classList.add('is-pressed');
      setTimeout(function () { btn.classList.remove('is-pressed'); }, 130);
    }

    let verdict = null;
    function clearVerdict() {
      clearTimeout(verdict);
      root.classList.remove('is-correct', 'is-wrong');
    }

    let popping = null, sinkT = null;
    function popSeat() {
      clearTimeout(popping);
      seat.classList.remove('pop');
      void seat.offsetWidth;
      seat.classList.add('pop');
      popping = setTimeout(function () { seat.classList.remove('pop'); }, SLIDE_MS + 40);
    }

    function set(v) {
      v = Math.min(max, Math.max(min, Math.round(v)));
      if (v === current) return;
      const dir = v > current ? 1 : -1;
      const step = Math.abs(v - current);
      current = v;
      clearVerdict();          // a new guess clears the verdict on the last
      const was = centre;
      centre = middle();

      /* More than one step at once — the host setting a value outright
         rather than the player pressing an arrow — is not a slide. */
      if (step > 1) { paint(true); }
      else {
        /* Rotate so the array still reads -2..+2 from the new middle.
           The cell that falls off one end is the one rewritten, out of
           sight under an arrow. At an end the window stays where it is
           and only the choice moves along it. */
        let wrapped = null;
        if (centre !== was) {
          wrapped = dir > 0 ? cells.shift() : cells.pop();
          if (dir > 0) cells.push(wrapped); else cells.unshift(wrapped);
        }
        cells.forEach(function (c, i) { seatCell(c, OFFSETS[i], c === wrapped); });
        seatAt(false);
        seat.setAttribute('aria-label', String(current));
        left.disabled = current <= min;
        right.disabled = current >= max;
        popSeat();
      }

      if (window.Audio8 && window.Audio8.blip) window.Audio8.blip();
    }

    left.addEventListener('click', function (e) {
      e.stopPropagation(); press(left); set(current - 1);
    });
    right.addEventListener('click', function (e) {
      e.stopPropagation(); press(right); set(current + 1);
    });
    check.addEventListener('click', function (e) {
      e.stopPropagation();
      press(check);
      if (onCheck) onCheck(current);
    });
    // taps inside the control are its own; they must not skip the screen
    root.addEventListener('click', function (e) { e.stopPropagation(); });

    paint(true);

    return {
      set: set,

      /* A screen can widen the range — the worked-out answers reach
         past 8 — without the component knowing what any of them mean. */
      setRange: function (lo, hi, start) {
        min = lo; max = hi;
        startAt = Math.min(max, Math.max(min, start != null ? start : START));
        current = Math.min(max, Math.max(min, current));
        paint(true);
      },

      reset: function () {
        current = startAt;
        clearVerdict();
        clearTimeout(popping);
        seat.classList.remove('pop');
        root.classList.remove('locked');
        left.disabled = right.disabled = check.disabled = false;
        paint(true);
      },

      /* The game decides what is right; these only show it. */
      markCorrect: function () {
        clearVerdict();
        void seat.offsetWidth;
        root.classList.add('is-correct');
      },
      markWrong: function () {
        clearVerdict();
        void seat.offsetWidth;
        root.classList.add('is-wrong');
        /* Back to the ordinary yellow block once the shake is done —
           when the shake says it is done, not on a guess 20ms short of
           it (340ms of wobble was being cut at 320 on every machine,
           and by more on a slow one). The timer is only the fallback
           for a shake that never reports. */
        const done = function (e) {
          if (e && e.animationName !== 'drumWobble') return;
          root.removeEventListener('animationend', done);
          clearTimeout(verdict);
          root.classList.remove('is-wrong');
        };
        root.addEventListener('animationend', done);
        verdict = setTimeout(done, 340 + 300);
      },

      /* Once the answer is right there is nothing left to choose, so
         the arrows and Check stop taking input rather than sitting
         there looking live. */
      lock: function () {
        root.classList.add('locked');
        left.disabled = right.disabled = check.disabled = true;
      },

      /* `rising` is for the moment it takes the space Swifty has just
         flown out of: it comes up from below rather than appearing, so
         it is visibly settled by the time she lands on it. */
      show: function (rising) {
        clearTimeout(sinkT);
        root.classList.remove('hidden', 'rising', 'sinking');
        if (rising) { void root.offsetWidth; root.classList.add('rising'); }
      },
      /* `sinking` is `rising` backwards, for when there is nothing left
         to choose and she steps down off it: it drops away rather than
         vanishing. */
      hide: function (sinking) {
        clearTimeout(sinkT);
        root.classList.remove('rising');
        if (sinking && !root.classList.contains('hidden')) {
          root.classList.add('sinking');
          sinkT = setTimeout(function () {
            root.classList.remove('sinking');
            root.classList.add('hidden');
          }, SINK_MS);
        } else {
          root.classList.remove('sinking');
          root.classList.add('hidden');
        }
      },

      onCheck: function (fn) { onCheck = fn; }
    };
  }

  return { mount: mount, MIN: MIN, MAX: MAX };
})();
