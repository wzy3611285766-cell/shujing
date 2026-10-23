/* =========================================================
   四国引擎：国度切换 + 传送塔网络
   —— 覆盖引擎里的同名函数（函数声明提升，后定义的生效）
   ========================================================= */
var CUR_NATION=NATIONS[0];

/* ---------------- 坐标：每个国度各记一份 ----------------
   四张地图尺寸不同，坐标不能共用，否则切回来会站在海里的同一个数字上 */
function natPos(){
  if(!state.pos||typeof state.pos!=='object')state.pos={};
  return state.pos;
}
function savePos(){
  const p=natPos();
  if(state.nation&&Number.isFinite(state.x)&&Number.isFinite(state.y))
    p[state.nation]={x:state.x,y:state.y};
}
function loadPos(nid){
  const p=natPos()[nid];
  if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))return {x:p.x,y:p.y};
  return null;
}

/* ---------------- 切到某个国度 ---------------- */
function useNation(id){
  const n=NATION_OF[id]||NATIONS[0];
  CUR_NATION=n;
  ADV.W=n.W;ADV.H=n.H;
  ADV.title=n.name;ADV.sub=n.sub+'　'+n.desc;
  ADV.regions=n.regions;ADV.bridges=n.bridges;
  ADV.spots=n.spots;ADV.loose=n.loose;ADV.spirits=n.spirits;
  state.nation=n.id;
  if(CUR===ADV){
    W=ADV.W;H=ADV.H;WORLD_TITLE=ADV.title;WORLD_SUB=ADV.sub;
    REGIONS=ADV.regions;BRIDGES=ADV.bridges;SPOTS=ADV.spots;
    LOOSE=ADV.loose;SPIRITS=ADV.spirits;
  }
  let p=loadPos(n.id);
  if(!p||!inRect(p.x,p.y,n.regions[0].rect)&&!n.regions.some(r=>inRect(p.x,p.y,r.rect))
     &&!n.bridges.some(b=>inRect(p.x,p.y,b.rect))){
    const s=findSpawnIn(n.regions[0])||findSpawn();
    p={x:s.x,y:s.y};
    natPos()[n.id]=p;
  }
  state.x=p.x;state.y=p.y;
  const reg=currentRegion(state.x,state.y);
  state.region=reg?reg.id:n.regions[0].id;
}
/* 完整切换流程：存盘 → 换图 → 重建 → 落镜头
   atStart=true 时落点强制取该国的出生域（传送网络里「前往某国」就是这么用的）；
   不传则沿用该国上次记下的坐标（从史诗模式切回闯关时用，见 switchMode）。 */
function switchNation(id,atStart){
  if(panel&&panel.dataset.lock==='1'){toast('先把这道题做完');return;}
  if(CUR!==ADV)return;
  const n=NATION_OF[id];
  if(!n||(CUR_NATION&&n.id===CUR_NATION.id))return;
  save();release();closePanel();
  savePos();
  /* 临走前给这个国度留一盏灯：一座塔都没点亮就换地图的话，
     人就再也回不来了 —— 传送网络只认已点亮的塔。 */
  const here=CUR_NATION;
  if(here&&!here.totems.some(t=>totemOn(t.id))&&here.totems[0]){
    if(!state.totems)state.totems={};
    state.totems[here.totems[0].id]=true;
    toast('离开前点亮了 ⛩️ '+here.totems[0].name);
  }
  entReset();
  /* 注意顺序：先换国度（它会把 state.x/y 设成新国度那份坐标），
     再 healState 补字段。这里不能调 load()——那会把上一个国度的
     坐标从存档里读回来，覆盖掉刚设好的落点 */
  useNation(id);
  healState();
  /* 落点强制到出生域：useNation 会把该国上次的坐标读回来，这里要盖掉它 */
  if(atStart){
    const s=findSpawnIn(n.regions[0])||findSpawn();
    state.x=s.x;state.y=s.y;
    natPos()[n.id]={x:s.x,y:s.y};
    const rg=currentRegion(state.x,state.y);
    state.region=rg?rg.id:n.regions[0].id;
  }
  resize();buildStatic();
  if(!walkable(state.x,state.y)){const p=findSpawn();state.x=p.x;state.y=p.y;savePos();}
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  /* 落地的国度必须先有一座亮着的塔，不然玩家就回不去了：
     传送网络只认已点亮的塔，而新国度的塔不走近就永远不亮。 */
  const ft=n.totems[0];
  if(ft&&!state.totems[ft.id]){
    state.totems[ft.id]=true;
    toast('⛩️ 已点亮「'+ft.name+'」');
  }
  updateHUD();syncModeButtons();save();
  showBanner(n.emoji+' '+n.name,n.sub);
  flashQuest(true);
  SFX.unlock();
}

