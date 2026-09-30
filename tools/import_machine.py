#!/usr/bin/env python3
"""Install the plank machine: slice its parts atlas into engine sprites.

    python3 tools/import_machine.py [--check]

Source: art_src/machine/machineParts.png, one 1536x1024 sheet holding
  row 1   the finished machine (reference only) and the SAME machine with its
          moving parts taken out - the saw blade, the side cog, the lever stick
          and the conveyor rollers - leaving a dark cavity, a socket, a boss
          and three holes where they were
  row 2   the saw blade sharp and motion-blurred, the cog, a roller, the lever,
          lamp off / lamp on, and four wood particles (two shavings, a
          splinter, a sawdust puff)
  row 3   a strapped plank: rounded end caps and four unit segments
  row 4   a six-frame comic dust burst
The cells are split by faint grid lines, which are dropped.

What it writes (assets/machine/ and assets/fx/):
  machine_back    the machine with the parts out - drawn first
  machine_front   every pixel of machine_back that sits IN FRONT of the blade
                  (the guard, the housing round the cavity, the base under it),
                  drawn after the blade so the blade shows only in its cavity
  saw_blade, saw_blade_blur, machine_cog, machine_roller
                  square, the hub at the exact centre: they spin
  machine_lever   tight crop; its pivot is recorded in the constants
  machine_lamp    the lamp's own dome, relit bright - laid over the dark one
  plank_sheet     [cap L][4 unit tiles][cap R], each tile cut strap-centre to
                  strap-centre, so tiles butt with the seam under a strap
  fx/wood_chips   4 square frames, one particle each
  fx/poof_sheet   6 square frames, bottom-anchored on one ground line

and rewrites the CG.MACHINE block in index.html (between the MACHINE:START /
MACHINE:END markers) with every pivot and size, in machine_back pixels.
--check writes docs/machine_assembly_test.webp: the parts reassembled at rest
beside the painted original, instead of trusting the numbers blind.
"""
import os, sys, json, re
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_car import fix_alpha

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = 'art_src/machine/machineParts.png'
OUT = 'assets/machine'

# ---- where things are in machineParts.png (atlas px), measured once ----
MASTER = (20, 0, 760, 400)            # the finished machine, for --check only
BACK = (790, 40, 1525, 400)           # the machine with its moving parts out
BLADE_HUB = (1161.8, 213.4)           # axle stub in the cavity = blade hub in MASTER + 766
BLADE_R = 114                         # blade tooth-tip radius: it fills the cavity, as in MASTER
CAVITY_BOX = (1053, 112, 1287, 277)   # the dark slot the blade turns in...
BELT_BOX = (1236, 236, 1300, 277)     # ...minus the conveyor, which is in front of it
CAVITY_SEED = (1110, 212)
COG_AT, COG_R = (978.5, 240.0), 47    # socket centre; cog tip radius in MASTER
ROLLERS_AT, ROLLER_R = [(1271.5, 290.0), (1360.0, 290.5), (1449.5, 290.5)], 21
LEVER_BOSS = (864.4, 120.5)           # the lever's pivot boss
LEVER_LEN = 92                        # boss to knob centre, atlas px (MASTER: 89)
LAMP_BOX = (924, 84, 980, 126)
BELT_TOP = 240                        # conveyor belt surface y
OUTFEED_X = 1512                      # conveyor's right end

PARTS = {                             # row 2 cell boxes
    'blade': (5, 410, 228, 642), 'blur': (232, 410, 456, 642),
    'cog': (462, 450, 626, 612), 'roller': (652, 455, 808, 610),
    'lever': (850, 410, 946, 628),
}
CHIPS = [(1276, 407, 1404, 523), (1409, 407, 1536, 523),
         (1276, 528, 1404, 645), (1409, 528, 1536, 645)]
PLANK_BOX = (85, 655, 1452, 782)
PLANK_ROWS = (665, 774)               # outline to outline
STRAPS = [291.0, 525.0, 765.0, 1008.5, 1243.5]   # strap centres
CAP_L = (91, 146)                     # left rounded end, to just past its end-grain line
CAP_R = (1390, 1446)
POOF_ROW = (790, 1024)
POOF_CELLS = [0, 237, 503, 768, 1033, 1298, 1536]
POOF_GROUND = 990                     # the burst's flat underside
POOF_F = 256
CHIP_F = 96


