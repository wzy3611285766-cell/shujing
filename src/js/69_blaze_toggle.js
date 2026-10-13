/* =========================================================
   进入 / 退出烽火世界
   ========================================================= */
function blazeEnter(){
  if(!BZ.carry||typeof BZ.carry!=='object')BZ.carry={};
  BLAZE_GEAR.forEach(it=>{if(BZ.carry[it.id]==null)BZ.carry[it.id]=0;});
  if(BLAZE_STATE.run&&BLAZE_SITE_OF[BLAZE_STATE.run.site])blazeRestoreRun();
  else blazeToLobby(true);
}

/* ---------------- 覆盖：模式切换 ----------------
   顶栏按钮按「闯关 → 史诗 → 烽火 → 闯关」循环；
   ☰ 菜单里则可以一步跳到任意一个世界（switchTo）。 */
function switchTo(target){
  if(!target||target===CUR)return;
  /* 锁现在只代表"有一道题正在作答"，只有这种情况才拦人；
     提示 / 战利品 / 撤离确认 / 结算这些面板不上锁，随时可以走 */
  if(panel&&panel.dataset.lock==='1'){toast('先把这道题做完');return;}
  /* 离开烽火前把这一局收干净：
     ① busy 复位 —— 面板被直接关掉时 busy 还卡着，下次回来整张图点不动
     ② 落一次盘 —— run 存着，回到烽火能接着打，不会白跑一趟
     以前这里是一句"行动进行中，先撤离再切换"直接把人拦死，
     局里又没有别的出口，等于困在战场里。 */
  if(CUR===BLAZE&&BZ.active){
    if(BZ.busy)BZ.busy=false;
    blazeSaveRun();
  }else if(CUR===BLAZE&&BZ.phase==='over'){
    blazeToLobby(true);           // 结算没点按钮就切世界，同样先把这一局收掉
  }
  audioKick();
  save();
  release();
  goTarget=null;                 // 换世界了，旧的落点已经没意义
  closePanel();
  entReset();
  useWorld(target);
  load();healState();
  if(target===ADV)useNation(state.nation||'math');
  if(target===BLAZE)blazeEnter();
  resize();buildStatic();
  if((state.x===0&&state.y===0)||!walkable(state.x,state.y)){
    const p=findSpawn();state.x=p.x;state.y=p.y;
    if(CUR===ADV)savePos();
  }
  const reg=currentRegion(state.x,state.y);
  state.region=reg?reg.id:REGIONS[0].id;
  if(CUR===EPIC&&reg&&reg.kind!=='river')state.era=reg.id;
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  updateHUD();syncModeButtons();save();
  showBanner(WORLD_TITLE,WORLD_SUB);
  flashQuest(true);
  SFX.open();
  maybeIntro(600);
  /* 练枪场是「面板驱动」的世界：不是首访（说明已读过）就直接把练枪大厅端上来。
     读不了存储说明首访说明也不会弹（maybeIntro 同样会因异常跳过），这时也要开大厅 */
  if(CUR===DRILL){
    let seen=true;
    try{seen=!!localStorage.getItem(SAVE_KEY_DRILL+'_intro');}catch(e){seen=true;}
    if(seen)setTimeout(()=>{if(!panelOpen())showDrill();},420);
  }
}
function switchMode(){
  /* 练枪场不在这个循环里 —— 顶栏常驻的「🎯 练枪」(#btnDrill) 就是它唯一的入口，
     点下去 showDrill() 会自己把玩家送进练枪场。以前烽火这一站也叫「练枪场」，
     于是顶上并排两颗 🎯、点下去到同一个地方，玩家分不清哪个是哪个。
     想直接去练枪场这个世界：☰ 菜单 → 切换世界 → 练枪场。 */
  switchTo(CUR===ADV?EPIC:(CUR===EPIC?BLAZE:ADV));
}

/* ---------------- 覆盖：顶栏按钮随模式变脸 ---------------- */
function syncModeButtons(){
  const bz=CUR===BLAZE, ep=CUR===EPIC, dr=CUR===DRILL;
  const shop=$('btnShop'),dex=$('btnDex'),mode=$('btnMode'),nat=$('btnNation');
  /* 史诗下这个按钮是「⏳ 时空交易所」：星尘唯一的去处，别再藏起来了；
     练枪场不是经贸现场，商行与国度入口一并收起 */
  if(shop){shop.style.display=(bz||dr)?'none':'';shop.textContent=ep?'⏳ 交易所':'🏪 商行';}
  if(nat) nat.style.display=(bz||dr)?'none':'';
  if(dex) dex.textContent=bz?'🎖️ 行动':(ep?'📜 编年史':'📖 图鉴');
  /* 这颗键只做一件事：切到下一个世界，名字就是那个世界的名字。
     以前烽火这站写作「🎯 练枪场」，和常驻的 #btnDrill「🎯 练枪」撞在一起 ——
     两颗键长得一样、点下去也到同一个地方，玩家分不清。
     现在循环里没有练枪场（见 switchMode），烽火 / 练枪场 这一站统一是「⚔️ 闯关」。 */
  if(mode)mode.textContent=ep?'🔥 烽火':((bz||dr)?'⚔️ 闯关':'📜 史诗');
}

