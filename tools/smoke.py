# -*- coding: utf-8 -*-
"""冒烟测试：用无头 Chrome 真跑一遍构建产物，产出机器可读的检查报告。

不依赖任何第三方库（不需要 playwright / node / websocket）：
  · 往产物里注入一段探针（只加在临时副本上，不碰发布文件）
  · chrome --headless=new --dump-dom 取回 DOM，从 <pre id="__smoke"> 里读 JSON
  · 用独立的临时 user-data-dir，不污染你自己的浏览器存档

用法：
  python tools/smoke.py            跑冒烟（file:// 打开，等同本地双击）
  python tools/smoke.py --http     顺便用本地 http 托管一遍，验证「更新推送」真的会提示
  python tools/smoke.py --shot     出一张截图
"""
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manifest import PUBLISH  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(ROOT, ".tmp_smoke")

CHROME_CANDIDATES = [
    r"C:/Program Files/Google/Chrome/Application/chrome.exe",
    r"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

PROBE = r"""
<script>
(function(){
  var errs=[], out=null, ce=console.error, cw=console.warn;
  window.addEventListener('error',function(e){errs.push('onerror: '+(e.message||e.type));});
  window.addEventListener('unhandledrejection',function(e){errs.push('reject: '+e.reason);});
  console.error=function(){errs.push('console.error: '+Array.prototype.join.call(arguments,' '));ce.apply(console,arguments);};
  console.warn=function(){errs.push('console.warn: '+Array.prototype.join.call(arguments,' '));cw.apply(console,arguments);};
  function safe(name,fn){try{return {ok:true,v:fn()};}catch(e){return {ok:false,e:String(e&&e.message||e)};}}
  function dump(){
    var pre=document.getElementById('__smoke')||document.createElement('pre');
    pre.id='__smoke';pre.textContent='SMOKE_JSON'+JSON.stringify(out);
    if(!pre.parentNode)document.body.appendChild(pre);
  }
  setTimeout(function(){
    out={errs:errs.slice(0,20),checks:{}};
    out.checks.构建版本 = safe('ver',function(){return (typeof BUILD_VER==='string')?BUILD_VER:'缺 BUILD_VER';});
    out.checks.题目生成器 = safe('gen',function(){
      var n=0;for(var rid in BANK)for(var t of [1,2,3])n+=BANK[rid][t].length;return n;});
    out.checks.国度 = safe('regions',function(){return REGIONS.length;});
    out.checks.精灵 = safe('spirits',function(){return SPIRITS.length;});
    out.checks.自检问题数 = safe('selftest',function(){return selfTest(25).length;});
    out.checks.存档往返 = safe('save',function(){
      var a=JSON.stringify(state);save();load();return a===JSON.stringify(state)?'一致':'load 后状态变了';});
    out.checks.史诗卷宗 = safe('epic',function(){return EPIC_SPOTS.length;});
    out.checks.画布 = safe('canvas',function(){
      var c=document.querySelector('canvas');return c?(c.width+'x'+c.height):'没有 canvas';});
    out.checks.切史诗世界 = safe('epicworld',function(){useWorld(EPIC);return WORLD_TITLE;});
    out.checks.切练枪世界 = safe('drillworld',function(){useWorld(DRILL);return WORLD_TITLE;});
    out.checks.切烽火世界 = safe('blazeworld',function(){useWorld(BLAZE);return WORLD_TITLE;});
    out.checks.切回闯关世界 = safe('advworld',function(){useWorld(ADV);return WORLD_TITLE;});
    /* 练枪入口必须只有一个：顶栏（四个世界各数一遍）与 ☰ 菜单里都不许出现第二个 */
    out.checks.顶栏练枪入口 = safe('bar',function(){
      var worlds=[['闯关',ADV],['史诗',EPIC],['练枪场',DRILL],['烽火',BLAZE]],res=[];
      worlds.forEach(function(p){
        useWorld(p[1]);syncModeButtons();
        var btns=document.querySelectorAll('#topRight .btn'),n=0;
        for(var i=0;i<btns.length;i++){
          if(btns[i].style.display==='none')continue;
          if(btns[i].textContent.indexOf('练枪')>=0)n++;
        }
        res.push(p[0]+'='+n);
      });
      useWorld(ADV);syncModeButtons();
      var bad=res.filter(function(x){return x.split('=')[1]!=='1';});
      if(bad.length)throw new Error('练枪入口不等于 1 个：'+res.join(' · '));
      return '四个世界各 1 个（'+res.join(' · ')+'）';});
    out.checks.菜单练枪入口 = safe('menu',function(){
      useWorld(ADV);syncModeButtons();
      showMenu();
      /* 只看条目标题（.tx 里的第一段文字），不看下面那行说明 ——
         说明里提到"练枪"不算入口（比如更新公告那条） */
      var items=panel.querySelectorAll('.menu-li'),n=0,names=[];
      for(var i=0;i<items.length;i++){
        var tx=items[i].querySelector('.tx');
        if(!tx)continue;
        var label=(tx.childNodes[0]&&tx.childNodes[0].textContent)||'';
        if(label.indexOf('练枪')>=0){n++;names.push(label.trim());}
      }
      closePanel();
      if(n!==1)throw new Error('菜单里练枪入口有 '+n+' 个（应为 1）：'+names.join(' / '));
      return '菜单里 1 个（'+names[0]+'）';});
    out.checks.更新公告 = safe('news',function(){
      var el=document.getElementById('news');
      if(!el)throw new Error('找不到公告元素 #news');
      var t=el.querySelector('.news-title');
      if(!t||!t.textContent.trim())throw new Error('公告没有标题');
      if(!/^v?\d/.test(String(NEWS_VER)))throw new Error('NEWS_VER 长得不对：'+NEWS_VER);
      return NEWS_VER+' · '+t.textContent.trim();});
    out.checks.账号与同步 = safe('acct',function(){
      closePanel();showAccountPanel();
      var hasPhone=!!document.getElementById('acctPhone'),hasWx=!!document.getElementById('acctWx');
      var why=/登录同步用不了/.test(panel.textContent||'');
      closePanel();
      if(!hasPhone&&!why)throw new Error('面板里既没有手机号输入框，也没有"不支持登录"的说明');
      return hasPhone?('手机号+验证码入口在 · 微信登录'+(hasWx?'在':'缺'))
                     :'本地地址：按设计提示不支持登录（线上域名下才可用）';});
    out.checks.存档面板 = safe('panel',function(){
      openPanel('<h2>冒烟</h2><div class="sub">面板通路</div>');closePanel();return '开合正常';});
    dump();
    /* 网页部署下再等一会儿：验「发现新版本 → 提示刷新」这条链路 */
    if(/^https?:/.test(location.protocol)){
      fetch('version.json?probe='+Date.now(),{cache:'no-store'}).then(r=>r.text())
        .then(t=>{out.checks.读到版本文件 = {ok:true,v:t.replace(/\s+/g,'').slice(0,44)+'…'};})
        .catch(e=>{out.checks.读到版本文件 = {ok:false,e:'取不到：'+e};});
      /* 提示只挂两秒多，所以边跑边看：从 4 秒盯到 9 秒，出现过就算数 */
      var saw=false;
      var iv=setInterval(function(){
        var box=document.getElementById('toast');
        if(box&&box.textContent.indexOf('有新版本')>=0)saw=true;
      },200);
      setTimeout(function(){
        clearInterval(iv);
        out.checks.更新推送 = safe('update',function(){
          if(location.search.indexOf('expect_none')>=0){
            if(saw)throw new Error('版本一致却提示了刷新（误报）');
            return '不提示（版本一致）';
          }
          if(!saw)throw new Error('有新版本却没提示刷新');
          return '已提示刷新';});
        dump();
      },5000);
    }
  },4000);
})();
</script>
"""


def find_chrome():
    for p in CHROME_CANDIDATES:
        if p and os.path.exists(p):
            return p
    raise SystemExit("没找到 Chrome，请手动指定路径（设环境变量 CHROME）")


def run_chrome(chrome, url, profile, shot=None, budget=20000):
    shutil.rmtree(profile, ignore_errors=True)
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
           "--user-data-dir=" + profile, "--window-size=1280,800",
           "--virtual-time-budget=%d" % budget, "--run-all-compositor-stages-before-draw"]
    if shot:
        cmd.append("--screenshot=" + shot.replace("\\", "/"))
    cmd += ["--dump-dom", url]
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, timeout=240)
    return proc, time.time() - t0


