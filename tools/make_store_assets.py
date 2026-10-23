# -*- coding: utf-8 -*-
"""生成小工具商店素材：应用图标 + 展示截图。

产物统一落在 minitool/store/：
  icon_512.png        512x512 图标
  01_战场.png         750x1334
  02_烽火答题.png      750x1334
  03_战术地图.png      750x1334

用法
----
  python tools/make_store_assets.py                # 图标 + 三张截图
  python tools/make_store_assets.py 战场 烽火答题     # 只重拍指定场景
  python tools/make_store_assets.py --icon-only    # 只重画图标
  python tools/make_store_assets.py --size 560x996 # 改布局视口（默认 560x996）

为什么不直接按 375x667 截图
--------------------------
这台机器的 Chrome 把窗口宽度卡在 504px 左右：要 375 时布局仍按 504 排，
截图却按 375 裁，右边会缺一条。所以按 9:16 用 560x996 布局 + 2 倍像素渲染，
再用 LANCZOS 等比缩到 750x1334（1120x1992 → 750x1334，比例几乎一致）。

截图前会隐藏进场横幅、任务条、点地图提示与帧率角标；只改临时副本，
不会改动 minitool/dist 里的产物。
"""
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import shots  # noqa: E402

STORE = os.path.join(ROOT, "minitool", "store")
TMP = os.path.join(ROOT, ".tmp_store_assets")
SRC = "minitool/dist/index.html"
SCENES = ["战场", "烽火答题", "战术地图"]
ORDER = {"战场": 1, "烽火答题": 2, "战术地图": 3}
TARGET = (750, 1334)

W, H, SCALE = 560, 996, 2

CLEAN = """
setTimeout(function(){
  ['banner','moveHint','fps','quest'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  var t=document.getElementById('toast'); if(t) t.textContent='';
}, 1600);
"""

# 战术地图会被"保险箱房守卫"遭遇弹窗顶掉：看到弹窗就关掉再把地图打开
EXTRA = {
    "战术地图": """
setTimeout(function(){
  var m=document.getElementById('modal');
  if(m && m.className.indexOf('show')>=0){
    try{closePanel();}catch(e){}
    setTimeout(function(){try{showTacMap();}catch(e){}}, 300);
  }
}, 3200);
""",
}

# ---------------- 图标 ----------------
S = 512
GOLD = (255, 215, 106)
BLUE = (156, 192, 224)
FONT_BD = r"C:/Windows/Fonts/msyhbd.ttc"
FONT_RG = r"C:/Windows/Fonts/msyh.ttc"


def _radial_bg():
    img = Image.new("RGB", (S, S), (7, 12, 20))
    px = img.load()
    c = S / 2
    far = (S / 2) * 1.42
    for y in range(S):
        for x in range(S):
            t = min(1.0, ((x - c) ** 2 + (y - c) ** 2) ** 0.5 / far)
            px[x, y] = (int(26 * (1 - t) + 7 * t),
                        int(42 * (1 - t) + 12 * t),
                        int(66 * (1 - t) + 20 * t))
    grid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    g = ImageDraw.Draw(grid)
    for i in range(0, S, 32):
        g.line([(i, 0), (i, S)], fill=(255, 215, 106, 10), width=1)
        g.line([(0, i), (S, i)], fill=(255, 215, 106, 10), width=1)
    return Image.alpha_composite(img.convert("RGBA"), grid)


