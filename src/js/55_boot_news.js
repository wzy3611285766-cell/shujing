/* =========================================================
   启动（定义层）
   —— startGame() 等 boot 函数只在这里**定义**，执行统一在末尾的
      80_boot.js：执行顺序 = 文件顺序，不再靠函数提升"倒着"调
      后置模块（69/70/80…）里的函数。build.py 有断言把这条焊死。
   ========================================================= */

/* 【4.0.22】默认进场改成**烽火**（原来一律进闯关）。
   产品理由（玩家定的）：闯关那套四国地图更接近"原神式"的探索，
   第一屏给"搜打撤"更接近"三角洲式"的一局 —— 选点 / 难度 / 战备 → 部署 → 拿东西走人。
   闯关没删，☰ 菜单里一键就能切。
   lm：清档重开时的一次性标记（见 34_engine_core.js 里写 himath_lastmode 那处），优先于默认。 */
function bootWorld(lm){
  if(lm==='epic')return EPIC;
  if(lm==='blaze')return BLAZE;
  if(lm==='drill')return DRILL;
  if(lm==='adv')return ADV;
  return BLAZE;                     // 没有标记（含全新玩家）→ 烽火
}
function startGame(){
  if(!CUR)useWorld(ADV);
  let lm=null;
  try{
    lm=localStorage.getItem('himath_lastmode');
    localStorage.removeItem('himath_lastmode');
  }catch(e){}
  if(CUR===ADV)useWorld(bootWorld(lm));
  entInit();
  load();
  /* 读档之后再并一次错题本（4.0.22）：四个世界各存各的，读回来的数组互不相干，
     这里按 text 去重合并，再让四个 state 重新指向同一份 —— 否则"只玩烽火"时
     ADV 那份存档落后，新错的题会在下次启动时被丢掉。 */
  if(typeof wbShare==='function')wbShare();
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
  try{$('btnSound').setAttribute('aria-pressed',state.sound?'true':'false');}catch(e){}
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

/* =========================================================
   活动公告（173.2）
   —— 进场那张"活动弹窗"。只在没看过这个版本时弹，之后可从 ☰ 菜单再看。
      存不下的环境（预览沙箱）用内存标记兜底：同一次会话只弹一遍，
      免得刷新一下就又糊一脸。
   ========================================================= */
/* NEWS_VER 是公告的"已读位"：玩家看过一次就写进 localStorage，值不变就不再弹。
   以前这里要手工改，改漏了公告就发不出去（v173 踩过一次）。
   现在由 tools/build.py 从 news.json 自动生成 —— 'v<版本>-<公告内容摘要>'，
   内容一改值必变，必重弹，不用再惦记这件事。 */
const NEWS_KEY='genji_news', NEWS_VER='__NEWS_VER__';
let NEWS_SEEN=false, NEWS_OPEN=false;
/* 没经过构建（在 src/ 上直接改着试）时占位符还在：退回按公告文本算个稳定值，
   至少保证"改了内容就会重弹"，不至于因为漏跑构建就永远看不到公告。 */
function newsVer(){
  if(NEWS_VER.indexOf('__')!==0)return NEWS_VER;
  const el=document.getElementById('news');
  const t=el?(el.textContent||'').replace(/\s+/g,''):'nodom';
  let h=5381;
  for(let i=0;i<t.length;i++)h=((h*33)^t.charCodeAt(i))>>>0;
  return 'raw-'+h.toString(36);
}
function newsSeen(){
  if(NEWS_SEEN)return true;
  try{return localStorage.getItem(NEWS_KEY)===newsVer();}catch(e){return false;}
}
function markNewsSeen(){
  NEWS_SEEN=true;
  try{localStorage.setItem(NEWS_KEY,newsVer());}catch(e){}
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
   iframe 里（预览面板）也可能被 sandbox 拦下，catch 兜住不让它炸。
   入口在 ☰ 菜单里那颗独立的「⛶ 全屏」（4.0.6 从公告卡片里搬出来的）。 */
function fullscreenOn(){
  const d=document;
  return !!(d.fullscreenElement||d.webkitFullscreenElement||d.msFullscreenElement);
}
function toggleFullscreen(){
  const d=document, el=d.documentElement;
  try{
    if(fullscreenOn()){
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
/* 全屏按钮的通用绑定：点一下切换，标题跟着变成"退出全屏 / 一键全屏"。
   公告卡里那颗（#newsFs）和顶部通知栏那颗（#upFs）共用这里 ——
   两处说法与行为必须一致，不然玩家会以为自己点错了东西。
   iPhone Safari 没有网页全屏 API：切换失败时给一条能走通的替代路径，
   而不是假装成功（旧版那颗按钮就是在这一点上糊弄过）。 */
function fsButtonBind(btn,onTxt,offTxt){
  if(!btn)return;
  const paint=()=>{btn.textContent=fullscreenOn()?(offTxt||'🗗 退出全屏'):(onTxt||'⛶ 一键全屏');};
  paint();
  ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>
    document.addEventListener(ev,paint));
  btn.onclick=()=>{
    const was=fullscreenOn();
    if(!toggleFullscreen()){
      toast('这个浏览器不给网页全屏 —— iOS 请从「添加到主屏幕」的图标进；电脑按 F11');
      return;
    }
    try{audioKick();}catch(e){}
    toast(was?'已退出全屏':'已全屏 · 再点一次就退出');
    setTimeout(paint,150);
  };
}
function newsBind(){
  const el=$('news');if(!el)return;
  const close=()=>{hideNews();try{audioKick();}catch(e){}};
  const x=$('newsX'), ok=$('newsOk');
  if(x)x.addEventListener('click',close);
  if(ok)ok.addEventListener('click',close);
  /* 公告尾巴上那颗全屏按钮（4.0.10 请回来的）：一次更新 = 一次提醒 + 一次教学 */
  fsButtonBind($('newsFs'));
  /* 只认 ✕ 和底部按钮：点遮罩、点卡片本身都不关。
     公告的作用就是"让你看见"，关掉它得是一个明确动作。 */
  el.addEventListener('click',e=>e.stopPropagation());
}
function newsBoot(){
  newsBind();
  /* 顶部通知栏那颗「⛶ 全屏」也在这里绑：那条栏由 73_version.js 检测到新版时才显示，
     但绑定不该等到显示那一刻（那时再绑就晚了，玩家可能已经点上去）。
     全屏是必需功能，不能只藏在 ☰ 菜单里 —— 这里给它两个"打开就能看见"的入口。 */
  fsButtonBind($('upFs'),'⛶ 全屏','🗗 退出');
  if(newsSeen())return;
  /* 【4.0.20】这里原本有一条"全新玩家先看教学、把公告直接记成已读"的分支
     （4.0.9 加的理由是"他连上次是什么样都不知道，读更新要点没意义"）。
     玩家反馈很直接：一点开先被塞一段闯关介绍，公告反而看不到。
     现在**公告永远第一**：新玩家也是先看公告，关掉之后 maybeIntro 再弹说明
     （它本来就会等公告关掉，见 maybeIntro 开头那段的等待逻辑）。
     登录/未登录都一样 —— 这条路径本来就不看账号。 */
  const tryOpen=n=>{
    /* 玩家手快先开了别的面板，就别硬顶掉，等它读完再弹。
       最多等 ~4 秒还不行就放弃本次（别和玩家的操作抢屏幕）。 */
    if(n>7)return;
    if(modal.classList.contains('show')){setTimeout(()=>tryOpen(n+1),500);return;}
    showNews();
  };
  setTimeout(()=>tryOpen(0),420);
}

/* =========================================================
   首次进入说明（一次性）
   ---------------------------------------------------------
   4.0.9 起这里只有一份 maybeIntro —— 以前 69_blaze_toggle.js 里还藏着一份
   同名的，它定义在后、把这一份整个盖掉，而它那份**漏了"读过了"的写入**
   （闯关分支结尾只写了 closePanel，没写 localStorage），
   于是「闯关模式说明」每次打开游戏都弹，老玩家被反复糊一脸。
   现在四个世界的说明都在这里处理，点掉就写已读位。
   ========================================================= */
let introWaitN=0;
/* 写"这个世界的说明读过了" */
function markIntroSeen(key){
  try{localStorage.setItem((key||curKey)+'_intro','1');}catch(e){}
}
/* 新玩家 = 本机还没有"玩过"的痕迹。
   刻意不认 x / y / crystals 这类"一进游戏就有"的东西，
   也不认 state.tier —— healState() 会给每个域都塞上 tier:1，
   那只是"初始化过"，不代表玩过（第一版就是栽在这个字段上：
   所有新玩家都被当成老玩家，公告照样弹）。
   只认真的动过手：答过题、收过精灵徽章、读过卷宗、本子里有错题。 */
function isNewPlayer(){
  if(!state)return true;
  const nz=o=>!!o&&Object.keys(o).length>0;
  return !((((state.totalRight|0)+(state.totalWrong|0))>=3)||
           nz(state.caught)||nz(state.solved)||nz(state.loose)||nz(state.badges)||
           nz(state.wrongBook)||nz(state.wrongDone)||nz(state.read)||nz(state.quiz)||
           nz(state.stat)||nz(state.tstat)||nz(state.astat)||nz(state.drill));
}
function maybeIntro(delay){
  /* 活动公告优先：它还没被看掉时先别弹说明，否则两个弹窗挤在一起。
     等公告关掉（或被标记已读）再继续。等太久（约 20 秒）就放弃弹说明 ——
     那说明玩家正忙着，不该再拦一道。 */
  try{
    if($('news')&&(!newsSeen()||newsIsOpen())){
      /* 等公告关掉。重试时把延时压到 150ms —— 原来传的是初始的 700ms，
         于是"关掉公告"到"说明出现"要等 1 秒多（4.0.20 实测 0.9 秒还没出来）。 */
      if(++introWaitN<40)setTimeout(()=>maybeIntro(150),500);
      return;
    }
  }catch(e){}
  let seen=false;
  try{seen=!!localStorage.getItem(curKey+'_intro');}catch(e){seen=true;}
  if(seen)return;
  /* 老玩家不弹说明：看的是"有没有真进度"，不是那个标记 ——
     4.0.9 以前标记从来没被写下来过，只认标记的话，
     所有老玩家都会被再糊一次说明。 */
  if(!isNewPlayer()){markIntroSeen();return;}
  const ikey=curKey;                 // 记下是哪个世界的说明：中途切世界也不写错钥匙
  setTimeout(()=>{
    /* 玩家已经在看别的面板就别硬顶掉（切模式后 600ms 才弹，手快的话会撞车） */
    if(modal.classList.contains('show'))return;
    /* intro 用 dataset.intro 而不是 lock：
       它只是"请先读一眼"，不是"题做到一半"，不该拦住切国度 / 切模式 */
    panel.dataset.intro='1';introShowing=true;

    const html=CUR===BLAZE?blazeIntroHtml()
             :CUR===EPIC?epicIntroHtml()
             :CUR===DRILL?drillIntroHtml()
             :null;
    if(html){
      openPanel(html);
      introShowing=false;            /* 之后被别的面板顶掉也能记成"读过了" */
      const g=$('go');
      if(g)g.onclick=()=>{
        closePanel();
        markIntroSeen(ikey);
        /* 烽火 / 练枪是"面板驱动"的世界：说明读完直接把大厅端上来 */
        if(CUR===BLAZE)setTimeout(showBlazeLobby,320);
        if(CUR===DRILL)setTimeout(showDrill,320);
        audioKick();
      };
      return;
    }
    /* 闯关模式的说明 */
    openPanel(`
      <h2>${WORLD_TITLE}</h2>
      <div class="sub">${WORLD_SUB}</div>
      <div class="it-list"><div class="il">📐 <b style="color:#9db4ff">数理群岛</b> · 数学　⚡ <b style="color:#ffd76a">力理亚</b> · 物理</div><div class="il">🔥 <b style="color:#ffb072">嬗变利亚</b> · 化学　🌿 <b style="color:#84e3a6">生衍利亚</b> · 生物</div><div class="il"><span style="color:#9cc0e0;font-size:var(--fs-sm)">四个国度<b>各有一张独立地图</b>，各含 3~5 个域，共十四域、42 只精灵</span></div><div class="il">⛩️ <b>传送塔</b>：每域一座，走过去自动点亮，之后可在四国之间任意往返</div><div class="il">🕹️ <b>移动</b>：在地图上<b>任意位置按住拖动</b>，摇杆会出现在你的手指下</div><div class="il">🗿 <b>石碑</b>：靠近后点右下角按钮，答题换结晶</div><div class="il">✨ <b>精灵</b>：答对 2/3 题即可收服进图鉴（四国共 42 只）</div><div class="il">🛡️ <b>守护者</b>：连答 5 道挑战题（错≤1）拿徽章、开桥</div><div class="il">💎 <b>结晶</b>：散落各处，走过去自动捡；商行可换道具</div><div class="il">📕 <b>错题中心</b>：答错的题自动收录，按熟炼度排复习日程 —— 到期就练，连对 5 次毕业</div><div class="il">📈 <b>三档难度</b>：普通 → 中档 → 高考，连对 2 题升档、错 2 题降档</div><div class="il">🆕 <b>四个模式</b>：⚔️ 闯关（刷实题）· 📜 史诗（读科学史）· 🔥 烽火（搜打撤）· 🎯 练枪（压轴 + 思路详解），进度各自独立</div><div class="il">💾 <b>存档</b>：进度自动存在本机；换设备/清缓存前，先到「💾 存档」导出存档码</div></div>
      <div class="row"><button class="btn primary" id="go">开始探索</button></div>`);
    introShowing=false;
    /* 无痕模式下 setItem 会抛异常，不兜住的话后面 audioKick() 就执行不到了 */
    $('go').onclick=()=>{
      closePanel();
      markIntroSeen(ikey);        /* ← 老版本这里漏了写，教学才每次都弹 */
      audioKick();
    };
  },delay||0);
}
/* 📌 每日复习闸的**弹窗**（4.0.22）。
   公告与首访说明之后才拦，别和它们抢屏幕；最多等 ~6 秒 ——
   玩家已经点进别的地方就放过这一次（他真想开局时，blazeDeploy 那道闸还会拦，
   那道是硬的：不复习就开不了新局）。 */
let reviewWaitN=0;
function reviewBoot(){
  if(typeof reviewNeed!=='function'||reviewNeed()<=0)return;
  if(reviewWaitN>12)return;
  if(newsIsOpen()||(typeof modal!=='undefined'&&modal&&modal.classList.contains('show'))){
    reviewWaitN++;setTimeout(reviewBoot,500);return;
  }
  if(typeof reviewGate==='function')reviewGate();
}

