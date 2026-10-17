# -*- coding: utf-8 -*-
"""性能探针：在"平板档"的视口里真跑一段，量出每帧到底花在哪。

为什么要有它
------------
「卡」是一个说不出所以然的词：可能是主线程画布太重、可能是合成器在重算模糊、
也可能只是这一帧刚好压着 16.7ms 的线。没有数字就只能瞎猜着改
（前三轮优化都是这么过来的：DPR 像素预算、地形层改合成器变换、面板打开时停画 —— 见 36_loop.js 的注释）。
这个工具把那三件事之后的现状量清楚：

  帧间隔 p50 / p95   —— 有没有掉帧、抖不抖
  draw / update 耗时 —— 主线程的活到底多重
  画布尺寸 / DPR     —— 后备存储开了多大
  DOM 实体数         —— emoji 层（每帧都在改 transform）有多少个节点
  PERF.multi         —— 自适应降档系统当前压到第几档

用法
----
  python tools/perf.py                          平板横屏档（1180x820 · dsf 2），三个场景各 6 秒
  python tools/perf.py --size 1024x768 --secs 8
  python tools/perf.py --dsf 1                  对比：同一视口下 DPR 减半的效果
  python tools/perf.py --html releases/xxx.html 拿旧版产物做前后对比

注意
----
无头 Chrome 没有真实 GPU 与真实刷新率，**绝对帧数不可当真**；
真正可比的是「同一台机器上，改前改后的相对差」。所以它输出的是
p50/p95 与逐项耗时，用来判断"哪一项在涨"。
"""
import functools
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shots  # noqa: E402  （复用它的找 Chrome）

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Result:
    data = None


class Handler(http.server.SimpleHTTPRequestHandler):
    """静态文件照常发；外加一个 POST /result 收探针结果。

    为什么不用 --dump-dom + --virtual-time-budget：虚拟时间下 rAF 与
    performance.now() 都被"加速"了，量出来的帧间隔和耗时全是假的
    （第一版就这么量出"帧间隔 83.4ms"这种没法解释的数）。
    真实时间跑、页面把结果 POST 回来，才是真的。
    """

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n)
        try:
            Result.data = json.loads(body.decode("utf-8"))
        except Exception:
            Result.data = {"error": body.decode("utf-8", "replace")[:500]}
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass

