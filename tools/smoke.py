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
        [{prog:10,cp:99,mine:99999,savedAt:99998,applied:0,dirty:true},'push','本机有新改动'],
        /* 4.0.24：两台都在玩、进度半斤八两却对不上 → 必须问，不许静默覆盖 */
        [{prog:40,cp:55,mine:5000,savedAt:4000,applied:0},'ask','两台都在玩·进度对不上 → 问一句'],
        [{prog:40,cp:55,mine:5000,savedAt:4000,applied:4000},'none','同一份云端问过就不再问'],
        [{prog:8,cp:60,mine:1000,savedAt:90000,applied:0},'apply','本机明显落后（新设备）→ 直接取回，别弹框']
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
    /* 时长文案与计时（4.0.28）
       云存档面板改成显示"玩了多久"（原来印内部加权分，没人看得懂）。 */
    out.checks.时长文案 = safe('playtext',function(){
      if(typeof playText!=='function'||typeof playMs!=='function'||typeof playAdd!=='function')
        throw new Error('没有 playText()/playMs()/playAdd()');
      const a=playText(30000), b=playText(12*60000), c=playText(3*3600000+12*60000);
      if(a!=='不到 1 分钟')throw new Error('30 秒应显示「不到 1 分钟」，实得：'+a);
      if(b!=='12 分钟')throw new Error('12 分钟不对：'+b);
      if(c!=='3 小时 12 分')throw new Error('3 小时 12 分不对：'+c);
      /* 落盘 + 单次封顶 */
      const keep=localStorage.getItem(PLAY_KEY);
      try{
        localStorage.setItem(PLAY_KEY,'0');
        playAdd(65000);
        if(playMs()!==65000)throw new Error('playAdd 没落盘：'+playMs());
        playAdd(600000);                       /* 一次灌 10 分钟 → 只算 90 秒 */
        if(playMs()!==65000+90000)throw new Error('单次增量没封顶：'+playMs());
      }finally{
        try{
          if(keep==null)localStorage.removeItem(PLAY_KEY);
          else localStorage.setItem(PLAY_KEY,keep);
        }catch(e){}
      }
      return '不到 1 分钟 / 12 分钟 / 3 小时 12 分 · 单次累加封顶 90 秒';});
    /* 阵亡结算不能把"保住的"算成"丢失"（4.0.25）
       玩家实测：带了 📄 行动保险，东西确实保住了，但结算页写"丢失 N 件"——
       因为那一行用的是**整个背包**的数量与估值。
       这里钉的是恒等式：丢失 + 保住 = 背包总数，且保住的必须真的进了仓库。 */
    out.checks.阵亡结算不误报 = safe('finish',function(){
      useWorld(BLAZE);
      const keepStash=JSON.stringify(BLAZE_STATE.stash||{});
      const keepBag=BZ.bag;
      let lost=-1,keptN=-1,txt='';
      try{
        BLAZE_STATE.pick={site:'math',diff:1};
        BZ.active=true;BZ.site='math';BZ.diff=1;BZ.carry={};
        BZ.gear={battery:0,bag:0,ins:1,key:0,scan:0,medkit:0,luck:0};
        BZ.opened=0;BZ.killed=0;BZ.cards=0;BZ.fee=0;BZ.naked=false;BZ.usedTicket=false;
        BZ.bag=[{n:'__t1__',e:'🅰️',r:1,val:500,slot:1},
                {n:'__t2__',e:'🅱️',r:1,val:400,slot:1},
                {n:'__t3__',e:'🅲',r:0,val:100,slot:1},
                {n:'__t4__',e:'🅳',r:0,val:80,slot:1},
                {n:'__t5__',e:'🅴',r:0,val:60,slot:1}];
        blazeFinish(false,'冒烟');
        txt=String(panel.textContent||'');
        const a=txt.match(/丢失\s*(\d+)\s*件/), b=txt.match(/保住了\s*(\d+)\s*件/);
        lost=a?+a[1]:-1;keptN=b?+b[1]:0;
      }finally{
        closePanel();
        try{BLAZE_STATE.stash=JSON.parse(keepStash);}catch(e){}
        BZ.bag=keepBag||[];BZ.active=false;BLAZE_STATE.run=null;
        try{blazeToLobby(true);}catch(e){}
        useWorld(ADV);syncModeButtons();
      }
      if(keptN<=0)throw new Error('带了行动保险却没保住任何东西（应当保住 2 件）');
      if(lost+keptN!==5)
        throw new Error('5 件阵亡：结算说丢失 '+lost+' 件、保住 '+keptN+' 件，加起来不等于 5');
      return '5 件 + 📄行动保险 → 丢失 '+lost+' 件 / 保住 '+keptN+' 件（恒等）';});
    /* 撤离信标删干净（4.0.24）：玩家说"没用，删掉"。
       它本来是真加撤离点的（nEx=diff.exfils+(gear.beacon?1:0)），
       但多一个撤离点在图上几乎看不出来 —— 与其留着占一个购买位，不如删。 */
    out.checks.撤离信标已删 = safe('gear',function(){
      if(typeof BLAZE_GEAR!=='undefined'){
        const hit=[];
        for(let i=0;i<BLAZE_GEAR.length;i++){
          const g=BLAZE_GEAR[i]||{};
          if(/beacon/i.test(String(g.id))||/信标/.test(String(g.n)))hit.push(g.n);
        }
        if(hit.length)throw new Error('战备采购里还有信标：'+hit.join('/'));
      }
      return '战备清单里已无信标 · 撤离点只由难度决定';});
    /* 默认进场 = 烽火 + 每日复习闸（4.0.22）
       —— 两条都是产品决定（"先复习完才能开新局""第一屏给搜打撤"），
          改起来都只有几行，被重构悄悄弄丢也不会有人发现，所以钉死。
       闸门只拦"开新局"（blazeDeploy），不拦整个游戏 —— 这条也要钉：
       否则以后有人把 reviewNeed 塞进 draw 或 update，整个游戏就卡在复习页出不来。 */
    out.checks.默认烽火与复习闸 = safe('boot2',function(){
      if(typeof bootWorld!=='function')throw new Error('没有 bootWorld()');
      if(bootWorld(null)!==BLAZE)throw new Error('全新玩家没有默认进烽火');
      if(bootWorld('adv')!==ADV)throw new Error('清档标记 adv 没生效（应当还能回到闯关）');
      if(typeof reviewNeed!=='function'||typeof reviewGate!=='function')
        throw new Error('没有 reviewNeed()/reviewGate()');
      const keepDay=localStorage.getItem('himath_review_day');
      const keepBook=JSON.stringify(state.wrongBook||[]);
      let r={ok:false};
      try{
        try{localStorage.removeItem('himath_review_day');}catch(e){}
        /* 造一道"早就到期"的错题。注意造在 ADV_STATE 上 —— 错题本是全局的（wbShare） */
        useWorld(ADV);
        state.wrongBook=[{text:'__smoke_due__',ans:'1',exp:'x',opts:['1','2'],
          rid:'func',due:'2000-01-01',box:0}];
        if(typeof wbShare==='function')wbShare();
        r.need=reviewNeed();
        useWorld(BLAZE);
        /* 切到烽火之后，"到期题"必须还在（这就是 wbShare 存在的理由） */
        r.needInBlaze=reviewNeed();
        BLAZE_STATE.naked=true;                /* 免票：别让战备值挡在前面 */
        BLAZE_STATE.pick={site:'math',diff:1};
        BZ.carry={};BZ.active=false;
        r.blocked=blazeDeploy();
        r.entered=!!BZ.active;
        closePanel();                          /* reviewGate 会弹一个面板 */
        reviewMarkDone();
        r.after=reviewNeed();
        try{
          r.need2=reviewNeed();
          /* 注意：blazeDeploy() 成功时不返回 true（没有 return），
             所以判据只能看 BZ.active，别拿返回值当成功标志。 */
          blazeDeploy();r.entered2=!!BZ.active;
        }
        catch(err2){r.err2=String(err2).slice(0,140);r.entered2=!!BZ.active;}
      }finally{
        /* 复原：错题本是共享数组，必须把**四个世界**都指回干净的那份，
           否则伪造的 __smoke_due__ 会被后面的检查看到。 */
        try{
          var clean=JSON.parse(keepBook);
          useWorld(ADV);
          state.wrongBook=clean;
          [ADV_STATE,EPIC_STATE,BLAZE_STATE,DRILL_STATE].forEach(function(o){
            if(o)o.wrongBook=clean;
          });
        }catch(e){}
        try{
          if(keepDay==null)localStorage.removeItem('himath_review_day');
          else localStorage.setItem('himath_review_day',keepDay);
        }catch(e){}
        BZ.active=false;BLAZE_STATE.run=null;
        try{blazeToLobby(true);}catch(e){}
        useWorld(ADV);syncModeButtons();closePanel();
      }
      if(!(r.need>0))throw new Error('造了到期错题，reviewNeed() 还是 0');
      if(!(r.needInBlaze>0))throw new Error('切到烽火后到期题就丢了（错题本没全局共享）');
      if(r.blocked!==false||r.entered)throw new Error('有到期错题时居然能部署入局');
      if(r.after!==0)throw new Error('标记复习完之后 reviewNeed() 还是 '+r.after);
      if(!r.entered2)throw new Error('复习完之后还是开不了新局'+(r.err2?('：'+r.err2):('｜need='+r.need2)));
      return '默认进场=烽火（清档标记可覆盖）· 错题本全局共享 · 有到期题时部署被拦 · 复习完自动放行';});
    /* 首屏顺序 + 帧率角标（4.0.20）：两条都是玩家直接提的要求，
       而且都属于"被以后的重构悄悄弄丢"的类型。
       ① 一点开先弹**更新公告**（新玩家也一样，不再先塞闯关说明）；
       ② 右上角帧率角标**默认开**，手动关过的人保持关。 */
    out.checks.首屏顺序 = safe('boot',function(){
      if(typeof fpsBadgeOn!=='function'||typeof setFpsBadge!=='function')
        throw new Error('没有 fpsBadgeOn()/setFpsBadge()');
      if(typeof newsBoot!=='function')throw new Error('没有 newsBoot()');
      /* ② 角标：清掉记录 → 默认必须是开；关掉之后必须是关 */
      const hadFps=localStorage.getItem(FPS_KEY);
      try{localStorage.removeItem(FPS_KEY);}catch(e){}
      const defOn=fpsBadgeOn();
      setFpsBadge(false);
      const afterOff=fpsBadgeOn();
      try{localStorage.removeItem(FPS_KEY);}catch(e){}   // 复原成"从没设过"
      setFpsBadge(true);
      const el=document.getElementById('fps');
      if(!defOn)throw new Error('帧率角标默认是关的（应当默认开）');
      if(afterOff)throw new Error('手动关掉之后 fpsBadgeOn() 还是返回开');
      if(!el)throw new Error('默认开的时候右上角没有 #fps 元素');
      /* ① 公告优先：newsBoot 里不许再把公告"静默记成已读"。
         它那个 420ms 的定时器是异步的，同步单测没法等它 ——
         所以直接钉住那条规则：函数体里不该出现 markNewsSeen。
         （4.0.9 加过一条"全新玩家先看教学、公告记成已读"，玩家反馈很直接：
           一点开先被塞闯关介绍，公告看不到。4.0.20 删掉了。） */
      const src=String(newsBoot);
      if(src.indexOf('markNewsSeen')>=0)
        throw new Error('newsBoot 里又把公告记成已读了（玩家会先看到说明、看不到公告）');
      if(typeof fpsBadgeApply!=='function')throw new Error('没有 fpsBadgeApply()');
      if(hadFps!==null)fpsBadgeApply();                  // 复原别人留下的设置
      return '公告优先（newsBoot 不再静默标已读）· 帧率角标默认开 · 关掉能记住';});
    /* 画质档（4.0.16 建，4.0.17 收窄并转正）：
       平板掉帧的两大来源是 ① 压在地图上的 backdrop-filter 每帧重算、
       ② 2400×1900 的地形图层每帧被合成器重采样（后者是 1850 万像素的活儿）。
       4.0.17 起这两样**默认就是关的**：地形改成主线程贴离屏画布（1.3ms），
       压在 HUD 上的毛玻璃换成同色底；省电档只剩"连面板毛玻璃也关掉"。
       这条钉住的就是这个架构 —— 谁把地形层加回 DOM、或给 HUD 加回毛玻璃，
       实机上就是 60fps 掉回 30fps，而主线程那 0.5ms 的耗时**完全看不出来**
       （tools/perf.py 消融才是第一现场）。 */
    out.checks.画质档 = safe('perf',function(){
      if(typeof setPerfLite!=='function')throw new Error('没有 setPerfLite()');
      if(typeof PERF!=='object')throw new Error('没有 PERF');
      useWorld(ADV);syncModeButtons();closePanel();
      /* ① 地形层不许回到 DOM 里（回来就等于每帧重采样 4.56MP） */
      if(document.getElementById('bg'))
        throw new Error('地形层又回到 DOM 里了；它必须离屏、只由主线程贴图');
      if(!staticLayer)throw new Error('没有 staticLayer');
      if(staticLayer.parentNode)throw new Error('staticLayer 挂在 DOM 上了，应当在离屏画布上');
      /* ② 压在地图上的 HUD 一律不许有毛玻璃 */
      const huds=['regionChip','quest','moveHint'].filter(function(id){
        const el=document.getElementById(id);if(!el)return false;
        const bf=String(getComputedStyle(el).backdropFilter||'none');
        return bf.indexOf('none')<0;});
      if(huds.length)throw new Error('这些 HUD 还带毛玻璃（每帧跟着地图重算）：'+huds.join('/'));
      /* ③ 现在**整站零 backdrop-filter**（4.0.19）。
         面板那层也曾留着，理由是"地图停画、模糊只算一次"—— 实测推翻了：
         面板一滚动就要重新合成整屏模糊，40 行列表 p50 100ms → 去掉 16.7ms。
         所以这条检查升级成"谁把毛玻璃加回来就红"。 */
      const zones='#upbar,#topbar *,#quest,#pcHint,#moveHint,#modal,#news';
      const blurred=[];
      document.querySelectorAll(zones).forEach(function(el){
        const bf=String(getComputedStyle(el).backdropFilter||'none');
        if(bf.indexOf('none')<0)blurred.push(el.id||el.className||el.tagName);
      });
      /* 面板内部也要查（要先把面板打开，元素才存在） */
      showMenu();
      document.querySelectorAll('#panel *').forEach(function(el){
        const bf=String(getComputedStyle(el).backdropFilter||'none');
        if(bf.indexOf('none')<0)blurred.push(el.id||el.className||el.tagName);
      });
      /* ④ 流畅档 = 画布分辨率降一档（毛玻璃没了之后，这是它唯一做的事） */
      const px0=cv.width*cv.height;
      setPerfLite(true,'smoke');
      const onBody=document.body.classList.contains('perf-lite');
      const pxLite=cv.width*cv.height;
      /* 菜单要重开一次：那颗开关的标题是渲染时按档位写死的，不会自己变 */
      showMenu();
      const item=document.getElementById('mLite');
      const label=item?String(item.textContent).replace(/\s+/g,''):'';
      closePanel();
      setPerfLite(false,'smoke');
      const offBody=document.body.classList.contains('perf-lite');
      const px2=cv.width*cv.height;
      if(blurred.length)throw new Error('还有元素挂着毛玻璃（滚动时会每帧重算）：'+blurred.slice(0,4).join(' / '));
      if(!onBody)throw new Error('开了流畅档，body 上却没有 perf-lite');
      if(offBody)throw new Error('关掉流畅档后 class 没摘掉');
      if(!(pxLite<px0))throw new Error('流畅档没降分辨率：'+px0+' → '+pxLite);
      if(Math.abs(px2-px0)>px0*.05)throw new Error('切回完整档没恢复分辨率：'+px0+' → '+px2);
      if(label.indexOf('流畅')<0)throw new Error('☰ 菜单那颗开关没跟着显示「流畅」：'+label.slice(0,50));
      return '地形层已离屏 · 整站零毛玻璃 · 流畅档 '+Math.round(px0/1e4)+'万→'+Math.round(pxLite/1e4)+'万像素 · ☰ 显示「画质：流畅」';});
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
            /* 【4.0.20 改】全新玩家也**先看公告**，关掉之后才轮到首访说明。
               旧规则是反的（4.0.9 定的"新玩家先看教学、公告记已读"），玩家反馈很直接。 */
            try{localStorage.removeItem(ikey);}catch(e){}
            Object.assign(state,blank);
            healState();
            newsEl.classList.remove('show');
            NEWS_SEEN=false;NEWS_OPEN=false;
            try{localStorage.removeItem(NEWS_KEY);}catch(e){}
            newsBoot();
            setTimeout(function(){
              r.newsForNew=newsEl.classList.contains('show');
              r.introToo=r.introShown=isIntro();        /* 公告开着时不该同时弹说明 */
              try{r.newsMarked=String(localStorage.getItem(NEWS_KEY)||'');}catch(e){r.newsMarked='';}
              try{hideNews();}catch(e){}
              maybeIntro(0);                            /* 关掉公告之后，说明才该出现 */
              setTimeout(function(){
                r.introAfterNews=isIntro();
                closePanel();
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
                  if(!r.newsForNew)throw new Error('全新玩家没有先看到「本次更新」公告（4.0.20 起公告永远第一）');
                  if(r.introToo)throw new Error('公告还开着就把首访说明弹出来了（两个弹窗一起糊脸）');
                  if(r.newsMarked)throw new Error('公告还没看就被记成已读了（玩家会再也看不到）');
                  if(!r.introAfterNews)throw new Error('关掉公告之后没弹首访说明');
                  return '公告永远第一 · 关掉后弹说明 · 点掉即写已读位 · 重开不再弹 · 老玩家不弹教学';});
                dump();
              },260);
            },600);
          },140);
        },140);
      },140);
    })();
    /* 烽火的错题必须进错题本（4.0.26）
       4.0.22 让四个模式共享了同一份错题本，但烽火的答错分支**压根没调 wbMiss** ——
       于是"每天先复习"永远复习不到战场上的错题，而战场恰恰是错得最多的地方。
       这里真答一题（点第一个选项，蒙对了就换一题），看它有没有进本。 */
    (function(){
      var tries=0,qt='',before=0;
      function cleanup(){
        try{
          [ADV_STATE,EPIC_STATE,BLAZE_STATE,DRILL_STATE].forEach(function(o){
            if(!o||!o.wrongBook)return;
            o.wrongBook=o.wrongBook.filter(function(w){return String(w.text)!==qt;});
          });
          if(typeof wbShare==='function')wbShare();
        }catch(e){}
      }
      function finish(ok,msg){
        cleanup();
        closePanel();useWorld(ADV);syncModeButtons();
        out.checks.烽火错题进本 = ok
          ? {ok:true,v:'战场答错一题后已进错题本（'+before+' → '+(before+1)+' 题）· 面板上也写了「已收进错题本」'}
          : {ok:false,e:msg||'没进本'};
        dump();
      }
      function attempt(){
        tries++;
        useWorld(BLAZE);
        before=(ADV_STATE.wrongBook||[]).length;
        try{blazeAsk({rid:'func',tier:1,title:'📦 冒烟',sub:'',tag:'',bar:'',
          nextText:'好',onDone:function(){}});}catch(e){}
        qt=String((panel.querySelector('.qtext')||{}).textContent||'');
        var os=panel.querySelectorAll('.opt');
        if(!os.length){finish(false,'题目没渲染出选项');return;}
        os[0].click();                       /* 可能是对是错，往下看反馈 */
        setTimeout(function(){
          var fb=document.getElementById('feedback');
          var wrong=fb&&fb.className==='no';
          if(!wrong){
            closePanel();
            if(tries<3)attempt();else finish(false,'连点 3 次都蒙对，测不下去');
            return;
          }
          var hit=(ADV_STATE.wrongBook||[]).some(function(w){return String(w.text)===qt;});
          finish(hit,hit?'':'答错了，但错题本里找不到这道题');
        },500);
      }
      setTimeout(attempt,1800);
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
