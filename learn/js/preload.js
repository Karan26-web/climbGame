/* =============================================================
   Everything fetched before Play: every picture, every sound, the
   fonts — and the loading bar that says how far it has got.

   Each file is fetched with a streaming reader, so the bar moves by the
   byte rather than by the file: every file is weighed by its size on
   disk (js/asset-manifest.js, written from the files by
   tools/manifest.js) and then by the Content-Length the server sends,
   and the bar never goes backwards. What arrives becomes a blob: URL,
   and that is what the game uses — so "loaded" means the file is on the
   laptop, and nothing is fetched a second time.

   Fonts are the one exception to fetching: the page loads them for its
   own @font-face rules, and the bar counts each in, by its size, when it
   has arrived — a second fetch alongside would only download it twice.

   The order: the fonts and what the title screen shows first (its
   picture, the Play button, Swifty's flying and talking sheets), then
   everything else smallest-first, so the small pictures are never
   starved behind the music. Five at a time.

   Nothing here can hold the game up. A file that fails, stalls (15s
   without a byte), or cannot be fetched at all — the game opened
   straight from disk, where fetch is refused — counts as done, and
   whatever uses it keeps its ordinary address.

   The addresses are exactly the ones the game asks for, ?v= stamp and
   all (CFG.stamp), or the browser's own cache would never be warmed by
   them.
   ============================================================= */
