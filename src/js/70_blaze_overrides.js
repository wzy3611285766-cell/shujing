/* =========================================================
   🔥 烽火地带 · 收尾：辅助函数与其余覆盖
   ========================================================= */

/* =========================================================
   战术地图（🗺️）—— 整张战场的平面图
   三角洲行动里摊开的就是这么一张图：矩形战区、栅格坐标、分区地名、
   道路与桥、撤离点，以及"哪些箱子已经摸过"。
   底图直接用预渲染好的静态层（地形不会变），
   上面再叠一层会变的东西：玩家在哪、哪些箱子没搜、哪队人还活着。
   ========================================================= */
function showTacMap(){
  if(CUR!==BLAZE||!BZ.active||!BZ.map||!BZ.map.poly){toast('先部署一次，才有战场地图');return;}
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const poi=blazePoiAt(state.x,state.y);
  const gd=blazeGridOf(state.x,state.y);
  const left=BLAZE_SPOTS.filter(s=>s.t==='crate'&&!s.looted).length;
  openPanel(`
    <h2>🗺️ 战术地图</h2>
    <div class="sub">${esc(site.emoji+' '+site.name)} · ${esc(diff.emoji+' '+diff.name)}
      · 📍 ${esc((poi?poi.n:'野地')+(gd?' '+gd:''))}</div>
    <canvas id="tacCv" style="width:100%;display:block;border-radius:14px;
      background:#070c12;border:1px solid rgba(255,255,255,.14)"></canvas>
    <div style="font-size:var(--fs-xs);color:#9cc0e0;line-height:var(--lh-loose);margin-top:10px;text-align:center">
      🚁 撤离点　📦 未搜的箱子　🔐 保险箱　🔒 上锁门　👾 巡逻队　💂 守卫<br>
      🔵 你现在的位置　·　📦 ${left} 个箱子没搜 · 🎒 ${blazeBagUsed()}/${blazeBagCap()}
    </div>
    <div class="row">
      <button class="btn primary" id="ok">关闭</button>
    </div>`);
  const cv=$('tacCv');
  if(cv)drawTacMap(cv);
  const ok=$('ok');if(ok)ok.onclick=closePanel;
}
function drawTacMap(cv){
  const g=(BZ.map&&BZ.map.grid)||{x:0,y:0,w:W,h:H,cols:8,rows:6,cw:W/8,ch:H/6};
  const pad=Math.max(g.w,g.h)*0.07;
  const bx=g.x-pad, by=g.y-pad, bw=g.w+pad*2, bh=g.h+pad*2;
  const cssW=Math.max(200,cv.clientWidth||320);
  const cssH=Math.round(cssW*bh/bw);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
  cv.style.height=cssH+'px';
  const c=cv.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);
  const s=cssW/bw, X=x=>(x-bx)*s, Y=y=>(y-by)*s;

  /* ① 底图：地形是预渲染好的静态层，缩放贴上去即可 */
  c.fillStyle='#070c12';c.fillRect(0,0,cssW,cssH);
  if(staticLayer)c.drawImage(staticLayer,bx,by,bw,bh,0,0,cssW,cssH);
  c.fillStyle='rgba(4,12,24,.34)';c.fillRect(0,0,cssW,cssH);

  /* ② 栅格与坐标：静态层上那一版是按世界尺寸画的，缩到面板里看不清，这里重画 */
  c.save();
  c.strokeStyle='rgba(160,205,255,.22)';c.lineWidth=1;
  for(let i=0;i<=g.cols;i++){
    const x=X(g.x+g.cw*i);c.beginPath();c.moveTo(x,Y(g.y));c.lineTo(x,Y(g.y+g.h));c.stroke();
  }
  for(let i=0;i<=g.rows;i++){
    const y=Y(g.y+g.ch*i);c.beginPath();c.moveTo(X(g.x),y);c.lineTo(X(g.x+g.w),y);c.stroke();
  }
  c.font='bold 11px system-ui,-apple-system,sans-serif';
  c.fillStyle='rgba(190,220,255,.72)';
  c.textAlign='center';c.textBaseline='middle';
  for(let i=0;i<g.cols;i++)c.fillText(String.fromCharCode(65+i),X(g.x+g.cw*(i+.5)),Y(g.y)-9);
  c.textAlign='right';
  for(let i=0;i<g.rows;i++)c.fillText(String(i+1),X(g.x)-6,Y(g.y+g.ch*(i+.5)));
  c.restore();

  /* ③ 分区：虚线圈 + 地名（高价值区用金色） */
  (BZ.map.pois||[]).forEach(p=>{
    const hot=p.hot>=3;
    c.save();
    c.setLineDash([5,4]);c.lineWidth=1.4;
    c.strokeStyle=hot?'rgba(255,215,106,.85)':'rgba(200,225,255,.55)';
    c.beginPath();c.arc(X(p.x),Y(p.y),p.r*s,0,7);c.stroke();
    c.setLineDash([]);
    const txt=p.e+' '+p.n, tx=X(p.x), ty=Y(p.y)-p.r*s*0.62;
    c.font='bold 12px system-ui,-apple-system,sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    const w=c.measureText(txt).width+12, h=18;
    c.fillStyle='rgba(6,14,24,.72)';roundRect(c,tx-w/2,ty-h/2,w,h,9);c.fill();
    c.strokeStyle=hot?'rgba(255,215,106,.7)':'rgba(255,255,255,.25)';
    c.lineWidth=1;roundRect(c,tx-w/2,ty-h/2,w,h,9);c.stroke();
    c.fillStyle=hot?'#ffd76a':'#eaf4ff';c.fillText(txt,tx,ty+.5);
    c.restore();
  });

  /* ④ 点位：只画"还用得上"的 —— 搜过的箱子、打死的巡逻队不再占注意力 */
  c.font='bold 13px system-ui,-apple-system,sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  function mark(x,y,emoji,col,r){
    const px=X(x),py=Y(y);
    c.fillStyle='rgba(6,14,24,.72)';c.beginPath();c.arc(px,py,r,0,7);c.fill();
    c.strokeStyle=col;c.lineWidth=1.6;c.stroke();
    c.fillText(emoji,px,py+.5);
  }
  BLAZE_SPOTS.forEach(sp=>{
    if(sp.t==='exfil')                   mark(sp.x,sp.y,'🚁','#5ed6ff',11);
    else if(sp.t==='crate'&&!sp.looted)  mark(sp.x,sp.y,'📦','#ffd76a',9);
    else if(sp.t==='vault'&&!sp.looted)  mark(sp.x,sp.y,sp.big>1?'💠':'🔐','#ffb43d',11);
    else if(sp.t==='door'&&!sp.opened)   mark(sp.x,sp.y,'🔒','#d9c6ff',10);
    else if(sp.t==='patrol'&&!sp.dead)   mark(sp.x,sp.y,'👾','#ff6b6b',10);
    else if(sp.t==='guard'&&!sp.dead)    mark(sp.x,sp.y,'💂','#ff8a5b',10);
  });
  c.fillStyle='rgba(255,215,106,.5)';
  BLAZE_LOOSE.forEach(o=>{
    if(o.got)return;
    c.beginPath();c.arc(X(o.x),Y(o.y),2.6,0,7);c.fill();
  });

  /* ⑤ 玩家 + 当前格 + 比例尺 */
  const px=X(state.x),py=Y(state.y);
  c.save();
  c.fillStyle='rgba(94,214,255,.22)';c.beginPath();c.arc(px,py,17,0,7);c.fill();
  c.strokeStyle='#5ed6ff';c.lineWidth=2.2;c.beginPath();c.arc(px,py,10,0,7);c.stroke();
  c.fillStyle='#5ed6ff';c.beginPath();c.arc(px,py,4.5,0,7);c.fill();
  c.restore();
  const gd=blazeGridOf(state.x,state.y);
  if(gd){
    c.font='bold 12px system-ui,-apple-system,sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    const w=c.measureText(gd).width+12;
    c.fillStyle='rgba(6,14,24,.85)';roundRect(c,px-w/2,py+15,w,17,8);c.fill();
    c.strokeStyle='rgba(94,214,255,.8)';c.lineWidth=1;roundRect(c,px-w/2,py+15,w,17,8);c.stroke();
    c.fillStyle='#9fe4ff';c.fillText(gd,px,py+23.5);
  }
  const barM=300, barPx=barM/BZ_M_PER_UNIT*s;
  c.fillStyle='rgba(255,255,255,.65)';
  c.fillRect(12,cssH-20,barPx,3);
  c.fillRect(12,cssH-24,2,11);c.fillRect(10+barPx,cssH-24,2,11);
  c.font='bold 11px system-ui,-apple-system,sans-serif';
  c.textAlign='left';c.textBaseline='alphabetic';
  c.fillStyle='rgba(255,255,255,.65)';c.fillText(barM+' m',14+barPx,cssH-16);
}

