# -*- coding: utf-8 -*-
"""把用户设计的黑金头像做成发布用图标。

原图是预切圆角的 RGBA，四角透明。互动空间上传后会再裁一次圆角，
透明角会露底变成"双圆角"，所以这里把透明区填成同款深黑，输出满幅方形。

产物：
  assets/images/icon_512x512.png   商店/展示用
  assets/images/icon_300x300.png   互动空间 MCP 发布用
原件留档：
  assets/images/_alt/avatar_blackgold_original.png
"""
import os
import shutil

from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(BASE, "抖音上传准备材料", "assets", "images")
ALT = os.path.join(IMG, "_alt")
SRC_CANDIDATES = [
    os.path.join(ALT, "avatar_blackgold_original.png"),
    r"C:/Users/Lenovo/Desktop/数境-横屏包/头像-黑金-大气-512.png",
]

BG = (9, 8, 6, 255)   # 与头像外圈同色，填平圆角


def make(size=512):
    os.makedirs(ALT, exist_ok=True)

    src = next((p for p in SRC_CANDIDATES if os.path.exists(p)), None)
    if not src:
        raise SystemExit("找不到黑金头像原图")

    # 首次运行把原件留档，之后固定用它，避免桌面文件被移走后断链
    keep = SRC_CANDIDATES[0]
    if not os.path.exists(keep):
        shutil.copy2(src, keep)

    im = Image.open(keep).convert("RGBA")
    flat = Image.alpha_composite(Image.new("RGBA", im.size, BG), im).convert("RGB")

    p512 = os.path.join(IMG, "icon_512x512.png")
    flat.resize((512, 512), Image.LANCZOS).save(p512, "PNG", optimize=True)

    p300 = os.path.join(IMG, "icon_300x300.png")
    flat.resize((300, 300), Image.LANCZOS).save(p300, "PNG", optimize=True)

    return p512, p300


if __name__ == "__main__":
    for p in make():
        print(p, os.path.getsize(p) // 1024, "KB")
