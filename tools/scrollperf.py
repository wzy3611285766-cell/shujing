# -*- coding: utf-8 -*-
"""一次性：量面板滚动时的帧间隔，验证"面板内毛玻璃导致滚动卡"。

做法：开一个 40 行的长面板（用真实的 .menu-li / .btn 样式），
     每帧把 scrollTop 推 6px，跑 3 秒，记 rAF 间隔。
     然后注入 *{backdrop-filter:none} 再跑一遍 —— 差值就是模糊的成本。
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
  function rows(n){
    var h='<h2>滚动测试</h2><div class="sub">40 行真实样式</div>';
    for(var i=0;i<n;i++){
      h+='<button class="menu-li"><span class="e">🧭</span>'
        +'<span class="tx">第 '+(i+1)+' 项<div class="d">这是列表里的一行，用来量滚动</div></span></button>';
    }
    h+='<div class="row"><button class="btn">按钮 A</button><button class="btn primary">按钮 B</button></div>';
    return h;
  }
  function snap(tag){
    return new Promise(function(res){
      var spans=[],last=0,end=performance.now()+3000,drawn=0;
      function step(now){
        if(last){
          var d=now-last;
          if(d>=5)spans.push(d);
          drawScroll();
        }
        last=now;
        if(now<end)requestAnimationFrame(step);
        else{
          spans.sort(function(a,b){return a-b;});
          var q=function(p){return spans.length?+spans[Math.min(spans.length-1,Math.floor(spans.length*p))].toFixed(1):0;};
          res({tag:tag,n:spans.length,p50:q(.5),p95:q(.95),max:spans.length?+spans[spans.length-1].toFixed(1):0});
        }
      }
      function drawScroll(){
        var p=document.getElementById('panel');
        if(!p)return;
        if(p.scrollTop+p.clientHeight>=p.scrollHeight-2)p.scrollTop=0;
        else p.scrollTop+=6;
      }
      requestAnimationFrame(step);
    });
  }
  try{
    openPanel(rows(40));
    await new Promise(function(r){setTimeout(r,300);});
    /* 先看看"谁还在模糊" —— 光看帧间隔分不清是 .menu-li 还是 #modal 那层 */
    var cs=function(el){return el?String(getComputedStyle(el).backdropFilter||'-'):'无此元素';};
    out.cs={
      modal:cs(document.getElementById('modal')),
      li:cs(document.querySelector('#panel .menu-li')),
      btn:cs(document.querySelector('#panel .btn'))
    };
    out.before=await snap('现状');
    /* 一轮一轮减，看哪一样真花钱 */
    var st=document.createElement('style');document.head.appendChild(st);
    async function tryCss(css,label){
      st.textContent=css;
      await new Promise(function(r){setTimeout(r,200);});
      var v=await snap(label);
      st.textContent='';
      return v;
    }
    out.noBlur=await tryCss('*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}','关掉全部模糊');
    out.noShadow=await tryCss('#panel .menu-li{box-shadow:none!important}','只关行阴影');
    out.noSheen=await tryCss('#panel .menu-li::before{display:none!important}#panel .menu-li{isolation:auto!important}','只关高光层');
    out.noShadowAll=await tryCss('*{box-shadow:none!important;text-shadow:none!important}','关掉所有阴影');
    out.rows=document.querySelectorAll('#panel .menu-li').length;
  }catch(e){out.err=String(e).slice(0,200);}
  try{fetch('/result',{method:'POST',body:JSON.stringify(out)});}catch(e){}
},1800);
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
    d = os.path.join(ROOT, ".tmp_shots", "scrollprobe")
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

    prof = os.path.join(ROOT, ".tmp_shots/pscroll")
    shutil.rmtree(prof, ignore_errors=True)
    cmd = [shots.find_chrome(), "--headless=new", "--disable-gpu", "--no-first-run",
           "--no-default-browser-check", "--user-data-dir=" + prof]
    if "--dsf" in sys.argv:
        cmd.append("--force-device-scale-factor=" + sys.argv[sys.argv.index("--dsf") + 1])
    size = sys.argv[sys.argv.index("--size") + 1] if "--size" in sys.argv else "1180x820"
    cmd += ["--window-size=" + size.lower().replace("x", ","),
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
    print("面板里 %d 个 .menu-li · 每帧滚 6px，各测 3 秒" % data["rows"])
    keys = [k for k in ("before", "noBlur", "noShadow", "noSheen", "noShadowAll") if k in data]
    base = data["before"]["p50"]
    for k in keys:
        v = data[k]
        print("  %-14s p50 %6.1f ms · p95 %6.1f ms · 最长 %6.1f ms · %3d 帧"
              % (v["tag"], v["p50"], v["p95"], v["max"], v["n"]))
    for k in keys[1:]:
        v = data[k]
        if base > 0:
            print("    %-12s 相对现状 %+.1f ms（%.0f%%）" % (v["tag"], v["p50"] - base,
                                                        (v["p50"] - base) / base * 100))
    return 0


if __name__ == "__main__":
    sys.exit(main())
