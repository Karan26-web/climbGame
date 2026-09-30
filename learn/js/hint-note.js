/* =============================================================
   "Need a hint?" — self-contained.

   A quiet row that opens one sentence. Mount it into whatever holds
   the answers:

       const hint = HintNote.mount(panel.root);
       hint.set('Count across and up from the house to each cafe.');
       hint.show();

   The rules it exists to keep are teaching rules, not layout ones:

     * It is optional and invisible in its effect. Nothing waits for
       it, nothing is gated on it, and the beat plays out the same
       whether it is touched or not. A child who does not need it must
       not be slowed by it; a child who does must not feel marked.
     * It gives the method, never the answer. The moment a hint names
       the answer it has stopped being a scaffold.
     * One sentence. A paragraph of help reads as punishment.

   It reports nothing to anybody, because nothing may depend on it.
   ============================================================= */
window.HintNote = (function () {
  'use strict';

  function mount(parent) {
    const root = document.createElement('div');
    root.className = 'hint-note';

    const bar = document.createElement('button');
    bar.type = 'button';
    bar.className = 'hint-bar';
    bar.setAttribute('aria-expanded', 'false');

    const bulb = document.createElement('span');
    bulb.className = 'hint-bulb';
    bulb.setAttribute('aria-hidden', 'true');
    bulb.textContent = '💡';

    const label = document.createElement('span');
    label.className = 'hint-label';
    label.textContent = 'Need a hint?';

    const chev = document.createElement('span');
    chev.className = 'hint-chev';
    chev.setAttribute('aria-hidden', 'true');

    bar.appendChild(bulb);
    bar.appendChild(label);
    bar.appendChild(chev);

    const body = document.createElement('div');
    body.className = 'hint-body';

    root.appendChild(bar);
    root.appendChild(body);
    parent.appendChild(root);

    /* A tap here is not a tap on the screen: the scene listens for
       clicks to advance, and opening a hint must never skip the beat
       it belongs to. */
    root.addEventListener('click', function (e) { e.stopPropagation(); });
    root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    bar.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = !root.classList.contains('open');
      root.classList.toggle('open', open);
      bar.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    function close() {
      root.classList.remove('open');
      bar.setAttribute('aria-expanded', 'false');
    }

    return {
      /* The sentence. Setting it closes the row: a hint carried open
         from the last question would be answering this one. */
      set: function (text) {
        body.textContent = text || '';
        close();
      },
      show: function () { root.classList.add('on'); },
      hide: function () { root.classList.remove('on'); close(); }
    };
  }

  return { mount: mount };
})();
