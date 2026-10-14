/* =========================================================
   启动
   ========================================================= */
function findSpawn(){
  const r=REGIONS[0];
  const [x,y,w,h]=r.rect;
  for(let dy=60;dy<h-60;dy+=40)
    for(let dx=60;dx<w-60;dx+=40)
      if(walkable(x+dx,y+dy))return {x:x+dx,y:y+dy};
  return {x:x+w/2,y:y+h/2};
}
function startGame(){
  if(!CUR)useWorld(ADV);
  /* 清档重开后回到玩家刚才所在的世界（一次性标记，读完即清） */
  try{
    const lm=localStorage.getItem('himath_lastmode');
    if(lm==='epic' &&CUR===ADV)useWorld(EPIC);
    if(lm==='blaze'&&CUR===ADV)useWorld(BLAZE);
    if(lm==='drill'&&CUR===ADV)useWorld(DRILL);
    localStorage.removeItem('himath_lastmode');
  }catch(e){}
  entInit();
  load();
  resize();
  /* 烽火地图是每局现生成的，必须先把地形和点位铺出来再 buildStatic，
     否则会在一张空地图上跑，人物掉进虚空。
     放在 resize() 之后：镜头归位要用到 SCALE，那时它才算好了。 */
  if(CUR===BLAZE)blazeEnter();
  buildStatic();
  if(!walkable(state.x,state.y)){
    const p=findSpawn();state.x=p.x;state.y=p.y;
  }
  const reg=currentRegion(state.x,state.y);
  state.region=reg?reg.id:REGIONS[0].id;
  updateHUD();
  $('btnSound').textContent=state.sound?'🔊':'🔇';
  syncModeButtons();
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  showBanner(WORLD_TITLE,WORLD_SUB);
  requestAnimationFrame(loop);
  /* 开场提醒今天有几道错题到期 —— 攒了不练等于没攒 */
  if(CUR!==EPIC)setTimeout(()=>{
    const n=wbDueList().length;
    if(n)toast('📕 今天有 '+n+' 道错题到期 · 点顶栏「错题」去复习');
  },2800);
  /* 练枪场是「面板驱动」的世界：恢复到这里就直接把练枪大厅端上来。
     存储读不了（预览沙箱）时首访说明也弹不出来，同样直接开大厅 */
  if(CUR===DRILL){
    let seen=true;
    try{seen=!!localStorage.getItem(SAVE_KEY_DRILL+'_intro');}catch(e){seen=true;}
    if(seen)setTimeout(()=>{if(!panelOpen())showDrill();},600);
  }
}
startGame();

/* =========================================================
   活动公告（173.2）
   —— 进场那张"活动弹窗"。只在没看过这个版本时弹，之后可从 ☰ 菜单再看。
      存不下的环境（预览沙箱）用内存标记兜底：同一次会话只弹一遍，
      免得刷新一下就又糊一脸。
   ========================================================= */
/* ⚠️ 发版必改：NEWS_VER 是公告的"已读位"。
   玩家看过一次就把它写进 localStorage，值不变就永远不再弹 ——
   每次更新内容后**必须**把这里改成新值（建议「v+日期」或「v+版本号」），
   否则新公告写了也发不出去。这个坑踩过一次：v173 一直没升，
   后面几版的公告全都弹不出来。 */
const NEWS_KEY='genji_news', NEWS_VER='v4.0.3-1013';
let NEWS_SEEN=false, NEWS_OPEN=false;
function newsSeen(){
  if(NEWS_SEEN)return true;
  try{return localStorage.getItem(NEWS_KEY)===NEWS_VER;}catch(e){return false;}
}
function markNewsSeen(){
  NEWS_SEEN=true;
  try{localStorage.setItem(NEWS_KEY,NEWS_VER);}catch(e){}
}
function newsIsOpen(){return NEWS_OPEN;}
function showNews(){
  const el=$('news');if(!el)return;
  if(el.classList.contains('show'))return;
  el.classList.add('show');NEWS_OPEN=true;
  try{SFX.unlock();}catch(e){}   // 上行琶音：这是"大事发生"的音，不是普通开面板
}
function hideNews(){
  const el=$('news');if(!el)return;
  el.classList.remove('show');NEWS_OPEN=false;
  markNewsSeen();
  try{SFX.tap();}catch(e){}
}
/* 一键全屏：桌面浏览器和安卓 Chrome 有效。
   iPhone 的 Safari 压根没有网页全屏 API，调用会失败 —— 返回 false，
   由调用方提示"从桌面图标打开"（那是 iOS 上唯一的全屏路径）。
   iframe 里（预览面板）也可能被 sandbox 拦下，catch 兜住不让它炸。 */