/* ---------------- 覆盖：首次进入的说明 ---------------- */
function maybeIntro(delay){
  try{if(localStorage.getItem(curKey+'_intro'))return;}catch(e){return;}
  setTimeout(()=>{
    if(modal.classList.contains('show'))return;
    panel.dataset.intro='1';introShowing=true;
    const html = CUR===BLAZE ? blazeIntroHtml()
               : CUR===EPIC ? epicIntroHtml()
               : CUR===DRILL ? drillIntroHtml()
               : null;
    if(html){
      openPanel(html);
      const g=$('go');
      if(g)g.onclick=()=>{
        closePanel();
        if(CUR===BLAZE)setTimeout(showBlazeLobby,320);
        if(CUR===DRILL)setTimeout(showDrill,320);
      };
      return;
    }
    /* 闯关模式的原始说明 */
    openPanel(`
      <h2>${WORLD_TITLE}</h2>
      <div class="sub">${WORLD_SUB}</div>
      <div class="it-list"><div class="il">📐 <b style="color:#9db4ff">数理群岛</b> · 数学　⚡ <b style="color:#ffd76a">力理亚</b> · 物理</div><div class="il">🔥 <b style="color:#ffb072">嬗变利亚</b> · 化学　🌿 <b style="color:#84e3a6">生衍利亚</b> · 生物</div><div class="il"><span style="color:#9cc0e0;font-size:var(--fs-sm)">四个国度<b>各有一张独立地图</b>，各含 3~5 个域，共十四域、42 只精灵</span></div><div class="il">⛩️ <b>传送塔</b>：每域一座，走过去自动点亮，之后可在四国之间任意往返</div><div class="il">🕹️ <b>移动</b>：在地图上<b>任意位置按住拖动</b>，摇杆会出现在你的手指下</div><div class="il">🗿 <b>石碑</b>：靠近后点右下角按钮，答题换结晶</div><div class="il">✨ <b>精灵</b>：答对 2/3 题即可收服进图鉴（四国共 42 只）</div><div class="il">🛡️ <b>守护者</b>：连答 5 道挑战题（错≤1）拿徽章、开桥</div><div class="il">💎 <b>结晶</b>：散落各处，走过去自动捡；商行可换道具</div><div class="il">📕 <b>错题中心</b>：答错的题自动收录，按熟炼度排复习日程 —— 到期就练，连对 5 次毕业</div><div class="il">📈 <b>三档难度</b>：普通 → 中档 → 高考，连对 2 题升档、错 2 题降档</div><div class="il">🆕 <b>四个模式</b>：⚔️ 闯关（刷实题）· 📜 史诗（读科学史）· 🔥 烽火（搜打撤）· 🎯 练枪（压轴 + 思路详解），进度各自独立</div><div class="il">💾 <b>存档</b>：进度自动存在本机；换设备/清缓存前，先到「💾 存档」导出存档码</div></div>
      <div class="row"><button class="btn primary" id="go">开始探索</button></div>`);
    $('go').onclick=closePanel;
  },delay||0);
}

/* ---------------- 覆盖：图鉴键在烽火模式下开大厅 ---------------- */
$('btnDex').onclick=()=>{
  audioKick();
  if(CUR===BLAZE)showBlazeLobby();
  else if(CUR===EPIC)showChronicle();
  else showDex();
};

/* ---------------- 覆盖：引路标——烽火里指向最近的物资箱 / 撤离点 ---------------- */
function guideCandidates(){
  if(CUR===DRILL){
    /* 练枪场没有可搜刮的点位：引路标只指向训练台 */
    return [{x:DRILL_SPOTS[0].x,y:DRILL_SPOTS[0].y,kind:'drill',
      name:'🎯 练枪台 · 开练',emoji:'🎯'}];
  }
  if(CUR===BLAZE){
    if(!BZ.active)return [];
    const out=[];
    BLAZE_SPOTS.forEach(s=>{
      if(s.t==='crate'&&!s.looted)
        out.push({x:s.x,y:s.y,kind:'crate',name:'📦 物资箱'+bzGridTag(s),emoji:'📦'});
      else if(s.t==='exfil')
        out.push({x:s.x,y:s.y,kind:'exfil',name:'🚁 '+s.name+bzGridTag(s),emoji:'🚁'});
      else if(s.t==='vault'&&!s.looted)
        out.push({x:s.x,y:s.y,kind:'vault',name:'🔐 '+s.name+bzGridTag(s),emoji:'🔐'});
      else if(s.t==='door'&&!s.opened){
        const c=BLAZE_CARD_OF[s.card]||{};
        out.push({x:s.x,y:s.y,kind:'door',
          name:'🔒 '+(c.n||'上锁')+'门'+bzGridTag(s),emoji:c.e||'🔒'});
      }
    });
    BLAZE_LOOSE.forEach(c=>{
      if(!c.got)out.push({x:c.x,y:c.y,kind:'loose',
        name:'📦 散落的物资'+bzGridTag(c),emoji:'📦'});
    });
    return out;
  }
  const out=[];
  SPOTS.forEach(s=>{
    if(s.t==='hermit'||s.t==='totem')return;
    if(CUR===EPIC){if(state.read[s.sid])return;}
    else if(spotDone(s))return;
    out.push({x:s.x,y:s.y,kind:s.t,name:spotNameOf(s),emoji:s.t==='guard'?'🛡️':(s.t==='stele'?'🗿':(s.t==='spirit'?'✨':'🧙'))});
  });
  LOOSE.forEach(c=>{
    if(c.got)return;
    out.push({x:c.x,y:c.y,kind:'crystal',name:'💎 散落的结晶',emoji:'💎'});
  });
  return out;
}