def _glow(size, r, width, color, blur, cy):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size[0] / 2
    d.ellipse([c - r, cy - r, c + r, cy + r], outline=color, width=width)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def build_icon():
    img = _radial_bg()
    d = ImageDraw.Draw(img)
    c = S / 2
    cy, r = 224.0, 158.0

    img = Image.alpha_composite(img, _glow((S, S), r, 10, GOLD + (70,), 14, cy))
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse([c - r, cy - r, c + r, cy + r], outline=GOLD + (235,), width=5)
    for a0 in (18, 108, 198, 288):
        rd.arc([c - r + 22, cy - r + 22, c + r - 22, cy + r - 22], a0, a0 + 54,
               fill=(255, 215, 106, 120), width=3)
    img = Image.alpha_composite(img, ring)
    d = ImageDraw.Draw(img)

    f_main = ImageFont.truetype(FONT_BD, 176)
    bb = d.textbbox((0, 0), "格", font=f_main)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx, ty = c - tw / 2 - bb[0], cy - th / 2 - bb[1] - 6

    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((tx, ty), "格", font=f_main, fill=(0, 0, 0, 180))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    d.text((tx, ty), "格", font=f_main, fill=GOLD)

    m, L = 40, 44
    for sx, sy in ((m, m), (S - m, m), (m, S - m), (S - m, S - m)):
        dx = 1 if sx < c else -1
        dy = 1 if sy < c else -1
        d.line([(sx, sy), (sx + dx * L, sy)], fill=GOLD + (200,), width=4)
        d.line([(sx, sy), (sx, sy + dy * L)], fill=GOLD + (200,), width=4)

    f_title = ImageFont.truetype(FONT_BD, 46)
    title, gap = "数境", 6
    widths = [d.textlength(ch, font=f_title) for ch in title]
    x = c - (sum(widths) + gap * (len(title) - 1)) / 2
    for ch, w in zip(title, widths):
        d.text((x, S - 118), ch, font=f_title, fill=(255, 255, 255))
        x += w + gap

    f_sub = ImageFont.truetype(FONT_RG, 26)
    sub, gap2 = "四国远征", 10
    widths2 = [d.textlength(ch, font=f_sub) for ch in sub]
    x = c - (sum(widths2) + gap2 * (len(sub) - 1)) / 2
    for ch, w in zip(sub, widths2):
        d.text((x, S - 56), ch, font=f_sub, fill=BLUE)
        x += w + gap2

    out = os.path.join(STORE, "icon_512.png")
    # 商店图标普遍要求「底板满幅、四角透明」：做成深色圆角（squircle 近似），
    # 而不是一张不透明方图。圆角半径取短边 23%，和主流商店遮罩接近。
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, S - 1, S - 1], radius=int(S * 0.23), fill=255)
    img.putalpha(mask)
    img.save(out, optimize=True)
    print("图标 -> %s (%.0f KB，圆角底板)" % (os.path.relpath(out, ROOT),
                                            os.path.getsize(out) / 1024))


# ---------------- 截图 ----------------
def build_shots(names):
    os.makedirs(STORE, exist_ok=True)
    chrome = shots.find_chrome()

    page = open(os.path.join(ROOT, SRC), encoding="utf-8").read()
    site = os.path.join(TMP, "site")
    shutil.rmtree(site, ignore_errors=True)
    os.makedirs(os.path.join(site, "assets"), exist_ok=True)
    shutil.copy2(os.path.join(ROOT, "minitool/dist/assets/app.js"),
                 os.path.join(site, "assets", "app.js"))
    shutil.copy2(os.path.join(ROOT, "shujing-app/version.json"),
                 os.path.join(site, "version.json"))

    for idx, name in enumerate(names):
        script, budget, _desc = shots.SCENES[name]
        html = page.replace("</body>", "<script>\n" + shots.COMMON + script + CLEAN
                            + EXTRA.get(name, "") + "\n</script>\r\n</body>", 1)
        open(os.path.join(site, "index.html"), "w", encoding="utf-8").write(html)

        port, httpd = shots.serve(site)
        try:
            raw = os.path.join(TMP, "%s_raw.png" % name)
            if os.path.exists(raw):
                os.remove(raw)
            prof = os.path.join(TMP, "prof%d" % idx)
            shutil.rmtree(prof, ignore_errors=True)
            cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                   "--no-first-run", "--user-data-dir=" + prof,
                   "--window-size=%d,%d" % (W, H),
                   "--force-device-scale-factor=%d" % SCALE,
                   "--virtual-time-budget=%d" % budget,
                   "--run-all-compositor-stages-before-draw",
                   "--screenshot=" + raw.replace("\\", "/"),
                   "http://127.0.0.1:%d/index.html" % port]
            r = subprocess.run(cmd, capture_output=True, timeout=120)
            if not os.path.exists(raw):
                print("%s 失败：exit=%d" % (name, r.returncode))
                continue
            im = Image.open(raw).convert("RGB").resize(TARGET, Image.LANCZOS)
            out = os.path.join(STORE, "%02d_%s.png" % (ORDER.get(name, 9), name))
            im.save(out, optimize=True)
            print("%s -> %s %s (%.0f KB)" % (name, os.path.relpath(out, ROOT), TARGET,
                                            os.path.getsize(out) / 1024))
        finally:
            httpd.shutdown()

    shutil.rmtree(TMP, ignore_errors=True)


def main():
    global W, H
    argv = sys.argv[1:]
    if "--size" in argv:
        i = argv.index("--size")
        W, H = (int(x) for x in argv[i + 1].lower().split("x"))
        del argv[i:i + 2]
    icon_only = "--icon-only" in argv
    if icon_only:
        argv.remove("--icon-only")

    os.makedirs(STORE, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    if not argv or icon_only:
        build_icon()
    if not icon_only:
        build_shots(argv or SCENES)
    return 0


if __name__ == "__main__":
    sys.exit(main())