def load():
    a = np.array(Image.open(os.path.join(ROOT, SRC)).convert('RGBA'))
    al = a[..., 3]
    lab, n = ndimage.label(al > 20)
    kill = np.zeros(al.shape, bool)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        area = (lab[sl] == i + 1).sum()
        if (w > 1000 or h > 200) and area < 0.06 * w * h:     # a grid line, not a part
            kill |= lab == i + 1
    a[ndimage.binary_dilation(kill, iterations=2), 3] = 0
    # the soft haze the generator left round every cell
    keep = ndimage.binary_dilation(a[..., 3] > 40, iterations=6)
    a[~keep, 3] = 0
    return a


def crop(a, box):
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1].copy()


def square_about(img, cx, cy, pad=3):
    """Put `img` on a square canvas whose exact centre is (cx, cy) of img."""
    ys, xs = np.where(img[..., 3] > 8)
    r = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2).max()
    half = int(np.ceil(r)) + pad
    out = np.zeros((2 * half, 2 * half, 4), np.uint8)
    sx, sy = half - cx, half - cy                       # float shift
    im = Image.fromarray(img).transform(
        (2 * half, 2 * half), Image.AFFINE, (1, 0, -sx, 0, 1, -sy), resample=Image.BICUBIC)
    out[:] = np.array(im)
    return out, r


def hub_of(img):
    """Centre of the navy hub disc (the blades) - the true spin axis."""
    f = img.astype(int)
    navy = (f[..., 2] > f[..., 0] + 50) & (f[..., 2] > f[..., 1] + 25) & (f[..., 3] > 200) & (f[..., :3].max(2) < 200)
    lab, n = ndimage.label(navy)
    k = int(np.argmax(ndimage.sum(navy, lab, range(1, n + 1)))) + 1
    cy, cx = ndimage.center_of_mass(lab == k)
    return cx, cy


def bbox_centre(img):
    ys, xs = np.where(img[..., 3] > 128)
    return (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, (xs.max() - xs.min()) / 2


def build_back(a):
    back = crop(a, BACK)
    ys, xs = np.where(back[..., 3] > 8)
    pad = 4
    x0, y0 = xs.min() - pad, ys.min() - pad
    x1, y1 = xs.max() + pad + 1, ys.max() + pad + 1
    back = back[y0:y1, x0:x1]
    ox, oy = BACK[0] + x0, BACK[1] + y0                 # atlas -> back px
    return back, ox, oy


def build_front(a, back, ox, oy):
    """Everything of the back layer that must cover the blade."""
    H, W = back.shape[:2]
    f = back.astype(int)
    dark = f[..., :3].max(2) < 75
    yy, xx = np.mgrid[0:H, 0:W]
    X, Y = xx + ox, yy + oy
    cx0, cy0, cx1, cy1 = CAVITY_BOX
    bx0, by0, bx1, by1 = BELT_BOX
    inbox = (X >= cx0) & (X <= cx1) & (Y >= cy0) & (Y <= cy1) & \
            ~((X >= bx0) & (X <= bx1) & (Y >= by0) & (Y <= by1))
    lab, n = ndimage.label(dark & inbox)
    cav = lab == lab[CAVITY_SEED[1] - oy, CAVITY_SEED[0] - ox]
    cav = ndimage.binary_fill_holes(cav)                # the axle stub goes too
    cav = ndimage.binary_erosion(cav, iterations=3)     # its rim of ink stays in front
    hx, hy = BLADE_HUB
    disc = (X - hx) ** 2 + (Y - hy) ** 2 <= (BLADE_R + 10) ** 2
    front = back.copy()
    front[~(disc & ~cav), 3] = 0
    return fix_alpha(front)


def build_lamp(back, ox, oy):
    x0, y0, x1, y1 = LAMP_BOX
    lamp = back[y0 - oy:y1 - oy, x0 - ox:x1 - ox].copy()
    f = lamp.astype(float)
    green = (f[..., 1] > f[..., 0] + 25) & (f[..., 1] > f[..., 2] + 15) & (f[..., 3] > 100)
    green = ndimage.binary_dilation(green, iterations=1) & (f[..., 3] > 100)
    lum = f[..., :3].max(2) / 255.0
    lit = np.zeros_like(f)
    # the dark dome, relit: the same shading, mapped onto lime #76FF03 -> #E8FFB0
    k = np.clip(lum * 2.4, 0, 1)[..., None]
    lit[..., :3] = np.array([60, 190, 20]) * (1 - k) + np.array([200, 255, 120]) * k
    lit[..., 3] = np.where(green, f[..., 3], 0)
    return fix_alpha(lit.astype(np.uint8)), (x0 - ox, y0 - oy)


def build_part(a, name):
    img = crop(a, PARTS[name])
    lab, n = ndimage.label(img[..., 3] > 20)
    k = int(np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)))) + 1
    body = ndimage.binary_dilation(lab == k, iterations=4)
    img[~body, 3] = 0
    return img


