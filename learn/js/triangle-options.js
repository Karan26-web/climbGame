/* =============================================================
   Triangle answer panel — self-contained component.

   Builds its own DOM and owns its own state. Mount it anywhere:

       const panel = TriangleOptions.mount(parent, { x, y });
       panel.onAnswer(function (key, isCorrect) { ... });

   The component never decides what is right: the screen tells it,
   and it only reports what was pressed and plays the verdict.
   ============================================================= */
window.TriangleOptions = (function () {
  'use strict';

  /* Default set. A screen can supply its own three answers instead —
     the panel only ever shows what it is given. */
  const CHOICES = [
    { key: 'scalene',      cls: 'scalene',      label: 'Scalene Triangle' },
    { key: 'isosceles',    cls: 'isosceles',    label: 'Isosceles Triangle' },
    { key: 'right-angled', cls: 'right-angled', label: 'Right-angled Triangle' }
  ];

  function mount(parent, opts) {
    opts = opts || {};

    const root = document.createElement('div');
    root.classList.add('triangle-options-panel');
    root.id = opts.id || 'triangleOptions';
    if (opts.x !== undefined) root.style.left = opts.x + 'px';
    if (opts.y !== undefined) root.style.top = opts.y + 'px';
    if (opts.scale) root.style.setProperty('--k', opts.scale);
    if (opts.hidden) root.classList.add('hidden');

    let buttons = [];
    let answerKey = null;      // set by the screen
    let onAnswer = null;
    let locked = false;

    function clearStates() {
      buttons.forEach(function (b) {
        b.classList.remove('selected', 'correct', 'incorrect', 'spent');
      });
    }

    /* The three shapes, drawn rather than described. Each is the same
       size and sits on the same baseline, so the cards read as three of
       one thing; what differs between them is the marks. */
    const NS = 'http://www.w3.org/2000/svg';
    function triangleIcon(marks) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'opt-icon');
      svg.setAttribute('viewBox', '0 0 120 84');
      svg.setAttribute('aria-hidden', 'true');
      /* Scalene leans and has no two sides alike; the other two are
         symmetric, because a child should be able to see the symmetry
         the marks are claiming. */
      const pts = marks === 0 ? [[8, 76], [112, 76], [78, 14]]
                              : [[10, 76], [110, 76], [60, 12]];
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts.map(function (p) { return p.join(','); }).join(' '));
      poly.setAttribute('class', 'opt-tri');
      svg.appendChild(poly);

      /* A hash across the middle of a side, at right angles to it. The
         sides that get one: two for isosceles (the two that are equal),
         three for equilateral, none for scalene. */
      const sides = [[pts[0], pts[2]], [pts[1], pts[2]], [pts[0], pts[1]]];
      for (let i = 0; i < marks; i++) {
        const a = sides[i][0], b = sides[i][1];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L * 7, ny = dx / L * 7;
        const tick = document.createElementNS(NS, 'line');
        tick.setAttribute('x1', mx - nx); tick.setAttribute('y1', my - ny);
        tick.setAttribute('x2', mx + nx); tick.setAttribute('y2', my + ny);
        tick.setAttribute('class', 'opt-tick');
        svg.appendChild(tick);
      }
      return svg;
    }

    let builtKeys = '';
    function build(list) {
      list = list || CHOICES;
      /* Only rebuild when what is on the cards actually differs — and
         that is everything a card is made of, not just its key.

         It used to compare keys alone, so a screen supplying the same
         three answers under different WORDS got the cards it happened
         to have: screen 26 declared Scalene / Isosceles / Right-angled
         and was shown the component's own defaults, which say
         "Triangle" after each of them. Its `options` array had been
         dead for as long as the keys had matched. */
      const sig = list.map(function (c) {
        return [c.key, c.label || '', c.cls || '',
                c.marks == null ? '' : c.marks, c.dist || '',
                c.pic ? c.pic.x + ',' + c.pic.y : ''].join('\u0001');
      }).join('|');
      if (sig === builtKeys) { clearStates(); return; }
      builtKeys = sig;

      buttons.forEach(function (b) { root.removeChild(b); });
      buttons = [];
      list.forEach(function (c, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.classList.add('triangle-option');
        b.classList.add('opt-' + (i + 1));        // positional colour
        b.style.order = '1';                      // answers first, hint under
        // one class or several ('expr long')
        if (c.cls) String(c.cls).split(/\s+/).filter(Boolean)
          .forEach(function (k) { b.classList.add(k); });
        b.dataset.key = c.key;

        /* A choice can carry a drawing of itself. `marks` is how many
           of the triangle's sides are the same length — 0, 2 or 3 — and
           the drawing wears that many hash marks, which is the notation
           mathematics itself uses for "these are equal". It is not
           decoration: a question about which sides match is answered by
           reading exactly those marks, so a card that carries them
           stops being a word to recognise and becomes a definition to
           check what you measured against. */
        if (c.marks != null) {
          b.appendChild(triangleIcon(c.marks));
          b.classList.add('with-icon');
        }
        /* Or a picture of the place it names, cut from the town's own
           sheet (`pic`: the drawing's rect on it), so the card and the
           map show the same building — a card for a place (46). */
        if (c.pic) {
          const P = c.pic, H = 128, k = H / P.h;
          const pic = document.createElement('span');
          pic.className = 'opt-pic';
          pic.style.width = Math.round(P.w * k) + 'px';
          pic.style.height = H + 'px';
          pic.style.backgroundImage = 'url("' + (window.Preload ? window.Preload.url(P.src) : P.src) + '")';
          pic.style.backgroundSize = (P.sw * k) + 'px ' + (P.sh * k) + 'px';
          pic.style.backgroundPosition = (-P.x * k) + 'px ' + (-P.y * k) + 'px';
          b.appendChild(pic);
          b.classList.add('card');
        }
        const cap = document.createElement('span');
        cap.className = 'opt-label';
        cap.textContent = c.label;
        b.appendChild(cap);
        /* …and how far it is, in a box of its own under its name. */
        if (c.dist) {
          const box = document.createElement('span');
          box.className = 'opt-dist';
          const w = document.createElement('span');
          w.className = 'opt-dist-k';
          w.textContent = c.distWord || 'Distance';
          const v = document.createElement('span');
          v.className = 'opt-dist-v';
          v.textContent = c.dist;
          box.appendChild(w); box.appendChild(v);
          b.appendChild(box);
          b.classList.add('card');
        }

        b.addEventListener('click', function (e) {
          e.stopPropagation();        // a tap here must never skip the screen
          if (locked) return;
          /* One answer at a time: while the last one's red is still
             showing, a second tap is the same tap twice, not a second
             go — counted, a double tap spent both tries at once. */
          if (performance.now() < quietUntil) return;
          choose(c.key, b);
        });
        root.appendChild(b);
        buttons.push(b);
      });
    }
    build(opts.choices);

    // dragging or stray taps inside the panel stay inside it
    root.addEventListener('click', function (e) { e.stopPropagation(); });
    root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    let quietUntil = 0, redT = null;
    function choose(key, btn) {
      clearStates();
      btn.classList.add('selected');
      const right = (answerKey != null) && (key === answerKey);

      /* The border carries the verdict. Green is left showing — the
         screen goes on to work this answer through, and the child
         should still be able to see which one they picked; clearStates
         takes it off at the next question. Red clears itself, because
         the panel stays live for another go. */
      btn.classList.add(right ? 'correct' : 'incorrect');
      if (!right) {
        quietUntil = performance.now() + 700;
        clearTimeout(redT);
        redT = setTimeout(function () {
          btn.classList.remove('incorrect', 'selected');
        }, 700);
      }

      if (onAnswer) onAnswer(key, right);
    }

    /* Once the method is chosen the buttons give way to the working,
       in the same panel and the same place.

       A line can be a plain string, or parts — and a part that names a
       length carries the side of the triangle it belongs to. Those are
       lit one at a time rather than all at once, and each one tells the
       host which side it just named, so the board can light the same
       thing at the same moment. That is the whole point of the sequence:
       the words and the drawing say one thing together. */
    parent.appendChild(root);

    return {
      el: root,
      setChoices: function (list) { build(list); },

      /* Two answers that name two places on a map read as a pair when
         they sit side by side, and as a list when they are stacked.
         The panel lays them out in a row on request; anything else it
         holds — the hint row — takes a line of its own beneath. */
      setRow: function (on) { root.classList.toggle('pair', !!on); },
      /* Three side by side rather than stacked — for answers that are
         three of one kind of thing rather than a list to work down. */
      setTrio: function (on) { root.classList.toggle('trio', !!on); },
      /* Stacked, but as wide as the trio: for answers that are whole
         formulas (35). */
      setWide: function (on) { root.classList.toggle('wide', !!on); },
      setAnswer: function (k) { answerKey = k; },
      reset: function () {
        clearStates(); locked = false; quietUntil = 0;
      },
      lock: function () { locked = true; },
      /* Nobody got it, so the panel says which one it was. Locking
         alone leaves three live-looking answers under a bird who has
         just given the answer, which reads as a third go; the green
         border is how this panel has always said "this one", so it
         says it here too. */
      reveal: function () {
        locked = true;
        clearStates();
        buttons.forEach(function (b) {
          if (b.dataset.key === answerKey) b.classList.add('correct', 'selected');
          else b.classList.add('spent');
        });
      },
      /* `rising` is for the moment it takes the space Swifty has just
         flown out of: it comes up from below rather than appearing, so
         it is visibly settled by the time she lands on it. */
      show: function (rising) {
        root.classList.remove('hidden', 'rising');
        if (rising) { void root.offsetWidth; root.classList.add('rising'); }
      },
      hide: function () { root.classList.add('hidden'); },
      onAnswer: function (fn) { onAnswer = fn; }
    };
  }

  return { mount: mount };
})();