/* ---------------- 四国并列：任意时间都能去任意一国 ----------------
   四国之间没有任何先后依赖，也不再看「上一国通没通关」：
   传送网络里每一国的「前往出生域」入口都常驻，落点就是该国的第一域。

   为什么不会像以前那样"卡死在出生国"：去的路上不一定点得亮塔，
   所以 switchNation 落地时会自动点亮该国第一座塔（见上面的注释），
   保证玩家立刻能再切回来。以前那条「必须先拿齐上一国徽章」的规则，
   就是为了绕开这个死局才加的 —— 现在死局在 switchNation 里解决了，
   所以这条总开关可以彻底拿掉（nationUnlocked 已删除）。 */
function goNationStart(id){
  if(panel&&panel.dataset.lock==='1'){toast('先把这道题做完');return;}
  if(CUR!==ADV)return;
  const n=NATION_OF[id];if(!n)return;
  closePanel();
  if(n.id!==(CUR_NATION&&CUR_NATION.id)){
    /* 跨国：走完整切换流程（它自己会存盘 / 重建 / 点亮落地国的第一座塔） */
    switchNation(n.id,true);
    return;
  }
  /* 本来就在这一国：只把人挪回出生域，地图不用重建 */
  savePos();
  const s=findSpawnIn(n.regions[0])||findSpawn();
  state.x=s.x;state.y=s.y;
  natPos()[n.id]={x:s.x,y:s.y};
  const reg=currentRegion(state.x,state.y);
  state.region=reg?reg.id:n.regions[0].id;
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  save();updateHUD();SFX.unlock();
  showBanner(n.emoji+' '+n.name,'出生域 · '+(n.regions[0].name||''));
  flashQuest(true);
}

/* ---------------- 传送塔 ---------------- */
function totemOn(tid){return !!(state.totems&&state.totems[tid]);}
/* 走到塔跟前自动点亮（像七天神像一样，靠近即解锁） */
function tickTotem(spot){
  if(!spot||spot.t!=='totem')return;
  if(totemOn(spot.tid))return;
  if(!state.totems)state.totems={};
  state.totems[spot.tid]=true;
  SFX.unlock();save();
  toast('⛩️ 已点亮「'+(spot.name||'传送塔')+'」');
  flashQuest(true);
}
/* 传送到任意国度的一座已点亮塔 */
function goTotem(nid,tid){
  const n=NATION_OF[nid];if(!n)return;
  const t=n.totems.find(v=>v.id===tid);
  if(!t||!totemOn(tid))return;
  closePanel();
  if(nid!==state.nation){
    savePos();
    entReset();
    useNation(nid);
    healState();resize();buildStatic();
  }
  state.x=t.x;state.y=t.y;savePos();
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  const reg=currentRegion(state.x,state.y);
  state.region=reg?reg.id:n.regions[0].id;
  save();updateHUD();SFX.unlock();
  showBanner('⛩️ '+t.name,'传送完成');
  flashQuest(true);
}

