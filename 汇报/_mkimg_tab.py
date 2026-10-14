# -*- coding: utf-8 -*-
"""把本轮平板档位的截图压成报告用的 JPEG，并存到 汇报/shots_tab/。

源图在 .tmp_play/（_diag.py --shot= 直接产出的 2800×1968 PNG，一张就好几 MB）。
报告是单文件 HTML，图片必须内嵌 base64 —— 所以先缩到宽 1200 / q82。

用法: python 汇报/_mkimg_tab.py
"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SHOT = os.path.join(BASE, "shots_tab")
SRC = os.path.join(ROOT, ".tmp_play")
os.makedirs(SHOT, exist_ok=True)

# 源图 -> 输出名
JOBS = [
    ("tab_before.png", "tab_before.jpg"),
    ("tab_after.png", "tab_after.jpg"),
]


def save(im, name, w=1200, q=82):
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(SHOT, name)
    im.convert("RGB").save(p, "JPEG", quality=q, optimize=True)
    print("%-18s %5dx%-5d %6.0f KB" % (name, im.width, im.height, os.path.getsize(p) / 1024.0))


for src, dst in JOBS:
    p = os.path.join(SRC, src)
    if not os.path.exists(p):
        print("缺图:", p)
        continue
    save(Image.open(p), dst)

# 角标特写：从「改动后」那张上裁左中一条（角标在 left:6px / top:50%）
p = os.path.join(SRC, "tab_after.png")
if os.path.exists(p):
    im = Image.open(p)
    # 截图是 deviceScaleFactor=2 出的，坐标 ×2
    box = (0, int(im.height * 0.36), 620, int(im.height * 0.62))
    save(im.crop(box), "dbg_badge.jpg", w=620, q=88)