PROBE = r"""
(function(){
  var R={phases:[]};
  function now(){return performance.now();}
  function pct(a,p){if(!a.length)return 0;var b=a.slice().sort(function(x,y){return x-y;});
    return b[Math.min(b.length-1,Math.floor(b.length*p))];}
  function avg(a){if(!a.length)return 0;var s=0;for(var i=0;i<a.length;i++)s+=a[i];return s/a.length;}

  /* 量帧间隔：直接挂 rAF，不动游戏自己的循环 */
  var frames=[],last=0;
  function tick(ts){if(last)frames.push(ts-last);last=ts;requestAnimationFrame(tick);}
  requestAnimationFrame(tick);

  /* 量 draw / update：函数声明在全局作用域，其绑定就是 globalThis 上的属性，
     所以 window.draw=… 之后，主循环里那句 draw() 调到的也是包一层之后的 */
  var drawT=[],updT=[],wrapped=false;
  function wrap(){
    if(wrapped||typeof window.draw!=='function'||typeof window.update!=='function')return;
    var _d=window.draw,_u=window.update;
    window.draw=function(){var t0=now();_d.apply(this,arguments);drawT.push(now()-t0);};
    window.update=function(){var t0=now();_u.apply(this,arguments);updT.push(now()-t0);};
    wrapped=true;
  }
  wrap();

  function snap(name,secs){
    var dpr=(typeof DPR!=='undefined')?DPR:0, sc=(typeof SCALE!=='undefined')?SCALE:0;
    var cv=document.getElementById('game');
    var ents=document.getElementById('ents');
    var perf={};
    try{perf={multi:PERF.multi,maxMulti:PERF.maxMulti,work:Math.round(PERF.work||0),
              budget:Math.round(PERF.budget||0)};}catch(e){}
    var ui={};
    try{ui={panel:panelOpen(),news:(typeof newsIsOpen==='function')&&newsIsOpen()};}catch(e){}
    R.phases.push({name:name,secs:secs,ui:ui,
      frames:frames.length,
      fP50:+pct(frames,.5).toFixed(1), fP95:+pct(frames,.95).toFixed(1),
      fMax:+(frames.length?Math.max.apply(null,frames):0).toFixed(1),
      drawN:drawT.length,drawAvg:+avg(drawT).toFixed(2),
      drawP50:+pct(drawT,.5).toFixed(2),drawP95:+pct(drawT,.95).toFixed(2),
      updAvg:+avg(updT).toFixed(2),updP95:+pct(updT,.95).toFixed(2),
      dpr:+dpr.toFixed(2),scale:+sc.toFixed(2),
      iw:innerWidth,ih:innerHeight,
      cvW:cv?cv.width:0,cvH:cv?cv.height:0,
      ents:ents?ents.children.length:0,
      entShown:(function(){if(!ents)return 0;var n=0,k=ents.children;
        for(var i=0;i<k.length;i++)if(k[i].style.display!=='none')n++;return n;})(),
      perf:perf});
    frames=[];drawT=[];updT=[];
  }

  /* 开场要把公告卡按掉：面板打开时游戏**故意**不画地图（4.0.x 的省电策略），
     不关掉的话量到的 draw 恒为 0 —— 第一版就栽在这儿，量出"draw 0.00ms"却毫无解释 */
  try{hideNews();}catch(e){}
  try{closePanel();}catch(e){}
  /* 等它把节拍量准（paceProbe 要 1.5 秒的窗口）：节拍没准就测不出真实档位 */


  /* paceDraw 的闸门是「面板或公告开着就不画」——每段开测前都要清干净，
     并把这两项状态一起记下来，免得又量出一堆 0 还得回头猜 */
  function clearUI(){
    try{hideNews();}catch(e){}
    try{closePanel();}catch(e){}
  }

  /* 消融开关：一次只关一样，看帧间隔掉不掉 —— 这样"卡在哪"就不是猜的了。
     （主线程 draw 只要 0.5ms，说明瓶颈在合成/光栅那一侧，得用减法找） */
  var ab=document.createElement('style');ab.id='__ablate';document.head.appendChild(ab);
  function ablate(what){
    var ents=document.getElementById('ents');
    if(ents)ents.style.display='';
    var css='';
    /* 省电档走真正的开关（setPerfLite），不是探针自己仿的 —— 量的就是玩家会开的那一档 */
    try{setPerfLite(what==='lite','probe');}catch(e){}
    if(what==='blur')css='*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
    else if(what==='ents'&&ents)ents.style.display='none';
    else if(what==='shadow')css='*{box-shadow:none!important;text-shadow:none!important}';
    ab.textContent=css;
  }

  /* 全部在"跑图"下比：镜头静止时合成器能复用缓存，测不出东西。
     4.0.17 起 ① 就是"玩家默认看到的画质"——地形层与 HUD 毛玻璃已经默认收掉，
     所以它应该直接是 60fps；下面几条消融是留着随时猎下一个瓶颈用的
     （哪条一关帧间隔就掉一档，瓶颈就在哪条上）。 */
  var PH=[['① 默认画质',null],['② 省电档(真开关)','lite'],['③ 消融·关全部模糊','blur'],
          ['④ 消融·关实体层','ents'],['⑤ 消融·关阴影','shadow'],
          ['⑥ 面板开着(停画)','panel'],
          /* 收尾再测一次默认档：① 挨着开局，JIT / 首次布局 / 加载垃圾回收那几下
             都会算进 p95（p50 不受影响），拿它当"这台机器的稳定帧率"会偏悲观。
             跑热了再测一次，才是玩家跑了十几秒之后的真实状态。 */
          ['⑦ 默认画质(复测)',null]];
  function phase(i){
    if(i>=PH.length){
      ablate(null);
      try{keys['arrowright']=false;}catch(e){}
      clearUI();
      try{fetch('/result',{method:'POST',body:JSON.stringify(R)});}catch(e){}
      return;
    }
    var tag=PH[i][0],mode=PH[i][1];
    clearUI();
    try{keys['arrowright']=true;}catch(e){}
    ablate(mode==='panel'?null:mode);
    if(mode==='panel')try{openPanel('<h2>性能探针</h2><div class="sub">面板打开时地图停画</div>');}catch(e){}
    setTimeout(function(){
      snap(tag,SECS);
      phase(i+1);
    },SECS*1000);
  }
  setTimeout(function(){phase(0);},1500);
})();
"""


# 「换场成本」模式：量地图生成 + 静态层重建 + 实体层清理要多久。
# 外观改动全落在静态层（只构建一次），所以这个数才是它的代价 ——
# 好看不能以"每次进图卡一下"为代价。
PROBE_BUILD = r"""
setTimeout(function(){
  try{hideNews();}catch(e){}
  var out=[],errs=[];
  try{
    useWorld(BLAZE);
    var sites=['math','phys','chem','bio'];
    for(var i=0;i<sites.length;i++){
      BLAZE_STATE.naked=true;
      BLAZE_STATE.pick={site:sites[i],diff:1};
      BZ.carry={};
      var t0=performance.now();
      blazeDeploy();
      out.push([sites[i],+(performance.now()-t0).toFixed(1)]);
    }
    BZ.active=false;BLAZE_STATE.run=null;
    var t1=performance.now();blazeToLobby(true);
    out.push(['回营地',+(performance.now()-t1).toFixed(1)]);
  }catch(e){errs.push(String(e).slice(0,140));}
  try{fetch('/result',{method:'POST',
    body:JSON.stringify({phases:[{name:'换场',secs:1,ui:{},frames:0,
      fP50:0,fP95:0,fMax:0,drawN:0,drawAvg:0,drawP95:0,updAvg:0,
      dpr:0,scale:0,iw:0,ih:0,cvW:0,cvH:0,ents:0,entShown:0,perf:{},
      t:out,errs:errs}]})});}catch(e){}
},1600);
"""


