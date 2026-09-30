/* =============================================================
   Screen jump — self-contained.

   A pill beside Next saying which screen you are on. Tap it and every
   screen in the script is listed; tap one and the game goes there.

   It is a way around the lesson rather than a part of it — for looking
   at one beat without playing the nine before it. Mount it and keep it
   told where the game is:

       const jump = ScreenJump.mount(nav, {
         screens: function () { return CFG.SCRIPT; },
         current: function () { return Game.index; },
         go:      function (i) { Game.goTo(i); }
       });
       jump.sync();          // after every screen change

   Everything it does goes through the host's `go`, so a jump is an
   ordinary screen change — the same one Back and Next make — and
   nothing here knows how the game works.
   ============================================================= */
window.ScreenJump = (function () {
  'use strict';

  /* What a screen is, in a few words. Her line where there is one,
     because that is what the screen is remembered by; otherwise what it
     is for, which is the next best handle. */
  function describe(s) {
    if (s.line) return s.line;
    if (s.lines && s.lines.length) return s.lines[0];
    if (s.task) return '(a question)';
    if (s.xEquation) return '(the subtraction, worked on the board)';
    if (s.examples) return '(pairs recalled)';
    if (s.segment || s.legs) return '(drawn, in silence)';
    return '(silent)';
  }

  function tagOf(s) {
    if (!s.task) return '';
    if (s.task.kind === 'choice') return 'choose';
    if (s.task.kind === 'entry') return 'type';
    if (s.task.kind === 'distance') return 'measure';
    return 'tap';
  }

  function mount(parent, opts) {
    opts = opts || {};
    const list = opts.screens || function () { return []; };
    const at = opts.current || function () { return 0; };
    const go = opts.go || function () {};

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'jumpBtn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Go to a screen');

    const count = document.createElement('span');
    count.className = 'jump-count';
    const chev = document.createElement('span');
    chev.className = 'jump-chev';
    chev.setAttribute('aria-hidden', 'true');
    btn.appendChild(count);
    btn.appendChild(chev);

    const panel = document.createElement('div');
    panel.id = 'jumpPanel';
    panel.setAttribute('role', 'listbox');

    const head = document.createElement('div');
    head.className = 'jump-head';
    head.textContent = 'Which screen?';
    /* Which copy of the game this is, so two laptops can be compared
       without leaving the screen: the host hands over the words. */
    const ver = typeof opts.version === 'function' ? opts.version() : opts.version;
    if (ver) {
      const v = document.createElement('span');
      v.className = 'jump-ver';
      v.textContent = ver;
      head.appendChild(v);
    }
    const rows = document.createElement('div');
    rows.className = 'jump-rows';
    panel.appendChild(head);
    panel.appendChild(rows);

    parent.appendChild(btn);
    parent.appendChild(panel);

    /* The scene advances on a click and the keyboard moves on space and
       the arrows. Every one of those would fire through this, so the
       whole thing swallows what it is given. */
    ['click', 'pointerdown', 'pointerup', 'keydown'].forEach(function (t) {
      panel.addEventListener(t, function (e) { e.stopPropagation(); });
      btn.addEventListener(t, function (e) { e.stopPropagation(); });
    });

    let open = false, built = 0;

    function build() {
      const ss = list();
      if (built === ss.length && rows.children.length) return;
      built = ss.length;
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      ss.forEach(function (s, i) {
        const r = document.createElement('button');
        r.type = 'button';
        r.className = 'jump-row';
        r.setAttribute('role', 'option');
        r.dataset.i = i;

        const n = document.createElement('span');
        n.className = 'jump-n';
        n.textContent = s.id;

        const t = document.createElement('span');
        t.className = 'jump-t';
        t.textContent = describe(s);

        r.appendChild(n);
        r.appendChild(t);
        const tag = tagOf(s);
        if (tag) {
          const g = document.createElement('span');
          g.className = 'jump-tag';
          g.textContent = tag;
          r.appendChild(g);
        }
        r.addEventListener('click', function (e) {
          e.stopPropagation();
          close();
          go(i);
        });
        rows.appendChild(r);
      });
    }

    /* Clicking anywhere else puts it away. Bound only while it is open,
       and in the capture phase so it is heard before the scene's own
       click listener gets the chance to advance a screen. */
    function away(e) {
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      close();
    }
    function onKey(e) { if (e.key === 'Escape') { close(); } }

    function show() {
      build();
      open = true;
      panel.classList.add('on');
      parent.classList.add('jumping');
      btn.setAttribute('aria-expanded', 'true');
      mark();
      /* Onto the one it is on, so a long script opens where you are
         rather than at the top. */
      const cur = rows.children[at()];
      if (cur) panel.querySelector('.jump-rows').scrollTop =
        Math.max(0, cur.offsetTop - 120);
      document.addEventListener('pointerdown', away, true);
      document.addEventListener('keydown', onKey, true);
    }

    function close() {
      open = false;
      panel.classList.remove('on');
      parent.classList.remove('jumping');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', onKey, true);
    }

    function mark() {
      const i = at();
      [].forEach.call(rows.children, function (r, n) {
        r.classList.toggle('here', n === i);
      });
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (open) close(); else show();
    });

    return {
      /* Told where the game is, after every change. */
      sync: function () {
        const ss = list(), i = at(), s = ss[i] || {};
        count.textContent = (s.id != null ? s.id : i + 1) + ' / ' +
                            (ss.length ? ss[ss.length - 1].id : 0);
        if (open) { build(); mark(); }
      },
      close: close
    };
  }

  return { mount: mount };
})();