def build_plank(a):
    x0, y0, x1, y1 = PLANK_BOX
    r0, r1 = PLANK_ROWS
    pl = a[r0 - 2:r1 + 3].copy()                        # a little air above and below
    H = pl.shape[0]
    tiles = []
    for i in range(4):
        s, e = STRAPS[i], STRAPS[i + 1]
        t = Image.fromarray(pl[:, int(round(s)):int(round(e))])
        tiles.append(t)
    tw = int(round(np.mean([t.width for t in tiles])))
    tiles = [np.array(t.resize((tw, H), Image.LANCZOS)) for t in tiles]
    capl = pl[:, CAP_L[0]:CAP_L[1]]
    capr = pl[:, CAP_R[0]:CAP_R[1]]
    G = 4                                               # gutter, filled with the edge column
    pieces = [capl] + tiles + [capr]
    W = sum(p.shape[1] for p in pieces) + G * (len(pieces) + 1)
    sheet = np.zeros((H, W, 4), np.uint8)
    rects, x = [], G
    for p in pieces:
        w = p.shape[1]
        sheet[:, x:x + w] = p
        sheet[:, x - G:x] = p[:, :1]
        sheet[:, x + w:x + w + G] = p[:, -1:]
        rects.append([x, w])
        x += w + G
    # alpha: a >= 250 -> 255 and bleed, but keep the gutters' copied edges
    sheet = fix_alpha(sheet)
    return sheet, rects, H, (r1 - r0 + 1)