function newsFullscreen(){
  const d=document, el=d.documentElement;
  try{
    const cur=d.fullscreenElement||d.webkitFullscreenElement||d.msFullscreenElement;
    if(cur){
      const ex=d.exitFullscreen||d.webkitExitFullscreen||d.msExitFullscreen;
      if(ex){const p=ex.call(d);if(p&&p.catch)p.catch(()=>{});}
      return true;
    }
    const fn=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
    if(!fn)return false;
    const p=fn.call(el);
    if(p&&p.catch)p.catch(()=>{});
    return true;
  }catch(e){return false;}
}
function newsBind(){
  const el=$('news');if(!el)return;
  const close=()=>{hideNews();try{audioKick();}catch(e){}};
  const x=$('newsX'), ok=$('newsOk'), fs=$('newsFs');
  if(x)x.addEventListener('click',close);
  if(ok)ok.addEventListener('click',close);
  if(fs)fs.addEventListener('click',()=>{
    if(newsFullscreen())toast('已全屏 · 再点一次退出');
    else toast('这个浏览器不给网页全屏 —— 按下面的方法从桌面图标打开');
  });
  /* 只认 ✕ 和底部按钮：点遮罩、点卡片本身都不关。
     公告的作用就是"让你看见"，关掉它得是一个明确动作。 */
  el.addEventListener('click',e=>e.stopPropagation());
}
function newsBoot(){
  newsBind();
  if(newsSeen())return;
  const tryOpen=n=>{
    /* 玩家手快先开了别的面板，就别硬顶掉，等它读完再弹。
       最多等 ~4 秒还不行就放弃本次（别和玩家的操作抢屏幕）。 */
    if(n>7)return;
    if(modal.classList.contains('show')){setTimeout(()=>tryOpen(n+1),500);return;}
    showNews();
  };
  setTimeout(()=>tryOpen(0),420);
}

/* 首次进入说明 */
let introWaitN=0;
function maybeIntro(delay){
  /* 活动公告优先：它还没被看掉时先别弹说明，否则两个弹窗挤在一起。
     等公告关掉（或被标记已读）再继续。等太久（约 20 秒）就放弃弹说明 ——
     那说明玩家正忙着，不该再拦一道。 */
  try{
    if($('news')&&(!newsSeen()||newsIsOpen())){
      if(++introWaitN<40)setTimeout(()=>maybeIntro(delay),500);
      return;
    }
  }catch(e){}
  try{if(localStorage.getItem(curKey+'_intro'))return;}catch(e){return;}
  setTimeout(()=>{
    /* 玩家已经在看别的面板就别硬顶掉（切模式后 600ms 才弹，手快的话会撞车） */
    if(modal.classList.contains('show'))return;
    /* intro 用 dataset.intro 而不是 lock：
       它只是"请先读一眼"，不是"题做到一半"，不该拦住切国度 / 切模式 */
    panel.dataset.intro='1';introShowing=true;

    openPanel(CUR===EPIC?epicIntroHtml():`
      <h2>${WORLD_TITLE}</h2>
      <div class="sub">${WORLD_SUB}</div>
      <div class="it-list"><div class="il">📐 <b style="color:#9db4ff">数理群岛</b> · 数学　⚡ <b style="color:#ffd76a">力理亚</b> · 物理</div><div class="il">🔥 <b style="color:#ffb072">嬗变利亚</b> · 化学　🌿 <b style="color:#84e3a6">生衍利亚</b> · 生物</div><div class="il"><span style="color:#9cc0e0;font-size:var(--fs-sm)">四个国度<b>各有一张独立地图</b>，各含 3~5 个域，共十四域、42 只精灵</span></div><div class="il">⛩️ <b>传送塔</b>：每域一座，走过去自动点亮，之后可在四国之间任意往返</div><div class="il">🕹️ <b>移动</b>：在地图上<b>任意位置按住拖动</b>，摇杆会出现在你的手指下</div><div class="il">🗿 <b>石碑</b>：靠近后点右下角按钮，答题换结晶</div><div class="il">✨ <b>精灵</b>：答对 2/3 题即可收服进图鉴（四国共 42 只，本国 ${SPIRITS.length} 只）</div><div class="il">🛡️ <b>守护者</b>：连答 5 道挑战题（错≤1）拿徽章、开桥</div><div class="il">💎 <b>结晶</b>：散落各处，走过去自动捡；商行可换道具</div><div class="il">📕 <b>错题中心</b>：答错的题自动收录，按熟炼度排复习日程 —— 到期就练，连对 5 次毕业</div><div class="il">📈 <b>三档难度</b>：普通 → 中档 → 高考，连对 2 题升档、错 2 题降档</div><div class="il">🆕 <b>新功能</b>（都在 ☰ 菜单）：🎯 每日一练 · 📊 学习报告 · 📐 公式速查 · 🔭 引路标 · 🌀 传送网络</div><div class="il">🌍 <b>换国度</b>：点顶部区域名，或走近 ⛩️ 传送塔，都能打开传送网络；四国<b>并列互不依赖</b>，任意时间都能前往任意一国（落在该国的出生域）</div><div class="il">🔀 <b>切模式</b>：顶部「📜 史诗」可去科学编年史（四科按时间混排），进度互不影响</div><div class="il">💾 <b>存档</b>：进度自动存在本机；换设备/清缓存前，先到「💾 存档」导出存档码</div></div>
      <div class="row"><button class="btn primary" id="go">开始冒险</button></div>
    `);
    introShowing=false;
    /* 无痕模式下 setItem 会抛异常，不兜住的话后面 audioKick() 就执行不到了 */
    $('go').onclick=()=>{
      closePanel();
      try{localStorage.setItem(curKey+'_intro','1');}catch(e){}
      audioKick();
    };
    },delay||700);
}
newsBoot();
maybeIntro(700);

