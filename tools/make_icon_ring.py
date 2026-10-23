# -*- coding: utf-8 -*-
"""按「头像-蓝-纯净」的构成语言生成游戏图标。

风格要素（照搬参考图）：
  · 满幅渐变底，左上更亮
  · 一条粗圆环，开口在左上，两端圆头
  · 开口处有一段半透明拖尾，向外渐隐
  · 没有描边、没有阴影、没有多余装饰

三个配色/变体：
  ring_gold      深蓝底 + 金色环（游戏主色，作为主图标）
  ring_blue      亮蓝底 + 白色环（还原参考图配色）
  ring_nodes     深蓝底 + 金色环，环上四个节点（四国）
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageOps

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "抖音上传准备材料", "assets", "images")
ALT = os.path.join(OUT, "_alt")

# 环的几何：参考图外径约 0.68 画布宽，线宽约 0.098
OUTER_R = 0.345
STROKE = 0.098
# 开口与拖尾（PIL 角度：0° 在 3 点钟，顺时针为正）
GAP_START = 268.0      # 上端圆头
GAP_END = 186.0        # 下端圆头
TAIL_FROM = 268.0
TAIL_TO = 196.0
# 拖尾比开口更长：会越过上端圆头，在环上再延伸一段渐隐（照原图）
HL_FROM = 298.0
HL_TO = 196.0


def make_bg(S, top, bottom, glow_color=None):
    """径向渐变底 + 左上柔光。"""
    grad = Image.radial_gradient("L").resize((S, S), Image.LANCZOS)
    img = ImageOps.colorize(grad, black=top, white=bottom).convert("RGB")

    if glow_color:
        glow = Image.new("L", (S, S), 0)
        ImageDraw.Draw(glow).ellipse(
            [-S * 0.25, -S * 0.30, S * 0.95, S * 0.90], fill=110)
        glow = glow.filter(ImageFilter.GaussianBlur(S * 0.28))
        img.paste(Image.new("RGB", (S, S), glow_color), (0, 0), glow)
    return img.convert("RGBA")


def polar(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def draw_ring(img, color, S, stroke_ratio=STROKE, tail=True, nodes=0,
              tail_color=None, tail_alpha=170):
    cx = cy = S / 2
    outer_r = S * OUTER_R
    stroke = int(S * stroke_ratio)
    bbox = [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r]
    mid_r = outer_r - stroke / 2
    tail_color = tail_color or color

    # 拖尾：'alpha' = 半透明渐隐（亮底用，效果干净）；
    #       None / False = 不做拖尾（深色底上半透明暖色会发灰，只留开口）
    # 'gold'：不透明的「暗金 → 环色」渐变，靠近下端圆头最亮、向上渐隐（照原图方向）。
    # 深色底上不能用半透明暖色（会混成灰），只能走同色系的明暗变化。
    if tail == "gold":
        dark = (168, 132, 62)
        ov_t = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        td = ImageDraw.Draw(ov_t)
        steps = 30
        for i in range(steps):
            t = (i + 0.5) / steps
            a0 = HL_FROM - (HL_FROM - HL_TO) * (i / steps)
            a1 = HL_FROM - (HL_FROM - HL_TO) * ((i + 1) / steps)
            col = tuple(int(dark[k] * (1 - t) + color[k] * t) for k in range(3))
            alpha = 255 if t > 0.4 else int(255 * max(0.0, t / 0.4))
            if alpha <= 2:
                continue
            td.arc(bbox, a1, a0 + 1.1, fill=col + (alpha,), width=stroke)
        ov_t = ov_t.filter(ImageFilter.GaussianBlur(stroke * 0.035))
        img.alpha_composite(ov_t)

    if tail == "alpha":
        ov_t = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        td = ImageDraw.Draw(ov_t)
        steps = 24
        for i in range(steps):
            a0 = TAIL_FROM - (TAIL_FROM - TAIL_TO) * (i / steps)
            a1 = TAIL_FROM - (TAIL_FROM - TAIL_TO) * ((i + 1) / steps)
            a = int(120 * (1 - i / steps) ** 1.5)
            if a <= 1:
                continue
            td.arc(bbox, a1, a0 + 1.1, fill=color + (a,), width=stroke)
        ov_t = ov_t.filter(ImageFilter.GaussianBlur(stroke * 0.04))
        img.alpha_composite(ov_t)

    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # 主环：从开口上端顺时针一圈到下端
    d.arc(bbox, GAP_START, GAP_END + 360, fill=color + (255,), width=stroke)

    # 两端圆头
    r = stroke / 2
    for deg in (GAP_START, GAP_END):
        px, py = polar(cx, cy, mid_r, deg)
        d.ellipse([px - r, py - r, px + r, py + r], fill=color + (255,))

    # 环上节点（四国）：在环形空档里等分，避开开口；挖空处理
    if nodes:
        span = (GAP_END + 360) - GAP_START
        for i in range(nodes):
            deg = GAP_START + span * (i + 0.5) / nodes
            px, py = polar(cx, cy, mid_r, deg)
            nr = stroke * 0.20
            d.ellipse([px - nr, py - nr, px + nr, py + nr],
                      fill=(tail_color or (28, 56, 88)) + (255,))

    img.alpha_composite(ov)
    return img


def draw_full_ring(img, color, S, stroke_ratio=STROKE,
                   highlight=None, hl_from=194.0, hl_to=292.0):
    """完整闭合圆环 + 环上叠加一段渐隐高光（照参考图的结构）。

    高光只在环的宽度内叠加，不落到背景上 —— 深色底上把亮色叠在环上，
    颜色是「更亮的金色」；一旦落到背景就会变成灰，这是两回事。
    """
    cx = cy = S / 2
    outer_r = S * OUTER_R
    stroke = int(S * stroke_ratio)
    bbox = [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r]

    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # 完整圆环，闭合，没有开口
    d.arc(bbox, 0, 360, fill=color + (255,), width=stroke)

    # 左上高光：两端渐隐，中间最亮
    if highlight:
        steps = 30
        for i in range(steps):
            t = (i + 0.5) / steps
            a0 = hl_from + (hl_to - hl_from) * (i / steps)
            a1 = hl_from + (hl_to - hl_from) * ((i + 1) / steps)
            alpha = int(215 * math.sin(math.pi * t) ** 0.85)
            if alpha <= 2:
                continue
            d.arc(bbox, a0, a1 + 1.0, fill=highlight + (alpha,), width=stroke)

    img.alpha_composite(ov)
    return img


def build(name, top, bottom, glow, ring_color, tail=True, nodes=0,
          tail_color=None, full=False, highlight=None, radius=0.0,
          size=512, scale=4):
    S = size * scale
    img = make_bg(S, top, bottom, glow)
    if full:
        img = draw_full_ring(img, ring_color, S, highlight=highlight)
    else:
        img = draw_ring(img, ring_color, S, tail=tail, nodes=nodes, tail_color=tail_color)
    out = img.convert("RGB").resize((size, size), Image.LANCZOS)
    # radius > 0 时切成圆角方形（照参考头像的外形），四角透明
    if radius > 0:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * radius), fill=255)
        out.putalpha(mask)
    path = os.path.join(ALT if name != "ring_gold" else OUT,
                        "icon_512x512.png" if name == "ring_gold" else name + ".png")
    out.save(path, "PNG", optimize=True)
    return path


def main():
    os.makedirs(ALT, exist_ok=True)
    made = []

    # 主图标：照参考头像的开口环 + 左上渐隐拖尾 + 圆角外形，配色用夜航深蓝与暖金
    made.append(build("ring_gold",
                      top=(44, 82, 128), bottom=(7, 16, 30),
                      glow=(44, 84, 126), ring_color=(255, 214, 124),
                      tail="gold", radius=0.202))

    # 满幅版：平台上传用（平台会自己裁圆角，预先切会变成双圆角）
    made.append(build("ring_square",
                      top=(44, 82, 128), bottom=(7, 16, 30),
                      glow=(44, 84, 126), ring_color=(255, 214, 124),
                      tail="gold", radius=0.0))

    # 还原参考图配色：亮蓝底 + 白色环 + 半透明拖尾
    made.append(build("ring_blue",
                      top=(56, 146, 255), bottom=(8, 80, 200),
                      glow=(70, 160, 255), ring_color=(255, 255, 255),
                      tail="alpha"))

    for p in made:
        print(p, os.path.getsize(p) // 1024, "KB")


if __name__ == "__main__":
    main()
