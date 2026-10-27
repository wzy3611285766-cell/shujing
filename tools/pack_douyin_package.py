# -*- coding: utf-8 -*-
"""打包抖音互动空间游戏包，并校验全部素材是否符合规格。"""
import json
import os
import zipfile

from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "抖音上传准备材料")
DIST = os.path.join(BASE, "minitool", "dist")
_VER = json.load(open(os.path.join(BASE, "version.json"), encoding="utf-8"))["version"]
PKG = os.path.join(OUT, "数境-v%s.zip" % _VER)

LIMITS = {
    "icon_512x512.png": ((512, 512), 5 * 1024 * 1024),
    # 互动空间发布规格（MCP 上传用这张）
    "icon_300x300.png": ((300, 300), 2 * 1024 * 1024),
    "splash_720x1280.png": ((720, 1280), 5 * 1024 * 1024),
    "banner_1080x1920.jpg": ((1080, 1920), 5 * 1024 * 1024),
}
SHOT_SIZE = (720, 1280)


def build_zip():
    if os.path.exists(PKG):
        os.remove(PKG)
    with zipfile.ZipFile(PKG, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, _dirs, files in os.walk(DIST):
            for fn in sorted(files):
                if fn.startswith("_shot_tmp"):
                    continue
                full = os.path.join(root, fn)
                rel = os.path.relpath(full, DIST).replace("\\", "/")
                z.write(full, rel)
    return PKG


def check():
    ok = True

    def line(tag, name, detail, passed):
        nonlocal ok
        ok = ok and passed
        print("[%s] %-38s %-34s %s" % ("OK " if passed else "FAIL", name, detail,
                                       "" if passed else "<-- 需处理"))

    print("=== 图片素材 ===")
    for name, (size, limit) in LIMITS.items():
        p = os.path.join(OUT, "assets", "images", name)
        if not os.path.exists(p):
            line("IMG", name, "缺失", False)
            continue
        im = Image.open(p)
        sz = os.path.getsize(p)
        line("IMG", name, "%dx%d  %.1fKB" % (im.width, im.height, sz / 1024),
             im.size == size and sz <= limit)

    shot_dir = os.path.join(OUT, "assets", "images", "screenshots")
    shots = sorted(f for f in os.listdir(shot_dir) if f.lower().endswith(".png"))
    for fn in shots:
        p = os.path.join(shot_dir, fn)
        im = Image.open(p)
        sz = os.path.getsize(p)
        line("IMG", fn, "%dx%d  %.1fKB" % (im.width, im.height, sz / 1024),
             im.size == SHOT_SIZE and sz <= 5 * 1024 * 1024)
    line("IMG", "截图数量", "%d 张（要求 3-5 张）" % len(shots), 3 <= len(shots) <= 5)

    print("\n=== 音频素材 ===")
    aud_dir = os.path.join(OUT, "assets", "audio")
    for fn in sorted(os.listdir(aud_dir)):
        p = os.path.join(aud_dir, fn)
        sz = os.path.getsize(p)
        with open(p, "rb") as f:
            head = f.read(12)
        valid = head[:4] == b"RIFF" and head[8:12] == b"WAVE"
        line("AUD", fn, "%.1fKB  %s" % (sz / 1024, "WAV 有效" if valid else "格式异常"),
             valid and sz <= 10 * 1024 * 1024)

    print("\n=== 文档与字体 ===")
    for rel in ("config/game_config.json",
                "documents/privacy_policy.txt",
                "documents/game_description.txt",
                "assets/fonts/README_font.txt"):
        p = os.path.join(OUT, rel)
        line("DOC", rel, "%.1fKB" % (os.path.getsize(p) / 1024) if os.path.exists(p) else "缺失",
             os.path.exists(p))

    print("\n=== 游戏包 ===")
    pkg_size = os.path.getsize(PKG) / 1024 / 1024
    with zipfile.ZipFile(PKG) as z:
        names = z.namelist()
    has_index = "index.html" in names
    line("ZIP", os.path.basename(PKG), "%.2f MB / %d 个文件" % (pkg_size, len(names)),
         has_index and pkg_size <= 100)
    line("ZIP", "index.html 位于根目录", "是" if has_index else "否", has_index)
    print("    包内文件：", ", ".join(names))

    print("\n=== 总体 ===")
    print("结果：", "全部符合规格" if ok else "存在不符合项，请按提示处理")
    return 0 if ok else 1


if __name__ == "__main__":
    build_zip()
    raise SystemExit(check())
