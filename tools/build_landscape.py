# -*- coding: utf-8 -*-
"""构建「横屏特供版」：给按横屏注册的容器用。

和竖屏主包的区别只有两点，源码不动：
  1. 横屏媒体查询从「仅矮屏 max-height:560px」放宽成「所有横屏」。
     原来的 560px 上限是为了别把 iPad 横屏（1024 高）也拆成两栏；
     特供版面向的是手机横屏容器（如 1280×720 / 844×390），放宽才对。
  2. 宽屏横屏下让面板吃满可用宽度，避免 1280 宽时两侧留大片空白。

产物：
  minitool/dist-landscape/                 —— 目录（index.html + assets/app.js）
  抖音上传准备材料/数境-横屏特供-vX.Y.Z.zip  —— 上传包，index.html 在根

用法：
  python tools/build_landscape.py            构建 + 打包
  python tools/build_landscape.py --no-zip   只出目录（便于截图调试）
"""
import os
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_minitool as bm  # noqa: E402

ROOT = bm.ROOT
DIST = os.path.join(ROOT, "minitool", "dist-landscape")
OUT_DIR = os.path.join(ROOT, "抖音上传准备材料")

TARGET = b"(orientation:landscape) and (max-height:560px)"
REPLACED = b"(orientation:landscape)"

ENHANCE = """<style id="landscape-pack">
/* ==== 横屏特供（构建时注入，不改源码）====
   1. 所有横屏统一走横屏布局：题面与选项左右分栏、菜单双列
   2. 宽屏容器（1280 及以上）把面板放宽，别让内容缩在中间一窄条 */
@media (orientation:landscape){
  .news-card{width:min(1180px,100%)}
  .panel{max-width:min(1180px,100%)}
  #modal{padding-left:max(12px,var(--safeL));padding-right:max(12px,var(--safeR))}
  .menu-list{grid-template-columns:1fr 1fr}
}
/* 极扁的横屏（如 844×390）再收一档字号，保证一屏放得下 */
@media (orientation:landscape) and (max-height:430px){
  .panel{padding:7px 11px}
  .panel h2{font-size:var(--fs-sm)}
}
</style>
""".encode("utf-8")


def main():
    print("构建横屏特供版")
    data, js_files, ver, built_at, news_ver = bm.build()

    n = data.count(TARGET)
    if n != 2:
        print("  [!] 横屏媒体查询命中 %d 处（预期 2 处），请检查 src/css" % n)
    data = data.replace(TARGET, REPLACED)

    if b"</head>" not in data:
        raise SystemExit("找不到 </head>，无法注入横屏增强样式")
    data = data.replace(b"</head>", ENHANCE + b"</head>", 1)

    bm.DIST = DIST
    bm.ASSETS = os.path.join(DIST, "assets")
    bm.write_dist(data, js_files, ver, news_ver)

    total = 0
    for root, _d, fs in os.walk(DIST):
        for f in fs:
            total += os.path.getsize(os.path.join(root, f))
    print("  index.html %.1f KB · 目录合计 %.2f MB" % (len(data) / 1024, total / 1048576))

    if "--no-zip" in sys.argv:
        print("  已跳过打包")
        return

    pkg = os.path.join(OUT_DIR, "数境-横屏特供-v%s.zip" % ver)
    if os.path.exists(pkg):
        os.remove(pkg)
    with zipfile.ZipFile(pkg, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, _d, fs in os.walk(DIST):
            for f in sorted(fs):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, DIST).replace("\\", "/"))

    print("  上传包 %s（%.2f MB）" % (os.path.basename(pkg), os.path.getsize(pkg) / 1048576))
    print("  构建时间 %s" % built_at)


if __name__ == "__main__":
    main()
