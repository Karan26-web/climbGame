#!/usr/bin/env python3
"""Install the recorded sound effects: trim, loop, level, and write sfx.js.

    python3 tools/import_sfx.py [--check]

The game is opened straight off the disk (file://), where Chrome refuses
fetch() and XHR, so a sampled cue cannot be loaded from assets/ as audio.
A <script src> still loads, though - so every clip is written, as a small
base64 Ogg Opus file (mono, OPUS_KBPS), into one generated script:

    assets/audio/sfx.js      window.CG_SFX = { name: '<base64 ogg opus>', ... }

The encoder - and the decoder, since the sources are Ogg Opus, which
macOS's afconvert cannot read - is libopus through PyAV (`python3 -m pip
install --user av`; there is no ffmpeg on this machine). Opus keeps the
exact sample count through a decode (pre-skip and end trimming are in the
Ogg headers), which is what lets the two saw loops stay seamless.

which index.html includes ahead of the game and decodes once audio starts
(A.loadEmbedded). Any cue missing from it - or the whole file - falls back
to the synthesised version, so the game never goes silent.

Recordings arrive with dead air in front of them (break.opus has 2.2 s of room
hiss before the screech), which would land the sound seconds after the event
it belongs to. For each ONE-SHOT this tool:

  1. DECODES it to mono PCM at RATE (PyAV; the sources are Ogg Opus)
  2. FINDS the sound: a noise floor (see FLOOR below), the onset the first
     10 ms window ONSET_DB above it, the tail the last window TAIL_DB above
     it. Pre-roll/post-roll keep the attack and the ring-out; `max` caps how
     long a long recording may ring.
  3. SHAPES it: a short fade-in so the cut never clicks, a longer fade-out so
     the tail dies naturally instead of ending on hiss, peak-normalised to
     PEAK_DB so every one-shot sits at the same level (the mix is set by the
     playback gains in A.sfx, not here).

A LOOP ({'loop': (a, b)}) is the stretch a..b seconds of its recording made
seamless: the XFADE after b is cross-faded (equal power) into the start, so
the last sample runs straight on into the first. It is levelled to LOOP_RMS
rather than by peak - the saw's two loops (motor, cut) have to match.

--check prints what it found and writes every processed clip to a temp dir
for listening, without touching sfx.js. Sources and licences: art_src/audio/SOURCES.md.
"""
import base64, io, math, os, sys, tempfile
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio', 'sfx.js')

A = 'art_src/audio/'
SAW = A + 'fs411222_iternetcone_makita_table_saw.opus'
# name -> (source recording, options)
CLIPS = {
    'brake':   (A + 'break.opus', {'floor': 'median'}),
    # the stop at a chasm, layered on the screech: the tyres scrubbing to a
    # halt on the gravel, then the air brakes letting go once it is stood
    'skid':    (A + 'fs637161_kyles_car_stop_brake_skid_gravel.opus', {}),
    'airbrake': (A + 'fs705390_chungus43A_air_brake_applied.opus', {'max': 1.05}),
    # the plank machine
    'saw_run': (SAW, {'loop': (5.0, 6.0)}),      # the motor at speed, no load
    'saw_cut': (SAW, {'loop': (3.2, 4.2)}),      # the blade in the wood
    'lever':   (A + 'kenney_rpg_metalLatch.opus', {}),
    'tick':    (A + 'kenney_impactMetal_light_001.opus', {}),
    'chop':    (A + 'kenney_rpg_chop.opus', {}),
    'plank':   (A + 'kenney_impactWood_light_002.opus', {}),   # off the end of the belt
    'slam':    (A + 'kenney_impactPlank_medium_001.opus', {}),
    'poof':    (A + 'fs208111_planman_poof_of_smoke.opus', {'max': 0.8}),
    'sink':    (A + 'fs90143_pengo_au_steam_burst.opus', {'max': 0.9}),
    'bump':    (A + 'kenney_impactMetal_medium_001.opus', {}),
}

RATE = 24000            # these cues live under 10 kHz; Opus takes 24 kHz input directly
OPUS_KBPS = 48          # mono VBR: transparent for effects, a tenth of the PCM
WIN = 0.010             # analysis window, s
ONSET_DB = 8            # this far above the floor is "the sound has started"
TAIL_DB = 6             # ...and this far above it is "still ringing"
FLOOR_SPAN = 60         # a 'quiet' floor never sits more than this below the peak
PRE_ROLL = 0.015        # keep a little before the onset for the attack
POST_ROLL = 0.060
FADE_IN = 0.006
FADE_OUT = 0.14
PEAK_DB = -1.0
XFADE = 0.08            # loop seam cross-fade, s
LOOP_RMS = -20.0        # loops are levelled by RMS, dBFS


def decode(path):
    """A recording (Ogg Opus, or anything else ffmpeg reads) as mono float
    PCM at RATE, -1..1."""
    try:
        import av
    except ImportError:
        raise SystemExit('PyAV is needed to decode the sources: python3 -m pip install --user av')
    chunks = []
    with av.open(os.path.join(ROOT, path)) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=RATE)
        for fr in c.decode(audio=0):
            chunks += [r.to_ndarray() for r in rs.resample(fr)]
        chunks += [r.to_ndarray() for r in rs.resample(None)]
    if not chunks:
        raise SystemExit(f'no audio in {path}')
    return np.concatenate(chunks, axis=1)[0].astype(np.float64) / 32768


