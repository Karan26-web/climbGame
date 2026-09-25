#!/usr/bin/env python3
"""Install the monster truck: split a wheels-on render into body + wheel sprites.

    python3 tools/import_truck.py [--check]

The renderer draws the wheels BEHIND the body, each at its own sprung axle, so
the body sprite must have open arches and no tyres. The truck was painted as
one finished picture with its tyres on (art_src/truck/truck.png), and the parts
sheet beside it (art_src/truck/truck_parts.png) has the same tyre on its own.
This tool turns the two into what the renderer wants:

  1. BODY  - the painted springs are cut out (the renderer draws live ones
             that stretch to the hub). Each near tyre is cut out as a disc about its hub. Behind it the
             render also paints the FAR tyre, offset back and up; that
             crescent is cut too, but only where it is tyre-dark, so the silver
             bull bar and the blue fenders it overlaps survive. Whatever is
             left detached (outline slivers of the tyres) is dropped. The
             canvas is kept, so every number below is a raw truck.png pixel.
  2. WHEEL - the tyre from the parts sheet, cut on a circle about its hub and
             stretched round. The painted tyre is 5% wider than tall; spun
             as-is it would visibly wobble on its axle.
  3. WELL  - the arch interior the cuts took away (and the slots where the
             painted springs were), as a flat shadow layer drawn behind the
             tyres, so a drooping wheel shows chassis, not sky.
  4. MEASURE - hubs, tyre radius and the body's bbox, printed in the form the
             CG.VConst block in index.html takes.

Both sprites get the same alpha repair as every other sprite (fix_alpha from
import_car.py), so bilinear filtering never drags a fringe into the outline.
--check writes docs/truck_assembly_test.png (body + wheels composited at rest)
instead of trusting the numbers blind.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_car import fix_alpha

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_BODY = 'art_src/truck/truck.png'
SRC_PARTS = 'art_src/truck/truck_parts.png'
DEST_BODY = 'assets/vehicle/truck_body.webp'
DEST_WHEEL = 'assets/vehicle/truck_wheel.webp'
DEST_WELL = 'assets/vehicle/truck_well.webp'

# measured in truck.png: hub centres (the bright hubcaps) and the tyre radius
# (tread tip to hub, the mean of left/bottom extents)
HUBS = [(244.0, 862.0), (882.5, 862.0)]
TYRE_R = 210
NEAR_CUT = 228          # tyre + its ink outline
FAR_OFF = (100, -10)    # far tyre centre relative to the near hub
FAR_CUT = 218
DARK = 130              # tyre rubber never gets brighter than this
BULL_BAR = (1015, 500, 1220, 705)   # never cut: its ink is as dark as a tyre's
# the painted coil-overs, x-span of each. They are baked to the chassis but
# must follow the wheel, so everything under the fender here is cut out and
# the renderer draws a live strut from under the fender to the hub instead.
SPRINGS = [(266, 354), (810, 900)]
FENDER_INK = 10         # the fender's outline, below its lowest blue pixel
WELL_TOP, WELL_BOT = (36, 31, 38), (13, 11, 15)   # sampled off the arch interior

# in truck_parts.png: the left-hand tyre's opaque box
WHEEL_BOX = (35, 498, 384, 829)
WHEEL_OUT = 360         # output sprite is square, hub at its centre


def build_body(img):
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    f = img.astype(int)
    tyre_like = (f[..., :3].max(2) < DARK) & ((f[..., :3].max(2) - f[..., :3].min(2)) < 40)
    cut = np.zeros((H, W), bool)
    for hx, hy in HUBS:
        cut |= (xx - hx) ** 2 + (yy - hy) ** 2 <= NEAR_CUT ** 2
        fx, fy = hx + FAR_OFF[0], hy + FAR_OFF[1]
        cut |= ((xx - fx) ** 2 + (yy - fy) ** 2 <= FAR_CUT ** 2) & tyre_like & (yy > 600)
    bx0, by0, bx1, by1 = BULL_BAR
    near = np.zeros((H, W), bool)
    for hx, hy in HUBS:
        near |= (xx - hx) ** 2 + (yy - hy) ** 2 <= NEAR_CUT ** 2
    cut &= near | ~((xx >= bx0) & (xx <= bx1) & (yy >= by0) & (yy <= by1))
    f = img.astype(int)
    blue = (f[..., 2] > f[..., 0] + 60) & (f[..., 2] > f[..., 1] + 20)
    for x0, x1 in SPRINGS:
        for x in range(x0, x1 + 1):
            fender = np.where(blue[400:700, x])[0].max() + 400
            cut[fender + FENDER_INK:720, x] = True
    out = img.copy()
    out[cut, 3] = 0
    lab, n = ndimage.label(out[..., 3] > 20)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    out[(lab != keep) & (lab > 0), 3] = 0
    return fix_alpha(out)


def build_well(body):
    """The back of the wheel arches, drawn BEHIND the tyres and struts.

    Cutting the tyres out leaves holes in the arch interior: a ring round each
    tyre (the cut is wider than the tread, for its ink) and the spring slots.
    With nothing behind them, a drooping wheel opens a gap of sky between the
    tyre and the chassis. This fills every hole the body closes round - clear
    pixels with body on both sides in their row and above them in their
    column, above the axle line - with the arch's own shadow."""
    H, W = body.shape[:2]
    solid = body[..., 3] > 128
    left = np.maximum.accumulate(solid, axis=1)
    right = np.maximum.accumulate(solid[:, ::-1], axis=1)[:, ::-1]
    above = np.maximum.accumulate(solid, axis=0)
    hole = ~solid & left & right & above
    hole[int(HUBS[0][1]):] = False
    hole = ndimage.binary_dilation(hole, iterations=3)   # tuck under the ink
    ys = np.arange(H)[:, None].repeat(W, 1)
    t = np.clip((ys - 520) / (HUBS[0][1] - 180 - 520), 0, 1)[..., None]
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = (np.array(WELL_TOP) * (1 - t) + np.array(WELL_BOT) * t).astype(np.uint8)
    out[..., 3] = hole * 255
    return fix_alpha(out)


