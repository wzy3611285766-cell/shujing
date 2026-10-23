# -*- coding: utf-8 -*-
"""抓横屏主界面截图（用于验证横屏特供版，也可产出横屏商店图）。

用法：
  python tools/capture_landscape.py                 默认 1280×720
  python tools/capture_landscape.py --size 844x390  指定尺寸
"""
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "minitool", "dist-landscape", "index.html")
TMP = os.path.join(BASE, "minitool", "dist-landscape", "_ls_tmp.html")
OUT_DIR = os.path.join(BASE, "_shots")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PROFILE = os.path.join(BASE, "_edge_profile")

JS = r"""
(function(){
  function fire(el){
    if(!el) return false;
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(t){
      el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window}));
    });
    return true;
  }
  setTimeout(function(){
    fire(document.querySelector('#news .news-x')) ||
    fire(document.querySelector('#news .btn'));
  }, 600);
  var k = 0;
  var t = setInterval(function(){
    document.querySelectorAll('#news,#modal').forEach(function(e){
      e.classList.remove('show'); e.style.display='none';
    });
    if(++k > 10) clearInterval(t);
  }, 350);
})();
"""


def main():
    size = "1280x720"
    for i, a in enumerate(sys.argv):
        if a == "--size" and i + 1 < len(sys.argv):
            size = sys.argv[i + 1]
    w, h = [int(x) for x in size.split("x")]

    if not os.path.exists(SRC):
        raise SystemExit("缺少 %s，先跑 python tools/build_landscape.py" % SRC)

    html = open(SRC, encoding="utf-8", errors="ignore").read()
    inject = "<script>\n%s\n</script>\n" % JS
    html = html.replace("</body>", inject + "</body>", 1)
    open(TMP, "w", encoding="utf-8").write(html)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PROFILE, exist_ok=True)
    out = os.path.join(OUT_DIR, "land_%dx%d.png" % (w, h))
    if os.path.exists(out):
        os.remove(out)

    cmd = [
        EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-first-run", "--disable-extensions",
        "--user-data-dir=" + PROFILE,
        "--virtual-time-budget=5000",
        "--window-size=%d,%d" % (w, h),
        "--screenshot=" + out,
        "file:///" + TMP.replace("\\", "/"),
    ]
    subprocess.run(cmd, capture_output=True)

    if os.path.exists(TMP):
        os.remove(TMP)

    if os.path.exists(out):
        print("OK", out, os.path.getsize(out) // 1024, "KB")
    else:
        print("FAIL 截图未生成")


if __name__ == "__main__":
    main()
