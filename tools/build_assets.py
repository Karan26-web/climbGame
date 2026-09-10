#!/usr/bin/env python3
"""Build engine-ready sprites from the raw generated art.

Sources
  asset1..7.png   round 1: sky, hills x2, terrain x2, jeep body, jeep wheel
  Charcter.png    44-sprite atlas: pickups, UI, fx, props (+ lower-res driver/coins)
  char2.png       higher-res driver_body / driver_head / coin_sheet, delivered as a
                  labelled mockup -> text chips and the white card are discarded
  tree.png        near tree line
  treeee2.png     foreground grass

Fixes applied to every output
  1. alpha clamp : a >= 250 -> 255 (no source ever emitted true opaque)
  2. alpha bleed : RGB of transparent pixels filled from the nearest opaque pixel, so
                   bilinear filtering / mipmaps cannot drag stray colour into edges
                   (Charcter.png hides pure red at alpha 1; char2.png hides white)

Run: python3 tools/build_assets.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage
import os, json, shutil

OUT = "assets"
manifest = {}


# ---------------------------------------------------------------- helpers
def fix(rgba):
    """Clamp near-opaque alpha to 255 and bleed RGB outward into transparency."""
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


def components(arr, thresh=60, close=7, min_area=1500):
    """Label blobs; return [(x, y, w, h, area, mean_rgb, dark_frac, mask)]."""
    a = arr[:, :, 3]
    lab, n = ndimage.label(ndimage.binary_closing(a > thresh, np.ones((close, close))))
    res = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        m = lab[sl] == i + 1
        if m.sum() < min_area:
            continue
        sub = arr[sl][:, :, :3]
        res.append(dict(x=xs.start, y=ys.start, w=xs.stop - xs.start,
                        h=ys.stop - ys.start, area=int(m.sum()),
                        mean=sub[m].mean(0), dark=float((sub[m].max(1) < 110).mean()),
                        mask=m, sl=sl))
    return res


def cut(arr, comp):
    """Extract one component: keep only its own blob, tight-crop, apply fixes."""
    sub = arr[comp["sl"]].copy()
    sub[:, :, 3] = np.where(comp["mask"], sub[:, :, 3], 0)
    ys, xs = np.nonzero(sub[:, :, 3] > 8)
    sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return fix(sub.astype(np.uint8))


def place(sprite, size, anchor="center", pivot=None):
    W = H = size
    canvas = np.zeros((H, W, 4), np.uint8)
    h, w = sprite.shape[:2]
    if pivot is not None:
        ox, oy = W // 2 - int(pivot[0]), H // 2 - int(pivot[1])
    elif anchor == "bottom":
        ox, oy = (W - w) // 2, H - h
    else:
        ox, oy = (W - w) // 2, (H - h) // 2
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    cw, ch = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
    canvas[dy0:dy0 + ch, dx0:dx0 + cw] = sprite[sy0:sy0 + ch, sx0:sx0 + cw]
    return canvas


def save(arr, path):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray(arr.astype(np.uint8)).save(p)
    print(f"  {path:38s} {arr.shape[1]}x{arr.shape[0]}")


def load(name):
    return np.array(Image.open(os.path.join(OUT, name)).convert("RGBA")).astype(np.uint8)


# ================================================================ round 1
print("round 1 (straight copies)")
for src, dst in [("asset1.png", "background/sky.png"),
                 ("asset2.png", "background/hills_far.png"),
                 ("asset3.png", "background/hills_mid.png"),
                 ("asset4.png", "terrain/grass_top.png"),
                 ("asset5.png", "terrain/dirt_body.png")]:
    os.makedirs(os.path.dirname(os.path.join(OUT, dst)), exist_ok=True)
    shutil.copy(os.path.join(OUT, src), os.path.join(OUT, dst))
    print(f"  {dst}")
# jeep parts get the alpha fixes
for src, dst in [("asset6.png", "vehicle/jeep_body.png"),
                 ("asset7.png", "vehicle/jeep_wheel.png")]:
    save(fix(load(src)), dst)

# ================================================ char2: driver + coins (hi-res)
print("\nchar2.png -> driver + coins (rejecting label chips and white card)")
c2 = load("char2.png")
comps = components(c2)
sprites, rejected = [], []
for c in comps:
    is_chip = c["dark"] > 0.45 and c["w"] > c["h"] * 1.4
    is_card = c["mean"].min() > 200
    (rejected if (is_chip or is_card) else sprites).append(c)
print(f"  {len(sprites)} sprites kept, {len(rejected)} label chips / cards discarded")

sprites.sort(key=lambda c: (c["y"] // 120, c["x"]))
body_c, head_c = sprites[0], sprites[1]
coin_cs = sorted(sprites[2:], key=lambda c: c["x"])
assert len(coin_cs) == 8, f"expected 8 coin frames, got {len(coin_cs)}"

body = cut(c2, body_c)
save(body, "vehicle/driver_body.png")

head = cut(c2, head_c)
hm = head[:, :, 3] > 40
low = hm[int(hm.shape[0] * 0.93):]
lxs = np.nonzero(low.any(0))[0]
neck = (int((lxs.min() + lxs.max()) / 2), hm.shape[0] - 1)
S = int(max(head.shape[:2]) * 2.1) // 2 * 2
save(place(head, S, pivot=neck), "vehicle/driver_head.png")
manifest["driver_head"] = {"size": S, "pivot": "frame centre = neck joint"}

coins = [cut(c2, c) for c in coin_cs]
FS = (max(max(c.shape[:2]) for c in coins) + 3) // 4 * 4
strip = np.zeros((FS, FS * 8, 4), np.uint8)
for i, c in enumerate(coins):
    strip[:, i * FS:(i + 1) * FS] = place(c, FS)
save(strip, "pickups/coin_sheet.png")
manifest["coin_sheet"] = {"frames": 8, "frame": FS}

# ---- driver landmarks, measured not guessed ----
bm = body[:, :, 3] > 128
rgb = body[:, :, :3].astype(int)
jeans = bm & (rgb[:, :, 2] > 90) & (rgb[:, :, 2] - rgb[:, :, 0] > 25)
jy, jx = np.nonzero(jeans)
hip = (int(jx.min() + (jx.max() - jx.min()) * 0.10), int(jy.min() + 20))
# collar: torso top edge, ignoring the raised arm (which is the narrow topmost blob)
rows = np.nonzero(bm.any(1))[0]
collar_row = None
for r in rows:
    xs = np.nonzero(bm[r])[0]
    if xs.max() - xs.min() > body.shape[1] * 0.45:      # torso width reached
        collar_row = r
        break
cxs = np.nonzero(bm[collar_row])[0]
collar = (int(cxs.min() + (cxs.max() - cxs.min()) * 0.18), int(collar_row))
manifest["driver_body"] = {"w": body.shape[1], "h": body.shape[0],
                           "collar": collar, "hip": hip}
print(f"  driver_body landmarks: collar={collar} hip={hip}")

# ================================================ Charcter.png atlas: the rest
print("\nCharcter.png -> pickups / ui / fx / props")
atlas = load("Charcter.png")


def grab(x, y, w, h, pad=2):
    x0, y0 = max(0, x - pad), max(0, y - pad)
    sub = atlas[y0:y + h + pad, x0:x + w + pad].copy()
    a = sub[:, :, 3]
    lab, n = ndimage.label(ndimage.binary_closing(a > 40, np.ones((5, 5))))
    if n > 1:
        big = 1 + np.argmax([(lab == i + 1).sum() for i in range(n)])
        sub[:, :, 3] = np.where(lab == big, a, 0)
    ys, xs = np.nonzero(sub[:, :, 3] > 8)
    return fix(sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


for name, box in {
    "pickups/fuel_can": (755, 201, 153, 166), "pickups/gem": (938, 214, 139, 140),
    "pickups/boost": (1090, 201, 122, 167), "pickups/star": (1244, 208, 147, 146),
    "pickups/heart": (1416, 230, 131, 123), "pickups/wrench": (1567, 209, 137, 147),
    "ui/icon_play": (655, 389, 130, 132), "ui/icon_pause": (810, 389, 129, 132),
    "ui/icon_gear": (968, 390, 128, 131), "ui/icon_restart": (1124, 393, 128, 128),
    "ui/icon_home": (1281, 394, 127, 128), "ui/icon_sound_on": (1440, 394, 127, 128),
    "ui/icon_sound_off": (1596, 395, 126, 127),
    "props/tyre_stack": (698, 545, 131, 125), "props/cone": (871, 547, 122, 124),
    "props/crate": (1023, 549, 137, 124), "props/barrel": (1205, 543, 107, 137),
    "props/rock_small": (1337, 566, 159, 117), "props/bush": (1514, 557, 209, 131),
    "props/flag_finish": (690, 683, 155, 169),
    "props/flag_checkpoint": (908, 684, 94, 167),
    "props/signpost": (1041, 695, 147, 153), "props/ramp": (1167, 708, 281, 133),
    "props/log": (1480, 722, 242, 115),
}.items():
    save(grab(*box), f"{name}.png")

# fx: source frames grow but do NOT fade -> impose a dissipation ramp
print("  (fx: applying the alpha dissipation ramp the source lacks)")
RAMP = [1.00, 0.85, 0.62, 0.38, 0.15]
for kind, boxes in {
    "dust": [(59, 601, 37, 31), (108, 588, 59, 52), (172, 568, 101, 78),
             (274, 550, 136, 101), (407, 528, 172, 127)],
    "smoke": [(61, 728, 73, 49), (138, 711, 88, 78), (221, 704, 108, 96),
              (319, 696, 128, 115), (434, 683, 151, 136)],
}.items():
    frames = [grab(*b) for b in boxes]
    FZ = (max(max(f.shape[:2]) for f in frames) + 3) // 4 * 4
    sheet = np.zeros((FZ, FZ * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        f = f.copy()
        f[:, :, 3] = (f[:, :, 3].astype(float) * RAMP[i]).astype(np.uint8)
        sheet[:, i * FZ:(i + 1) * FZ] = place(f, FZ)
    save(sheet, f"fx/{kind}_sheet.png")
    manifest[f"{kind}_sheet"] = {"frames": len(frames), "frame": FZ, "ramp": RAMP}

# ================================================ new parallax layers
print("\ntree.png / treeee2.png -> parallax layers")
save(fix(load("tree.png")), "background/trees_near.png")

# The delivered grass is mid-green with bright white daisies. As the frontmost layer it
# must read as shadowed and out of focus, or it competes with the vehicle for attention.
# Darken + desaturate here so the renderer stays a plain drawImage.
g = fix(load("treeee2.png")).astype(float)
lum = g[:, :, :3].mean(2, keepdims=True)
g[:, :, :3] = np.clip((g[:, :, :3] * 0.72 + lum * 0.28) * 0.60, 0, 255)
save(g, "background/foreground_grass.png")
print("    (darkened to 60% + desaturated 28% for depth separation)")

with open(os.path.join(OUT, "atlas_manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2, default=str)
print("\ndone -> assets/atlas_manifest.json")
