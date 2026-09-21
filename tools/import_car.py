#!/usr/bin/env python3
"""Install a car body PNG as the vehicle sprite, and measure its mount points.

    python3 tools/import_car.py art_src/car/newCar.png

The physics core maps art pixels to world space through a handful of measured
numbers (CG.VConst in index.html): where the two wheel arches are, how wide the
body is, where the roof crown and rear bumper sit. Guessing them is how a wheel
ends up floating beside its arch. This tool measures them the same way every
time and prints them in the form the constants take, then writes the sprite:

  1. REPAIR  - alpha clamped (a >= 250 -> 255) and RGB bled outward into the
               transparent pixels, so bilinear filtering never drags a stray
               fringe colour into the car's outline. Same treatment every other
               sprite gets in tools/build_assets.py.
  2. MEASURE - each wheel arch is found as a run of columns where the body's
               lower edge lifts well above the sill, and a circle is fitted to
               that edge. Its centre is the axle; the distance between the two
               centres is the art-space wheelbase.
  3. CONVERT - to .webp, full canvas kept (the numbers are in raw PNG pixels).

The output is the numbers to paste into index.html, not a file that patches
index.html: the hull and the ride height are judgement calls that belong next
to the physics comments, not in a script.
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = 'assets/vehicle/car_body.webp'


def fix_alpha(rgba):
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


def fit_circle(xs, ys):
    A = np.c_[2 * xs, 2 * ys, np.ones_like(xs)]
    b = xs * xs + ys * ys
    cx, cy, c0 = np.linalg.lstsq(A, b, rcond=None)[0]
    return cx, cy, float(np.sqrt(c0 + cx * cx + cy * cy))


def measure(alpha):
    H, W = alpha.shape
    ys, xs = np.where(alpha)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    low = np.full(W, -1)
    top = np.full(W, -1)
    for x in range(x0, x1 + 1):
        col = np.where(alpha[:, x])[0]
        if len(col):
            low[x] = col.max()
            top[x] = col.min()
    sill = np.percentile(low[low > 0], 80)
    arch = (low > 0) & (low < sill - 60)
    cols = np.where(arch)[0]
    groups, st, prev = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - prev > 15:
            groups.append((st, prev))
            st = c
        prev = c
    groups.append((st, prev))
    # the two widest openings are the arches; bumper undercuts are narrow
    groups.sort(key=lambda g: g[1] - g[0], reverse=True)
    arches = sorted(groups[:2])
    fits = []
    for g in arches:
        seg = np.arange(g[0], g[1] + 1).astype(float)
        fits.append(fit_circle(seg, low[g[0]:g[1] + 1].astype(float)))
    return dict(bbox=(int(x0), int(x1), int(y0), int(y1)), sill=float(sill),
                arches=[(int(g[0]), int(g[1])) for g in arches], fits=fits,
                roof=(int(np.argmin(np.where(top > 0, top, 10 ** 9))),
                      int(top[top > 0].min())))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = sys.argv[1]
    a = np.array(Image.open(src).convert('RGBA'))
    a = fix_alpha(a)
    m = measure(a[:, :, 3] > 8)
    (rx, ry, rr), (fx, fy, fr) = m['fits']
    x0, x1, y0, y1 = m['bbox']
    print(f'source {src}: {a.shape[1]}x{a.shape[0]}')
    print(f'  opaque bbox        x {x0}-{x1}  y {y0}-{y1}   (sill y ~{m["sill"]:.0f})')
    print(f'  rear arch          cols {m["arches"][0]}  centre ({rx:.1f}, {ry:.1f})  r {rr:.0f}')
    print(f'  front arch         cols {m["arches"][1]}  centre ({fx:.1f}, {fy:.1f})  r {fr:.0f}')
    print(f'  roof crown         ({m["roof"][0]}, {m["roof"][1]})')
    print()
    print('  -> CG.VConst (index.html):')
    print(f'       ARCH_REAR_X = {rx:.1f}, ARCH_FRONT_X = {fx:.1f}   # art-space wheelbase {fx - rx:.1f}')
    print(f'       AXLE_Y      = {(ry + fy) / 2:.0f}')
    print(f'       body bbox   = ({x0}, {y0}) - ({x1}, {y1})')
    out = os.path.join(ROOT, DEST)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.fromarray(a, 'RGBA').save(out, 'WEBP', quality=92, method=6)
    print(f'\ninstalled {DEST}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
