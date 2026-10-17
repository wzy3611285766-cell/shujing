# -*- coding: utf-8 -*-
"""决定性实验：慢的音效会不会挡住"反馈画面"。

把 SFX.right/wrong 换成一个忙等 800ms 的空函数，模拟平板上
"唤醒 AudioContext" 的真实代价；然后点正确选项，量：
    点击 → 反馈真的画到屏幕上（两次 rAF：第一次在绘制前，第二次在绘制后）
新版本应该 ≈ 一帧（16~40ms），旧版本应该 ≈ 800ms。
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = r"c:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20"
os.chdir(ROOT)
sys.path.insert(0, "tools")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import shots  # noqa: E402

PROBE = r"""
setTimeout(async function(){
  var out={};
  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function slow(ms){var t=performance.now();while(performance.now()-t<ms){}}
  try{
    useWorld(BLAZE);
    BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
    BLAZE_STATE.run=null;BZ.map=null;
    blazeDeploy();
    /* 把音效变慢（模拟唤醒 AudioContext 的代价） */
    SFX.right=function(){slow(800);};
    SFX.wrong=function(){slow(800);};
    for(var attempt=0;attempt<6;attempt++){
      blazeAsk({rid:'func',tier:1,title:'📦 物资箱',sub:'探针',tag:'测试',
        bar:'',nextText:'继续 →',onDone:function(){}});
      await wait(350);
      var opts=document.querySelectorAll('#panel .opt');
      if(!opts.length)break;
      var fb=document.getElementById('feedback');
      var t0=performance.now();
      opts[0].click();
      var tSync=performance.now()-t0;
      /* 只等**一帧**：DOM 写入在 click 里就完成了，这一帧画出来的就是带反馈的画面。
         等两次 rAF 反而会跨到下一帧（那帧可能被副作用拖住），度量就失真了。 */
      var painted=await new Promise(function(res){
        requestAnimationFrame(function(){res(performance.now()-t0);});
      });
      var ok=fb&&fb.className==='ok';
      if(!ok){closePanel();continue;}
      out.sync=+tSync.toFixed(1);
      out.painted=+painted.toFixed(1);
      out.fb=String(fb.textContent||'').slice(0,12);
      out.gap=window.__ansGap;
      closePanel();
      break;
    }
  }catch(e){out.err=String(e).slice(0,200);}
  try{fetch('/result',{method:'POST',body:JSON.stringify(out)});}catch(e){}
},2600);
"""

Result = {"data": None}


class H(SimpleHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", "0"))
        try:
            Result["data"] = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            Result["data"] = {"err": "回传解析失败"}
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *a):
        pass


def run(html, tag):
    page = open(html, encoding="utf-8").read()
    page = page.replace("</body>", "<script>" + PROBE + "</script>\r\n</body>", 1)
    d = os.path.join(ROOT, ".tmp_shots", "ansprobe2")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    v = os.path.join(os.path.dirname(html), "version.json")
    if os.path.exists(v):
        shutil.copy2(v, os.path.join(d, "version.json"))

    Result["data"] = None
    handler = lambda *a, **k: H(*a, directory=d, **k)  # noqa: E731
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    srv.daemon_threads = True
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    prof = os.path.join(ROOT, ".tmp_shots/pans2")
    shutil.rmtree(prof, ignore_errors=True)
    cmd = [shots.find_chrome(), "--headless=new", "--disable-gpu", "--no-first-run",
           "--no-default-browser-check", "--user-data-dir=" + prof,
           "--window-size=1180,820", "--force-device-scale-factor=2",
           "http://127.0.0.1:%d/index.html" % port]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while time.time() - t0 < 45 and Result["data"] is None:
        time.sleep(0.3)
    try:
        proc.kill()
    except Exception:
        pass
    srv.shutdown()
    data = Result["data"]
    if not data:
        print("%-14s 没回传" % tag)
        return
    if data.get("err"):
        print("%-14s !! %s" % (tag, data["err"]))
        return
    print("%-14s 点击同步 %6s ms · **反馈上屏** %6s ms · 副作用延迟 %s ms"
          % (tag, data.get("sync"), data.get("painted"), data.get("gap")))


def main():
    import glob
    old = sorted(glob.glob(os.path.join(ROOT, "releases", "*v4.0.20*.html")))
    if old:
        run(old[-1], "改前 4.0.20")
    run(os.path.join(ROOT, "shujing-app/index.html"), "改后 当前")
    return 0


if __name__ == "__main__":
    sys.exit(main())
