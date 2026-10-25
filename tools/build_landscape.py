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
OUT_DIR_XHS = os.path.join(ROOT, "minitool")

TARGET = b"(orientation:landscape) and (max-height:560px)"
REPLACED = b"(orientation:landscape)"

ENHANCE = """<style id="landscape-pack">
/* ==== 横屏特供（构建时注入，不改源码）====
   1. 所有横屏统一走横屏布局：题面与选项左右分栏、菜单双列
   2. 宽屏容器（1280 及以上）把面板放宽，别让内容缩在中间一窄条 */
@media (orientation:landscape){
  .news-card{width:min(1180px,100%)}
  /* 只放开 max-width 不够：面板自身是 width:min(560px,…)，上限再大也不会变宽。
     宽屏横屏下显式给宽度，题面与选项才真正摊开；窄横屏由 min() 收回到 96%。 */
  .panel{width:min(1000px,96%);max-width:min(1180px,100%)}
  #modal{padding-left:max(12px,var(--safeL));padding-right:max(12px,var(--safeR))}
  .menu-list{grid-template-columns:1fr 1fr}
}
/* 极扁的横屏（如 844×390）再收一档字号，保证一屏放得下 */
@media (orientation:landscape) and (max-height:430px){
  .panel{padding:7px 11px}
  .panel h2{font-size:var(--fs-sm)}
}
/* ==== 竖屏容器里强制横屏 ====
   小红书的小工具容器多数按竖屏加载，此时 orientation 永远是 portrait，
   上面的横屏规则一条都不生效。这里把整个 app 旋转 90°：视觉上变成横屏，
   用户把手机横过来玩即可。旋转后：
     · --vmin/--vmax 在 portrait 下本来就是「短边=100vw / 长边=100vh」，
       正好等于旋转后的高度 / 宽度，字号与间距不用另算；
     · #app 自身的宽高要与视口互换，否则内容会按竖屏尺寸排。
   触摸坐标必须自己换算：clientX/clientY 报的是视口坐标，CSS 变换不会改它们，
   直接用会得到「上滑变右滑」的方向错乱 —— 由 rotate-input.js 在捕获阶段换算。 */
@media (orientation:portrait){
  html,body{height:100%;overflow:hidden;background:#060b14}
  #app{
    position:fixed;left:0;top:0;
    width:100vh;height:100vw;
    transform:rotate(90deg) translateY(-100%);
    transform-origin:top left;
    /* 覆盖基础样式里的四边 0 与 height:100vh */
    right:auto;bottom:auto;
    height:100vw;
  }
}
</style>
<script src="./assets/rotate-input.js"></script>
""".encode("utf-8")

# 竖屏容器旋转 90° 之后，clientX/clientY 仍是视口坐标，与元素内部坐标差一次旋转。
# 这里在捕获阶段把坐标换算到元素坐标系，再让事件继续冒泡给游戏。
# 必须是外置脚本：容器 CSP 不允许内联 <script>。
ROT_JS = """/* 竖屏容器里把 app 旋转 90° 后，事件坐标的换算层。
   clientX/clientY 报的是视口坐标，浏览器不会因为 CSS 变换而改变它；
   游戏内部按元素坐标算方向与落点，直接用就会出现「上滑变右滑」。
   映射（顺时针 90°）：元素 x = 视口高 - clientY，元素 y = clientX。 */
(function () {
  var mq = window.matchMedia('(orientation:portrait)');

  function fix(t) {
    if (!t) return;
    var x = t.clientX, y = t.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    var u = window.innerHeight - y;
    var v = x;
    try {
      Object.defineProperty(t, 'clientX', { value: u, configurable: true });
      Object.defineProperty(t, 'clientY', { value: v, configurable: true });
      Object.defineProperty(t, 'pageX', { value: u + window.pageXOffset, configurable: true });
      Object.defineProperty(t, 'pageY', { value: v + window.pageYOffset, configurable: true });
    } catch (e) { /* 某些实现不允许覆写，保持原值 */ }
  }

  function on(e) {
    if (!mq.matches) return;                 // 真横屏时坐标本来就是对的
    var i;
    if (e.touches) for (i = 0; i < e.touches.length; i++) fix(e.touches[i]);
    if (e.changedTouches) for (i = 0; i < e.changedTouches.length; i++) fix(e.changedTouches[i]);
    if (typeof e.clientX === 'number') fix(e);
  }

  var types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel',
               'touchstart', 'touchmove', 'touchend', 'touchcancel',
               'mousedown', 'mousemove', 'mouseup', 'click'];
  for (var k = 0; k < types.length; k++) {
    document.addEventListener(types[k], on, true);
  }
})();
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

    # 旋转层的坐标换算脚本（外置，head 里先于游戏脚本加载）
    with open(os.path.join(bm.ASSETS, "rotate-input.js"), "wb") as f:
        f.write(ROT_JS)

    total = 0
    for root, _d, fs in os.walk(DIST):
        for f in fs:
            total += os.path.getsize(os.path.join(root, f))
    print("  index.html %.1f KB · 目录合计 %.2f MB" % (len(data) / 1024, total / 1048576))

    if "--no-zip" in sys.argv:
        print("  已跳过打包")
        return

    # 同一份产物打两个包：抖音沿用旧名，小红书用带平台前缀的名字，避免上传时拿错
    targets = [
        (OUT_DIR, "数境-横屏特供-v%s.zip" % ver),
        (OUT_DIR_XHS, "shujing-minitool-landscape-v%s.zip" % ver),
    ]
    for out_dir, name in targets:
        os.makedirs(out_dir, exist_ok=True)
        pkg = os.path.join(out_dir, name)
        if os.path.exists(pkg):
            os.remove(pkg)
        with zipfile.ZipFile(pkg, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for root, _d, fs in os.walk(DIST):
                for f in sorted(fs):
                    full = os.path.join(root, f)
                    z.write(full, os.path.relpath(full, DIST).replace("\\", "/"))
        print("  上传包 %-42s %.2f MB" % (os.path.relpath(pkg, ROOT),
                                          os.path.getsize(pkg) / 1048576))

    print("  构建时间 %s" % built_at)


if __name__ == "__main__":
    main()
