# -*- coding: utf-8 -*-
"""一次性：量「按下正确选项」这一下到底卡在哪。

分三段看：
  A 点击处理器同步耗时（如果这里就几百 ms，问题在手写代码）
  B 点击之后**下一帧**多久才来（如果这里 1~2 秒，问题在绘制/合成）
  C 之后 2.5 秒的帧间隔（有没有持续掉帧）

为了拿到"答对"那条分支，会反复开新题直到点中正确答案（错的也照样记录）。
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
  var out={tries:[]};
  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function ask(){
    panic=0;
    blazeAsk({rid:'func',tier:1,title:'📦 物资箱',sub:'探针',tag:'测试',
      bar:'',nextText:'继续 →',onDone:function(){}});
  }
  var panic=0;
  try{
    useWorld(BLAZE);
    BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
    BLAZE_STATE.run=null;BZ.map=null;
    blazeDeploy();
    for(var attempt=0;attempt<6;attempt++){
      ask();
      await wait(350);
      var opts=document.querySelectorAll('#panel .opt');
      if(!opts.length){out.err='没有选项';break;}
      var fb=document.getElementById('feedback');
      var target=null;
      /* 点第一个；如果不是正确答案，换下一题再来（最多 6 次） */
      target=opts[0];
      var t0=performance.now();
      target.click();
      var t1=performance.now();
      var ok=fb&&fb.className==='ok';
      var txt=fb?String(fb.textContent||'').slice(0,16):'';
      if(!ok){out.tries.push({wrong:true,sync:+(t1-t0).toFixed(2)});closePanel();continue;}
      /* 命中正确分支：量下一帧 + 之后 2.5 秒 */
      var gaps=[],last=performance.now();
      var firstAfter=null,end=performance.now()+2500;
      await new Promise(function(res){
        function step(now){
          if(firstAfter===null)firstAfter=now;
          var d=now-last;last=now;
          if(d>=5)gaps.push(d);
          if(now<end)requestAnimationFrame(step);
          else res();
        }
        requestAnimationFrame(step);
      });
      gaps.sort(function(a,b){return a-b;});
      var q=function(p){return gaps.length?+gaps[Math.min(gaps.length-1,Math.floor(gaps.length*p))].toFixed(1):0;};
      out.tries.push({
        wrong:false,
        sync:+(t1-t0).toFixed(2),
        nextFrame:+(firstAfter-t1).toFixed(1),
        n:gaps.length,p50:q(.5),p95:q(.95),max:gaps[gaps.length-1],
        fb:txt,shown:!!(fb&&fb.className==='ok')
      });
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


def main():
    page = open(os.path.join(ROOT, "shujing-app/index.html"), encoding="utf-8").read()
    page = page.replace("</body>", "<script>" + PROBE + "</script>\r\n</body>", 1)
    d = os.path.join(ROOT, ".tmp_shots/ansprobe")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    shutil.copy2(os.path.join(ROOT, "shujing-app/version.json"),
                 os.path.join(d, "version.json"))

    handler = lambda *a, **k: H(*a, directory=d, **k)  # noqa: E731
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    srv.daemon_threads = True
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    prof = os.path.join(ROOT, ".tmp_shots/pans")
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
        print("没回传")
        return 1
    if data.get("err"):
        print("!! " + data["err"])
        return 1
    for row in data["tries"]:
        if row.get("wrong"):
            print("  点中错误选项（跳过）：同步 %s ms" % row["sync"])
            continue
        print("  点中正确答案：")
        print("    A 处理器同步耗时      %8s ms" % row["sync"])
        print("    B 下一帧延迟          %8s ms   ← 这一格才是「停顿」")
        print("    C 之后 2.5s：%d 帧 · p50 %s · p95 %s · 最长 %s ms"
              % (row["n"], row["p50"], row["p95"], row["max"]))
        print("    反馈已显示：%s（%s）" % (row["shown"], row["fb"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
