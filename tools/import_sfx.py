#!/usr/bin/env python3
"""Install a recorded sound effect: trim it, level it, embed it in index.html.

    python3 tools/import_sfx.py [--check]

The game ships as one file opened over file://, where Chrome refuses fetch()
and XHR, so a sampled cue cannot be loaded from assets/ at runtime. Each clip
is therefore embedded as a small base64 WAV between its markers in index.html:

    /* SFX:<name>:START */ ... /* SFX:<name>:END */

Recordings arrive with dead air in front of them (break.mp3 has 2.2 s of room
hiss before the screech), which would land the sound seconds after the event
it belongs to. For each clip this tool:

  1. DECODES it to mono PCM at RATE (macOS afconvert - no ffmpeg needed)
  2. FINDS the sound: the noise floor is the median 10 ms RMS of the clip; the
     onset is the first window ONSET_DB above it, the tail the last window
     TAIL_DB above it. Pre-roll/post-roll keep the attack and the ring-out.
  3. SHAPES it: a short fade-in so the cut never clicks, a longer fade-out so
     the tail dies naturally instead of ending on hiss, peak-normalised to
     PEAK_DB so every embedded cue sits at the same level.
  4. EMBEDS it as 16-bit WAV. --check prints what it found and writes the
     trimmed clip to docs/ for listening, without touching index.html.
"""
import base64, io, os, re, subprocess, sys, tempfile, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')

# name -> source recording
CLIPS = {
    'brake': 'assets/audios/break.mp3',
}

RATE = 24000            # a screech lives under 8 kHz; half of 48k halves the page weight
WIN = 0.010             # analysis window, s
ONSET_DB = 8            # this far above the floor is "the sound has started"
TAIL_DB = 6             # ...and this far above it is "still ringing"
PRE_ROLL = 0.015        # keep a little before the onset for the attack
POST_ROLL = 0.060
FADE_IN = 0.006
FADE_OUT = 0.14
PEAK_DB = -1.0


def decode(path):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'x.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % RATE, '-c', '1',
                        os.path.join(ROOT, path), wav], check=True)
        with wave.open(wav) as w:
            return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768


def trim(x):
    n = int(RATE * WIN)
    k = len(x) // n
    rms = np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9
    db = 20 * np.log10(rms)
    floor = np.median(db)
    loud = np.where(db > floor + ONSET_DB)[0]
    if not len(loud):
        raise SystemExit('no sound found above the noise floor')
    ring = np.where(db > floor + TAIL_DB)[0]
    a = max(0, int((loud[0] * WIN - PRE_ROLL) * RATE))
    b = min(len(x), int(((ring[-1] + 1) * WIN + POST_ROLL) * RATE))
    y = x[a:b].copy()
    fi, fo = int(FADE_IN * RATE), min(int(FADE_OUT * RATE), len(y) // 2)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo) ** 2
    y *= 10 ** (PEAK_DB / 20) / max(1e-9, np.abs(y).max())
    return y, a / RATE, b / RATE, floor, db.max()


def to_wav(y):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    return buf.getvalue()


def main():
    check = '--check' in sys.argv
    html = open(INDEX, encoding='utf-8').read()
    for name, src in CLIPS.items():
        y, t0, t1, floor, peak = trim(decode(src))
        data = to_wav(y)
        print(f'{name:8s} {src}: noise floor {floor:.0f} dB, peak {peak:.0f} dB')
        print(f'         kept {t0:.3f}-{t1:.3f} s ({t1 - t0:.2f} s), {len(data) // 1024} KB wav')
        if check:
            out = os.path.join(ROOT, 'docs', f'sfx_{name}_trimmed.wav')
            open(out, 'wb').write(data)
            print(f'         wrote {os.path.relpath(out, ROOT)}')
            continue
        pat = re.compile(r"(/\* SFX:%s:START \*/ ')[^']*(' /\* SFX:%s:END \*/)" % (name, name))
        if not pat.search(html):
            raise SystemExit(f'markers for {name} not found in index.html')
        html = pat.sub(lambda m: m.group(1) + base64.b64encode(data).decode() + m.group(2), html)
    if not check:
        open(INDEX, 'w', encoding='utf-8').write(html)
        print('embedded into index.html')


if __name__ == '__main__':
    main()
