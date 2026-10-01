#!/usr/bin/env python3
"""Install the recorded voice lines: cut, level, and write vo.js.

    python3 tools/import_vo.py [--check] [--scan]

The game speaks the three lines of the road explained (intro.line1..3 in
i18n/strings.json) at the first chasm. Each language's lines arrive as ONE
recording, read in the order the game says them (art_src/audio/vo_<lang>_
intro.opus - Ogg Opus, as every source recording here is), and are cut here into one clip per line. Like the effects, the
clips ship inside a generated script - base64 Ogg Opus - because the game
opens over file://, where fetch() is refused:

    assets/audio/vo.js      window.CG_VO = { en: { 'intro.line1': [secs, '<base64>'], ... } }

The game (A.say) picks the clip for the current language and the line's
i18n key; a language with no recording, or a line missing from one, simply
shows its words for the written time instead, so a gap here is quiet rather
than broken. The length is written next to the clip because the words are
paced to it (the line holds for the voice plus a breath).

CUTS: where each line sits in its recording, in seconds. They are found
with --scan, which prints every stretch of sound between the silences
(a pause inside a line - "Oops, | the road is broken" - can show as two;
listen and join them), and written down here so a re-run cuts the same
clips. A clip opens
PRE s before the first sound and closes POST s after the last; the cut
never clicks (short fades) and every line sits at the same loudness
(RMS over the clip to VOICE_RMS, peak capped), so one line is never
louder than the next. Encoding is import_sfx's (libopus through PyAV).

--check prints what it cut and writes the clips to a temp dir for
listening, without touching vo.js.
"""
import base64, os, sys, tempfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_sfx as S

ROOT = S.ROOT
OUT = os.path.join(ROOT, 'assets', 'audio', 'vo.js')
RATE = S.RATE

A = 'art_src/audio/'
# lang -> (recording, [(i18n key, first sound s, last sound s), ...])
CUTS = {
    'en': (A + 'vo_en_intro.opus', [
        ('intro.line1', 0.12, 2.20),      # Oops, the road is broken!
        ('intro.line2', 2.87, 7.38),      # To cross this gap, we need to know ...
        ('intro.line3', 7.53, 10.56),     # Let's explore how to find that ...
    ]),
}

PRE, POST = 0.05, 0.06      # kept either side of the words, s
FADE_IN, FADE_OUT = 0.008, 0.05
VOICE_RMS = -20.0           # every line levelled to this, dBFS
PEAK_DB = -1.0
WIN = 0.010
SCAN_GAP = 0.12             # a silence this long separates two lines (--scan)
SCAN_DB = 12                # ...sound is this far above the noise floor


def profile(x):
    n = int(RATE * WIN)
    k = len(x) // n
    rms = np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9
    return 20 * np.log10(rms)


def scan(path):
    """Every stretch of sound between silences longer than SCAN_GAP."""
    x = S.decode(path)
    db = profile(x)
    on = db > np.percentile(db, 10) + SCAN_DB
    segs, i, gap = [], 0, int(SCAN_GAP / WIN)
    while i < len(on):
        if not on[i]:
            i += 1; continue
        j = i
        while True:
            nxt = np.where(on[j + 1:j + 1 + gap])[0]
            if not len(nxt): break
            j += 1 + nxt[-1]
        segs.append((i * WIN, (j + 1) * WIN)); i = j + 1
    print(f'{path}: {len(x) / RATE:.2f} s, {len(segs)} stretches of sound')
    for a, b in segs:
        print(f'  {a:6.2f} - {b:6.2f}   ({b - a:.2f} s)')


def cut(x, t0, t1):
    a, b = max(0, int((t0 - PRE) * RATE)), min(len(x), int((t1 + POST) * RATE))
    y = x[a:b].copy()
    fi, fo = int(FADE_IN * RATE), int(FADE_OUT * RATE)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo) ** 2
    y *= 10 ** (VOICE_RMS / 20) / max(1e-9, np.sqrt((y ** 2).mean()))
    pk = np.abs(y).max()
    if pk > 10 ** (PEAK_DB / 20):
        y *= 10 ** (PEAK_DB / 20) / pk
    return y


def main():
    if '--scan' in sys.argv:
        for lang, (src, _) in CUTS.items():
            scan(src)
        return
    check = '--check' in sys.argv
    tmp = tempfile.mkdtemp(prefix='vo_check_') if check else None
    out, total = {}, 0
    for lang, (src, lines) in CUTS.items():
        x = S.decode(src)
        out[lang] = {}
        for key, t0, t1 in lines:
            if t1 <= t0 or t1 * RATE > len(x):
                raise SystemExit(f'{lang} {key}: cut {t0}-{t1} s is outside the recording')
            y = cut(x, t0, t1)
            data = S.to_opus(y)
            total += len(data)
            secs = len(y) / RATE
            print(f'{lang} {key:12s} {secs:5.2f} s {len(data) // 1024:3d} KB  cut {t0:.2f}-{t1:.2f} s  <- {src}')
            if check:
                open(os.path.join(tmp, f'{lang}-{key}.opus'), 'wb').write(data)
            out[lang][key] = (round(secs, 2), base64.b64encode(data).decode())
    if check:
        print(f'\nwrote the clips to {tmp} for listening; vo.js untouched')
        return
    lines = ['/* GENERATED by tools/import_vo.py - do not edit by hand; re-run the tool.',
             '   The spoken lines of the road explained, per language and i18n key, as',
             '   [seconds, base64 Ogg Opus (mono, %d kbps)] - a <script> because file://' % S.OPUS_KBPS,
             '   refuses fetch(). Recordings: art_src/audio/SOURCES.md. */',
             'window.CG_VO = {']
    langs = list(out.items())
    for li, (lang, clips) in enumerate(langs):
        lines.append('  %s: {' % lang)
        items = list(clips.items())
        for i, (key, (secs, b64)) in enumerate(items):
            lines.append("    '%s': [%s, '%s']%s" % (key, secs, b64, ',' if i < len(items) - 1 else ''))
        lines.append('  }' + (',' if li < len(langs) - 1 else ''))
    lines.append('};')
    open(OUT, 'w').write('\n'.join(lines) + '\n')
    print(f'\nwrote {OUT}: {sum(len(c) for c in out.values())} clips, {total // 1024} KB of audio')


if __name__ == '__main__':
    main()
