# -*- coding: utf-8 -*-
"""一次性：全新设备（空 localStorage）第一次打开，看首屏到底是什么。

要验三件事：
  ① 先弹「本次更新」公告（不是闯关说明）
  ② 右上角帧率角标默认在
  ③ 关掉公告之后，首访说明才出现
另外顺手截一张图（--shot）看角标位置会不会挡住别的东西。
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = r"c:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20"
os.chdir(ROOT)
sys.path.insert(0, "tools")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import shots  # noqa: E402

PROBE = r"""
(function(){
  var out={t:[]};
  function snap(tag){
    var p=document.getElementById('panel');
    out.t.push({at:tag,
      news:(document.getElementById('news')||{className:''}).className.indexOf('show')>=0,
      fps:(document.getElementById('fps')||{}).textContent||'',
      panel:(document.getElementById('modal')||{className:''}).className.indexOf('show')>=0,
      title:p?String(p.querySelector('h2')?p.querySelector('h2').textContent:'').slice(0,20):'',
      newsKey:(function(){try{return localStorage.getItem(NEWS_KEY)||''}catch(e){return '?'}})()
    });
  }
  setTimeout(function(){snap('2.2s 刚进场');},200);
  setTimeout(function(){
    snap('2.5s');
    try{hideNews();}catch(e){}
    setTimeout(function(){snap('关掉公告 1.6s 后');dump();},1600);
  },2500);
  function dump(){
    var p=document.createElement('pre');p.id='FIRST';
    p.textContent='FIRST'+JSON.stringify(out);
    document.body.appendChild(p);
  }
})();
"""


def run(shot=None):
    page = open(os.path.join(ROOT, "shujing-app/index.html"), encoding="utf-8").read()
    page = page.replace("</body>", "<script>" + PROBE + "</script>\r\n</body>", 1)
    d = os.path.join(ROOT, ".tmp_shots/firstprobe")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    shutil.copy2(os.path.join(ROOT, "shujing-app/version.json"),
                 os.path.join(d, "version.json"))
    port, httpd = shots.serve(d)
    prof = os.path.join(ROOT, ".tmp_shots/pfirst")
    shutil.rmtree(prof, ignore_errors=True)      # 全新设备：必须没本地记录
    cmd = [shots.find_chrome(), "--headless=new", "--disable-gpu", "--no-first-run",
           "--user-data-dir=" + prof, "--window-size=560,1000",
           "--virtual-time-budget=9000"]
    if shot:
        cmd.append("--screenshot=" + shot)
    else:
        cmd.append("--dump-dom")
    cmd.append("http://127.0.0.1:%d/index.html" % port)
    try:
        p = subprocess.run(cmd, capture_output=True, encoding="utf-8", errors="replace")
    finally:
        httpd.shutdown()
    if shot:
        print("截图：", shot)
        return 0
    m = re.search(r"FIRST(\{.*?\})</pre>", p.stdout or "", re.S)
    if not m:
        print("没回传")
        return 1
    data = json.loads(m.group(1))
    for row in data["t"]:
        print("  %-14s 公告=%-5s 面板=%-5s 角标=%-12s 标题=%s"
              % (row["at"], row["news"], row["panel"], (row["fps"] or "无")[:12], row["title"] or "—"))
    return 0


if __name__ == "__main__":
    shot = None
    if "--shot" in sys.argv:
        shot = os.path.join(ROOT, "shots_auto", "first_screen.png")
    sys.exit(run(shot))