window.Preload = (function () {
  'use strict';

  const SIZES = window.ASSET_MANIFEST || {};
  const CONCURRENCY = 5, STALL_MS = 15000;

  const blobs = {};          // address -> blob: URL
  const settled = {};        // address -> true once it is done, either way
  const waiting = {};        // address -> things to hand it to once it is

  /* Its path on disk, from an address that may carry a ?v= stamp. */
  function pathOf(u) { return decodeURIComponent(String(u).split('?')[0]); }

  /* The best address for a file: the blob once it is here, the ordinary
     address until then. */
  function url(u) { return blobs[u] || u; }

  /* Hand a file to something the moment it is ready: at once if it has
     arrived (the blob) or failed (its ordinary address), or when it does.
     Nothing is fetched twice — the element is only given an address once
     the loader has settled on one. An address the loader is not fetching
     is handed over at once. */
  function use(u, fn) {
    if (!u) return;
    if (blobs[u] || settled[u] || !(u in waiting)) { fn(url(u), !!blobs[u]); return; }
    waiting[u].push(fn);
  }

  /* An element's src — or its background-image (`bg`) — from the loader,
     with a way back: if the blob will not play or draw, it goes back once
     to the ordinary address (and a sound that was playing carries on). */
  function adopt(el, u, bg) {
    if (!el || !u) return;
    use(u, function (best, local) {
      if (bg) { el.style.backgroundImage = 'url("' + best + '")'; return; }
      if (local) {
        const back = function () {
          el.removeEventListener('error', back);
          const playing = el.tagName === 'AUDIO' && !el.paused;
          el.src = u;
          if (playing && el.play) { const p = el.play(); if (p && p.catch) p.catch(function () {}); }
        };
        el.addEventListener('error', back);
      }
      el.src = best;
    });
  }

  function finish(u, blobUrl) {
    if (blobUrl) blobs[u] = blobUrl;
    settled[u] = true;
    const list = waiting[u] || [];
    delete waiting[u];
    list.forEach(function (fn) { fn(url(u), !!blobs[u]); });
  }

  /* One file, streamed. Resolves with a Blob, or null for any failure. */
  function fetchOne(item, onBytes, onLength) {
    return new Promise(function (resolve) {
      if (location.protocol === 'file:' || !window.fetch) { resolve(null); return; }
      const ctl = window.AbortController ? new AbortController() : null;
      let stall = null;
      const arm = function () {
        clearTimeout(stall);
        stall = setTimeout(function () { if (ctl) ctl.abort(); resolve(null); }, STALL_MS);
      };
      arm();
      fetch(item.url, ctl ? { signal: ctl.signal } : {}).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const len = +res.headers.get('Content-Length');
        if (len > 0) onLength(len);
        const type = res.headers.get('Content-Type') || '';
        if (!res.body || !res.body.getReader) {
          return res.blob().then(function (b) { onBytes(b.size); return b; });
        }
        const reader = res.body.getReader(), parts = [];
        const pump = function () {
          return reader.read().then(function (r) {
            if (r.done) return new Blob(parts, { type: type });
            parts.push(r.value);
            onBytes(r.value.length);
            arm();
            return pump();
          });
        };
        return pump();
      }).then(function (blob) { clearTimeout(stall); resolve(blob); },
               function () { clearTimeout(stall); resolve(null); });
    });
  }

  /* A picture decoded as well as fetched, and held on to, so the first
     time it is drawn is not inside the animation that first shows it.
     Resolves true if it drew, false if it would not — and on its own
     after STALL_MS, like everything else here. */
  const decoded = [];
  function decode(src) {
    return new Promise(function (resolve) {
      const im = new Image();
      let over = false;
      const end = function (ok) { if (over) return; over = true; clearTimeout(cap); resolve(ok); };
      const cap = setTimeout(function () { end(true); }, STALL_MS);
      im.onload = function () {
        const ok = im.naturalWidth > 0;
        if (im.decode) im.decode().then(function () { end(ok); }, function () { end(ok); });
        else end(ok);
      };
      im.onerror = function () { end(false); };
      decoded.push(im);
      im.src = src;
    });
  }

  /* Fetch everything: each of `first` and `rest` a list of
     { url, pic, load } — `pic` for a picture, to be decoded too; `load`
     for a file the page fetches itself (a font), in place of fetching
     it here. `first` goes in the order given, ahead of the rest, which
     go smallest-first. onProgress(fraction) never goes back; onDone()
     once every file has settled. */
  function start(first, rest, onProgress, onDone) {
    const seen = {};
    const items = [];
    const add = function (f) {
      const u = f.url;
      if (!u || seen[u]) return;
      seen[u] = true;
      waiting[u] = [];
      items.push({ url: u, pic: !!f.pic, load: f.load || null, size: SIZES[pathOf(u)] || 60000, got: 0 });
    };
    first.forEach(add);
    const head = items.length;
    rest.forEach(add);
    const tail = items.slice(head).sort(function (a, b) { return a.size - b.size; });
    const queue = items.slice(0, head).concat(tail);

    let total = items.reduce(function (s, it) { return s + it.size; }, 0) || 1;
    let got = 0, shown = 0, left = queue.length, next = 0;
    const tell = function () {
      const f = Math.min(1, got / total);
      if (f > shown) { shown = f; onProgress(shown); }
    };
    const settle = function (it) {
      got += Math.max(0, it.size - it.got);        // done is done, whatever arrived
      it.got = it.size;
      tell();
      if (--left === 0) { onProgress(1); onDone(); }
    };
    const work = function () {
      if (next >= queue.length) return;
      const it = queue[next++];
      /* Something the page loads itself — a font face, which the browser
         fetches for its @font-face rule and which a second fetch here
         could only duplicate: it is counted in, by its size, when it has
         arrived (or failed, or taken too long). */
      if (it.load) {
        let over = false;
        const end = function () { if (over) return; over = true; clearTimeout(cap); finish(it.url, null); settle(it); work(); };
        const cap = setTimeout(end, STALL_MS);
        Promise.resolve().then(it.load).then(end, end);
        return;
      }
      fetchOne(it, function (n) {
        const add = Math.min(n, Math.max(0, it.size - it.got));
        it.got += add; got += add; tell();
      }, function (len) {
        total += len - it.size; it.size = len;       // the server knows best
      }).then(function (blob) {
        const blobUrl = blob ? URL.createObjectURL(blob) : null;
        if (!it.pic) { finish(it.url, blobUrl); return null; }
        /* A picture is drawn once before it is handed out. A copy that
           arrived and will not draw is dropped for the ordinary address:
           a background — most of the pictures here — has no error event
           to fall back on later. */
        return decode(blobUrl || it.url).then(function (ok) {
          if (!ok && blobUrl) { URL.revokeObjectURL(blobUrl); finish(it.url, null); }
          else finish(it.url, blobUrl);
        });
      }).then(function () { settle(it); work(); });
    };
    if (!queue.length) { onProgress(1); onDone(); return; }
    for (let i = 0; i < CONCURRENCY; i++) work();
  }

  return { start: start, url: url, adopt: adopt };
})();