def main():
    argv = sys.argv[1:]
    size = "1180x820"
    dsf = "2"
    secs = 6
    html = os.path.join(ROOT, "shujing-app", "index.html")
    if "--size" in argv:
        size = argv[argv.index("--size") + 1]
    if "--dsf" in argv:
        dsf = argv[argv.index("--dsf") + 1]
    if "--secs" in argv:
        secs = int(argv[argv.index("--secs") + 1])
    if "--html" in argv:
        html = argv[argv.index("--html") + 1]

    page = open(html, encoding="utf-8").read()
    probe = (PROBE_BUILD if "--build" in argv else PROBE.replace("SECS", str(secs)))
    page = page.replace("</body>", "<script>" + probe + "</script>\r\n</body>", 1)
    d = os.path.join(ROOT, ".tmp_shots", "perf")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    # version.json 一起给上，免得页面对版本做无谓告警
    src = os.path.join(os.path.dirname(html), "version.json")
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(d, "version.json"))

    # 自己的小服务器：发文件 + 收 /result（真实时间跑，结果 POST 回来）
    Result.data = None
    srv = socketserver.ThreadingTCPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=d))
    srv.daemon_threads = True
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    # --window-size 给的就是 CSS 视口尺寸（实测：1180,820 + dsf2 → innerWidth 1162、dpr 2），
    # 而且**必须用逗号**：写成 1180x820 会被当成非法值、静默退回默认小窗
    # （前两版就是这样量出"视口 491x184"这种没法解释的数）
    win = size.lower().replace("x", ",")
    prof = os.path.join(ROOT, ".tmp_shots", "profile_perf")
    shutil.rmtree(prof, ignore_errors=True)
    cmd = [shots.find_chrome(), "--headless=new", "--disable-gpu",
           "--no-first-run", "--no-default-browser-check",
           "--force-device-scale-factor=" + dsf,
           "--user-data-dir=" + prof,
           "--window-size=" + win,
           "http://127.0.0.1:%d/index.html" % port]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    budget = 1.5 + secs * 8 + 25          # 七个场景 + 收尾余量（场景数改了就跟着改）
    t0 = time.time()
    while time.time() - t0 < budget and Result.data is None:
        time.sleep(0.3)
    try:
        proc.terminate()
        proc.wait(timeout=10)
    except Exception:
        proc.kill()
    srv.shutdown()

    data = Result.data
    if not data:
        print("探针没回传（页面可能没起来，或 %ds 内没跑完）" % budget)
        return 1
    if "--build" in argv:
        ph = (data.get("phases") or [{}])[0]
        print("换场成本 · %s · %s" % (size, os.path.basename(html)))
        print("  （地图生成 + 静态层重建 + 实体层清理，一次完整的进图）")
        for k, v in (ph.get("t") or []):
            print("   %-12s %6s ms" % (k, v))
        for e in (ph.get("errs") or []):
            print("   !! " + e)
        return 0
    print("性能探针 · %s · dsf %s · 每段 %ds · %s"
          % (size, dsf, secs, os.path.basename(html)))
    print()
    print("%-22s %7s %7s %7s %8s %8s %7s %6s %5s" %
          ("场景", "帧间隔p50", "p95", "最长", "draw均", "draw p95", "update均", "帧数", "画面"))
    for ph in data["phases"]:
        if ph["secs"] == 0:
            continue
        ui = ph.get("ui") or {}
        blocked = ui.get("panel") or ui.get("news")
        print("%-22s %7.1f %7.1f %7.1f %8.2f %8.2f %7.2f %6d %5s" %
              (ph["name"], ph["fP50"], ph["fP95"], ph["fMax"],
               ph["drawAvg"], ph["drawP95"], ph["updAvg"], ph["frames"],
               "停画" if blocked else "画"))
        if ph["drawN"] == 0 and not blocked:
            print("   ⚠️ 没有任何面板挡着，draw 却一次没跑 —— 这条要查")
    last = data["phases"][-1] if data["phases"] else {}
    print()
    print("视口 %sx%s CSS · 画布后备 %sx%s（%.2f MP）· DPR %.2f · SCALE %.2f"
          % (last.get("iw"), last.get("ih"), last.get("cvW"), last.get("cvH"),
             (last.get("cvW", 0) * last.get("cvH", 0)) / 1e6,
             last.get("dpr", 0), last.get("scale", 0)))
    print("DOM 实体 %s 个（显示 %s 个）" % (last.get("ents"), last.get("entShown")))
    if last.get("perf"):
        print("自适应降档 PERF：multi=%s / maxMulti=%s · 每帧预算约 %sms · 上一批纯工作 %sms"
              % (last["perf"].get("multi"), last["perf"].get("maxMulti"),
                 last["perf"].get("budget"), last["perf"].get("work")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