def build_chips(a):
    out = np.zeros((CHIP_F, CHIP_F * 4, 4), np.uint8)
    for i, box in enumerate(CHIPS):
        img = crop(a, box)
        ys, xs = np.where(img[..., 3] > 8)
        img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(img)
        s = min(1.0, (CHIP_F - 8) / max(im.size))
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        cell = Image.new('RGBA', (CHIP_F, CHIP_F))
        cell.paste(im, ((CHIP_F - im.width) // 2, (CHIP_F - im.height) // 2))
        out[:, i * CHIP_F:(i + 1) * CHIP_F] = np.array(cell)
    return fix_alpha(out)


def build_poof(a):
    y0, y1 = POOF_ROW
    out = np.zeros((POOF_F, POOF_F * 6, 4), np.uint8)
    base = POOF_F - 8                                   # ground line inside each frame
    for i in range(6):
        c0, c1 = POOF_CELLS[i] + 3, POOF_CELLS[i + 1] - 3
        cell = a[y0 + 3:y1, c0:c1].copy()
        cx = (POOF_CELLS[i] + POOF_CELLS[i + 1]) / 2 - c0
        gy = POOF_GROUND - (y0 + 3)
        # frame px = cell px shifted so (cx, gy) lands on (F/2, base)
        dx, dy = POOF_F / 2 - cx, base - gy
        im = Image.fromarray(cell).transform((POOF_F, POOF_F), Image.AFFINE,
                                             (1, 0, -dx, 0, 1, -dy), resample=Image.BICUBIC)
        out[:, i * POOF_F:(i + 1) * POOF_F] = np.array(im)
    return fix_alpha(out)


def save(arr, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr).save(path, 'WEBP', quality=92, method=6)
    return rel


def write_constants(M):
    index = os.path.join(ROOT, 'index.html')
    html = open(index, encoding='utf-8').read()
    pat = re.compile(r'(/\* MACHINE:START \*/ ).*?( /\* MACHINE:END \*/)', re.S)
    if not pat.search(html):
        print('MACHINE markers not found in index.html - constants not written')
        return
    data = json.dumps(M, separators=(',', ':'))
    open(index, 'w', encoding='utf-8').write(pat.sub(lambda m: m.group(1) + data + m.group(2), html, count=1))
    print('index.html: CG.MACHINE updated')


def main():
    a = load()
    back, ox, oy = build_back(a)
    front = build_front(a, back, ox, oy)
    back = fix_alpha(back)
    lamp, lamp_at = build_lamp(back, ox, oy)

    blade = build_part(a, 'blade')
    hx, hy = hub_of(blade)
    blade_sq, blade_tip = square_about(blade, hx, hy)
    blur = build_part(a, 'blur')
    bx, by = hub_of(blur)
    blur_sq, _ = square_about(blur, bx, by)
    cog = build_part(a, 'cog')
    cx, cy, cog_tip = bbox_centre(cog)
    cog_sq, _ = square_about(cog, cx, cy)
    roller = build_part(a, 'roller')
    rx, ry, roller_r = bbox_centre(roller)
    roller_sq, _ = square_about(roller, rx, ry)
    lever = build_part(a, 'lever')
    ys, xs = np.where(lever[..., 3] > 8)
    lever = lever[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    lys, lxs = np.where(lever[..., 3] > 128)
    hub_rows = lys > lever.shape[0] - 82                 # the round pivot hub at the foot
    lpx = (lxs[hub_rows].min() + lxs[hub_rows].max()) / 2
    lpy = (lys[hub_rows].min() + lys[hub_rows].max()) / 2
    f = lever.astype(int)
    red = (f[..., 0] > f[..., 1] + 80) & (f[..., 0] > f[..., 2] + 80) & (f[..., 3] > 200)
    kys, kxs = np.where(red)
    knob_y = (kys.min() + kys.max()) / 2
    lever_len = lpy - knob_y

    plank, rects, plank_h, plank_body = build_plank(a)
    chips = build_chips(a)
    poof = build_poof(a)

    def B(x, y):                                          # atlas -> machine_back px
        return [round(x - ox, 1), round(y - oy, 1)]

    H, W = back.shape[:2]
    ys, xs = np.where(back[..., 3] > 128)
    M = {
        'w': W, 'h': H,
        'feet': int(ys.max()),                            # where it stands
        'outfeed': round(OUTFEED_X - ox, 1),              # conveyor end
        'belt': round(BELT_TOP - oy, 1),                  # conveyor surface
        'blade': B(*BLADE_HUB) + [BLADE_R, round(BLADE_R / blade_tip, 4)],     # x, y, r, sprite scale
        'cog': B(*COG_AT) + [COG_R, round(COG_R / cog_tip, 4)],
        'rollers': [B(x, y) for x, y in ROLLERS_AT],
        'roller': [ROLLER_R, round(ROLLER_R / roller_r, 4)],
        'lever': B(*LEVER_BOSS) + [round(lpx, 1), round(lpy, 1), round(LEVER_LEN / lever_len, 4)],
        'lamp': [lamp_at[0], lamp_at[1]],
        'plank': {'h': plank_h, 'body': plank_body, 'caps': [rects[0], rects[5]],
                  'tiles': rects[1:5]},
    }
    M = json.loads(json.dumps(M, default=lambda o: o.item()))   # numpy scalars -> plain
    print(json.dumps(M, indent=1))

    if '--check' in sys.argv:
        comp = Image.new('RGBA', (W * 2 + 40, H + 60), (120, 190, 235, 255))
        master = crop(a, MASTER)
        comp.alpha_composite(Image.fromarray(master), (W + 40 + (ox - MASTER[0]) - 766, 0 + (oy - MASTER[1])))
        m = Image.new('RGBA', (W, H + 60))
        m.alpha_composite(Image.fromarray(back), (0, 60))

        def put(img, x, y, s, ang=0, px=None, py=None):
            im = Image.fromarray(img)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            if px is None:
                m.alpha_composite(im, (round(x - im.width / 2), round(y + 60 - im.height / 2)))
            else:
                m.alpha_composite(im, (round(x - px * s), round(y + 60 - py * s)))
        for x, y in M['rollers']:
            put(roller_sq, x, y, M['roller'][1])
        put(cog_sq, M['cog'][0], M['cog'][1], M['cog'][3])
        put(blade_sq, M['blade'][0], M['blade'][1], M['blade'][3])
        m.alpha_composite(Image.fromarray(front), (0, 60))
        L = M['lever']
        put(lever, L[0], L[1], L[4], px=L[2], py=L[3])
        m.alpha_composite(Image.fromarray(lamp), (M['lamp'][0], M['lamp'][1] + 60))
        comp.alpha_composite(m, (0, 0))
        comp.convert('RGB').save(os.path.join(ROOT, 'docs/machine_assembly_test.webp'))
        print('wrote docs/machine_assembly_test.webp')
        return 0

    for arr, rel in ((back, OUT + '/machine_back.webp'), (front, OUT + '/machine_front.webp'),
                     (blade_sq, OUT + '/saw_blade.webp'), (blur_sq, OUT + '/saw_blade_blur.webp'),
                     (cog_sq, OUT + '/machine_cog.webp'), (roller_sq, OUT + '/machine_roller.webp'),
                     (fix_alpha(lever), OUT + '/machine_lever.webp'), (lamp, OUT + '/machine_lamp.webp'),
                     (plank, OUT + '/plank_sheet.webp'),
                     (chips, 'assets/fx/wood_chips.webp'), (poof, 'assets/fx/poof_sheet.webp')):
        print('wrote', save(arr, rel), f'{arr.shape[1]}x{arr.shape[0]}')
    write_constants(M)
    return 0


if __name__ == '__main__':
    sys.exit(main())
