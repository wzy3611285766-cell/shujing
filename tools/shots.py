# -*- coding: utf-8 -*-
"""场景截图：给游戏的某个界面状态拍一张图，喂给汇报页用。

为什么不用 --screenshot 直接拍：游戏的公告弹窗要等 420ms、版本通知栏要等 5s、
☰ 菜单还得先点开 —— 静态截图拍到的永远是"刚开场的空地图"。
这里往产物副本里注入一段小脚本，把状态摆好再让 Chrome 拍。

用法
----
  python tools/shots.py                    拍全部场景（产物 shujing-app/index.html）
  python tools/shots.py 公告 菜单           只拍指定场景
  python tools/shots.py --html releases/数境169_v4.0.5_2026-10-14.html --prefix old_
                                           换成别的产物拍（做前后对比）
  python tools/shots.py --size 390x844     指定窗口尺寸（默认 560x1000，见下）

关于尺寸：Chrome 在这台机器上给窗口卡了个最小宽度（约 522px），
要 414 只会得到 504 的布局 —— 而截图仍按你要求的 414 裁，右边就缺一条。
所以默认取 560x1000（手机竖屏比例，且高于那个下限），布局多少、图就多大。
"页面按 504 布局、图裁成 414"这种错位不会再有。

产物：shots_auto/<前缀><场景>.png
"""
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "shots_auto")
TMP = os.path.join(ROOT, ".tmp_shots")
CHROME_CANDIDATES = [
    r"C:/Program Files/Google/Chrome/Application/chrome.exe",
    r"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

# 场景 = (注入脚本, 虚拟时间预算ms, 说明)
# 注入脚本跑在主脚本之后：那时所有 const/函数都已就绪，可以随便点。
COMMON = """
try{localStorage.setItem('genji_news',newsVer());}catch(e){}   /* 先记成"公告看过了" */
function quiet(){try{state.sound=false;}catch(e){}}
/* 往仓库里塞一摞真物资（交易站 / 特勤处那几屏靠它才有东西可看） */
function seedStash(){
  try{
    BLAZE_STATE.stash={};
    [5,4,4,3,3,2,1,0].forEach(function(rid,i){
      var L=makeLoot(rid,'math',1.5,1);
      if(!L)return;
      var rec=BLAZE_STATE.stash[L.n];
      if(!rec){
        rec={n:L.n,e:L.e,r:L.r,val:0,cnt:0,slot:L.slot,cat:L.cat,nt:L.nt?1:0};
        BLAZE_STATE.stash[L.n]=rec;
      }
      var k=1+(i%3);
      rec.cnt+=k;rec.val+=L.val*k;
    });
    save();
  }catch(e){}
}
/* 练枪场里蒙错一题：一题一题往下试，直到 feedback 变红（选项 4 个，8 题内几乎必中） */
function missOne(){
  try{drillSession('math',{tier:1});}catch(e){return false;}
  for(var k=0;k<8;k++){
    var sk=document.getElementById('skipBtn');
    if(sk&&sk.offsetParent!==null)sk.click();
    var os=panel.querySelectorAll('.opt:not(.appr)');
    if(!os.length)return false;
    os[0].click();
    var fb=document.getElementById('feedback');
    if(fb&&fb.className==='no')return true;
    var nx=document.getElementById('nextBtn');
    if(nx)nx.click();else return false;
  }
  return false;
}
"""

SCENES = {
    # 进场那张更新公告：4.0.9 起"全新玩家"看不到它（先看教学），
    # 所以要拍公告得先把这台机器伪装成"玩过的老玩家"，再清掉公告已读位重走一次
    "公告": ("""
setTimeout(function(){
  quiet();
  closePanel();
  try{state.totalRight=9;save();}catch(e){}
  NEWS_SEEN=false;
  try{localStorage.removeItem(NEWS_KEY);}catch(e){}
  try{newsBoot();}catch(e){}
},900);
""", 6000, "进场更新公告（老玩家 + 这版还没看过）"),
    # ☰ 菜单：把公告按掉再点开菜单，顺手滚到底（全屏那一行在最下面）
    "菜单": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  try{document.getElementById('toast').textContent='';}catch(e){}
  try{showMenu();}catch(e){}
  try{var p=document.getElementById('panel');p.scrollTop=p.scrollHeight;}catch(e){}
},900);
""", 6000, "☰ 菜单（滚到最下面：⛶ 全屏那一行）"),
    # 全新玩家的开场：把"读过了"清掉、进度清零，说明才会弹（4.0.9 修的就是它）
    "首次说明": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{localStorage.removeItem(curKey+'_intro');}catch(e){}
  Object.assign(state,{totalRight:0,totalWrong:0,caught:{},solved:{},loose:{},badges:{},
    wrongBook:[],wrongDone:[],read:{},quiz:{},stat:{},tstat:{},astat:{},drill:{}});
  maybeIntro(0);
},900);
""", 6000, "全新玩家的开场：闯关模式说明（现在只出现这一次）"),
    # 行动基地（特勤处）的地面：4.0.13 修的"石子粒子"就在这儿
    "基地": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{useWorld(BLAZE);blazeEnter();blazeCamTo(state.x,state.y);}catch(e){}
},1200);
""", 7000, "行动基地（特勤处）的地面"),
    # 部署后的战场地面：和基地那张对着看，就能看出残留
    "战场": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    useWorld(BLAZE);
    BLAZE_STATE.naked=true;                 /* 跑刀：免票免战备值，直接把图开出来 */
    BLAZE_STATE.pick={site:'math',diff:1};
    BZ.carry={};
    blazeDeploy();
  }catch(e){}
  /* 落到撤离点再拍：出生点有时紧挨着保险箱房守卫，
     一开局就弹「门卫」遭遇框，拍到的全是弹窗（随机踩过两次）。
     撤离点是固定点位、一定可走，画面也更像一张地图。 */
  setTimeout(function(){
    try{
      var ex=SPOTS.filter(function(s){return s.t==='exfil';})[0];
      if(ex){state.x=ex.x;state.y=ex.y-96;}
      closePanel();
      if(typeof blazeCamTo==='function')blazeCamTo(state.x,state.y);
      document.querySelectorAll('.tst,#toast').forEach(function(n){n.textContent='';});
    }catch(e){}
  },700);
},1200);
""", 7000, "部署后的战场地面（撤离点附近）"),
    # 烽火答题：4.0.21 修的是"摁完正确选项停一两秒才变色"
    "烽火答题": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  (async function(){
    try{
      useWorld(BLAZE);
      BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
      BLAZE_STATE.run=null;BZ.map=null;
      blazeDeploy();
      /* 反复开箱直到点中正确答案（错的也走同一条渲染路径，但截图想看绿色那条） */
      for(var k=0;k<8;k++){
        blazeAsk({rid:'func',tier:1,title:'📦 物资箱',sub:'正在撬锁 · 零点演算场',
          tag:'📐 常规 · 搜索',bar:'',nextText:'搜刮完毕 →',onDone:function(){}});
        await new Promise(function(r){setTimeout(r,240);});
        var o=document.querySelector('#panel .opt');
        if(!o)break;
        o.click();
        var fb=document.getElementById('feedback');
        if(fb&&fb.className==='ok')break;
        closePanel();
      }
    }catch(e){}
  })();
},1200);
""", 7000, "烽火答题：答对之后的样子（反馈当帧就到）"),
    # 战术地图：4.0.13 修的是它"图中间拖不动"（画布吃掉了手势）
    "战术地图": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    useWorld(BLAZE);
    BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};
    BZ.carry={};
    blazeDeploy();
    showTacMap();
  }catch(e){}
},1300);
""", 7000, "战术地图（整块区域都能拖着滚）"),
    # 卖出确认：4.0.14 起是游戏内弹窗（原生 confirm 会把全屏踢掉）
    "卖出确认": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    useWorld(BLAZE);blazeEnter();
    seedStash();
    blazeLobbyTab=2;blazeRenderLobby();
    /* 第一件是单件（只有「卖 1」），所以扫一遍找第一颗「卖 N」 */
    var b=document.querySelector('[id^="sa_"]');
    if(b)b.click();
  }catch(e){}
},1400);
""", 7000, "交易站 · 卖出确认（游戏内弹窗）"),
    # 一键清空仓库：明细多行 + 到手总额
    "清空确认": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    useWorld(BLAZE);blazeEnter();
    seedStash();
    blazeLobbyTab=2;blazeRenderLobby();
    var d=document.getElementById('dump');
    if(d)d.click();
  }catch(e){}
},1400);
""", 7000, "一键清空仓库 · 确认（明细 + 到手总额）"),
    # 特勤处升级确认：和交易站同一套弹窗（4.0.14）
    "升级确认": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    useWorld(BLAZE);blazeEnter();
    seedStash();
    BLAZE_STATE.crystals=99999;
    blazeLobbyTab=3;blazeRenderLobby();
    var b=document.getElementById('up_cmd');
    if(b&&!b.disabled)b.click();
  }catch(e){}
},1400);
""", 7000, "特勤处 · 升级确认（同一套游戏内弹窗）"),
    # 省电档：和「菜单」那张对着看，就是"毛玻璃 vs 不透明底"的差别（4.0.16）
    "省电档": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{setPerfLite(true,'shot');}catch(e){}
  try{$('regionChip').click();}catch(e){}
  try{document.getElementById('toast').textContent='';}catch(e){}
  try{showMenu();}catch(e){}
  try{var p=document.getElementById('panel');p.scrollTop=p.scrollHeight;}catch(e){}
},900);
""", 6000, "省电档（画质：流畅）下的 ☰ 菜单与顶栏"),
    # 烽火 · 战备采购：房卡那一排（4.0.12 修的是它那颗购买按钮的样式）
    "战备采购": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{
    if(typeof useWorld==='function')useWorld(BLAZE);
    BLAZE_STATE.active=false;
    blazeLobbyTab=1;
    blazeRenderLobby();
    /* 房卡在采购页最下面，滚到底才看得见它们的购买按钮 */
    var p=document.getElementById('panel');if(p)p.scrollTop=p.scrollHeight;
  }catch(e){}
},1200);
""", 7000, "烽火 · 战备采购：物资与房卡现在是同一套购买按钮"),
    # 帧率角标（4.0.11）：☰ 菜单打开它之后，右上角那一行
    "帧率角标": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  try{setFpsBadge(true);}catch(e){}
},900);
""", 6000, "右上角的帧率角标（☰ 菜单 → 帧率角标）"),
    # 练枪答错那一屏：反馈里那句"又错一次 · 熟炼度打回第一天"是这次改的
    "练枪答错": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  if(missOne()){try{panel.scrollTop=0;}catch(e){}}
},900);
""", 6000, "练枪场答错：反馈直接说明这道题在错题本里怎么处理"),
    # 练枪收工：新加的那颗「趁热重做刚错的 N 题」
    "练枪收工": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  closePanel();
  if(missOne()){var fin=document.getElementById('finBtn');if(fin)fin.click();}
},900);
""", 6000, "练枪收工：本轮小结 + 趁热重做刚错的题"),
    # 菜单顶部：标题那一行挂着当前版本号（4.0.8）
    "菜单顶部": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  try{document.getElementById('toast').textContent='';}catch(e){}
  try{showMenu();var p=document.getElementById('panel');p.scrollTop=0;}catch(e){}
},900);
""", 6000, "☰ 菜单顶部：标题右侧的版本号标签"),
    # 新版本通知栏：靠 version.json 里放一个更高版本号触发，5 秒后才出来
    "通知栏": ("""