/* ---------------- 传送网络面板 ---------------- */
function showNationPortal(){
  const cur=CUR_NATION||NATIONS[0];
  /* 已点亮的塔逐座列出来（可点传送）；没点亮的合并成一行"还有 N 座" ——
     以前每座未点亮的塔都占一整行，四个国家铺开来十几行，翻半天才看得到别国，
     而锁着的行本来就是点不动的。 */
  const tl=n=>{
    const lit=n.totems.filter(t=>totemOn(t.id));
    const rows=lit.map(t=>`<button class="menu-li" id="tt_${t.id}"><span class="e">⛩️</span>
      <span class="tx">${esc(t.name)}${state.nation===n.id&&state.region===t.rid?' · 📍你在这里':''}
        <div class="d">${esc((n.regions.find(v=>v.id===t.rid)||{}).name||'')} · 点击传送</div></span></button>`).join('');
    const rest=n.totems.length-lit.length;
    const more=rest?`<div class="menu-li" style="opacity:.42"><span class="e">🔒</span>
      <span class="tx">还有 ${rest} 座未点亮<div class="d">走到${esc(n.name)}里的传送塔跟前即可解锁</div></span></div>`:'';
    return rows+more;
  };
  /* 四国并列：每一国都常驻一个「前往出生域」入口，没有先后依赖也没有锁。
     已点亮的塔照样列在下面，用来回到具体某一域（含本国，国内跳域也走这里）。 */
  const sec=n=>{
    const on=n.totems.filter(t=>totemOn(t.id)).length;
    const bd=n.regions.filter(r=>state.badges[r.id]).length;
    const here=n.id===cur.id;
    const been=bd>0||on>0||!!(state.pos&&state.pos[n.id]);
    const first=n.regions[0];
    const go=`<button class="menu-li" id="go_${n.id}"><span class="e">${here?'🏠':(been?'↩️':'🚀')}</span>
      <span class="tx">${here?'回到出生域':(been?'再次前往 ':'开辟航路 · ')+esc(n.name)}
        <div class="d">落在 ${first.emoji}${esc(first.name)} 的出生点${here?'':' · ⛩️ 第一座传送塔会自动点亮'}</div>
      </span></button>`;
    /* 塔列表只在本国、或该国已经点亮过塔时才展开：
       没去过的国度把 3~5 条"未点亮"全铺出来，四个国家就是十几个无关行，
       面板会长到要滑半天才看得到别国 —— 而那些锁着的塔本来就点不动。 */
    return `<div class="nat-sec"><div class="nat-hd" style="color:${n.color}">${n.emoji} ${esc(n.name)}
      <span style="font-weight:600;opacity:.8;font-size:var(--fs-xs)">🏅 ${bd}/${n.regions.length} · ⛩️ ${on}/${n.totems.length}${here?' · 本国':''}</span></div>
      <div class="menu-list">${go}${(here||on)?tl(n):''}</div></div>`;
  };
  openPanel(`
    <h2>⛩️ 传送网络</h2>
    <div class="sub">你现在在 <b style="color:${cur.color}">${cur.emoji} ${esc(cur.name)}</b> ·
      已点亮 ${cur.totems.filter(t=>totemOn(t.id)).length}/${cur.totems.length} 座塔</div>
    ${sec(cur)}
    ${NATIONS.filter(n=>n.id!==cur.id).map(sec).join('')}
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:var(--lh-base)">
      四个国度互不依赖：任意时间都能前往任意一国，落点都是该国的出生域<br>
      走到 ⛩️ 传送塔跟前会自动点亮，之后还能跳到具体某一座塔
    </div>
    <div class="row"><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  NATIONS.forEach(n=>n.totems.forEach(t=>{
    const b=$('tt_'+t.id);
    if(b)b.onclick=()=>{audioKick();goTotem(n.id,t.id);};
  }));
  /* 「前往出生域」：四国通用，本国也能用（等于回到本国的第一域） */
  NATIONS.forEach(n=>{
    const b=$('go_'+n.id);
    if(b)b.onclick=()=>{audioKick();goNationStart(n.id);};
  });
}
/* ☰ 菜单与顶栏都走同一个入口 */
function showTeleport(){audioKick();showNationPortal();}

/* ---------------- 覆盖：目标 / 出生点 / HUD ---------------- */
function questText(){
  if(CUR===BLAZE)return questTextBlaze();
  if(CUR===EPIC)return questTextEpic();
  if(CUR===DRILL)return questTextDrill();
  /* 到期题攒多了就提醒一句，别让错题本白攒 */
  const dueN=wbDueList().length;
  if(dueN>=8)return `📕 错题本有 ${dueN} 题到期，去「错题中心 → 今日复习」`;
  const n=CUR_NATION||NATIONS[0];
  /* 烽火 / 史诗走各自的分支提前返回；万一 REGIONS 仍是空数组
     （切世界的瞬间还没换完引用），这里兜一下，别让 reg.id 抛异常 */
  const reg=REGIONS.find(r=>r.id===state.region)||REGIONS[0];
  if(!reg)return '';
  if(!state.badges[reg.id]){
    const tot=SPOTS.filter(s=>s.r===reg.id&&s.t==='stele').length;
    const left=SPOTS.filter(s=>s.r===reg.id&&s.t==='stele'&&!state.solved[s.x+','+s.y]).length;
    if(left>0)return `点亮${reg.name}的石碑 ${tot-left}/${tot}，再挑战守护者`;
    return `石碑全亮！去挑战${reg.name}守护者`;
  }
  const next=REGIONS.find(r=>!state.badges[r.id]);
  if(next)return `已获${reg.name}徽章，前往${next.name}`;
  /* 四国并列：本国全通后，其余三国没有先后之分，别只指一国 */
  const other=NATIONS.some(v=>v.id!==n.id&&v.regions.some(r=>!state.badges[r.id]));
  if(other)return `${n.name}已全通！⛩️ 传送网络可去其余三国任一`;
  return '十四域徽章集齐！你已走遍四国 🏆';
}
function findSpawn(){
  /* 闯关地图用「当前国度的第一域」；史诗地图是另一套坐标，
     必须用它自己的第一座纪元岛 —— 否则出生点会掉进随机某个纪元
     （实测落在第 6 纪元「天空的立法者」，长河的开头整段被跳过）。 */
  const r=(CUR===ADV?(CUR_NATION&&CUR_NATION.regions[0]):REGIONS[0])||REGIONS[0];
  const [x,y,w,h]=r.rect;
  for(let dy=60;dy<h-60;dy+=40)
    for(let dx=60;dx<w-60;dx+=40)
      if(walkable(x+dx,y+dy))return {x:x+dx,y:y+dy};
  return {x:x+w/2,y:y+h/2};
}
function updateHUD(){
  updateWbBadge();
  if(CUR===BLAZE)return updateHudBlaze();
  if(CUR===EPIC)return updateHudEpic();
  if(CUR===DRILL)return updateHudDrill();
  const reg=REGIONS.find(r=>r.id===state.region)||REGIONS[0];
  const n=CUR_NATION||NATIONS[0];
  setH($('regionChip'), '<span class="txt">'+n.emoji+' '+esc(n.name)+' · '+esc(reg.name)+'</span>');
  $('regionChip').style.color=n.color;
  const tv=state.tier[state.region]||1;
  setH($('diffChip'), '<span class="txt">'+TIER_NAME[tv]+'题</span>');
  $('diffChip').style.color=tv>=3?'#ffb0b0':(tv===2?'#ffd76a':'');
  const cv=crystalShown();
  setH($('crystalChip'), '🪙 <span class="mono">'+cv+'</span>');
  $('crystalChip').style.color='#ffd76a';
  watchCrystal(cv);
  setQuestText(questText());
  measureTopbar();
}

/* ---------------- 覆盖：存档字段补齐全（四国坐标 / 传送塔） ---------------- */
function healState(){
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!isObj(state.badges))state.badges={};
  if(!isObj(state.caught))state.caught={};
  if(!isObj(state.solved))state.solved={};
  if(!isObj(state.loose))state.loose={};
  if(!isObj(state.tier))state.tier={};
  if(!isObj(state.read))state.read={};
  if(!isObj(state.quiz))state.quiz={};
  if(!isObj(state.stat))state.stat={};
  if(!isObj(state.tstat))state.tstat={};
  if(!isObj(state.astat))state.astat={};
  if(!isObj(state.drill))state.drill={};    // 练枪场：各科 / 各知识点统计
  if(!isObj(state.drillTier))state.drillTier={};
  if(!isObj(state.drillTopic))state.drillTopic={};
  if(!isObj(state.pos))state.pos={};        // 四国各自的坐标
  if(!isObj(state.totems))state.totems={};  // 已点亮的传送塔
  if(!Array.isArray(state.wrongBook))state.wrongBook=[];
  if(!Array.isArray(state.wrongDone))state.wrongDone=[];
  if(!isObj(state.wbRev))state.wbRev={};
  wbHealAll();          // 1.7.0：给老存档的错题补上熟炼度 / 复习日期
  if(typeof state.daily!=='string')state.daily='';
  if(typeof state.dailyStreak!=='number'||!isFinite(state.dailyStreak))state.dailyStreak=0;
  if(typeof state.crystals!=='number'||!isFinite(state.crystals))state.crystals=0;
  if(typeof state.hint!=='number'||!isFinite(state.hint))state.hint=2;
  state.hint=Math.max(0,Math.round(state.hint));   // 手改过的存档可能留下负数
  if(typeof state.totalRight!=='number')state.totalRight=0;
  if(typeof state.totalWrong!=='number')state.totalWrong=0;
  if(typeof state.streak!=='number')state.streak=0;
  if(typeof state.bestStreak!=='number'||!isFinite(state.bestStreak))state.bestStreak=0;
  if(typeof state.sound!=='boolean')state.sound=true;
  if(typeof state.x!=='number'||!isFinite(state.x))state.x=0;
  if(typeof state.y!=='number'||!isFinite(state.y))state.y=0;
  /* 国度：老存档没有这个字段，默认回到数学国 */
  if(typeof state.nation!=='string'||!NATION_OF[state.nation])state.nation='math';
  /* 烽火地带专属字段（只有切到那个世界才需要，别污染闯关/史诗的存档） */
  if(CUR===BLAZE){
    if(!isObj(state.gear))state.gear={};
    if(!isObj(state.bstat))state.bstat={exfil:0,wipe:0,best:0,loot:0};
    if(!isObj(state.pick))state.pick={site:'math',diff:1};
    if(!isObj(state.stash))state.stash={};
    if(!isObj(state.dex))state.dex={};
    if(!isObj(state.best))state.best={r:-1,n:'',v:0};
    /* 老存档没有 dex：把当时的收藏柜原样复制一份当图鉴底子 */
    if(!Object.keys(state.dex).length&&Object.keys(state.stash).length)
      Object.keys(state.stash).forEach(k=>{
        const v=state.stash[k];
        if(v&&v.cnt>0)state.dex[k]={n:v.n,e:v.e,r:v.r,val:v.val,cnt:v.cnt};
      });
    if(typeof state.sold!=='number'||!isFinite(state.sold))state.sold=0;
    if(typeof state.soldVal!=='number'||!isFinite(state.soldVal))state.soldVal=0;
    /* 老存档没有跑刀开关与行动经费累计，默认「正经买票进场」 */
    if(typeof state.naked!=='boolean')state.naked=false;
    if(typeof state.fee!=='number'||!isFinite(state.fee)||state.fee<0)state.fee=0;
    if(!isObj(state.bstat))state.bstat={exfil:0,wipe:0,best:0,loot:0,items:0};
    if(typeof state.bstat.items!=='number'||!isFinite(state.bstat.items))state.bstat.items=0;
    /* 老存档只有一条 hq 等级线（1~5），按主线搬进新的五部门结构：
       主线给指挥部，其余按主线等级折算，不让老玩家的投入打水漂 */
    if(!isObj(state.hqd)){
      const old=clamp(Math.round(Number(state.hq)||1),1,5);
      state.hqd={cmd:old,log:clamp(old-1,1,4),med:clamp(old-1,1,4),
                 intel:clamp(old-2,1,4),arms:clamp(old-1,1,4)};
    }
    BLAZE_DEPT.forEach(d=>{
      const v=Math.round(Number(state.hqd[d.id]));
      state.hqd[d.id]=isFinite(v)?clamp(v,1,BLAZE_DEPT_MAX):1;
    });
    delete state.hq;
    if(state.run&&typeof state.run!=='object')state.run=null;
    BLAZE_GEAR.forEach(it=>{
      if(typeof state.gear[it.id]!=='number'||!isFinite(state.gear[it.id])||state.gear[it.id]<0)
        state.gear[it.id]=0;
      state.gear[it.id]=Math.floor(state.gear[it.id]);
    });
    if(typeof state.run==='object'&&state.run)blazeHealRun(state.run);
  }
  REGIONS.forEach(r=>{if(!state.tier[r.id])state.tier[r.id]=1;});
  LOOSE.forEach(c=>{c.got=!!state.loose[c.id];});
  if(typeof state.era!=='string')state.era='';
}

/* ---------------- 覆盖：互动键（含传送塔） ---------------- */
function updateActBtn(spot){
  const btn=$('actBtn'),hint=$('actHint');
  if(CUR&&CUR.actBtn){CUR.actBtn(spot,btn,hint);return;}
  /* 走近传送塔自动点亮 */
  tickTotem(spot);
  let nearLocked=null;
  for(const b of BRIDGES){
    if(!b.need||state.badges[b.need])continue;
    const cx=b.rect[0]+b.rect[2]/2,cy=b.rect[1]+b.rect[3]/2;
    if(dist(state.x,state.y,cx,cy)<150)nearLocked=b;
  }
  if(nearLocked){
    const h='🔒 需要'+((REGIONS.find(r=>r.id===nearLocked.need)||{}).name||'')+'徽章才能通行';
    if(h!==actHintCache){hint.textContent=h;actHintCache=h;}
    hint.classList.add('show');btn.classList.remove('show');return;
  }
  if(spot){
    hint.classList.remove('show');btn.classList.add('show');
    const t=spot.t==='totem'?'⛩️ 传送'
      :spot.t==='guard'?'⚔️ 挑战'
      :spot.t==='spirit'?'✨ 收服'
      :spot.t==='hermit'?'💬 请教':'🗿 解谜';
    if(t!==actBtnCache){btn.textContent=t;actBtnCache=t;}
    return;
  }
  btn.classList.remove('show');hint.classList.remove('show');
}

/* ---------------- 覆盖：图鉴（42 精灵 / 14 徽章，按国分组） ---------------- */
function showDex(){
  const got=SPIRITS.filter(s=>state.caught[s.id]).length;
  const allSp=NATIONS.reduce((a,n)=>a.concat(n.spirits),[]);
  const allGot=allSp.filter(s=>state.caught[s.id]).length;
  /* 徽章按十四域统计：state.badges 里还可能躺着史诗模式那 15 枚纪元章，
     直接数键的个数会算出「17 / 14」这种数。 */
  const allReg=NATIONS.reduce((a,n)=>a.concat(n.regions),[]);
  const bd=allReg.filter(r=>state.badges[r.id]).length;
  const bdHere=REGIONS.filter(r=>state.badges[r.id]).length;
  const badges=NATIONS.map(nt=>
    `<div class="nat-sec"><div class="nat-hd" style="color:${nt.color}">${nt.emoji} ${esc(nt.name)}
       <span style="font-weight:600;opacity:.8;font-size:var(--fs-xs)">🏅 ${nt.regions.filter(r=>state.badges[r.id]).length}/${nt.regions.length}</span></div>
     <div class="badges">${nt.regions.map(r=>
       `<div class="bd ${state.badges[r.id]?'on':''}"><div class="e">${state.badges[r.id]?r.emoji:'🔒'}</div><div class="n">${esc(r.name)}</div></div>`).join('')}</div></div>`).join('');
  const dex=NATIONS.map(nt=>{
    const list=nt.spirits;
    const g=list.filter(s=>state.caught[s.id]).length;
    return `<div class="nat-sec"><div class="nat-hd" style="color:${nt.color}">${nt.emoji} ${esc(nt.name)}
      <span style="font-weight:600;opacity:.8;font-size:var(--fs-xs)">精灵 ${g}/${list.length}</span></div>
      <div class="grid6">${list.map(s=>
        `<div class="sp ${state.caught[s.id]?'got':''}"><div class="e">${state.caught[s.id]?s.e:'❔'}</div>
         <div class="n">${state.caught[s.id]?esc(s.n):'未收服'}</div><div class="k">${esc(s.k)}</div></div>`).join('')}</div></div>`;
  }).join('');
  openPanel(`
    <h2>📖 图鉴与徽章</h2>
    <div class="sub">四国精灵 ${allGot} / ${allSp.length} · 徽章 ${bd} / ${allReg.length}</div>
    ${lingDexSection()}
    ${badges}
    <div class="pbar"><i style="width:${allGot/allSp.length*100}%"></i></div>
    <div style="margin-top:6px">${dex}</div>
    <div class="center" style="margin-top:14px;font-size:var(--fs-sm);color:#9cc0e0">
      本国（${esc((CUR_NATION||NATIONS[0]).name)}）精灵 ${got} / ${SPIRITS.length} · 徽章 ${bdHere} / ${REGIONS.length}<br>
      累计答对 ${state.totalRight} 题 · 答错 ${state.totalWrong} 题 · 错题本 ${state.wrongBook.length} / ${WRONG_CAP} 题${(state.wrongDone||[]).length?' · 已掌握 '+(state.wrongDone||[]).length+' 题':''}
    </div>
    <div class="row"><button class="btn" id="wb">📕 错题中心${wbDueList().length?'（'+wbDueList().length+'）':''}</button><button class="btn" id="rp">📊 学习报告</button><button class="btn" id="rs">重开</button><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  $('rp').onclick=showReport;
  $('rs').onclick=()=>{
    if(confirm('确定清空【闯关模式 · 四国】的进度重新开始吗？\n\n会清掉：结晶、徽章、精灵、错题本、石碑记录、传送塔\n科学编年史与烽火地带的进度不受影响\n\n（建议先到「💾 存档」导出一份存档码留底）'))
      resetSave();
  };
  $('wb').onclick=showWrongBook;
}

/* ---------------- 覆盖：公式速查（14 域，按国分页） ---------------- */
function showFormula(rid){
  const ids=Object.keys(FORMULAS);
  if(!rid||!FORMULAS[rid])rid=ids.indexOf(state.region)>=0?state.region:ids[0];
  const reg=REGIONS.find(r=>r.id===rid);
  const nat=NATIONS.find(n=>n.id===(reg?reg.nation:(CUR_NATION||NATIONS[0]).id))||NATIONS[0];
  const list=FORMULAS[rid]||[];
  openPanel(`
    <h2>📐 公式速查</h2>
    <div class="sub">${reg?esc(reg.emoji+' '+reg.name+' · '+reg.sub):esc(rid)}</div>
    <div style="margin-bottom:10px">
      ${NATIONS.map(n=>`<div class="nat-sec" style="margin-top:8px">
        <div class="nat-hd" style="color:${n.color};font-size:var(--fs-sm)">${n.emoji} ${esc(n.name)}</div>
        <div class="row" style="margin-top:0;gap:6px">
        ${n.regions.map(r=>`<button class="btn ${r.id===rid?'primary':''}" id="fm_${r.id}"
          style="flex:1 1 auto;min-width:0;padding:7px 9px;font-size:var(--fs-sm)">${r.emoji} ${esc(r.name)}</button>`).join('')}
        </div></div>`).join('')}
    </div>
    ${list.map(f=>`<div class="wb-item">
      <div class="wb-t">${esc(f.t)}</div>
      <div class="wb-e" style="color:#dbeafe">${esc(f.v)}</div></div>`).join('')}
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:var(--lh-base)">
      只收最常考的几条，用来考前扫一眼；<br>真要吃透还得回到题目里练
    </div>
    <div class="row"><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  ids.forEach(k=>{const b=$('fm_'+k);if(b)b.onclick=()=>{audioKick();showFormula(k);};});
}

/* ---------------- 覆盖：模式切换（回闯关时回到刚才的国度） ---------------- */

/* ---------------- 引路标：传送塔与引路人不进候选 ---------------- */

function spotNameOf(s){
  if(CUR===EPIC&&typeof epicSpotLabel==='function')return epicSpotLabel(s);
  if(s.t==='stele')return '🗿 智慧石碑';
  if(s.t==='totem')return '⛩️ '+(s.name||'传送塔');
  if(s.t==='guard')return '🛡️ '+(s.name||'守护者');
  if(s.t==='spirit'){const sp=SPIRITS.find(v=>v.id===s.sid);return sp?sp.e+' '+sp.n:'✨ 野生精灵';}
  if(s.t==='hermit')return '🧙 引路人';
  return s.name||'目标';
}

/* ---------------- 顶栏：点区域名 / 🌍 国度 直接开传送网络 ---------------- */
(function(){
  function openNat(){
    if(CUR===EPIC){toast('编年史里用「📜 编年史」跳转');return;}
    if(CUR===DRILL){audioKick();closePanel();showDrill();return;}   // 练枪场：点位置条直接开大厅
    audioKick();closePanel();showNationPortal();
  }
  const el=document.getElementById('regionChip');
  if(el){el.style.cursor='pointer';el.addEventListener('click',openNat);}
  const nb=document.getElementById('btnNation');
  if(nb)nb.addEventListener('click',openNat);
})();

/* ---------------- 启动：按存档所在的国度重建地图 ---------------- */
(function(){
  if(CUR!==ADV)return;
  useNation(state.nation||'math');
  healState();
  resize();buildStatic();
  if(!walkable(state.x,state.y)){const p=findSpawn();state.x=p.x;state.y=p.y;savePos();}
  cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
  cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
  updateHUD();
})();

