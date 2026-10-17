# -*- coding: utf-8 -*-
"""一次性：把每一帧的活儿拆开量（真实时间，不用虚拟时间）。

⚠️ 不能用 --virtual-time-budget：它会把 performance.now() 一起虚拟化，
   同步循环里量出来全是 0ms（这个坑在 _dbg_build 那次已经踩过一次）。
   所以走 tools/perf.py 那套：本地起服务 + POST 回传 + 真实等待。
"""
import json
import os
import shutil
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = r"c:/Users/Lenovo/WorkBuddy/2026-10-08-22-42-20"
os.chdir(ROOT)
sys.path.insert(0, "tools")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import subprocess  # noqa: E402

import shots  # noqa: E402

PROBE = r"""
setTimeout(function(){
  var out={};
  try{
    useWorld(BLAZE);
    BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
    BLAZE_STATE.run=null;BZ.map=null;
    blazeDeploy();
    var N=240;
    function bench(fn,setup,teardown){
      if(setup)setup();
      for(var i=0;i<20;i++)fn();
      var t0=performance.now();
      for(var j=0;j<N;j++)fn();
      var ms=(performance.now()-t0)/N;
      if(teardown)teardown();
      return +ms.toFixed(3);
    }
    var w0=cv.width,h0=cv.height;
    out.full=bench(function(){draw();});
    var keepSL=staticLayer;
    out.noTerrain=bench(function(){draw();},function(){staticLayer=null;},
                        function(){staticLayer=keepSL;});
    var ents=document.getElementById('ents');
    out.noEnts=bench(function(){draw();},function(){if(ents)ents.style.display='none';},
                     function(){if(ents)ents.style.display='';});
    out.halfRes=bench(function(){draw();},function(){
      cv.width=Math.max(2,Math.round(w0/2));cv.height=Math.max(2,Math.round(h0/2));
      ctx.setTransform(DPR,0,0,DPR,0,0);
    },function(){cv.width=w0;cv.height=h0;ctx.setTransform(DPR,0,0,DPR,0,0);});
    out.cv=[w0,h0];out.dpr=+DPR.toFixed(2);out.scale=+SCALE.toFixed(3);
    out.ents=document.querySelectorAll('#ents>*').length;
    out.blitMs=+(out.full-out.noTerrain).toFixed(3);
    out.terrainShare=out.full>0?Math.round(out.blitMs/out.full*100):0;
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


def main():
    page = open(os.path.join(ROOT, "shujing-app/index.html"), encoding="utf-8").read()
    page = page.replace("</body>", "<script>" + PROBE + "</script>\r\n</body>", 1)
    d = os.path.join(ROOT, ".tmp_shots", "partsprobe")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    shutil.copy2(os.path.join(ROOT, "shujing-app/version.json"),
                 os.path.join(d, "version.json"))
    os.chdir(d)

    handler = lambda *a, **k: H(*a, directory=d, **k)  # noqa: E731
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    srv.daemon_threads = True
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    prof = os.path.join(ROOT, ".tmp_shots/pparts")
    shutil.rmtree(prof, ignore_errors=True)
    proc = subprocess.Popen([shots.find_chrome(), "--headless=new", "--disable-gpu",
                             "--no-first-run", "--no-default-browser-check",
                             "--force-device-scale-factor=2",
                             "--user-data-dir=" + prof,
                             "--window-size=1180,820",
                             "http://127.0.0.1:%d/index.html" % port],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while time.time() - t0 < 40 and Result["data"] is None:
        time.sleep(0.3)
    try:
        proc.kill()
    except Exception:
        pass
    srv.shutdown()

    data = Result["data"]
    if not data:
        print("没回传")
        return 1
    if data.get("err"):
        print("!! " + data["err"])
        return 1
    print("画布 %s · dpr %s · SCALE %s · 实体 %d 个"
          % (data["cv"], data["dpr"], data["scale"], data["ents"]))
    print()
    print("每帧 draw() 平均耗时（连调 240 次取均值，真实时间）")
    print("  A 完整画一帧          %7.3f ms" % data["full"])
    print("  B 跳过地形贴图        %7.3f ms  → 地形那一贴 = %.3f ms（占 %.0f%%）"
          % (data["noTerrain"], data["blitMs"], data["terrainShare"]))
    print("  C 隐藏实体层 #ents    %7.3f ms" % data["noEnts"])
    print("  D 画布分辨率减半      %7.3f ms" % data["halfRes"])
    print()
    print("  （60fps 预算 16.7ms · 120fps 预算 8.3ms）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
