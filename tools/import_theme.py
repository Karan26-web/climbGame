#!/usr/bin/env python3
"""Install a delivered theme pack into assets/, repairing and verifying it first.

    python3 tools/import_theme.py <png_masters_dir> [--theme NAME] [--dry-run]

With --theme NAME the pack is installed as a SEASON under assets/themes/NAME/
(summer, autumn, winter — the engine cycles through whichever of these exist)
instead of replacing the built-in spring set in assets/background + terrain.
A night_sky.png in the masters dir, if present, is installed as the shared
assets/themes/night_sky.webp: opaque, 1774x887, tiling left/right.

Art arrives from an image model as PNG masters. Three things always have to
happen before it can be trusted in the engine, and doing them by hand is how a
seam or a half-transparent edge ships:

  1. REPAIR  - alpha clamped (a >= 250 -> 255) and RGB bled outward into the
               transparent pixels, so bilinear filtering cannot drag stray
               colour into a canopy edge when the layer is pre-scaled. Same
               treatment tools/build_assets.py gives every other sprite.
               Plus per-file repairs listed in REPAIRS below.
  2. VERIFY  - the renderer depends on exact geometry: each layer's transparent
               top fraction is a hard-coded crop in index.html, and every
               background layer is tiled, so its left and right edges must
               meet. A file that fails is reported and NOT installed.
  3. CONVERT - to .webp at the sizes the engine already expects.

Run it again after any re-render; it is idempotent.
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# name -> (destination, expected size, expected transparent top rows or None)
# The top-row numbers are the `top:` constants in index.html's LAYERS table and
# R.drawForeground; changing the art means changing both, together.
CONTRACT = {
    'sky':              ('assets/background/sky.webp',              (1774, 887), None),
    'hills_far':        ('assets/background/hills_far.webp',        (1774, 887), 618),
    'hills_mid':        ('assets/background/hills_mid.webp',        (1774, 887), 508),
    'trees_near':       ('assets/background/trees_near.webp',       (1774, 887), 312),
    'foreground_grass': ('assets/background/foreground_grass.webp', (2172, 724), 232),
    'grass_top':        ('assets/terrain/grass_top.webp',           (2508, 627), None),
    'dirt_body':        ('assets/terrain/dirt_body.webp',           (1254, 1254), None),
}
TILES_BOTH_WAYS = {'dirt_body'}
# shared, optional: installed only when the file is in the masters dir
EXTRAS = {
    'night_sky': ('assets/themes/night_sky.webp', (1774, 887), None),
}


def theme_dest(dest, theme):
    """assets/background/sky.webp -> assets/themes/<theme>/sky.webp"""
    return os.path.join('assets', 'themes', theme, os.path.basename(dest))
SEAM_TOLERANCE = 8.0          # mean abs RGB difference between first/last edge


def haze_dissolve(arr, row, depth):
    """Dissolve a hard horizontal cut into distance haze.

    The delivered hills_mid is composited from two pieces: flat atmospheric
    haze above, fully detailed farmland below, meeting on a straight line that
    runs the whole width of the frame. In game that reads as a seam across the
    sky rather than as distance.

    Blurring across it does not work — the two sides differ in CONTENT, not
    sharpness, so a blur just smears the fields. Instead the haze colour from
    just above the cut is carried down over the artwork and faded out, so the
    farmland emerges from mist. That is what the painting should have done, and
    it keeps every bit of detail below the fade.
    """
    out = arr.copy().astype(float)
    h = out.shape[0]
    depth = min(depth, h - row)
    src = out[max(0, row - 10):row]                       # the flat haze band
    op = src[:, :, 3] > 250
    col = np.zeros((out.shape[1], 3))
    for x in range(out.shape[1]):
        m = op[:, x]
        col[x] = src[m, x, :3].mean(0) if m.any() else src[:, x, :3].mean(0)
    for i in range(depth):
        t = i / float(depth)
        t = t * t * (3 - 2 * t)                           # smoothstep
        out[row + i, :, :3] = col * (1 - t) + out[row + i, :, :3] * t
    return out.round().clip(0, 255).astype(np.uint8)


def patch_copy(arr, x0, y0, x1, y1, src_x, feather=14):
    """Replace a rectangular defect with clean pixels from elsewhere in the tile.

    The delivered trees_near carries a pale rectangular wash over one bush —
    a compositing artifact, not paint. There is nothing to recover inside it,
    so a clean stretch of the same bush band is copied over it with a feathered
    mask. It works because this layer IS a repeating row of trees and bushes:
    the eye has no landmark to check the copy against. The source offset is
    chosen by matching the rows immediately above and below the defect, so the
    patch continues the surrounding silhouette instead of cutting it.

    The defect must not touch the left or right edge, or the copy would break
    the horizontal tiling; import_theme verifies the seam afterwards either way.
    """
    out = arr.copy().astype(float)
    w, h = x1 - x0, y1 - y0
    src = out[y0:y1, src_x:src_x + w].copy()
    mask = np.ones((h, w, 1))
    for i in range(feather):
        t = (i + 1) / float(feather + 1)
        mask[i, :, 0] = np.minimum(mask[i, :, 0], t)
        mask[h - 1 - i, :, 0] = np.minimum(mask[h - 1 - i, :, 0], t)
        mask[:, i, 0] = np.minimum(mask[:, i, 0], t)
        mask[:, w - 1 - i, 0] = np.minimum(mask[:, w - 1 - i, 0], t)
    out[y0:y1, x0:x1] = out[y0:y1, x0:x1] * (1 - mask) + src * mask
    return out.round().clip(0, 255).astype(np.uint8)


REPAIRS = {
    # measured, not guessed: the cut is at row 613 (tools/import_theme.py found
    # a 13-point brightness step there against < 1 everywhere else)
    'hills_mid': [('haze_dissolve', 613, 70)],
    # a flat green block with a pale edge pasted over one bush, x 80-273 /
    # y 735-760. The rect below is deliberately larger than the defect: the
    # feather must fall entirely OUTSIDE it, or the defect survives at reduced
    # opacity inside the blend. Source offset 850 scored best on the rows above
    # and below.
    'trees_near': [('patch_copy', 55, 712, 300, 788, 850, 12)],
}


def fix_alpha(rgba):
    """Clamp near-opaque alpha and bleed RGB outward into transparency."""
    out = rgba.copy()
    a = out[:, :, 3].astype(int)
    a[a >= 250] = 255
    out[:, :, 3] = a.astype(np.uint8)
    solid = a > 8
    if solid.any() and (~solid).any():
        _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
        for c in range(3):
            ch = out[:, :, c]
            ch[~solid] = ch[iy[~solid], ix[~solid]]
            out[:, :, c] = ch
    return out


def seam(a, axis):
    """How visibly the two edges fail to meet, on PREMULTIPLIED colour.

    Comparing raw RGB is wrong here: the alpha bleed above deliberately fills
    the RGB of fully transparent pixels, so two identical edges can differ by a
    lot in RGB and by nothing on screen. What the eye sees is colour * alpha,
    plus the alpha silhouette itself.
    """
    if axis == 'h':
        lo, hi = a[:, 0, :].astype(float), a[:, -1, :].astype(float)
    else:
        lo, hi = a[0, :, :].astype(float), a[-1, :, :].astype(float)
    pre_lo = lo[:, :3] * (lo[:, 3:4] / 255.0)
    pre_hi = hi[:, :3] * (hi[:, 3:4] / 255.0)
    return float(max(np.abs(pre_lo - pre_hi).mean(),
                     np.abs(lo[:, 3] - hi[:, 3]).mean()))


def first_opaque_row(a):
    rows = np.where(a[:, :, 3].max(axis=1) > 8)[0]
    return int(rows[0]) if len(rows) else -1


def main():
    argv = sys.argv[1:]
    theme = None
    if '--theme' in argv:
        i = argv.index('--theme')
        theme = argv[i + 1]
        del argv[i:i + 2]
    args = [x for x in argv if not x.startswith('--')]
    dry = '--dry-run' in argv
    if not args:
        print(__doc__)
        return 2
    src = args[0]

    contract = dict(CONTRACT)
    if theme:
        contract = {k: (theme_dest(v[0], theme), v[1], v[2]) for k, v in contract.items()}
    for k, v in EXTRAS.items():
        if os.path.exists(os.path.join(src, k + '.png')):
            contract[k] = v

    report, failed = {}, []
    for name, (dest, size, top) in contract.items():
        path = os.path.join(src, name + '.png')
        if not os.path.exists(path):
            failed.append(f'{name}: missing {path}')
            continue

        a = np.array(Image.open(path).convert('RGBA'))
        notes = []

        for repair in REPAIRS.get(name, []):
            if repair[0] == 'patch_copy':
                a = patch_copy(a, *repair[1:])
                notes.append(f'patched rect x{repair[1]}-{repair[3]} y{repair[2]}-{repair[4]}')
            if repair[0] == 'haze_dissolve':
                a = haze_dissolve(a, repair[1], repair[2])
                notes.append(f'haze dissolve from row {repair[1]} over {repair[2]}')

        opaque = top is None
        if not opaque:
            a = fix_alpha(a)
            notes.append('alpha clamped + bled')
        elif a[:, :, 3].min() < 255:
            a[:, :, 3] = 255
            notes.append('forced opaque')

        h, w = a.shape[:2]
        got_top = first_opaque_row(a)
        hs = seam(a, 'h')
        vs = seam(a, 'v') if name in TILES_BOTH_WAYS else None

        bad = []
        if (w, h) != size:
            bad.append(f'size {w}x{h}, contract says {size[0]}x{size[1]}')
        if top is not None and abs(got_top - top) > 8:
            bad.append(f'transparent top {got_top} rows, contract says {top} '
                       f'(update index.html LAYERS if this is intended)')
        if hs > SEAM_TOLERANCE:
            bad.append(f'left/right edges differ by {hs:.1f} — visible tiling seam')
        if vs is not None and vs > SEAM_TOLERANCE:
            bad.append(f'top/bottom edges differ by {vs:.1f} — this tile must '
                       f'repeat in all four directions')

        report[name] = dict(size=[w, h], top_rows=got_top, h_seam=round(hs, 2),
                            v_seam=None if vs is None else round(vs, 2),
                            repairs=notes, errors=bad)
        if bad:
            failed.append(name + ': ' + '; '.join(bad))
            continue

        if not dry:
            out = os.path.join(ROOT, dest)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            im = Image.fromarray(a, 'RGBA')
            if opaque:
                im = im.convert('RGB')
            im.save(out, 'WEBP', quality=90, method=6)

    w = max(len(k) for k in contract)
    print(f'{"asset".ljust(w)}  {"size":11} {"top":>5} {"seam h/v":>10}  repairs')
    for name, r in report.items():
        v = '' if r['v_seam'] is None else f"/{r['v_seam']}"
        print(f'{name.ljust(w)}  {str(tuple(r["size"])):11} {r["top_rows"]:5} '
              f'{r["h_seam"]}{v:>10}  {", ".join(r["repairs"]) or "-"}')

    # the flat colour at the very top of the sky is what the engine fills the
    # gap above the sky layer with — it must match exactly or a climb shows a band
    skyp = os.path.join(src, 'sky.png')
    if os.path.exists(skyp):
        s = np.array(Image.open(skyp).convert('RGB')).astype(int)
        row0 = s[0].mean(0).round().astype(int)
        spread = float(np.abs(s[0] - s[0].mean(0)).max())
        print(f'\nsky top row: #{row0[0]:02X}{row0[1]:02X}{row0[2]:02X} '
              f'(variation across the row: {spread:.1f})')
        print('  -> index.html: both R.drawBackground fills, the #boot gradient '
              'and <meta name="theme-color"> must use this exact value.')

    if failed:
        print('\nNOT INSTALLED:')
        for f in failed:
            print('  ' + f)
        return 1
    where = f'assets/themes/{theme}/' if theme else 'assets/'
    print('\n' + ('dry run — nothing written' if dry else
                  f'installed {len(report)} assets into {where}'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