/* 镜头归位。SCALE 还没算出来（0）时不能直接算，否则会得到 NaN，
   镜头一旦变成 NaN，之后每帧的插值都救不回来，整张图会消失。 */
function blazeCamTo(x,y){
  if(!(SCALE>0)||!isFinite(SCALE)||!isFinite(VW)||!isFinite(VH))return;
  cam.x=clamp(x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
}

/* 局内存档是手改过或跨版本留下的，字段可能缺胳膊少腿，
   恢复前逐个校验一遍，坏掉的就退回安全值 */
function blazeHealRun(r){
  const io2=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!io2(r))return null;
  if(!BLAZE_SITE_OF[r.site])r.site='math';
  r.diff=clamp(parseInt(r.diff,10)||1,1,3);
  r.loot=Math.max(0,parseInt(r.loot,10)||0);
  r.sig=parseInt(r.sig,10);if(!isFinite(r.sig))r.sig=1;
  r.sigMax=Math.max(1,parseInt(r.sigMax,10)||1);
  r.waves=clamp(parseInt(r.waves,10)||1,1,3);
  r.opened=Math.max(0,parseInt(r.opened,10)||0);
  r.killed=Math.max(0,parseInt(r.killed,10)||0);
  if(!io2(r.gear))r.gear={};
  BLAZE_GEAR.forEach(it=>{
    const n=parseInt(r.gear[it.id],10);
    r.gear[it.id]=(isFinite(n)&&n>0)?n:0;      // 房卡可以带不止一张
  });
  if(!Array.isArray(r.bag))r.bag=[];
  else r.bag=r.bag.filter(L=>L&&typeof L.n==='string'&&isFinite(L.val))
             .map(L=>{const df=lootDef(String(L.n));
               return {n:String(L.n),e:String(L.e||'📦'),
                       r:clamp(parseInt(L.r,10)||0,0,RARITY.length-1),
                       val:Math.max(0,Math.round(L.val)||0),
                       slot:Math.max(1,(L.slot|0)||(df&&df.slot)||1),
                       cat:String(L.cat||(df&&df.cat)||''),
                       nt:(L.nt||(df&&df.nt))?1:0};});
  r.medkitUsed=!!r.medkitUsed;
  /* 跑刀局与已交的行动经费：刷新页面回来不能把「这一局是跑刀」忘了，
     不然阵亡时又会按正经局给保底，估值也不打折 */
  r.naked=!!r.naked;
  r.fee=Math.max(0,parseInt(r.fee,10)||0);
  r.usedTicket=!!r.usedTicket;r.intelAid=!!r.intelAid;
  /* 地形：读不回来就当没有，blazeGenMap 会重新生成一片不规则战场 */
  if(!io2(r.map)||!Array.isArray(r.map.rooms))r.map=null;
  else{
    r.map.rooms=r.map.rooms.filter(o=>o&&isFinite(o.x)&&isFinite(o.y)&&o.w>60&&o.h>60)
      .map(o=>({x:o.x,y:o.y,w:o.w,h:o.h,vault:!!o.vault,lock:o.lock|0,opened:!!o.opened,
        cells:Array.isArray(o.cells)&&o.cells.length
          ?o.cells.filter(cc=>cc&&isFinite(cc.x)&&cc.w>40&&cc.h>40)
                  .map(cc=>({x:cc.x,y:cc.y,w:cc.w,h:cc.h}))
          :[{x:o.x,y:o.y,w:o.w,h:o.h}],
        doors:Array.isArray(o.doors)?o.doors.filter(d=>Array.isArray(d)&&d.length===4)
              .map(d=>d.map(Number)):[]}));
    r.map.poly=Array.isArray(r.map.poly)?r.map.poly.map(Number).filter(isFinite):[];
    if(r.map.poly.length<6)r.map.poly=null;
    r.map.rocks=Array.isArray(r.map.rocks)
      ?r.map.rocks.filter(k=>k&&isFinite(k.x)&&isFinite(k.y)&&k.r>6)
        .map(k=>({x:k.x,y:k.y,r:k.r,seed:k.seed|0||1}))
      :[];
    if(!r.map.rooms.length&&!r.map.poly)r.map=null;
  }
  if(!Array.isArray(r.spots))r.spots=null;
  if(!isFinite(r.x)||!isFinite(r.y)){r.x=0;r.y=0;}
  return r;
}

