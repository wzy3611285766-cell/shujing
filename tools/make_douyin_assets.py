# -*- coding: utf-8 -*-
"""生成「数境 · 四国远征」抖音互动空间上传素材。

产物目录：抖音上传准备材料/
  图片：图标 512、启动图 720x1280、宣传图 1080x1920、截图 720x1280 x5
  音频：按钮音效、结束音效、背景音乐（WAV 44.1kHz）
  字体：中文字体副本（仅本地测试用，发布前请替换为授权字体）
"""
import math
import os
import random
import struct
import wave

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "抖音上传准备材料")
IMG_DIR = os.path.join(OUT, "assets", "images")
SHOT_DIR = os.path.join(IMG_DIR, "screenshots")
AUD_DIR = os.path.join(OUT, "assets", "audio")
FONT_DIR = os.path.join(OUT, "assets", "fonts")

# 游戏主色（取自 src/css/00_base.css）
DEEP = (7, 15, 27)
MID = (13, 27, 42)
LIGHT = (26, 52, 80)
GOLD = (255, 215, 106)
GOLD_HI = (255, 231, 168)
GOLD_LO = (245, 160, 40)
AMBER = (179, 101, 26)

FONT_BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]
FONT_REG_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def pick_font(cands):
    for p in cands:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("找不到可用中文字体")


BOLD_PATH = pick_font(FONT_BOLD_CANDIDATES)
REG_PATH = pick_font(FONT_REG_CANDIDATES)


def F(size, bold=False):
    return ImageFont.truetype(BOLD_PATH if bold else REG_PATH, size)


def ensure_dirs():
    for d in (IMG_DIR, SHOT_DIR, AUD_DIR, FONT_DIR):
        os.makedirs(d, exist_ok=True)


def vgrad(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line(
            [(0, y), (w, y)],
            fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return img


def add_glow(img, cx, cy, r, color, alpha=110, blur=0.55):
    """在 img 上叠加柔和径向光。"""
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(r * blur))
    layer = Image.new("RGB", (w, h), color)
    img.paste(layer, (0, 0), mask)


def background(w, h, scale, glow=True):
    """夜航底色：深蓝垂直渐变 + 中心暖光 + 星点 + 细网格。"""
    img = vgrad(w, h, (10, 22, 38), (5, 11, 20))
    if glow:
        add_glow(img, w * 0.5, h * 0.32, int(min(w, h) * 0.75), (28, 58, 88), 130)
        add_glow(img, w * 0.5, h * 0.34, int(min(w, h) * 0.30), (86, 66, 26), 60)

    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # 细网格（地图经纬感）
    step = int(96 * scale)
    grid = (255, 215, 106, 9)
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=grid)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=grid)

    # 星点
    rnd = random.Random(20261022)
    for _ in range(int(w * h / (14000 * scale))):
        x = rnd.uniform(0, w)
        y = rnd.uniform(0, h)
        r = rnd.uniform(0.7, 2.1) * scale
        a = rnd.randint(40, 150)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 232, 170, a))

    img = Image.alpha_composite(img.convert("RGBA"), ov)
    return img