def trim(x, opt):
    """FLOOR: 'median' - the median window, right for a take that is mostly
    room tone (the brake recording); otherwise 'quiet' - the 10th percentile,
    for clean library clips where the sound fills most of the file and the
    median would sit halfway down its own decay."""
    n = int(RATE * WIN)
    k = len(x) // n
    rms = np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9
    db = 20 * np.log10(rms)
    if opt.get('floor') == 'median':
        floor = np.median(db)
    else:
        floor = max(np.percentile(db, 10), db.max() - FLOOR_SPAN)
    loud = np.where(db > floor + ONSET_DB)[0]
    if not len(loud):
        raise SystemExit('no sound found above the noise floor')
    ring = np.where(db > floor + TAIL_DB)[0]
    a = max(0, int((loud[0] * WIN - PRE_ROLL) * RATE))
    b = min(len(x), int(((ring[-1] + 1) * WIN + POST_ROLL) * RATE))
    if 'max' in opt:
        b = min(b, a + int(opt['max'] * RATE))
    y = x[a:b].copy()
    fi, fo = int(FADE_IN * RATE), min(int(FADE_OUT * RATE), len(y) // 2)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo) ** 2
    y *= 10 ** (PEAK_DB / 20) / max(1e-9, np.abs(y).max())
    return y, a / RATE, b / RATE, floor, db.max()


def make_loop(x, span):
    a, b = int(span[0] * RATE), int(span[1] * RATE)
    X, L = int(XFADE * RATE), b - a
    seg = x[a:b + X]
    if len(seg) < L + X:
        raise SystemExit('loop runs past the end of its recording')
    w = np.linspace(0, 1, X) * math.pi / 2
    y = seg[:L].copy()
    y[:X] = seg[L:L + X] * np.cos(w) + seg[:X] * np.sin(w)     # the tail runs on into the head
    y *= 10 ** (LOOP_RMS / 20) / np.sqrt((y ** 2).mean())
    pk = np.abs(y).max()
    if pk > 10 ** (PEAK_DB / 20):
        y *= 10 ** (PEAK_DB / 20) / pk
    return y


def to_opus(y):
    """One clip as an Ogg Opus file, mono, VBR at OPUS_KBPS."""
    try:
        import av
    except ImportError:
        raise SystemExit('PyAV is needed for the Opus encoder: python3 -m pip install --user av')
    buf = io.BytesIO()
    with av.open(buf, 'w', format='ogg') as out:
        st = out.add_stream('libopus', rate=RATE, layout='mono')
        st.bit_rate = OPUS_KBPS * 1000
        st.options = {'vbr': 'on', 'application': 'audio'}
        frame = av.AudioFrame.from_ndarray((np.clip(y, -1, 1) * 32767).astype(np.int16).reshape(1, -1),
                                           format='s16', layout='mono')
        frame.sample_rate = RATE
        frame.pts = 0
        for pkt in st.encode(frame):
            out.mux(pkt)
        for pkt in st.encode(None):
            out.mux(pkt)
    return buf.getvalue()


def main():
    check = '--check' in sys.argv
    tmp = tempfile.mkdtemp(prefix='sfx_check_') if check else None
    out, total = {}, 0
    for name, (src, opt) in CLIPS.items():
        x = decode(src)
        if 'loop' in opt:
            y = make_loop(x, opt['loop'])
            desc = f'loop {opt["loop"][0]:.2f}-{opt["loop"][1]:.2f} s, seam cross-faded {XFADE * 1000:.0f} ms'
        else:
            y, t0, t1, floor, peak = trim(x, opt)
            desc = f'kept {t0:.3f}-{t1:.3f} s (floor {floor:.0f} dB, peak {peak:.0f} dB)'
        data = to_opus(y)
        total += len(data)
        print(f'{name:8s} {len(y) / RATE:5.2f} s {len(data) // 1024:4d} KB  {desc}   <- {src}')
        if check:
            open(os.path.join(tmp, name + '.opus'), 'wb').write(data)
        out[name] = base64.b64encode(data).decode()
    if check:
        print(f'\nwrote {len(out)} clips to {tmp} for listening; sfx.js untouched')
        return
    lines = ['/* GENERATED by tools/import_sfx.py - do not edit by hand; re-run the tool.',
             '   Recorded cues as base64 Ogg Opus (mono, %d kbps), loaded with a <script> tag' % OPUS_KBPS,
             '   because file:// refuses fetch(). Sources and licences: art_src/audio/SOURCES.md. */',
             'window.CG_SFX = {']
    lines += ['  %s: \'%s\'%s' % (n, b, ',' if i < len(out) - 1 else '') for i, (n, b) in enumerate(out.items())]
    lines += ['};', '']
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w').write('\n'.join(lines))
    print(f'\nwrote {os.path.relpath(OUT, ROOT)}: {len(out)} cues, {total // 1024} KB of audio, '
          f'{os.path.getsize(OUT) // 1024} KB as base64')


if __name__ == '__main__':
    main()