def build_wheel(parts):
    x0, y0, x1, y1 = WHEEL_BOX
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
    pad = 4
    crop = parts[int(cy - ry - pad):int(cy + ry + pad) + 1, int(cx - rx - pad):int(cx + rx + pad) + 1].copy()
    h, w = crop.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    ell = ((xx - w / 2) / (rx + pad)) ** 2 + ((yy - h / 2) / (ry + pad)) ** 2 <= 1
    crop[~ell, 3] = 0
    im = Image.fromarray(crop).resize((WHEEL_OUT, WHEEL_OUT), Image.LANCZOS)
    tyre_r = rx * WHEEL_OUT / w      # tread radius in output pixels
    return fix_alpha(np.array(im)), tyre_r


def main():
    body_src = np.array(Image.open(os.path.join(ROOT, SRC_BODY)).convert('RGBA'))
    parts = np.array(Image.open(os.path.join(ROOT, SRC_PARTS)).convert('RGBA'))
    body = build_body(body_src)
    well = build_well(body)
    wheel, wheel_r = build_wheel(parts)

    ys, xs = np.where(body[..., 3] > 8)
    (rx, ry), (fx, fy) = HUBS
    print(f'body  {SRC_BODY}: {body.shape[1]}x{body.shape[0]}')
    print(f'  opaque bbox        x {xs.min()}-{xs.max()}  y {ys.min()}-{ys.max()}')
    print(f'  hubs               rear ({rx}, {ry})  front ({fx}, {fy})  art wheelbase {fx - rx:.1f}')
    print(f'  tyre radius        {TYRE_R} art px  -> {TYRE_R / (fx - rx):.4f} x wheelbase')
    print(f'wheel {DEST_WHEEL}: {WHEEL_OUT}x{WHEEL_OUT}, tread radius {wheel_r:.1f} px')

    if '--check' in sys.argv:
        comp = Image.new('RGBA', (body.shape[1], body.shape[0]), (120, 190, 235, 255))
        wim = Image.fromarray(wheel)
        dark = Image.fromarray((wheel * [0.55, 0.55, 0.55, 1]).astype(np.uint8))
        s = TYRE_R / wheel_r
        size = round(WHEEL_OUT * s)
        for hx, hy in HUBS:
            for im, (ox, oy) in ((dark, FAR_OFF), (wim, (0, 0))):
                r = im.resize((size, size), Image.LANCZOS)
                comp.alpha_composite(r, (round(hx + ox - size / 2), round(hy + oy - size / 2)))
        comp.alpha_composite(Image.fromarray(well))
        comp.alpha_composite(Image.fromarray(body))
        comp.convert('RGB').save(os.path.join(ROOT, 'docs/truck_assembly_test.png'))
        print('wrote docs/truck_assembly_test.png')
        return 0

    Image.fromarray(body).save(os.path.join(ROOT, DEST_BODY), 'WEBP', quality=92, method=6)
    Image.fromarray(wheel).save(os.path.join(ROOT, DEST_WHEEL), 'WEBP', quality=92, method=6)
    Image.fromarray(well).save(os.path.join(ROOT, DEST_WELL), 'WEBP', quality=92, method=6)
    print(f'\ninstalled {DEST_BODY}, {DEST_WHEEL}, {DEST_WELL}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