def tracked_text(d, cx, cy, text, font, fill, tracking=0, anchor_center=True):
    widths = [font.getlength(ch) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2 if anchor_center else cx
    for ch, wd in zip(text, widths):
        d.text((x + wd / 2, cy), ch, font=font, fill=fill, anchor="mm")
        x += wd + tracking
    return total


def gradient_text(img, cx, cy, text, font, tracking=0,
                  top=GOLD_HI, bottom=GOLD_LO, glow=True, glow_color=(255, 176, 64)):
    """金色渐变标题，带柔光。img 需为 RGBA。"""
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    tracked_text(ImageDraw.Draw(mask), cx, cy, text, font, 255, tracking)
    bbox = mask.getbbox()
    if not bbox:
        return
    x0, y0, x1, y1 = bbox

    grad = Image.new("RGB", (x1 - x0, y1 - y0))
    gd = ImageDraw.Draw(grad)
    for i in range(y1 - y0):
        t = i / max(1, y1 - y0 - 1)
        gd.line(
            [(0, i), (x1 - x0, i)],
            fill=tuple(int(top[k] + (bottom[k] - top[k]) * t) for k in range(3)),
        )

    if glow:
        gm = mask.filter(ImageFilter.GaussianBlur(max(4, font.size * 0.16)))
        layer = Image.new("RGB", (w, h), glow_color)
        img.paste(layer, (0, 0), gm.point(lambda v: int(v * 0.55)))

    img.paste(grad, (x0, y0), mask.crop(bbox))


def soft_text(img, cx, cy, text, font, color, tracking=0, alpha=255, shadow=True):
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    tracked_text(ImageDraw.Draw(mask), cx, cy, text, font, 255, tracking)
    if shadow:
        sm = mask.filter(ImageFilter.GaussianBlur(max(3, font.size * 0.12)))
        img.paste(Image.new("RGB", (w, h), (0, 0, 0)), (0, 0),
                  sm.point(lambda v: int(v * 0.65)))
    layer = Image.new("RGB", (w, h), color)
    img.paste(layer, (0, 0), mask.point(lambda v: int(v * alpha / 255)))


def draw_compass(img, cx, cy, r, scale, alpha=90, ticks=True):
    """罗盘：双环 + 方位刻度 + 四国标记。"""
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    lw = max(1, int(1.6 * scale))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD + (alpha,), width=lw)
    d.ellipse([cx - r * 0.86, cy - r * 0.86, cx + r * 0.86, cy + r * 0.86],
              outline=GOLD + (int(alpha * 0.5),), width=max(1, lw // 2))

    if ticks:
        for i in range(48):
            ang = math.radians(i * 7.5)
            major = i % 6 == 0
            r1 = r * (0.82 if major else 0.885)
            r2 = r * 0.94
            d.line(
                [(cx + r1 * math.cos(ang), cy + r1 * math.sin(ang)),
                 (cx + r2 * math.cos(ang), cy + r2 * math.sin(ang))],
                fill=GOLD + (int(alpha * (1.0 if major else 0.45)),),
                width=lw if major else max(1, lw - 1),
            )

    # 四个方位菱形（四国）
    for i in range(4):
        ang = math.radians(i * 90 - 90)
        px = cx + r * 0.99 * math.cos(ang)
        py = cy + r * 0.99 * math.sin(ang)
        s = 7 * scale
        d.polygon([(px, py - s), (px + s, py), (px, py + s), (px - s, py)],
                  fill=GOLD + (min(255, alpha + 90),))

    img.alpha_composite(ov)


def draw_crystal(img, cx, cy, h, w=None, scale=1):
    """中心水晶：左右两半不同亮度，模拟切面。"""
    w = w or h * 0.42
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # 外发光
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [cx - w * 1.8, cy - h * 1.3, cx + w * 1.8, cy + h * 1.3],
        fill=(255, 200, 110, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(h * 0.22))
    img.alpha_composite(glow)

    left = [(cx, cy - h), (cx - w, cy), (cx, cy + h), (cx, cy)]
    right = [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx, cy)]
    d.polygon(left, fill=(255, 226, 150, 255))
    d.polygon(right, fill=(224, 150, 48, 255))
    d.line([(cx, cy - h), (cx, cy + h)], fill=(255, 247, 214, 210),
           width=max(1, int(1.6 * scale)))
    d.polygon([(cx, cy - h), (cx - w, cy), (cx, cy + h), (cx, cy)],
              outline=(255, 247, 214, 170))
    d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx, cy)],
              outline=(255, 247, 214, 170))
    img.alpha_composite(ov)


def round_frame(im, radius, border=GOLD, border_w=2, shadow=True):
    """给图片加圆角、金色细边与投影，返回 RGBA。"""
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1],
                                           radius=radius, fill=255)
    out = Image.new("RGBA", (w + border_w * 6, h + border_w * 6), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [border_w * 3, border_w * 3 + border_w * 2,
             border_w * 3 + w, border_w * 3 + h],
            radius=radius, fill=(0, 0, 0, 150))
        out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(border_w * 5)))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.paste(im.convert("RGBA"), (0, 0), mask)
    out.alpha_composite(layer, (border_w * 3, border_w * 3))
    ImageDraw.Draw(out).rounded_rectangle(
        [border_w * 3, border_w * 3, border_w * 3 + w - 1, border_w * 3 + h - 1],
        radius=radius, outline=border + (170,), width=border_w)
    return out


