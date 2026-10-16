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

# Windows 控制台默认 GBK：结果里的 ✅/❌ 会直接 UnicodeEncodeError 崩掉（只换编码，不动逻辑）
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

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
    /* 四国并联：任意一国都要能直达，且落在它的出生域 —— 不许再出现"先通关上一国"的门槛 */
    out.checks.四国直达 = safe('nations',function(){
      useWorld(ADV);
      try{panel.dataset.lock='0';}catch(e){}
      closePanel();
      var snd=state.sound;state.sound=false;      // 无手势环境别去创建 AudioContext（会进控制台）
      var res=[];
      try{
        /* 从别国开始绕一圈，最后回到数学国：每一站都是"跨国切换"，
           才验得到「落地自动点亮第一座塔」这条（本国之间不算切换，也不需要）。 */
        NATIONS.slice(1).concat([NATIONS[0]]).forEach(function(n){
          goNationStart(n.id);
          if(state.nation!==n.id)throw new Error('没切到 '+n.name);
          if(!walkable(state.x,state.y))throw new Error(n.name+' 的落点走不过去');
          var reg=currentRegion(state.x,state.y);
          if(!reg||reg.id!==n.regions[0].id)throw new Error(n.name+' 没落在出生域（'+(reg?reg.name:'地图外')+'）');
          if(!state.totems[n.totems[0].id])throw new Error(n.name+' 落地后第一座塔没点亮（回不去）');
          res.push(n.emoji+n.name);
        });
      }finally{
        state.sound=snd;useNation('math');save();
      }
      showNationPortal();
      var miss=NATIONS.filter(function(n){return !document.getElementById('go_'+n.id);});
      var txt=panel.textContent||'';
      var locked=/航路还没打通|未开辟|先通关/.test(txt);
      closePanel();
      if(miss.length)throw new Error('面板里缺「前往出生域」入口：'+miss.map(function(n){return n.name;}).join('、'));
      if(locked)throw new Error('面板里还留着"先通关上一国"的锁');
      return '四国都能直达出生域（'+res.join(' → ')+'）';});
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
      /* 公告已读位由构建期从 news.json 生成（v<版本>-<内容摘要>），
         不再是手改的常量 —— 老坑就是"改了公告忘了升它" */
      if(String(NEWS_VER).indexOf('__')===0)throw new Error('NEWS_VER 没被构建注入（还是占位符）');
      if(newsVer()!==NEWS_VER)throw new Error('newsVer() 与 NEWS_VER 不一致：'+newsVer());
      if(el.querySelectorAll('.news-card').length!==1)throw new Error('公告卡片不是 1 张');
      if(!el.querySelector('.news-li'))throw new Error('公告里没有"本次更新"条目');
      return NEWS_VER+' · '+t.textContent.trim();});
    /* 全屏入口：4.0.6 是"只留 ☰ 菜单里一颗"，4.0.10 改成"三处都要"——
       用户反馈：全屏是必需功能，只藏在菜单里很多人一辈子发现不了。
       所以：☰ 菜单（老手常用）+ 更新公告卡尾 + 顶部通知栏（新手发现）。 */
    out.checks.全屏入口 = safe('fs',function(){
      useWorld(ADV);syncModeButtons();
      if(typeof toggleFullscreen!=='function')throw new Error('没有 toggleFullscreen()');
      if(typeof fsButtonBind!=='function')throw new Error('没有 fsButtonBind()');
      showMenu();
      var btns=panel.querySelectorAll('.menu-li'),hit=[];
      for(var i=0;i<btns.length;i++){
        var tx=btns[i].querySelector('.tx');
        if(!tx)continue;
        var label=(tx.childNodes[0]&&tx.childNodes[0].textContent)||'';
        if(label.indexOf('全屏')>=0)hit.push(btns[i].id);
      }
      closePanel();
      if(!document.getElementById('upbar'))throw new Error('产物里没有新版本通知栏 #upbar');
      if(hit.length!==1||hit[0]!=='mFs')
        throw new Error('☰ 菜单里全屏入口应只有 #mFs 一个，实得：'+(hit.join('/')||'无'));
      var nf=document.getElementById('newsFs'),uf=document.getElementById('upFs');
      if(!nf)throw new Error('公告卡片里没有全屏按钮 #newsFs（4.0.10 请回来的那个）');
      if(!uf)throw new Error('顶部通知栏里没有全屏按钮 #upFs');
      if(typeof nf.onclick!=='function')throw new Error('#newsFs 没绑上行为，点了没反应');
      if(typeof uf.onclick!=='function')throw new Error('#upFs 没绑上行为，点了没反应');
      if(!/全屏/.test(nf.textContent))throw new Error('#newsFs 文案里没有「全屏」：'+nf.textContent);
      if(!/全屏/.test(uf.textContent))throw new Error('#upFs 文案里没有「全屏」：'+uf.textContent);
      /* 用户要的是"并说明使用方法"：公告里各平台怎么开，至少得列全 */
      var tips=document.querySelectorAll('#news .fs-tip');
      if(tips.length<4)throw new Error('公告里各平台怎么开全屏的说明只有 '+tips.length+' 条');
      return '☰ #mFs · 公告 #newsFs · 通知栏 #upFs（三处都在、都绑了行为）· 平台说明 '+tips.length+' 条';});
    /* 云对账决策：把"无限重载"那类事故当测试用例钉住 */
    out.checks.云端对账决策 = safe('decide',function(){
      var cases=[
        [{prog:0,cp:0,savedAt:0,applied:0},'none','两边都空'],
        [{prog:0,cp:0,savedAt:12345,applied:0},'none','本机空+云端是空档（事故现场：以前会无限重载）'],
        [{prog:0,cp:30,mine:0,savedAt:100,applied:0},'apply','本机空·云端有真进度'],
        [{prog:0,cp:30,mine:0,savedAt:100,applied:100},'none','同一份云端刚盖过：不再盖'],
        [{prog:30,cp:0,mine:50,savedAt:99999,applied:0},'push','云端是空档·本机有进度：不许拿空档盖'],
        [{prog:10,cp:5,mine:0,savedAt:100,applied:0},'push','本机练过但从没同步过'],
        [{prog:10,cp:99,mine:1,savedAt:99999,applied:0},'apply','云端明显更新'],
        [{prog:10,cp:99,mine:99999,savedAt:1,applied:0},'push','本机明显更新'],
        [{prog:10,cp:99,mine:99999,savedAt:99998,applied:0,dirty:true},'push','本机有新改动']
      ];
      var bad=[];
      cases.forEach(function(c){
        var got=cloudDecide(c[0]);
        if(got!==c[1])bad.push(c[2]+' → '+got+'（应 '+c[1]+'）');
      });
      /* 再模拟一次"卡在载入中"：同一份空云端连问 5 轮，不许出现第二次 apply */
      var d={prog:0,cp:0,mine:0,savedAt:12345,applied:0},applies=0;
      for(var i=0;i<5;i++){
        if(cloudDecide(d)==='apply'){applies++;d.applied=12345;}
      }
      if(applies>1)bad.push('空云端被重复取回 '+applies+' 次（会重载循环）');
      if(bad.length)throw new Error(bad.join(' · '));
      return cases.length+' 组对账场景 + 防重载模拟全部通过';});
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
    /* 练枪场错题回流（4.0.7）
       ① 内核：答错一道"已经在本子里"的题，熟炼度必须打回第一天 ——
          以前 wbAdd 碰到已存在的题直接返回 false，这个错就白错了；
       ② 界面：练枪结算页要有一颗「趁热重做刚错的 N 题」。 */
    /* 菜单标题上的版本号（4.0.8）：玩家报问题时第一句就是"你是哪一版"，
       以前只有"有新版本"那条通知栏才会提版本号，平时没处可查 */
    out.checks.菜单版本号 = safe('ver',function(){
      useWorld(ADV);syncModeButtons();
      showMenu();
      var tag=panel.querySelector('.ver-tag'),txt=tag?String(tag.textContent).trim():'';
      closePanel();
      if(!tag)throw new Error('☰ 菜单标题上没有 .ver-tag 版本标签');
      if(txt.indexOf('__')>=0)throw new Error('版本标签里是构建占位符：'+txt);
      if(txt!=='v'+BUILD_VER)throw new Error('标签写的 '+txt+'，而 BUILD_VER 是 '+BUILD_VER);
      return txt+'（与 BUILD_VER 一致）';});
    /* 战术地图要能拖（4.0.13）。
       坑是 `canvas{touch-action:none}` 那条按元素名写的规则把面板里的画布也吃了：
       touch-action 取路径交集，画布 none → 身后 .panel 的 pan-y 白写，
       手指落在图中间压根不产生滚动手势（只有面板两侧那条窄边能滑）。 */
    out.checks.战术地图可拖动 = safe('tacmap',function(){
      useWorld(BLAZE);
      BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
      blazeDeploy();
      showTacMap();
      var cv=document.getElementById('tacCv');
      if(!cv)throw new Error('战术地图面板里没有 #tacCv');
      var ta=String(getComputedStyle(cv).touchAction||'');
      var panelTA=String(getComputedStyle(panel).touchAction||'');
      if(ta==='none')throw new Error('画布还在吃手势：touch-action=none —— 图中间拖不动');
      if(panelTA==='none')throw new Error('面板自己就是 none，滚不了');
      if(!cv.closest('#modal'))throw new Error('画布不在 #modal 里，输入层会把它当成游戏地图吞掉');
      var h=cv.getBoundingClientRect().height;
      closePanel();
      useWorld(ADV);syncModeButtons();
      if(!(h>60))throw new Error('画布高度不对：'+h);
      return '画布 touch-action='+ta+' · 面板 '+panelTA+' · 图中间可拖 · 画布 '+Math.round(h)+'px 高';});
    /* 营地 ⇄ 战场换场要清实体层（4.0.13）：
       营地那枚 🎖️ 指挥部以前会粘在战场上不动；
       营地本身也不该有战场那套掩体方块与地表碎石。 */
    out.checks.换场清实体层 = safe('wipe',function(){
      if(typeof entWipe!=='function')throw new Error('没有 entWipe()');
      if(typeof bzNeedGroundFurniture!=='function')throw new Error('没有 bzNeedGroundFurniture()');
      useWorld(BLAZE);
      BZ.map=null;
      if(bzNeedGroundFurniture())throw new Error('营地被当成战场，会画出掩体方块与碎石');
      var layer=document.getElementById('ents');
      var ghost=document.createElement('div');
      ghost.textContent='🎖️';
      layer.appendChild(ghost);
      ENT.map.set('__probe_ghost__',ghost);
      BLAZE_STATE.naked=true;BLAZE_STATE.pick={site:'math',diff:1};BZ.carry={};
      blazeDeploy();
      var left=ENT.map.has('__probe_ghost__')||layer.contains(ghost);
      var onMap=bzNeedGroundFurniture();
      BZ.active=false;BLAZE_STATE.run=null;blazeToLobby(true);
      var backCamp=!bzNeedGroundFurniture();
      useWorld(ADV);syncModeButtons();
      if(left)throw new Error('部署后实体层还留着营地那枚 🎖️');
      if(!onMap)throw new Error('战场上反而不画掩体了（判据坏了）');
      if(!backCamp)throw new Error('回营地又被当成战场');
      return '营地不画掩体/碎石 · 部署即清空实体层 · 回营地恢复';});
    /* 卖东西走游戏内弹窗（4.0.14）。
       原生 confirm 会把全屏踢掉：卖一次东西 → 弹一次框 → 全屏没了 →
       回来还得再点一次「⛶ 全屏」。这条钉两件事：
         ① 交易全程不碰浏览器 UI（把 window.confirm 换掉，一旦被调用就失败）
         ② 弹窗里写的价 = 真正到账的价（同一个 blazeSellCalc 算的）
       顺带验取消不落账、确认后交易站画得回来。 */
    out.checks.交易走游戏内弹窗 = safe('sell',function(){
      if(typeof uiConfirm!=='function')throw new Error('没有 uiConfirm()');
      if(typeof blazeSellCalc!=='function')throw new Error('没有 blazeSellCalc()');
      useWorld(BLAZE);
      const keepStash=BLAZE_STATE.stash,keepCr=BLAZE_STATE.crystals|0;
      const KEY='冒烟探针物资';
      BLAZE_STATE.stash={};
      BLAZE_STATE.stash[KEY]={n:KEY,e:'🧪',r:1,val:400,cnt:4,slot:1,cat:'探针',nt:0};
      BLAZE_STATE.crystals=0;
      blazeLobbyTab=2;blazeRenderLobby();           /* 交易站 */
      let calls=0,msg='';
      const real=window.confirm;
      window.confirm=function(){calls++;return true;};
      try{
        const b1=$('sa_0');
        if(!b1)throw new Error('交易站里没有「卖 N」按钮');
        b1.click();
        if(calls)throw new Error('还在弹浏览器确认框 —— 那会把全屏踢掉');
        if(!$('ucOk')||!$('ucNo'))throw new Error('没弹出游戏内确认框');
        const hope=blazeSellCalc(BLAZE_STATE.stash[KEY],4).gain;
        const shown=String(panel.textContent||'');
        if(shown.indexOf(String(hope))<0)
          throw new Error('弹窗没把到手价写清（应含 '+hope+'）：'+shown.slice(0,90));
        /* ① 取消：一件都不许少 */
        $('ucNo').click();
        if(!$('dump'))throw new Error('取消后没回到交易站');
        if((BLAZE_STATE.crystals|0)!==0||!BLAZE_STATE.stash[KEY]||BLAZE_STATE.stash[KEY].cnt!==4)
          throw new Error('点了取消却把东西卖了');
        /* ② 确认：按弹窗里那个数到账 */
        const b2=$('sa_0');
        if(!b2)throw new Error('取消之后交易站没画回来');
        b2.click();$('ucOk').click();
        const got=BLAZE_STATE.crystals|0;
        if(got!==hope)throw new Error('到账 '+got+' 与弹窗写的 '+hope+' 不一致');
        if(BLAZE_STATE.stash[KEY])throw new Error('卖光了仓库里还留着这条');
        /* 卖光之后交易站该画出"没有可卖的东西"那一屏（那一屏没有 #dump） */
        if(String(panel.textContent||'').indexOf('没有可卖')<0)
          throw new Error('卖完没回到交易站：'+String(panel.textContent||'').slice(0,60));
        msg='到手 '+hope+' 🪙 与到账一致 · 全程 0 次浏览器 confirm · 取消不落账';
      }finally{
        window.confirm=real;
        BLAZE_STATE.stash=keepStash;BLAZE_STATE.crystals=keepCr;
        blazeLobbyTab=0;closePanel();
      }
      useWorld(ADV);syncModeButtons();
      return msg;});
    /* 特勤处升级也走同一套游戏内弹窗（4.0.14）：
       同样不许碰 window.confirm；取消不扣钱，确认才扣。 */
    out.checks.升级走游戏内弹窗 = safe('dept',function(){
      useWorld(BLAZE);
      const keepCr=BLAZE_STATE.crystals|0,keepStash=BLAZE_STATE.stash;
      const keepHqd=JSON.stringify(BLAZE_STATE.hqd||{});
      const KEY='冒烟探针物资';
      BLAZE_STATE.stash={};
      BLAZE_STATE.stash[KEY]={n:KEY,e:'🧪',r:5,val:4000,cnt:8,slot:1,cat:'探针',nt:0};
      BLAZE_STATE.crystals=99999;
      blazeLobbyTab=3;blazeRenderLobby();              /* 特勤处 */
      const b1=$('up_cmd');
      if(!b1||b1.disabled)throw new Error('特勤处那颗升级按钮点不了');
      let calls=0,msg='';
      const real=window.confirm;
      window.confirm=function(){calls++;return true;};
      try{
        const lv0=deptLevel('cmd');
        b1.click();
        if(calls)throw new Error('升级还在弹浏览器确认框 —— 那会把全屏踢掉');
        if(!$('ucOk')||!$('ucNo'))throw new Error('升级没弹出游戏内确认框');
        const shown=String(panel.textContent||'');
        const nxCost=deptNext('cmd').cost;
        if(shown.indexOf(String(nxCost))<0)
          throw new Error('弹窗没把花费写清（应含 '+nxCost+'）：'+shown.slice(0,80));
        $('ucNo').click();
        if(deptLevel('cmd')!==lv0)throw new Error('点了取消却升级了');
        const b2=$('up_cmd');
        if(!b2)throw new Error('取消后没回到特勤处');
        b2.click();$('ucOk').click();
        if(deptLevel('cmd')!==lv0+1)
          throw new Error('确认后没升级：Lv'+deptLevel('cmd'));
        msg='Lv'+lv0+'→Lv'+deptLevel('cmd')+' · 花费 '+nxCost+' 🪙 写在弹窗里 · 取消不扣钱 · 0 次 confirm';
      }finally{
        window.confirm=real;
        BLAZE_STATE.crystals=keepCr;BLAZE_STATE.stash=keepStash;
        BLAZE_STATE.hqd=JSON.parse(keepHqd);
        blazeLobbyTab=0;closePanel();
      }
      useWorld(ADV);syncModeButtons();
      return msg;});
    /* 烽火只有一种卡：房卡（4.0.12）。保险箱钥匙卡并进了房卡 ——
       💠 高价值保险箱改成刷一张房卡（扣手里等级最低的那张）。 */
    out.checks.房卡唯一 = safe('cards',function(){
      if(typeof blazeLowestCard!=='function')throw new Error('没有 blazeLowestCard()');
      var key=BLAZE_GEAR.filter(function(g){return g.id==='key';});
      if(key.length)throw new Error('战备物资里还留着「保险箱钥匙卡」');
      var named=BLAZE_GEAR.filter(function(g){return String(g.n).indexOf('钥匙卡')>=0;});
      if(named.length)throw new Error('还有叫钥匙卡的采购项：'+named.map(function(g){return g.n;}).join('/'));
      if(BLAZE_CARDS.length!==3)throw new Error('房卡应有 3 张，实得 '+BLAZE_CARDS.length);
      var lc=blazeLowestCard({kc3:1,kc1:2,kc2:1});
      if(!lc||lc.id!=='kc1')throw new Error('应当挑出等级最低的 kc1，实得 '+(lc&&lc.id));
      if(blazeLowestCard({})!==null)throw new Error('一张卡都没有时应返回 null');
      var aid=AID_OF['key'];
      if(!aid||String(aid.n).indexOf('房卡')<0)throw new Error('时空交易所那张券没换成房卡：'+(aid&&aid.n));
      return '物资里没有钥匙卡 · 房卡 3 张 · 最低级优先（kc1）· 交易所券已改成房卡补给';});
    /* 采购页：房卡与物资必须是同一套行标记。
       4.0.12 之前房卡另写一套 .kcard，那颗购买按钮因此没吃到 .item .buy
       的金色样式，成了一颗浏览器默认灰按钮（同一页两种长相）。 */
    out.checks.房卡采购行 = safe('shoprow',function(){
      useWorld(BLAZE);
      BLAZE_STATE.active=false;
      blazeLobbyTab=1;
      blazeRenderLobby();
      var kc=panel.querySelectorAll('.kcard').length;
      var kcBtn=document.getElementById('buy_kc1');
      var batBtn=document.getElementById('buy_battery');
      var items=panel.querySelectorAll('.item').length;
      var buys=panel.querySelectorAll('.item .buy').length;
      closePanel();
      if(kc)throw new Error('采购页还在用 .kcard 那套标记：'+kc);
      if(!kcBtn||!batBtn)throw new Error('房卡或物资的购买按钮缺了');
      if(kcBtn.className!==batBtn.className)
        throw new Error('两种购买按钮的 class 不一致：'+kcBtn.className+' / '+batBtn.className);
      if(typeof kcBtn.onclick!=='function')throw new Error('房卡购买按钮没绑行为');
      if(buys!==items)throw new Error(items+' 行物资/房卡里只有 '+buys+' 个购买按钮');
      return items+' 行同一套标记 · 房卡按钮 class="'+kcBtn.className+'" · 行为已绑';});
    /* 帧率角标（4.0.11）：☰ 菜单里能开关，开了右上角真有一行数，
       关掉之后元素与定时器都得拆干净（不留一个每秒跑两次的空转） */
    out.checks.帧率角标 = safe('fps',function(){
      if(typeof setFpsBadge!=='function')throw new Error('没有 setFpsBadge()');
      useWorld(ADV);syncModeButtons();
      setFpsBadge(false);
      if(document.getElementById('fps'))throw new Error('关掉之后 #fps 还在');
      showMenu();
      var row=document.getElementById('mFps');
      var txt=row?String(row.textContent):'';
      closePanel();
      if(!row)throw new Error('☰ 菜单里没有「帧率角标」这一行');
      if(!/帧率角标/.test(txt))throw new Error('菜单那一行文案不对：'+txt);
      setFpsBadge(true);
      var el=document.getElementById('fps');
      if(!el)throw new Error('打开之后右上角没有 #fps');
      if(!/fps/.test(el.textContent))throw new Error('#fps 里没有 fps 字样：'+el.textContent);
      var cs=getComputedStyle(el);
      if(parseFloat(cs.right)<0)throw new Error('#fps 没贴右边：right='+cs.right);
      setFpsBadge(false);
      if(document.getElementById('fps'))throw new Error('再关一次没拆掉 #fps');
      return '菜单可开关 · 打开时右上角有数（'+String(el.textContent||'')+'）· 关掉即拆干净';});
    out.checks.错题回流内核 = safe('wbm',function(){
      var T='__冒烟探针__'+Date.now();
      function scrub(){
        state.wrongBook=state.wrongBook.filter(function(w){return String(w.text).indexOf('__冒烟探针__')!==0;});
        state.wrongDone=state.wrongDone.filter(function(w){return String(w.text).indexOf('__冒烟探针__')!==0;});
      }
      scrub();
      var it={text:T,ans:'A',opts:['A','B','C','D'],exp:'探针',topic:'探针',rid:'func',subject:'math'};
      var k1=wbMiss(it),w1=wbFind(T),box1=w1?w1.box:-1;
      if(w1)w1.box=3;                                  /* 假装它已经练到 3 星 */
      var k2=wbMiss(it),w2=wbFind(T),box2=w2?w2.box:-1,bad2=w2?w2.badN:-1;
      if(w2)wbArchive(w2);                             /* 再假装它已经毕业 */
      var k3=wbMiss(it),back=(!!wbFind(T)&&!wbFindDone(T));
      scrub();
      if(k1!=='new'||box1!==0)throw new Error('新题应 new 且 box=0，实得 '+k1+'/box'+box1);
      if(k2!=='down'||box2!==0)throw new Error('又错一次没打回第一天：'+k2+'/box'+box2);
      if(bad2!==1)throw new Error('又错一次没记进 badN（错题分析靠它排最薄弱）：'+bad2);
      if(k3!=='back'||!back)throw new Error('已掌握的题再错应拉回本子，实得 '+k3);
      return '新收 / 打回第一天（box 3→0 · badN+1）/ 从已掌握拉回 —— 三种都对';});
    out.checks.练枪结算重做 = safe('drill',function(){
      closePanel();
      useWorld(ADV);syncModeButtons();
      drillSession('math',{tier:1});
      if(!panel.querySelector('.opt'))throw new Error('练枪没开出题目面板');
      var got=false,k;
      /* 一题一题蒙第一个选项，蒙错一题就收工 —— 选项 4 个，8 题内几乎必中 */
      for(k=0;k<8&&!got;k++){
        var sk=document.getElementById('skipBtn');
        if(sk&&sk.offsetParent!==null)sk.click();       /* 有思路环节先跳过 */
        var os=panel.querySelectorAll('.opt:not(.appr)');
        if(!os.length)throw new Error('第 '+(k+1)+' 题没有可选项');
        os[0].click();
        var fb=document.getElementById('feedback');
        if(fb&&fb.className==='no')got=true;
        else{
          var nx=document.getElementById('nextBtn');
          if(nx)nx.click();else break;
        }
      }
      if(!got)throw new Error('连试 8 题都没蒙错，测不下去');
      var fin=document.getElementById('finBtn');
      if(!fin)throw new Error('答题面板上没有「🏁 收工」');
      fin.click();
      var re=document.getElementById('dfRe');
      if(!re)throw new Error('结算页没有「趁热重做刚错的 N 题」按钮');
      var label=String(re.textContent).trim();
      re.click();                                      /* 点进去应当直接开始重做 */
      var head=String((panel.querySelector('h2')||{}).textContent||'');
      var opts2=panel.querySelectorAll('.opt').length;
      closePanel();
      if(!/重做刚错/.test(label))throw new Error('按钮文案不对：'+label);
      if(!/重做刚错/.test(head))throw new Error('点进去没进重做面板，标题是：'+head);
      if(!opts2)throw new Error('重做面板里没有选项');
      return label+' → 面板「'+head+'」'+opts2+' 个选项';});
    /* 首访说明（4.0.9）：新玩家只弹一次、点掉就写已读位、老玩家一次都不弹。
       老病根是"两个同名 maybeIntro，覆盖的那份漏了写入"，所以这里既验弹不弹，
       也验**已读位到底有没有写进去** —— 只验"弹了"是抓不住那个 bug 的。 */
    (function(){
      useWorld(ADV);syncModeButtons();
      var ikey=curKey+'_intro',newsEl=document.getElementById('news'),r={};
      var snap=JSON.stringify(state),savedSave=null,savedFlag=null;
      try{savedSave=localStorage.getItem(curKey);savedFlag=localStorage.getItem(ikey);}catch(e){}
      var blank={totalRight:0,totalWrong:0,caught:{},solved:{},loose:{},badges:{},
        wrongBook:[],wrongDone:[],read:{},quiz:{},stat:{},tstat:{},drill:{},tier:{}};
      function isIntro(){
        return modal.classList.contains('show')&&panel.dataset.intro==='1';
      }
      try{localStorage.removeItem(ikey);}catch(e){}
      Object.assign(state,blank);           /* 造一个"全新玩家" */
      healState();                          /* 走一遍开场的补齐：tier 会被填满，别误判成老玩家 */
      closePanel();try{hideNews();}catch(e){}
      maybeIntro(0);
      setTimeout(function(){
        r.opened=isIntro();
        var go=document.getElementById('go');
        if(go)go.click();                   /* 点「开始探索」 */
        try{r.marked=String(localStorage.getItem(ikey)||'');}catch(e){r.marked='';}
        closePanel();
        maybeIntro(0);                      /* 再看一次：不该弹 */
        setTimeout(function(){
          r.again=isIntro();
          closePanel();
          try{localStorage.removeItem(ikey);}catch(e){}
          state.totalRight=7;               /* 造一个"玩过的老玩家"（但没有已读位） */
          maybeIntro(0);
          setTimeout(function(){
            r.oldPlayer=isIntro();
            closePanel();
            /* 全新玩家连「本次更新」都不该弹：他连上次是什么样都不知道 */
            try{localStorage.removeItem(ikey);}catch(e){}
            Object.assign(state,blank);
            healState();
            newsEl.classList.remove('show');
            NEWS_SEEN=false;NEWS_OPEN=false;
            try{localStorage.removeItem(NEWS_KEY);}catch(e){}
            newsBoot();
            setTimeout(function(){
              r.newsForNew=newsEl.classList.contains('show');
              try{r.newsMarked=String(localStorage.getItem(NEWS_KEY)||'');}catch(e){r.newsMarked='';}
              /* 还原现场，别把后面的检查带跑偏 */
              try{Object.assign(state,JSON.parse(snap));}catch(e){}
              try{
                if(savedSave==null)localStorage.removeItem(curKey);else localStorage.setItem(curKey,savedSave);
                if(savedFlag==null)localStorage.removeItem(ikey);else localStorage.setItem(ikey,savedFlag);
                localStorage.setItem(NEWS_KEY,newsVer());
              }catch(e){}
              NEWS_SEEN=true;NEWS_OPEN=false;closePanel();
              out.checks.首访说明只弹一次 = safe('intro',function(){
                if(!r.opened)throw new Error('新玩家没弹说明');
                if(r.marked!=='1')throw new Error('点掉说明后没写已读位（"每次都弹"的老病根）');
                if(r.again)throw new Error('读过一次了还弹');
                if(r.oldPlayer)throw new Error('有进度的老玩家又被弹了说明');
                if(r.newsForNew)throw new Error('全新玩家被弹了「本次更新」公告');
                if(!r.newsMarked)throw new Error('新玩家的公告没记已读位，玩到一半还会弹');
                return '新玩家只弹教学（公告记已读）· 点掉即写已读位 · 重开不再弹 · 老玩家不弹教学';});
              dump();
            },600);
          },140);
        },140);
      },140);
    })();
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
        /* 通知栏：发现新版时，顶部那条要把"本次更新要点"铺出来，
           而不是只有一句"刷新一下"（要点来自 version.json 的 news_items） */
        out.checks.新版本通知栏 = safe('upbar',function(){
          var el=document.getElementById('upbar');
          if(!el)throw new Error('找不到 #upbar');
          if(location.search.indexOf('expect_none')>=0){
            if(!el.hidden)throw new Error('版本一致却顶出了通知栏（误报）');
            return '不显示（版本一致）';
          }
          if(el.hidden)throw new Error('有新版本却没顶出通知栏');
          var items=el.querySelectorAll('.up-li'),txt=(el.textContent||'');
          if(!items.length)throw new Error('通知栏里一条更新要点都没列');
          if(txt.indexOf('9.9.9')<0)throw new Error('通知栏没写清新版版本号');
          var top=getComputedStyle(document.documentElement).getPropertyValue('--upH');
          if(!top||parseFloat(top)<10)throw new Error('--upH 没写进去，顶栏会被压住：'+top);
          if(!document.getElementById('upGo'))throw new Error('通知栏没有「立即刷新」按钮');
          return items.length+' 条要点 · --upH '+top.trim();});
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
