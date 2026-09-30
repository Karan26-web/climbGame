/* =============================================================
   x₁, y₁, x₂, y₂ set as mathematics — the way LaTeX sets \(x_1\):
   the letter in italic, and its number a real subscript, below the
   line.

   They are written with the subscript digits (₁, ₂) everywhere — in
   her lines, in the labels on the board, in the formula table and the
   working — and Nunito, the face those digits come from, draws them as
   small numbers standing ON the line (0 to 0.43 em), which reads as
   "x2" rather than as x-sub-2. So wherever such a pair is written, by
   whatever writes it, it is set here: the letter in its own span and
   the digit in another, dropped below the line.

   The characters themselves are left exactly as they were, only
   wrapped. Everything that reads a label back (and several things do —
   a coordinate is carried from one label to the next by its text) gets
   the same text it wrote. The drop moves the digit without moving
   anything after it, and the slant keeps the letter's width, so a line
   measured before it was set here is still the size it measured.
   ============================================================= */
(function () {
  'use strict';

  /* A letter and its number (x₂); or the letter of an axis's name, "the
     x-axis", which is the same x. */
  const PAIR = /([xy])([₀-₉])|\b([xy])(?=-axis)/g;
  const SVG = 'http://www.w3.org/2000/svg';
  /* A subscript's drop, as TeX sets one in running text: its foot well
     under the line and its top below the letter's middle. */
  const DROP = 0.18;

  function isSet(el) {
    return !!(el && el.classList &&
              (el.classList.contains('mvar') || el.classList.contains('msub')));
  }

  function set(text) {
    const parent = text.parentNode;
    if (!parent || isSet(parent)) return;
    const s = text.data;
    PAIR.lastIndex = 0;
    if (!PAIR.test(s)) return;
    const inSvg = parent.namespaceURI === SVG;
    const piece = function (cls, str) {
      const n = inSvg ? document.createElementNS(SVG, 'tspan')
                      : document.createElement('span');
      n.setAttribute('class', cls);
      /* In a drawing, as attributes: SVG text takes its shift from
         baseline-shift, which moves the one glyph and leaves the rest of
         the line — even the rest in other tspans, as a label's pieces
         are — on its own baseline. (A dy would carry on through all of
         them.) A browser that ignores it leaves the digit where Nunito
         draws it, which is where it was before. */
      if (inSvg && cls === 'mvar') n.setAttribute('font-style', 'italic');
      if (inSvg && cls === 'msub') n.setAttribute('baseline-shift', (-DROP) + 'em');
      n.textContent = str;
      return n;
    };
    const out = document.createDocumentFragment();
    let at = 0, m;
    PAIR.lastIndex = 0;
    while ((m = PAIR.exec(s))) {
      if (m.index > at) out.appendChild(document.createTextNode(s.slice(at, m.index)));
      if (m[3]) out.appendChild(piece('mvar', m[3]));
      else {
        out.appendChild(piece('mvar', m[1]));
        out.appendChild(piece('msub', m[2]));
      }
      at = m.index + m[0].length;
    }
    if (at < s.length) out.appendChild(document.createTextNode(s.slice(at)));
    /* In a box that lays its children out as items — a grid or a flex
       row, like a tile of the table's scroller — the letter and its
       digit would each become an item of their own, and a grid stacks
       its items: the digit fell out of the bottom of its tile, and a
       whole "x₂ − x₁" came out as a column under it. There, the setting
       goes in as one piece, which flows as a line. */
    if (!inSvg && /(grid|flex)/.test(getComputedStyle(parent).display)) {
      const one = document.createElement('span');
      one.className = 'mtext';
      one.appendChild(out);
      parent.replaceChild(one, text);
      return;
    }
    parent.replaceChild(out, text);
  }

  function setAll(root) {
    if (root.nodeType === 3) { set(root); return; }
    if (root.nodeType !== 1 || isSet(root)) return;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walk.nextNode()) found.push(walk.currentNode);
    found.forEach(set);
  }

  /* Whatever is written from now on, as it is written. Only text going
     in is looked at: the game restyles its elements constantly, and none
     of that is a reason to look. */
  const watch = new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.type === 'characterData') set(m.target);
      else m.addedNodes.forEach(setAll);
    });
  });
  /* At once, for what is measured the moment it is written (her balloon
     is cut to its line before the line is shown): measured unset, it was
     measured in another face. */
  window.MathText = { set: setAll };

  const start = function () {
    setAll(document.body);
    watch.observe(document.body, { childList: true, characterData: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
