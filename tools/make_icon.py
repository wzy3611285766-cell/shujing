# -*- coding: utf-8 -*-
"""生成「数境 · 四国远征」的游戏图标（简约版）。

方案 A：单晶四点 —— 一枚金色结晶 + 四方四个小菱形
方案 B：远征路径 —— 一条折线穿过四个节点，终点是结晶
两个方案都只用「深蓝 + 金色」两色，保证小尺寸下依然清晰。
"""
import os
import shutil

from PIL import Image, ImageDraw, ImageFilter, ImageOps

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "抖音上传准备材料", "assets", "images")
ALT = os.path.join(OUT, "_alt")

DEEP = (7, 15, 27)
MID = (18, 34, 54)
GOLD_HI = (255, 231, 168)
GOLD = (255, 207, 96)
GOLD_LO = (238, 152, 32)


def bg(size, scale):
    w = h = size * scale
    grad = Image.radial_gradient("L").resize((w, h), Image.LANCZOS)
    img = ImageOps.colorize(grad, black=MID, white=DEEP)
    # 顶部一层极淡的冷光，避免整块死黑
    glow = Image.new("L", (w, h), 0)
    ImageDraw.Draw(glow).ellipse(
        [w * 0.18, h * 0.10, w * 0.82, h * 0.66], fill=48)
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.16))
    img.paste(Image.new("RGB", (w, h), (34, 62, 96)), (0, 0), glow)
    return img.convert("RGBA")


def crystal(im, cx, cy, half_h, half_w, scale):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    halo = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse(
        [cx - half_w * 2.6, cy - half_h * 1.25,
         cx + half_w * 2.6, cy + half_h * 1.25],
        fill=(255, 196, 104, 46))
    halo = halo.filter(ImageFilter.GaussianBlur(half_h * 0.30))
    im.alpha_composite(halo)

    left = [(cx, cy - half_h), (cx - half_w, cy), (cx, cy + half_h), (cx, cy)]
    right = [(cx, cy - half_h), (cx + half_w, cy), (cx, cy + half_h), (cx, cy)]
    d.polygon(left, fill=GOLD_HI + (255,))
    d.polygon(right, fill=GOLD_LO + (255,))
    # 中缝高光
    d.line([(cx, cy - half_h), (cx, cy + half_h)],
           fill=(255, 248, 220, 200), width=max(1, int(1.8 * scale)))
    im.alpha_composite(ov)


def diamond(d, cx, cy, r, fill):
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=fill)


def icon_a(size=512, scale=4):
    """方案 A：四切面结晶。一枚菱形切成四片，四面即四国。"""
    S = size * scale
    im = bg(size, scale)
    cx = cy = S / 2
    h, w = S * 0.325, S * 0.188

    halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse(
        [cx - w * 2.2, cy - h * 1.18, cx + w * 2.2, cy + h * 1.18],
        fill=(255, 198, 106, 58))
    halo = halo.filter(ImageFilter.GaussianBlur(h * 0.34))
    im.alpha_composite(halo)

    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    faces = [
        ([(cx, cy - h), (cx - w, cy), (cx, cy)], (255, 240, 192)),
        ([(cx, cy - h), (cx + w, cy), (cx, cy)], (255, 205, 92)),
        ([(cx, cy + h), (cx - w, cy), (cx, cy)], (247, 164, 42)),
        ([(cx, cy + h), (cx + w, cy), (cx, cy)], (198, 103, 16)),
    ]
    for poly, col in faces:
        d.polygon(poly, fill=col + (255,))

    d.line([(cx, cy - h), (cx, cy + h)],
           fill=(255, 250, 228, 120), width=max(1, int(1.2 * scale)))
    d.line([(cx - w, cy), (cx + w, cy)],
           fill=(255, 250, 228, 70), width=max(1, int(1.2 * scale)))
    d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)],
              outline=(255, 246, 214, 130), width=max(1, int(1.4 * scale)))
    im.alpha_composite(ov)

    return im.convert("RGB").resize((size, size), Image.LANCZOS)


def icon_b(size=512, scale=4):
    """方案 B：远征路径。一格一格推进，终点是结晶。"""
    S = size * scale
    im = bg(size, scale)

    pts = [(S * 0.180, S * 0.780), (S * 0.370, S * 0.620),
           (S * 0.585, S * 0.655), (S * 0.760, S * 0.300)]
    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # 路径外发光
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).line(pts, fill=(255, 200, 110, 90),
                              width=int(9 * scale), joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(7 * scale))
    ov.alpha_composite(glow)

    d.line(pts, fill=(255, 214, 120, 235), width=int(4.2 * scale), joint="curve")

    # 起点与中途节点
    for px, py in pts[:-1]:
        d.ellipse([px - 7.5 * scale, py - 7.5 * scale,
                   px + 7.5 * scale, py + 7.5 * scale],
                  fill=(9, 20, 34, 255), outline=(255, 214, 120, 255),
                  width=int(3 * scale))

    im.alpha_composite(ov)
    # 终点结晶
    crystal(im, pts[-1][0], pts[-1][1], S * 0.105, S * 0.048, scale)

    return im.convert("RGB").resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(ALT, exist_ok=True)
    cur = os.path.join(OUT, "icon_512x512.png")
    v1 = os.path.join(ALT, "icon_v1_rosette.png")
    if os.path.exists(cur) and not os.path.exists(v1):
        shutil.copy2(cur, v1)

    a = icon_a()
    a.save(cur, "PNG", optimize=True)

    b = icon_b()
    b.save(os.path.join(ALT, "icon_alt_path.png"), "PNG", optimize=True)

    # 小尺寸预览，检查 48px 下是否还认得出
    a.resize((48, 48), Image.LANCZOS).save(os.path.join(ALT, "preview_a_48.png"))
    b.resize((48, 48), Image.LANCZOS).save(os.path.join(ALT, "preview_b_48.png"))

    for p in (cur, os.path.join(ALT, "icon_alt_path.png")):
        print(p, os.path.getsize(p) // 1024, "KB")


if __name__ == "__main__":
    main()
