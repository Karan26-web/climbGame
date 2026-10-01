/* =============================================================
   Embedded in another page — Cliff Cross.

   Opened as index.html?embed=1 inside an <iframe>, the lesson tells the
   page around it two things, by postMessage:

     { type: 'distance-formula:ready' }     the page has loaded
     { type: 'distance-formula:complete' }  the last screen has been said,
                                            or Next pressed on it
                                            (Game.ended, js/game.js)

   and listens for one thing back:

     { type: 'climbgame:show' }             the page has just put the
                                            lesson up. Passed on as a
                                            'lesson:show' event on the
                                            window: the lesson then skips
                                            its title screen - no flight,
                                            no Play - and opens straight
                                            on its first screen
                                            (offerPlay, js/game.js). The
                                            frame is fetched unseen well
                                            before it is shown, so this,
                                            and not the load, is when it
                                            starts.

   The target origin is '*' because the page around it may be opened
   from a file (a null origin), and nothing in the message is private.
   Nothing else changes: opened on its own, or without ?embed=1, this
   file does nothing at all.
   ============================================================= */
(function () {
  'use strict';
  const embedded = /[?&]embed=1(&|$)/.test(location.search) &&
                   window.parent && window.parent !== window;
  if (!embedded) return;
  document.documentElement.classList.add('embedded');

  /* Inside the game the lesson carries no navigation at all. Its
     screens hand over by themselves (CFG.AUTO: each settles after its
     line, its answer or its drawing - the three formula screens too,
     before their corner Next would show), so Next, the corner Next,
     Back and the screen picker are all ways AROUND the lesson rather
     than parts of it. They stay for the standalone page and are not
     carried here: the picker is switched off at its one switch
     (CFG.NAV.jump, read when the game boots, which is after this script
     runs); the buttons are hidden, not removed, because game.js still
     holds them. */
  if (window.CFG && window.CFG.NAV) window.CFG.NAV.jump = false;
  const style = document.createElement('style');
  style.textContent = 'html.embedded #nav, html.embedded #goOn, html.embedded #jumpPanel { display: none !important; }';
  document.head.appendChild(style);

  const tell = function (what) {
    try { window.parent.postMessage({ type: 'distance-formula:' + what }, '*'); } catch (e) {}
  };
  window.addEventListener('lesson:end', function () { tell('complete'); });
  window.addEventListener('message', function (e) {
    const d = e.data;
    if (e.source !== window.parent || !d || typeof d !== 'object') return;
    if (d.type === 'climbgame:show') window.dispatchEvent(new CustomEvent('lesson:show'));
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tell('ready'); });
  } else tell('ready');
})();