# ---------------- 图标 ----------------
def make_icon(size=512, scale=4):
    """图标统一由 tools/make_icon_ring.py 生成（圆环开口，极简两色）。"""
    import importlib
    mod = importlib.import_module("make_icon_ring")
    S = size * scale
    img = mod.make_bg(S, (44, 82, 128), (7, 16, 30), (44, 84, 126))
    img = mod.draw_ring(img, (255, 214, 124), S, tail="gold")
    img = img.convert("RGB").resize((size, size), Image.LANCZOS)
    p = os.path.join(IMG_DIR, "icon_512x512.png")
    img.save(p, "PNG", optimize=True)
    return p


# ---------------- 启动图 ----------------
def make_splash(w=720, h=1280, scale=2):
    W, H = w * scale, h * scale
    img = background(W, H, scale)
    draw_compass(img, W // 2, int(H * 0.40), int(W * 0.44), scale, alpha=55)
    draw_compass(img, W // 2, int(H * 0.40), int(W * 0.60), scale, alpha=25, ticks=False)

    # 顶部徽记
    soft_text(img, W // 2, int(H * 0.12), "S H U   J I N G", F(int(15 * scale)),
              (255, 215, 106), alpha=170)
    draw_crystal(img, W // 2, int(H * 0.205), int(W * 0.058), int(W * 0.0245), scale)

    gradient_text(img, W // 2, int(H * 0.365), "数境", F(int(138 * scale), bold=True),
                  tracking=int(14 * scale))
    soft_text(img, W // 2, int(H * 0.455), "四 国 远 征", F(int(38 * scale)),
              (240, 246, 255), tracking=int(10 * scale), alpha=235)

    # 分隔线
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    y = int(H * 0.505)
    half = int(W * 0.18)
    d.line([(W // 2 - half, y), (W // 2 + half, y)], fill=(255, 215, 106, 90),
           width=max(1, scale))
    d.polygon([(W // 2, y - 4 * scale), (W // 2 + 4 * scale, y),
               (W // 2, y + 4 * scale), (W // 2 - 4 * scale, y)],
              fill=(255, 215, 106, 200))
    img.alpha_composite(ov)

    soft_text(img, W // 2, int(H * 0.555), "以知识为刃 · 行四国之远",
              F(int(24 * scale)), (208, 220, 236), alpha=200)

    soft_text(img, W // 2, int(H * 0.94), "v4.0.28   单机可玩   竖屏适配",
              F(int(14 * scale)), (150, 166, 186), alpha=170, shadow=False)

    img = img.convert("RGB").resize((w, h), Image.LANCZOS)
    p = os.path.join(IMG_DIR, "splash_720x1280.png")
    img.save(p, "PNG", optimize=True)
    return p


# ---------------- 宣传图 ----------------
def make_banner(w=1080, h=1920, scale=2):
    W, H = w * scale, h * scale
    img = background(W, H, scale)
    draw_compass(img, int(W * 0.5), int(H * 0.21), int(W * 0.34), scale, alpha=48)
    draw_compass(img, int(W * 0.5), int(H * 0.21), int(W * 0.46), scale, alpha=22, ticks=False)

    soft_text(img, W // 2, int(H * 0.072), "数 境", F(int(26 * scale)),
              (255, 215, 106), alpha=190, tracking=int(8 * scale))
    draw_crystal(img, W // 2, int(H * 0.125), int(W * 0.042), int(W * 0.018), scale)

    gradient_text(img, W // 2, int(H * 0.225), "四国远征", F(int(112 * scale), bold=True),
                  tracking=int(10 * scale))
    soft_text(img, W // 2, int(H * 0.298), "知识问答 × 地图策略 × 单机闯关",
              F(int(28 * scale)), (226, 236, 250), alpha=225)

    # 卖点标签
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    tags = ["四国地图", "题库挑战", "存档码", "离线可玩"]
    f = F(int(22 * scale))
    gap = int(16 * scale)
    tws = [f.getlength(t) + 40 * scale for t in tags]
    total = sum(tws) + gap * (len(tags) - 1)
    x = (W - total) / 2
    y = int(H * 0.34)
    for t, tw in zip(tags, tws):
        d.rounded_rectangle([x, y, x + tw, y + 52 * scale], radius=26 * scale,
                            fill=(255, 215, 106, 26), outline=(255, 215, 106, 110),
                            width=max(1, scale))
        d.text((x + tw / 2, y + 26 * scale), t, font=f,
               fill=(255, 224, 150, 240), anchor="mm")
        x += tw + gap
    img.alpha_composite(ov)

    # 实机画面（取真实界面顶部，HUD 与地图同框）
    src_path = SHOT_SRC if os.path.exists(SHOT_SRC) else SHOT_FALLBACK
    raw = Image.open(src_path).convert("RGB")
    cut = int(raw.width * 0.97)
    shot = raw.crop((0, 0, raw.width, min(raw.height, cut)))
    sw = int(W * 0.66)
    sh = int(sw * shot.height / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    frame = round_frame(shot, int(30 * scale), border_w=int(2 * scale))
    fx = int(W / 2 - frame.width / 2)
    fy = int(H * 0.40)
    img.alpha_composite(frame, (fx, fy))

    # 卖点短句
    f = F(int(22 * scale))
    feats = ["四国地图 · 逐格推进", "题库挑战 · 即时反馈", "存档码 · 换机续玩"]
    py = int(H * 0.80)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for t in feats:
        tw = f.getlength(t)
        d.ellipse([W / 2 - tw / 2 - 26 * scale, py - 3 * scale,
                   W / 2 - tw / 2 - 20 * scale, py + 3 * scale],
                  fill=(255, 215, 106, 220))
        d.text((W / 2 - tw / 2, py), t, font=f, fill=(200, 214, 232, 230), anchor="lm")
        py += int(H * 0.036)
    img.alpha_composite(ov)

    soft_text(img, W // 2, int(H * 0.945), "打开即玩 · 无需下载",
              F(int(23 * scale)), (196, 212, 232), alpha=190, shadow=False)

    img = img.convert("RGB").resize((w, h), Image.LANCZOS)
    p = os.path.join(IMG_DIR, "banner_1080x1920.jpg")
    img.save(p, "JPEG", quality=90, optimize=True, progressive=True)
    return p


# ---------------- 截图 ----------------
# 实机截图由 tools/capture_game_shots.py 生成；缺失时回退到已有实机图
SHOT_SRC = os.path.join(BASE, "_shots", "shot_main.png")
SHOT_FALLBACK = os.path.join(BASE, "小红书上传准备材料", "冒烟截图_烽火地带.jpg")

SHOTS = [
    ("screenshot_1_720x1280.png", "烽火地带", "实机运行画面 · 搜刮 / 交火 / 撤离", []),
    ("screenshot_2_720x1280.png", "顶栏与资源", "模式切换 · 结晶与行动点",
     [(0.008, 0.004, 0.86, 0.05, "")]),
    ("screenshot_3_720x1280.png", "任务目标", "当前目标与操作提示",
     [(0.255, 0.040, 0.755, 0.096, "")]),
    ("screenshot_4_720x1280.png", "小地图与帧率", "实时位置 · 性能监控",
     [(0.760, 0.050, 0.995, 0.180, "")]),
    ("screenshot_5_720x1280.png", "摇杆与交互", "单指移动 · 场景交互",
     [(0.008, 0.818, 0.245, 0.982, "")]),
]


def content_crop(im):
    """去掉截图上下黑边，只保留实际画面。"""
    mask = im.convert("L").point(lambda v: 255 if v > 16 else 0)
    bbox = mask.getbbox()
    return im.crop(bbox) if bbox else im


def focal_crop(im, w, h, cx=0.5, cy=0.5, zoom=1.0):
    """按焦点裁切到固定尺寸，画面不变形。"""
    base = max(w / im.width, h / im.height) * zoom
    nw, nh = max(w, int(im.width * base)), max(h, int(im.height * base))
    big = im.resize((nw, nh), Image.LANCZOS)
    x = int(nw * cx - w / 2)
    y = int(nh * cy - h / 2)
    x = max(0, min(nw - w, x))
    y = max(0, min(nh - h, y))
    return big.crop((x, y, x + w, y + h))


def draw_marks(im, marks, scale):
    """在画面上叠加金色标注框与说明胶囊。"""
    if not marks:
        return im
    w, h = im.size
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    f = F(int(14 * scale))
    for x0, y0, x1, y1, label in marks:
        bx0, by0 = int(x0 * w), int(y0 * h)
        bx1, by1 = int(x1 * w), int(y1 * h)
        d.rounded_rectangle([bx0, by0, bx1, by1], radius=int(8 * scale),
                            outline=(255, 215, 106, 235), width=int(2.4 * scale))
        if label:
            tw = f.getlength(label) + 22 * scale
            th = 30 * scale
            lx = min(max(bx0, 4 * scale), max(4 * scale, w - tw - 4 * scale))
            ly = by0 - th - 7 * scale
            if ly < 4 * scale:
                ly = min(by0 + 7 * scale, h - th - 4 * scale)
            d.rounded_rectangle([lx, ly, lx + tw, ly + th], radius=th / 2,
                                fill=(10, 24, 40, 240), outline=(255, 215, 106, 190),
                                width=max(1, int(scale)))
            d.text((lx + tw / 2, ly + th / 2 + 1 * scale), label, font=f,
                   fill=(255, 228, 156, 255), anchor="mm")
    return Image.alpha_composite(im.convert("RGBA"), ov)


def make_screenshot(idx, filename, title, subtitle, marks, w=720, h=1280, scale=2):
    W, H = w * scale, h * scale
    img = background(W, H, scale, glow=True)

    src_path = SHOT_SRC if os.path.exists(SHOT_SRC) else SHOT_FALLBACK
    src = Image.open(src_path).convert("RGB")

    # 顶部标题
    soft_text(img, W // 2, int(H * 0.055), title, F(int(44 * scale), bold=True),
              (255, 232, 176), tracking=int(3 * scale))
    soft_text(img, W // 2, int(H * 0.088), subtitle, F(int(19 * scale)),
              (176, 194, 216), alpha=210)

    # 画面区域（保持手机比例）
    dw = int(W * 0.72)
    dh = int(dw * src.height / src.width)
    disp = src.resize((dw, dh), Image.LANCZOS)
    disp = draw_marks(disp, marks, scale)
    frame = round_frame(disp.convert("RGB"), int(22 * scale), border_w=int(2 * scale))
    fx = int(W / 2 - frame.width / 2)
    fy = int(H * 0.14)
    img.alpha_composite(frame, (fx, fy))

    # 底部信息条
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    y = int(H * 0.905)
    d.rounded_rectangle([int(W * 0.14), y, int(W * 0.86), y + int(58 * scale)],
                        radius=int(29 * scale), fill=(255, 215, 106, 18),
                        outline=(255, 215, 106, 85), width=max(1, scale))
    d.text((W // 2, y + int(29 * scale)),
           "数境 · 四国远征   v4.0.28", font=F(int(18 * scale)),
           fill=(255, 224, 154, 215), anchor="mm")
    img.alpha_composite(ov)

    soft_text(img, W // 2, int(H * 0.965), f"0{idx} / 05", F(int(15 * scale)),
              (128, 146, 168), alpha=160, shadow=False)

    img = img.convert("RGB").resize((w, h), Image.LANCZOS)
    p = os.path.join(SHOT_DIR, filename)
    img.save(p, "PNG", optimize=True)
    return p


# ---------------- 音频 ----------------
SR = 44100


def write_wav(path, samples, sr=SR):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.82 / peak
    frames = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s * gain)) * 32767)
        frames += struct.pack("<h", v)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(frames))


def make_click(path):
    dur = 0.09
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        f = 1750 - 900 * (t / dur)
        env = math.exp(-t * 55)
        s = math.sin(2 * math.pi * f * t) * env
        s += 0.35 * math.sin(2 * math.pi * f * 2.02 * t) * env
        if i < 60:
            s += random.uniform(-0.4, 0.4) * (1 - i / 60)
        out.append(s * 0.9)
    write_wav(path, out)


def make_game_over(path):
    notes = [523.25, 392.00, 261.63]
    dur = 0.26
    out = []
    for idx, f in enumerate(notes):
        n = int(SR * dur)
        for i in range(n):
            t = i / SR
            env = math.exp(-t * 6.5) * (1 - math.exp(-t * 90))
            s = math.sin(2 * math.pi * f * t) * 0.6
            s += 0.22 * math.sin(2 * math.pi * f * 2 * t)
            s += 0.10 * math.sin(2 * math.pi * f * 3 * t)
            out.append(s * env * (1.0 if idx < 2 else 1.15))
        out.extend([0.0] * int(SR * 0.03))
    write_wav(path, out)


def make_bgm(path, bars=8, bpm=72):
    """A 小调五声音阶氛围循环：低频垫 + 竖琴式琶音。"""
    beat = 60.0 / bpm
    dur = bars * 4 * beat
    n = int(SR * dur)
    buf = [0.0] * n
    scale = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00]
    rnd = random.Random(7)

    # 低频垫
    for f in (110.0, 164.81, 220.0):
        for i in range(n):
            t = i / SR
            lfo = 0.75 + 0.25 * math.sin(2 * math.pi * 0.07 * t)
            buf[i] += 0.10 * math.sin(2 * math.pi * f * t) * lfo * 0.6

    # 琶音（每 1/2 拍一个音）
    step = beat / 2
    tpos = 0.0
    while tpos < dur - 0.6:
        note = rnd.choice(scale)
        start = int(tpos * SR)
        length = int(1.6 * SR)
        for i in range(length):
            if start + i >= n:
                break
            t = i / SR
            env = math.exp(-t * 2.4) * (1 - math.exp(-t * 120))
            s = math.sin(2 * math.pi * note * t)
            s += 0.30 * math.sin(2 * math.pi * note * 2 * t)
            s += 0.12 * math.sin(2 * math.pi * note * 3 * t)
            buf[start + i] += 0.16 * s * env
        tpos += step

    # 简单延迟
    delay = int(beat * 0.75 * SR)
    for i in range(delay, n):
        buf[i] += buf[i - delay] * 0.22

    # 首尾淡入淡出（无缝循环用 0.5s）
    fade = int(0.5 * SR)
    for i in range(fade):
        k = i / fade
        buf[i] *= k
        buf[n - 1 - i] *= k

    write_wav(path, buf)


def make_audio():
    make_click(os.path.join(AUD_DIR, "button_click.wav"))
    make_game_over(os.path.join(AUD_DIR, "game_over.wav"))
    make_bgm(os.path.join(AUD_DIR, "background_music.wav"))


def copy_font():
    """本作直接调用系统字体，无需随包分发字体文件；此处只留替换说明。"""
    note = (
        "本游戏为纯 HTML 单页应用，界面文字直接使用运行环境的系统字体\n"
        "（font-family 依次回退到 -apple-system / PingFang SC / Microsoft YaHei / sans-serif），\n"
        "因此不需要随包分发字体文件，也不会产生字体版权与体积问题。\n"
        "\n"
        "如果后续要做品牌字体（例如标题换成特定字形），请务必使用可商用授权字体：\n"
        "  · 思源黑体 Source Han Sans（SIL Open Font License 1.1）\n"
        "  · 阿里巴巴普惠体（免费商用）\n"
        "  · HarmonyOS Sans（免费商用）\n"
        "\n"
        "接入方式建议：\n"
        "  1. 将字体放到 assets/fonts/ 下，单个文件不超过 5MB；\n"
        "  2. 中文字体请先做字形子集化，只保留实际用到的字，否则体积容易超限；\n"
        "  3. 在 CSS 中用 @font-face 引入，并保留系统字体作为回退。\n"
        "  4. 同步更新 config/game_config.json 中的 resources.font 字段。\n"
        "\n"
        "注意：Windows 自带字体（微软雅黑、黑体等）不可随应用分发。\n"
    )
    with open(os.path.join(FONT_DIR, "README_font.txt"), "w", encoding="utf-8") as f:
        f.write(note)


def main():
    ensure_dirs()
    made = []
    made.append(make_icon())
    made.append(make_splash())
    made.append(make_banner())
    for i, (fn, title, sub, marks) in enumerate(SHOTS, start=1):
        made.append(make_screenshot(i, fn, title, sub, marks))
    make_audio()
    copy_font()

    for p in made:
        print("IMG %-42s %8.1f KB" % (os.path.basename(p), os.path.getsize(p) / 1024))
    for fn in ("button_click.wav", "game_over.wav", "background_music.wav"):
        p = os.path.join(AUD_DIR, fn)
        print("AUD %-42s %8.1f KB" % (fn, os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
