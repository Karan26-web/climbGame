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
