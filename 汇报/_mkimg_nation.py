# -*- coding: utf-8 -*-
"""把「四国并联」这轮的截图压成报告用的 JPEG（存到 汇报/shots_nation/）。

源图在 .tmp_play/（_shot_portal.py 产出的 860×1864 PNG，一张 500KB）。
用法: python 汇报/_mkimg_nation.py
"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SHOT = os.path.join(BASE, "shots_nation")
SRC = os.path.join(ROOT, ".tmp_play")
os.makedirs(SHOT, exist_ok=True)

JOBS = [
    ("portal_old.png",     "portal_before.jpg",  700),
    ("portal_new.png",     "portal_after.jpg",   700),
    ("portal_visited.png", "portal_visited.jpg", 700),
    ("menu_teleport.png",  "menu_entry.jpg",     640),
]

for src, dst, w in JOBS:
    p = os.path.join(SRC, src)
    if not os.path.exists(p):
        print("缺图:", src)
        continue
    im = Image.open(p)
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out = os.path.join(SHOT, dst)
    im.convert("RGB").save(out, "JPEG", quality=80, optimize=True)
    print("%-20s %4dx%-5d %6.0f KB" % (dst, im.width, im.height, os.path.getsize(out) / 1024.0))
