# -*- coding: utf-8 -*-
"""用 Edge 无头模式截取游戏真实界面，供抖音素材使用。

做法：在 dist/index.html 副本末尾注入自动操作脚本，再用 Edge 截图。
"""
import os
import re
import shutil
import subprocess
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(BASE, "minitool", "dist")
SRC = os.path.join(DIST, "index.html")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
TMP = os.path.join(DIST, "_shot_tmp.html")
OUT_DIR = os.path.join(BASE, "_shots")
PROFILE = os.path.join(BASE, "_edge_profile")


def build_page(script, name):
    with open(SRC, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    inject = "<script>\n(function(){\n%s\n})();\n</script>\n" % script
    if "</body>" in html:
        html = html.replace("</body>", inject + "</body>", 1)
    else:
        html += inject
    with open(TMP, "w", encoding="utf-8") as f:
        f.write(html)
    return TMP


def shot(page_path, out_png, wait_ms=4000):
    if os.path.exists(out_png):
        os.remove(out_png)
    cmd = [
        EDGE,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--disable-extensions",
        "--user-data-dir=" + PROFILE,
        "--virtual-time-budget=%d" % wait_ms,
        "--window-size=720,1280",
        "--screenshot=" + out_png,
        "file:///" + page_path.replace("\\", "/"),
    ]
    subprocess.run(cmd, capture_output=True)
    return out_png if os.path.exists(out_png) else None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PROFILE, exist_ok=True)
    if not os.path.exists(EDGE):
        print("Edge not found")
        return 1

    # 1. 关掉版本弹窗后的主界面
    js_main = r"""
  function fire(el){
    if (!el) return false;
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(t){
      el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window}));
    });
    return true;
  }
  function clickText(re){
    var els = document.querySelectorAll('button,a,div,span,li');
    for (var i=0;i<els.length;i++){
      var e = els[i];
      var t = (e.textContent||'').replace(/\s+/g,'');
      var r = e.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && re.test(t) && t.length < 24){ return fire(e); }
    }
    return false;
  }
  function tapAt(x,y){
    var el = document.elementFromPoint(x,y);
    if (!el) return false;
    var n = el;
    while (n && n !== document.body){
      fire(n);
      n = n.parentNode;
    }
    return true;
  }
  setTimeout(function(){
    fire(document.querySelector('#news .news-x')) ||
    fire(document.querySelector('#news .btn')) ||
    clickText(/^知道了/);
  }, 600);
  // 商店截图里不要出现电脑端键位提示
  setTimeout(function(){
    ['pcHint','pcKeyHint'].forEach(function(id){
      var e = document.getElementById(id);
      if(e) e.style.display = 'none';
    });
  }, 900);

  // 兜底：无论引导弹窗有没有冒出来，都把遮罩层收掉
  var kills = 0;
  var kt = setInterval(function(){
    document.querySelectorAll('#news,#modal').forEach(function(e){
      e.classList.remove('show');
      e.style.display = 'none';
    });
    if (++kills > 10) clearInterval(kt);
  }, 350);
"""
    p1 = build_page(js_main, "main")
    print("shot1", shot(p1, os.path.join(OUT_DIR, "shot_main.png"), 4000))

    # 2. 四国菜单（顶栏第二个胶囊）
    js_menu = js_main + r"""
  setTimeout(function(){ tapAt(132, 27); }, 2200);
"""
    p2 = build_page(js_menu, "menu")
    print("shot2", shot(p2, os.path.join(OUT_DIR, "shot_menu.png"), 6000))

    # 3. 行动 / 部署
    js_action = js_main + r"""
  setTimeout(function(){ tapAt(204, 27); }, 2200);
"""
    p3 = build_page(js_action, "action")
    print("shot3", shot(p3, os.path.join(OUT_DIR, "shot_action.png"), 6000))

    # 4. 错题本
    js_wrong = js_main + r"""
  setTimeout(function(){ tapAt(374, 27); }, 2200);
"""
    p4 = build_page(js_wrong, "wrong")
    print("shot4", shot(p4, os.path.join(OUT_DIR, "shot_wrong.png"), 6000))

    for fn in os.listdir(OUT_DIR):
        p = os.path.join(OUT_DIR, fn)
        print(fn, os.path.getsize(p) // 1024, "KB")

    # 注入用的副本只服务于截图，用完即删，别留在 dist 里
    if os.path.exists(TMP):
        os.remove(TMP)
    return 0


if __name__ == "__main__":
    sys.exit(main())