setTimeout(function(){
  quiet();
  try{hideNews();}catch(e){}
  try{closePanel();}catch(e){}
  try{document.getElementById('toast').textContent='';}catch(e){}
},900);
setTimeout(function(){
  try{closePanel();}catch(e){}
  try{document.getElementById('toast').textContent='';}catch(e){}
},1600);
""", 9000, "旧版打开时顶部的新版本通知栏"),
}


def find_chrome():
    for p in CHROME_CANDIDATES:
        if p and os.path.exists(p):
            return p
    raise SystemExit("没找到 Chrome，可以设环境变量 CHROME 指定路径")


def serve(dirpath, port=0):
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=dirpath, **kw)

        def log_message(self, *a):
            pass

    s = socket.socket()
    s.bind(("127.0.0.1", port))
    port = s.getsockname()[1]
    s.close()
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return port, httpd


def shoot(chrome, url, out, w, h, budget, tag, idx):
    if os.path.exists(out):
        os.remove(out)
    # profile 目录名只用 ASCII：Chrome 会把带中文的 --user-data-dir 打进日志，
    # Windows 上那几行是 UTF-8，subprocess 按 GBK 一解就炸（读日志的线程直接报错）
    profile = os.path.join(TMP, "prof%d" % idx)
    shutil.rmtree(profile, ignore_errors=True)
    cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
           "--user-data-dir=" + profile, "--window-size=%d,%d" % (w, h),
           "--virtual-time-budget=%d" % budget, "--run-all-compositor-stages-before-draw",
           "--screenshot=" + os.path.abspath(out).replace("\\", "/"), url]
    errfile = os.path.join(TMP, "chrome_err%d.txt" % idx)
    t0 = time.time()
    # 不用管道：Chrome 的日志有非 GBK 字节，走管道会连带解码线程一起炸
    with open(errfile, "wb") as ef:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=ef, timeout=240)
    if not os.path.exists(out):
        log = open(errfile, "rb").read().decode("utf-8", "replace")[-600:]
        print("   ✗ %s 没出图（%.1fs）" % (tag, time.time() - t0))
        print("   ", log)
        return False
    print("   ✓ %s（%.1fs · %.0f KB）" % (tag, time.time() - t0, os.path.getsize(out) / 1024.0))
    return True


def main():
    argv = sys.argv[1:]
    src = "shujing-app/index.html"
    prefix = ""
    w, h = 560, 1000
    outdir = OUTDIR
    names = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--html":
            i += 1
            src = argv[i]
        elif a == "--prefix":
            i += 1
            prefix = argv[i]
        elif a == "--out":
            i += 1
            outdir = argv[i] if os.path.isabs(argv[i]) else os.path.join(ROOT, argv[i])
        elif a == "--size":
            i += 1
            w, h = (int(x) for x in argv[i].lower().split("x"))
        elif a.startswith("-"):
            raise SystemExit("不认识的参数：%s" % a)
        else:
            names.append(a)
        i += 1

    names = names or list(SCENES)
    for n in names:
        if n not in SCENES:
            raise SystemExit("没有这个场景：%s（可选：%s）" % (n, " / ".join(SCENES)))

    chrome = os.environ.get("CHROME") or find_chrome()
    html = open(os.path.join(ROOT, src), "rb").read().decode("utf-8")
    if "</body>" not in html:
        raise SystemExit("%s 里找不到 </body>" % src)
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)

    # 通知栏场景要靠 version.json 触发：把版本号改高，让它自己认出新版
    vj = json.load(open(os.path.join(ROOT, "shujing-app", "version.json"), encoding="utf-8"))
    hi = dict(vj)
    hi["version"] = "9.9.9"

    print("场景截图（%s · %dx%d）" % (src, w, h))
    ok = True
    for idx, name in enumerate(names):
        script, budget, _desc = SCENES[name]
        page = html.replace("</body>", "<script>\n" + COMMON + script + "\n</script>\r\n</body>", 1)
        # 临时目录名只用 ASCII：IDE 回收站助手（genie-trash）拿到带中文的路径会解错码，
        # 每条中文路径都往 stderr 甩一段 traceback（不影响出图，但刷屏）
        d = os.path.join(TMP, "site%d" % idx)
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "wb").write(page.encode("utf-8"))
        v = hi if name == "通知栏" else vj
        open(os.path.join(d, "version.json"), "w", encoding="utf-8").write(
            json.dumps(v, ensure_ascii=False))
        port, httpd = serve(d)
        try:
            ok &= shoot(chrome, "http://127.0.0.1:%d/index.html" % port,
                        os.path.join(outdir, prefix + name + ".png"), w, h, budget,
                        prefix + name, idx)
        finally:
            httpd.shutdown()
    print("输出目录：%s" % os.path.relpath(outdir, ROOT))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