def parse(proc, label):
    dom = proc.stdout.decode("utf-8", "replace")
    m = re.search(r"SMOKE_JSON(\{.*?\})</pre>", dom, re.S)
    if not m:
        print("❌ %s：探针没有回传结果（页面可能启动就崩了）" % label)
        print("stderr:", proc.stderr.decode("utf-8", "replace")[-1200:])
        return 1
    data = json.loads(m.group(1))
    bad = 0
    for k, v in data["checks"].items():
        if isinstance(v, dict) and v["ok"]:
            print("  ✅ %-12s %s" % (k, v["v"]))
        else:
            bad += 1
            print("  ❌ %-12s %s" % (k, v.get("e") if isinstance(v, dict) else v))
    if data["errs"]:
        bad += 1
        print("  ❌ 运行期错误 %d 条:" % len(data["errs"]))
        for e in data["errs"][:10]:
            print("     · " + e[:200])
    else:
        print("  ✅ %-12s 无" % "控制台错误")
    return bad


def serve(dirpath):
    """起一个本地静态服务，返回 (port, httpd)。"""
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=dirpath, **kw)

        def log_message(self, *a):
            pass

    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return port, httpd


def main():
    chrome = os.environ.get("CHROME") or find_chrome()
    os.makedirs(TMP, exist_ok=True)
    html = open(os.path.join(ROOT, PUBLISH), "rb").read().decode("utf-8")
    if "</body>" not in html:
        raise SystemExit("产物里找不到 </body>，无法注入探针")
    tested = html.replace("</body>", PROBE + "\r\n</body>", 1)

    failed = 0

    # ① 本地双击（file://）的场景
    probe_path = os.path.join(TMP, "smoke.html")
    open(probe_path, "wb").write(tested.encode("utf-8"))
    print("① file:// 本地打开（等同双击产物）")
    proc, cost = run_chrome(chrome, "file:///" + probe_path.replace("\\", "/"),
                            os.path.join(TMP, "profile_file"),
                            shot=os.path.join(TMP, "smoke.png") if "--shot" in sys.argv else None)
    print("  耗时 %.1fs" % cost)
    failed += parse(proc, "file")

    # ② 网页部署（http）的场景：顺带验更新推送
    if "--http" in sys.argv:
        http_dir = os.path.join(TMP, "http")
        os.makedirs(http_dir, exist_ok=True)
        open(os.path.join(http_dir, "index.html"), "wb").write(tested.encode("utf-8"))
        vj = json.load(open(os.path.join(ROOT, "shujing-app", "version.json"), encoding="utf-8"))
        vj["version"] = "9.9.9"          # 故意放一个"更新版"，看它会不会提示刷新
        open(os.path.join(http_dir, "version.json"), "w", encoding="utf-8").write(
            json.dumps(vj, ensure_ascii=False))
        port, httpd = serve(http_dir)
        print()
        print("② http://127.0.0.1:%d/index.html（模拟线上部署，version.json 故意写成 9.9.9）" % port)
        proc, cost = run_chrome(chrome, "http://127.0.0.1:%d/index.html" % port,
                                os.path.join(TMP, "profile_http"), budget=26000)
        print("  耗时 %.1fs" % cost)
        failed += parse(proc, "http")

        # ③ 版本一致时不该提示（防误报）
        same_dir = os.path.join(TMP, "http_same")
        os.makedirs(same_dir, exist_ok=True)
        shutil.copy2(os.path.join(http_dir, "index.html"), os.path.join(same_dir, "index.html"))
        shutil.copy2(os.path.join(ROOT, "shujing-app", "version.json"), os.path.join(same_dir, "version.json"))
        port2, httpd2 = serve(same_dir)
        httpd.shutdown()
        print()
        print("③ http://127.0.0.1:%d/index.html（版本一致，应当不提示）" % port2)
        proc, cost = run_chrome(chrome, "http://127.0.0.1:%d/index.html?expect_none=1" % port2,
                                os.path.join(TMP, "profile_http2"), budget=26000)
        httpd2.shutdown()
        print("  耗时 %.1fs" % cost)
        failed += parse(proc, "http-same")

    print()
    print("冒烟%s" % ("通过" if failed == 0 else "失败（%d 项）" % failed))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
