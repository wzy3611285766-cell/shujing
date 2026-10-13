# -*- coding: utf-8 -*-
"""生成「同步到 GitHub」快捷方式用的图标（不依赖任何第三方库）。

画的是游戏主色（深蓝底）+ 一对上下箭头（同步），输出标准的 32 位 .ico。
想换颜色 / 换图案，改下面的 COL_* 和 draw() 就行，然后重新运行：
    python tools/make_icon.py
"""
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "assets", "sync.ico")

COL_BG_TOP = (18, 42, 84)        # 深蓝（和游戏 theme-color 同色系）
COL_BG_BOT = (9, 18, 34)
COL_UP = (255, 215, 106)         # 游戏里的「结晶金」
COL_DOWN = (126, 200, 255)       # 冷蓝
COL_GO = (127, 227, 160)         # 上线绿
COL_WHITE = (240, 248, 255)
SIZES = [16, 32, 48, 64]
SS = 4                           # 超采样倍数，用来做抗锯齿
SIZE = 48                        # 绘图坐标系边长


def in_round_rect(x, y, x0, y0, x1, y1, r):
    """圆角矩形判定：把点夹到「内矩形」上，再比距离。"""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def in_tri(px, py, ax, ay, bx, by, cx, cy):
    d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
    d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
    d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def sample(x, y, size, kind):
    """在 48×48 的坐标系里判断这个点属于什么颜色，返回 (r,g,b,a) 或 None。"""
    u = x * SIZE / size
    v = y * SIZE / size
    # 底：圆角方
    if not in_round_rect(u, v, 2, 2, 46, 46, 11):
        return None
    bg = v / 48.0
    bg = 0.0 if bg < 0 else (1.0 if bg > 1 else bg)

    if kind == "publish":
        # 「上线」图标：向上箭头 + 底托（= 上传/发布）
        if 12 <= u <= 36 and 34 <= v <= 38.5:
            return COL_GO + (255,)
        if 21 <= u <= 27 and 15 <= v <= 34:
            return COL_WHITE + (255,)
        if in_tri(u, v, 15.5, 16, 32.5, 16, 24, 6):
            return COL_WHITE + (255,)
    else:
        # 「同步」图标：一上一下两支箭头
        if 17 <= u <= 22 and 22 <= v <= 38:
            return COL_UP + (255,)
        if in_tri(u, v, 12, 22, 27, 22, 19.5, 9):
            return COL_UP + (255,)
        if 26 <= u <= 31 and 10 <= v <= 26:
            return COL_DOWN + (255,)
        if in_tri(u, v, 21, 26, 36, 26, 28.5, 39):
            return COL_DOWN + (255,)

    return tuple(int(COL_BG_TOP[i] + (COL_BG_BOT[i] - COL_BG_TOP[i]) * bg) for i in range(3)) + (255,)


def render(size, kind):
    """返回自下而上的 BGRA 行（BMP 用）。"""
    big = size * SS
    rows = []
    for y in range(size - 1, -1, -1):          # BMP 自下而上
        row = bytearray()
        for x in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    c = sample(x * SS + sx + 0.5, y * SS + sy + 0.5, big, kind)
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += c[3]
            n = SS * SS
            row += bytes((b // n, g // n, r // n, a // n))
        rows.append(bytes(row))
    return rows


def ico_image(size, kind):
    rows = render(size, kind)
    xor = b"".join(rows)
    mask_row = ((size + 31) // 32) * 4
    and_mask = b"\x00" * (mask_row * size)
    header = struct.pack("<IiiHHIIiiII", 40, size, size * 2, 1, 32, 0,
                         len(xor) + len(and_mask), 0, 0, 0, 0)
    return header + xor + and_mask


def write_ico(path, kind):
    images = [(s, ico_image(s, kind)) for s in SIZES]
    out = bytearray(struct.pack("<HHH", 0, 1, len(images)))
    offset = 6 + 16 * len(images)
    for s, data in images:
        out += struct.pack("<BBBBHHII", s if s < 256 else 0, s if s < 256 else 0,
                           0, 0, 1, 32, len(data), offset)
        offset += len(data)
    for _s, data in images:
        out += data
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(bytes(out))
    print("图标已生成：%s（%s · %d 个尺寸 · %d 字节）"
          % (os.path.relpath(path, ROOT), kind, len(images), len(out)))


def main():
    want = sys.argv[1] if len(sys.argv) > 1 else "all"
    if want in ("all", "sync"):
        write_ico(os.path.join(ROOT, "tools", "assets", "sync.ico"), "sync")
    if want in ("all", "publish"):
        write_ico(os.path.join(ROOT, "tools", "assets", "publish.ico"), "publish")


if __name__ == "__main__":
    main()
