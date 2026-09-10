#!/usr/bin/env python3
"""Composite jeep + wheels + driver to validate mount points and draw order."""
from PIL import Image, ImageDraw
import numpy as np

jeep = Image.open("assets/vehicle/jeep_body.png").convert("RGBA")
wheel = Image.open("assets/vehicle/jeep_wheel.png").convert("RGBA")
body = Image.open("assets/vehicle/driver_body.png").convert("RGBA")
head = Image.open("assets/vehicle/driver_head.png").convert("RGBA")

# ---- measured mount points, in jeep_body.png pixel space ----
REAR_AXLE = (413, 598)
FRONT_AXLE = (1314, 598)
WHEEL_R = 178                       # 21% of the 1668px body length
SEAT = (700, 470)                   # where the driver's hip sits
DRIVER_SCALE = 0.62
COLLAR = (76, 13)                   # neck attach point in driver_body.png
HIP = (55, 170)                     # hip landmark in driver_body.png
HEAD_ROT = 0                        # runtime: driven by chassis angular velocity


def put(dst, src, cx, cy, scale=1.0, rot=0.0, pivot=None):
    """Paste src onto dst so that `pivot` (src px, default centre) lands at (cx,cy)."""
    if scale != 1.0:
        src = src.resize((max(1, round(src.width * scale)),
                          max(1, round(src.height * scale))), Image.LANCZOS)
        if pivot:
            pivot = (pivot[0] * scale, pivot[1] * scale)
    if pivot is None:
        pivot = (src.width / 2, src.height / 2)
    if rot:
        before = src.size
        src = src.rotate(rot, resample=Image.BICUBIC, expand=True)
        pivot = (pivot[0] + (src.width - before[0]) / 2,
                 pivot[1] + (src.height - before[1]) / 2)
    dst.alpha_composite(src, (round(cx - pivot[0]), round(cy - pivot[1])))


W, H = 2100, 1100
OX, OY = 180, 120          # jeep origin inside the test canvas

canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

wd = round(WHEEL_R * 2)
wsc = wd / wheel.width

# DRAW ORDER: wheels -> chassis -> driver body -> driver head
put(canvas, wheel, OX + REAR_AXLE[0], OY + REAR_AXLE[1], scale=wsc)
put(canvas, wheel, OX + FRONT_AXLE[0], OY + FRONT_AXLE[1], scale=wsc)
canvas.alpha_composite(jeep, (OX, OY))
put(canvas, body, OX + SEAT[0], OY + SEAT[1], scale=DRIVER_SCALE, pivot=HIP)

# head neck-joint is the exact centre of head.png; place it on the scaled collar
collar_x = OX + SEAT[0] + (COLLAR[0] - HIP[0]) * DRIVER_SCALE
collar_y = OY + SEAT[1] + (COLLAR[1] - HIP[1]) * DRIVER_SCALE
put(canvas, head, collar_x, collar_y, scale=DRIVER_SCALE, rot=HEAD_ROT)

# ---- background so we can judge it in context ----
sky = Image.open("assets/background/sky.png").convert("RGBA").resize((W, H))
far = Image.open("assets/background/hills_far.png").convert("RGBA")
mid = Image.open("assets/background/hills_mid.png").convert("RGBA")
grass = Image.open("assets/terrain/grass_top.png").convert("RGBA")

scene = sky.copy()
f = far.resize((W, round(far.height * W / far.width)))
scene.alpha_composite(f, (0, H - f.height - 300))
m = mid.resize((W, round(mid.height * W / mid.width)))
scene.alpha_composite(m, (0, H - m.height - 120))
g = grass.resize((W, round(grass.height * W / grass.width)))
scene.alpha_composite(g, (0, H - 210))
scene.alpha_composite(canvas, (0, -120))

d = ImageDraw.Draw(scene)
for (ax, ay) in (REAR_AXLE, FRONT_AXLE):
    d.ellipse([OX + ax - 6, OY + ay - 6 - 120, OX + ax + 6, OY + ay + 6 - 120],
              fill=(255, 0, 255))
d.ellipse([OX + SEAT[0] - 6, OY + SEAT[1] - 6 - 120,
           OX + SEAT[0] + 6, OY + SEAT[1] + 6 - 120], fill=(0, 255, 255))
d.ellipse([collar_x - 6, collar_y - 6 - 120, collar_x + 6, collar_y + 6 - 120],
          fill=(255, 255, 0))
scene.convert("RGB").save("/tmp/composite.png")
print("magenta = axles, cyan = hip/seat, yellow = neck joint")
print("saved /tmp/composite.png", scene.size)