/* 清档：只清烽火这一边的进度，闯关和史诗原封不动 */
function resetBlazeState(){
  const snd=BLAZE_STATE.sound;
  Object.keys(BLAZE_STATE).forEach(k=>delete BLAZE_STATE[k]);
  Object.assign(BLAZE_STATE,blankBlaze());
  if(typeof snd==='boolean')BLAZE_STATE.sound=snd;
  BZ.active=false;BZ.phase='lobby';BZ.busy=false;
  BZ.loot=0;BZ.sig=0;BZ.sigMax=4;BZ.waves=1;BZ.opened=0;BZ.killed=0;BZ._sv=0;
  BZ.gear={};BZ.carry={};
  BLAZE_GEAR.forEach(it=>{BZ.gear[it.id]=0;BZ.carry[it.id]=0;});
}

/* =========================================================
   覆盖：☰ 菜单（三个模式各自的入口）
   ========================================================= */
function showMenu(){
  const ep=CUR===EPIC, bz=CUR===BLAZE, dr=CUR===DRILL;
  const head = bz?'烽火地带 · 搜打撤':(ep?'科学编年史 · 科学长河':(dr?'练枪场 · 压轴专训':'格物纪元 · 四国远征'));
  /* 三个世界列全，点哪个去哪个 —— 以前只能循环切换，
     在史诗模式想回闯关得点两次，很容易点错 */
  const worlds=[
    {w:ADV,  e:'⚔️', n:'闯关模式 · 四国远征', d:'走遍四国十四域，直接刷高考实题（不再走思路环节）'},
    {w:EPIC, e:'📜', n:'科学编年史',          d:'读数学、物理、化学、生物交织的科学史'},
    {w:BLAZE,e:'🔥', n:'烽火地带 · 搜打撤',   d:'搜刮 · 交火 · 撤离，战利品活着带出去才算数'},
    /* 练枪场在菜单里只有这一处入口（顶栏另有一颗常驻的 🎯 练枪）。
       以前世界列表和功能列表各列一条「练枪场」，一个菜单里两个同名入口。 */
    {w:DRILL,e:'🎯', n:'练枪场 · 压轴专训',   d:'高考压轴 + 思路详解 · 四科无限题'
      +((CUR===ADV||CUR===DRILL)&&drillTotal().n?' · 已练 '+drillTotal().n+' 题':'')}
  ];
  const wlist=worlds.map((x,i)=>{
    const cur=(x.w===CUR);
    return `<button class="menu-li" id="mw_${i}"${cur?' style="background:linear-gradient(180deg,rgba(255,215,106,.22),rgba(255,215,106,.10));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(255,215,106,.55),var(--gb-drop)"':''}>
      <span class="e">${x.e}</span>
      <span class="tx">${cur?'📍 ':'　'}${x.n}<div class="d">${x.d}</div></span></button>`;
  }).join('');
  const dE = bz?'🎖️':(ep?'📜':'📖');
  const dT = bz?'🎖️ 行动大厅':(ep?'📜 编年史（回顾全部篇章）':'📖 图鉴与徽章');
  const dD = bz?'选地点与难度、采购战备物资、部署行动'
            :(ep?'已读篇章 · 未读的可一键传送'
                :'精灵 '+SPIRITS.filter(v=>state.caught[v.id]).length+'/'+SPIRITS.length
                 +' 已收服 · 徽章 '+Object.keys(state.badges).length+'/'+REGIONS.length);
  const sndTxt=state.sound?'🔊 音效：开':'🔇 音效：关';
  /* 错题中心那一项的 HTML：有到期题时**排到菜单最上面**。
     原因见 updateWbBadge 的注释 —— 顶栏 ☰ 顶着「4」，点开菜单却要
     滚动半屏才在功能列表里找到「错题中心」，红点照样是悬空的。
     有到期题就把它提到第一屏，这是当时最该处理的一件事。 */
  const dueN=wbDueList().length;
  const showWb=(!bz&&!ep);
  const mWbHtml=`<button class="menu-li${dueN?' pend-item':''}" id="mWb"><span class="e">📕</span>
        <span class="tx">📕 错题中心${dueN?`<span class="wb-dot">${dueN>99?'99+':dueN}</span>`:''}<div class="d">${dueN
          ?'🔥 今日待复习 '+dueN+' 题 · 直接点开练'
          :'本子 '+state.wrongBook.length+' 题 · 已掌握 '+(state.wrongDone||[]).length+' 题'}</div></span></button>`;

  openPanel(`
    <h2>☰ 菜单</h2>
    <div class="sub">${head}</div>
    ${showWb&&dueN?`<div class="menu-list" style="margin-bottom:12px">${mWbHtml}</div>`:''}
    <div class="sub" style="text-align:left;margin:2px 0 8px">切换世界（四个模式进度分开存）</div>
    <div class="menu-list" style="margin-bottom:14px">${wlist}</div>
    <div class="menu-list">
      <button class="menu-li" id="mDex"><span class="e">${dE}</span>
        <span class="tx">${dT}<div class="d">${dD}</div></span></button>
      ${!bz&&!ep&&!dr?`<button class="menu-li" id="mShop"><span class="e">🏪</span>
        <span class="tx">结晶商行<div class="d">启示灯 / 错题重练 / 专项训练</div></span></button>`:''}
      <button class="menu-li" id="mAid"><span class="e">⏳</span>
        <span class="tx">时空交易所<div class="d">${
          ep?'用时间星尘换支援券，带给烽火与闯关'
            :'用 📜 编年史的时间星尘换支援券：🎟️ 抵用券 · 🔑 钥匙卡 · 📟 情报 · 💡 启示灯'
          } · 手上 ${aidTotal()} 张</div></span></button>
      ${!bz&&!ep&&!dr?`<button class="menu-li" id="mDaily"><span class="e">🎯</span>
        <span class="tx">每日一练<div class="d">${state.daily===todayStr()?'今天已完成 ✓ 明天刷新':'5 道跨域混合题 · 奖励 20 🪙'}</div></span></button>`:''}
      <button class="menu-li" id="mStudy"><span class="e">📚</span>
        <span class="tx">自习室<div class="d">不知道该练哪块？按薄弱程度替你排好了 · 打开就能学</div></span></button>
      <button class="menu-li" id="mLadder"><span class="e">🧗</span>
        <span class="tx">母题阶梯<div class="d">${ladderList(null).length} 个课本模型 · 母题 → 变式 → 出其不意，三级按顺序连刷</div></span></button>
      ${!bz&&!ep?`<button class="menu-li" id="mReport"><span class="e">📊</span>
        <span class="tx">学习报告<div class="d">各域 / 各知识点正确率，找出该补哪里</div></span></button>`:''}
      ${showWb&&!dueN?mWbHtml:''}
      ${!bz?`<button class="menu-li" id="mFormula"><span class="e">📐</span>
        <span class="tx">公式速查<div class="d">十四个域的核心公式，考前扫一眼</div></span></button>`:''}
      ${bz?`<button class="menu-li" id="mTac"><span class="e">🗺️</span>
        <span class="tx">战术地图<div class="d">整张战场平面图：分区 · 道路 · 撤离点 · 搜刮进度</div></span></button>`:''}
      ${bz?`<button class="menu-li" id="mClean"><span class="e">🎛️</span>
        <span class="tx">战场底纹：${BZ_CLEAN?'简洁':'完整'}<div class="d">${BZ_CLEAN
          ?'扫描线 / 密网格 / 栅格坐标已收起，地形和点位更清楚'
          :'扫描线 + 战术网格 + 栅格坐标全开，氛围更足也更花'}</div></span></button>`:''}
      ${IS_PC?`<button class="menu-li" id="mKeys"><span class="e">⌨️</span>
        <span class="tx">电脑端键位<div class="d">WASD 移动 · Shift 疾跑 · 点地图走过去 · E 互动 · 1~4 选选项</div></span></button>`:''}
      ${!bz&&!ep&&!dr?`<button class="menu-li" id="mTeleport"><span class="e">🌀</span>
        <span class="tx">传送阵<div class="d">四国并列，随时可去任意一国 · 也能跳到该国已点亮的传送塔</div></span></button>`:''}
      <button class="menu-li" id="mGoal"><span class="e">🎯</span>
        <span class="tx">当前目标<div class="d">把任务条重新叫出来</div></span></button>
      <button class="menu-li" id="mAcct"><span class="e">☁️</span>
        <span class="tx">账号与同步<div class="d">${acctMenuDesc()}</div></span></button>
      <button class="menu-li" id="mSave"><span class="e">💾</span>
        <span class="tx">存档管理<div class="d">导出 / 导入存档码 · 清档重开</div></span></button>
      <button class="menu-li" id="mNews"><span class="e">📣</span>
        <span class="tx">更新公告<div class="d">练枪入口合一 · 旧版会提醒刷新 · 一键全屏怎么开</div></span></button>
      <button class="menu-li" id="mSound"><span class="e">${state.sound?'🔊':'🔇'}</span>
        <span class="tx">${sndTxt}<div class="d">答题与拾取的提示音</div></span></button>
    </div>
    <div class="row"><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  worlds.forEach((x,i)=>{
    const b=$('mw_'+i);
    if(b)b.onclick=()=>{
      audioKick();
      if(x.w===CUR){closePanel();return;}
      closePanel();switchTo(x.w);
    };
  });
  $('mDex').onclick  =()=>{closePanel();audioKick();bz?showBlazeLobby():(ep?showChronicle():showDex());};
  const ms=$('mShop');
  /* 商行按钮在史诗下会变成交易所，这里直接调函数，别绕 btnShop 的分派 */
  if(ms)ms.onclick  =()=>{closePanel();audioKick();showShop();};
  const ma=$('mAid');
  if(ma)ma.onclick  =()=>{closePanel();audioKick();showAidShop();};
  const md=$('mDaily'),mr=$('mReport'),mf=$('mFormula'),mt=$('mTeleport');
  const mst=$('mStudy');
  if(mst)mst.onclick=()=>{closePanel();audioKick();showStudyRoom();};
  const mld=$('mLadder');
  if(mld)mld.onclick=()=>{closePanel();audioKick();showLadder();};
  if(md)md.onclick  =()=>{closePanel();audioKick();showDaily();};
  if(mr)mr.onclick  =()=>{closePanel();audioKick();showReport();};
  const mw=$('mWb');
  if(mw)mw.onclick  =()=>{closePanel();audioKick();showWrongBook();};
  if(mf)mf.onclick  =()=>{closePanel();audioKick();showFormula();};
  const mtac=$('mTac');
  if(mtac)mtac.onclick=()=>{closePanel();audioKick();showTacMap();};
  const mcl=$('mClean');
  if(mcl)mcl.onclick=()=>{audioKick();setBzClean(!BZ_CLEAN);closePanel();setTimeout(showMenu,60);};
  if(mt)mt.onclick  =()=>{closePanel();audioKick();showTeleport();};
  const mk=$('mKeys');
  if(mk)mk.onclick  =()=>{closePanel();audioKick();showKeyHelp();};
  $('mGoal').onclick =()=>{closePanel();flashQuest(true);};
  $('mSave').onclick =()=>{closePanel();audioKick();showSavePanel();};
  $('mAcct').onclick =()=>{closePanel();audioKick();showAccountPanel();};
  const mn=$('mNews');
  /* 从菜单看公告不标记"已读"以外的东西：它和进场弹的是同一个，
     看完照样记成看过（下次进场不再自动弹） */
  if(mn)mn.onclick=()=>{closePanel();audioKick();setTimeout(showNews,90);};
  $('mSound').onclick=()=>{closePanel();$('btnSound').onclick();setTimeout(showMenu,60);};
}

/* =========================================================
   覆盖：存档面板的进度摘要
   ========================================================= */
function saveSummary(){
  if(CUR===DRILL){
    const tt=drillTotal();
    return `🎯 练枪场 · 独立进度<br>`+
           `📝 累计练 ${tt.n|0} 题 · 命中 ${pctOf(tt.p)}（四科合计）<br>`+
           `📕 错题本 ${(state.wrongBook||[]).length} 题 · 今日待复习 ${wbDueList().length} 题`;
  }
  if(CUR===BLAZE){
    const st=BLAZE_STATE.bstat||{};
    return `🔥 烽火地带 · 仓库 🪙 ${BLAZE_STATE.crystals|0}<br>`+
           `🚁 撤离 ${st.exfil|0} 次 · 💀 阵亡 ${st.wipe|0} 次 · 🏆 单次最高 ${st.best|0}<br>`+
           `📦 累计带回 ${st.loot|0} · 答对 ${BLAZE_STATE.totalRight|0} / 答错 ${BLAZE_STATE.totalWrong|0}`+
           (BZ.active?'<br><span style="color:#ffd76a">⚠️ 有一场行动正在进行中</span>':'');
  }
  if(CUR===EPIC){
    const tot=EPIC_SPOTS.length,rd=EPIC_SPOTS.filter(s=>state.read[s.sid]).length;
    const qz=Object.keys(state.quiz||{}).length;
    const bd=Object.keys(state.badges||{}).length;
    const ep=EPOCHS.find(r=>r.id===state.region)||EPOCHS[0];
    return `📍 ${ep.name} · ✨ ${state.crystals} 星尘 · 🎖️ ${bd}/${EPOCHS.length} 纪元章<br>`+
           `📜 已读 ${rd}/${tot} 篇 · 时空考题通过 ${qz} 道 · 答对 ${state.totalRight} / 答错 ${state.totalWrong}`;
  }
  const got=SPIRITS.filter(s=>state.caught[s.id]).length;
  const allReg=NATIONS.reduce((a,n)=>a.concat(n.regions),[]);
  const bd=allReg.filter(r=>state.badges[r.id]).length;
  const bdHere=REGIONS.filter(r=>state.badges[r.id]).length;
  const reg=REGIONS.find(r=>r.id===state.region)||REGIONS[0];
  return `📍 ${reg.name} · 🪙 ${state.crystals} 结晶 · 🏅 ${bd}/${allReg.length} 徽章（本国 ${bdHere}/${REGIONS.length}）<br>`+
         `✨ ${got}/${SPIRITS.length} 精灵 · 答对 ${state.totalRight} / 答错 ${state.totalWrong} · 错题本 ${state.wrongBook.length} / ${WRONG_CAP} 题<br>`+
         `🎯 每日一练连续 ${state.dailyStreak||0} 天${state.daily?'（'+esc(state.daily)+' 已完成）':''}`;
}

