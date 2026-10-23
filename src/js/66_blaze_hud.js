/* =========================================================
   HUD
   ========================================================= */
function updateHudBlaze(){
  const active=BZ.active;
  /* site / diff 一律给兜底，别写成 active?…:null。
     撤离结算（blazeFinish）和回基地（blazeToLobby）都是先把 BZ.active 置 false
     再调 updateHUD 的，而下面「位置」那一格在没落到分区里时会退回去读 site.emoji
     —— site 是 null 就当场抛异常：结算面板开不出来，上一张答题面板还锁着，
     玩家看到的就是「撤到最后一波，然后彻底撤不了」。 */
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];

  /* 位置那一格显示「当前分区 · 栅格坐标」，跟战术地图上的报点方式一致：
     "主机房 C4"比"地图中间"清楚得多，也是队内说话的方式 */
  const poi=active?blazePoiAt(state.x,state.y):null;
  const gd =active?blazeGridOf(state.x,state.y):'';
  const here=poi?(poi.e+' '+poi.n):(site.emoji+' '+site.name);
  setH($('regionChip'), '<span class="txt">'+
    (active?esc('📍 '+here+(gd?' · '+gd:'')):'📍 🎖️ 行动基地')+'</span>');
  $('regionChip').style.color=active?site.color:'#9cc0e0';

  setH($('diffChip'), '<span class="txt">'+
    (active?esc(diff.emoji+' '+diff.name+' · 📶'+Math.max(0,BZ.sig)):'未部署')+'</span>');
  $('diffChip').style.color=active?(diff.id>=3?'#ffb0b0':(diff.id===2?'#ffd76a':'')):'';

  /* 局中这一格显示「背包」：几件 / 几格，以及这批东西能卖多少。
     烽火里不掉结晶，钱只能活着回基地、去交易站卖了东西才有。 */
  if(active){
    const bg=BZ.bag||[];
    const v=bg.reduce((a,b)=>a+b.val,0);
    setH($('crystalChip'), '🎒 <span class="mono">'+blazeBagUsed(bg)+'</span>/'+
      blazeBagCap()+'<span style="opacity:.65"> · '+bg.length+'件 · '+v+'</span>');
  }else{
    setH($('crystalChip'), '🪙 <span class="mono">'+(BLAZE_STATE.crystals|0)+'</span>');
  }
  $('crystalChip').style.color='#ffd76a';
  watchCrystal(BLAZE_STATE.crystals|0);

  setQuestText(questTextBlaze());
  measureTopbar();
}

function questTextBlaze(){
  if(!BZ.active)return '去 🎖️ 指挥部选地点和难度，然后部署行动';
  const left=BLAZE_SPOTS.filter(s=>s.t==='crate'&&!s.looted).length;
  const live=BLAZE_SPOTS.filter(s=>s.t==='patrol'&&!s.dead).length;
  const guards=blazeVaultGuards().length;
  const vaults=BLAZE_SPOTS.filter(s=>s.t==='vault'&&!s.looted).length;
  const bagVal=(BZ.bag||[]).reduce((a,b)=>a+b.val,0);
  /* 携带的物资挂在任务条末尾，局中随时能确认自己带了什么（尤其保险） */
  let perk='';
  if(BZ.gear.battery)perk+=' 🔋';
  if(BZ.gear.bag)    perk+=' 🎒';
  if(BZ.gear.ins)    perk+=' 📄';
  if(BZ.gear.scan)   perk+=' 📟';
  if(BZ.gear.medkit) perk+=' 💊';
  if(BZ.gear.luck)   perk+=' 🍀';
  BLAZE_CARDS.forEach(c=>{if(BZ.gear&&BZ.gear[c.id])perk+=' '+c.e;});
  if(BZ.naked)perk+=' 🪖';
  const doors=BLAZE_SPOTS.filter(s=>s.t==='door'&&!s.opened).length;
  const vaultTxt=vaults
    ? (guards?`🔒 保险箱房：还有 ${guards} 名守卫，清完才进得去`:'🔓 保险箱已解锁')
    : (BZ.opened?'✅ 保险箱已清空':'');
  const doorTxt=doors?`🔑 上锁房间 ${doors} 间 · `:'';
  return `📦 箱 ${left} · ${doorTxt}${vaultTxt?vaultTxt+' · ':''}👾 巡逻 ${live} · 📶 ${Math.max(0,BZ.sig)}/${BZ.sigMax} · 🎒 ${blazeBagUsed()}/${blazeBagCap()}（${bagVal}🪙）`+perk;
}

/* =========================================================
   大厅：选地点 / 选难度 / 携带物资 / 部署
   ========================================================= */
let blazeLobbyTab=0;      // 0 部署 1 采购 2 战绩
function showBlazeLobby(){
  if(BZ.active){
    /* 行动进行中就别开大厅了，不然部署按钮会把这一局顶掉 */
    const okQuit=confirm('当前有一场行动还在进行中。\n放弃这次行动回到基地？\n（背包里的物资会全部丢失）');
    if(!okQuit)return;
    BLAZE_STATE.run=null;
  }
  blazeLobbyTab=0;
  blazeRenderLobby();
}

/* =========================================================
   收藏柜：累计带出来过的物资，特勤处升级要吃它
   ========================================================= */
function blazeStashList(){
  const st=BLAZE_STATE.stash||{};
  return Object.keys(st).map(k=>{
    const v=st[k];
    if(!v||v.cnt<=0)return null;
    /* 旧存档的物资没有占格 / 分类 / 禁售标记，按名字回物资表补齐 */
    const d=lootDef(v.n);
    if(v.slot==null)v.slot=(d&&d.slot)||1;
    if(!v.cat&&d)v.cat=d.cat;
    if(v.nt==null)v.nt=(d&&d.nt)?1:0;
    return v;
  }).filter(Boolean).sort((a,b)=>b.r-a.r||b.val-a.val);
}
function blazeStashCount(minR){
  return blazeStashList().filter(v=>v.r>=(minR||0)).reduce((a,b)=>a+b.cnt,0);
}
/* 消耗 n 件指定稀有度以上的物资：优先吃掉档位最低、存量最多的那几种 */
function blazeStashConsume(minR,n){
  const st=BLAZE_STATE.stash||{};
  const keys=Object.keys(st).filter(k=>st[k].r>=minR&&st[k].cnt>0)
    .sort((a,b)=>st[a].r-st[b].r||st[b].cnt-st[a].cnt);
  let left=n;
  for(const k of keys){
    if(left<=0)break;
    const take=Math.min(left,st[k].cnt);
    st[k].cnt-=take;left-=take;
    if(st[k].cnt<=0)delete st[k];
  }
  return left;      // 没扣完（理论上不会发生）
}
/* 图鉴（只增不减的历史记录）：卖光了也还在，留给收藏页翻 */
function blazeDexList(){
  const st=BLAZE_STATE.dex||{};
  return Object.keys(st).map(k=>st[k])
    .filter(v=>v&&v.cnt>0)
    .sort((a,b)=>b.r-a.r||b.val-a.val);
}
function blazeDexHtml(){
  const list=blazeDexList();
  const total=list.reduce((a,b)=>a+b.cnt,0);
  const val=list.reduce((a,b)=>a+b.val,0);
  const best=BLAZE_STATE.best||{};
  const inStock=blazeStashCount(0);
  if(!total)return `
    <div class="center" style="font-size:52px;margin:10px 0">🗄️</div>
    <div class="center" style="color:#9cc0e0;font-size:var(--fs-md);line-height:var(--lh-loose)">
      图鉴还是空的。<br>
      <span style="font-size:var(--fs-sm)">撤离成功时，身上所有物资都会在这里留一份底。<br>
      越好越稀有的东西，🏛️ 特勤处越想要。</span>
    </div>
    <div class="row"><button class="btn primary" id="back">← 返回部署</button></div>`;
  return `
    <div class="sub" style="margin-bottom:8px">
      见过 <b style="color:#ffd76a">${total}</b> 件 · 累计估值 ${val} 🪙
      · 仓库现存 ${inStock} 件</div>
    ${best.n?`<div style="background:rgba(255,201,74,.10);border:1px solid rgba(255,201,74,.3);
      border-radius:14px;padding:10px 12px;margin-bottom:12px;text-align:center">
      <div style="font-size:var(--fs-xs);color:#9cc0e0">镇柜之宝</div>
      <div style="font-size:var(--fs-xl);font-weight:800;color:#fff;margin:2px 0">
        ${best.e} ${esc(best.n)}</div>
      <div>${rarityTag(best.r)} <span style="color:#ffd76a;font-weight:700">${best.v|0} 🪙</span></div>
    </div>`:''}
    ${RARITY.slice().reverse().map(r=>{
      const g=list.filter(v=>v.r===r.id);
      if(!g.length)return '';
      return `<div style="margin-bottom:10px">
        <div style="font-size:var(--fs-sm);font-weight:700;color:${r.c};margin-bottom:5px">
          ${r.e} ${r.n} <span style="color:#7d94ab;font-weight:600">· ${g.reduce((a,b)=>a+b.cnt,0)} 件</span></div>
        <div class="lootgrid">${g.map(v=>`
          <div class="lootcell" style="background:${r.bg};border-color:${r.bd}">
            <div class="e">${v.e}</div>
            <div class="n">${esc(v.n)}${v.cnt>1?' ×'+v.cnt:''}</div>
            <div class="v">${v.val} 🪙</div>
            <div class="s">${Math.max(1,v.slot|0||1)} 格${v.cat?' · '+esc(v.cat):''}
              ${v.nt?' · <span style="color:#ffd76a">🚫</span>':''}</div>
          </div>`).join('')}</div></div>`;
    }).join('')}
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:8px;line-height:var(--lh-base)">
      图鉴只记「见过」，卖掉也不会消失；<br>
      真正能拿去卖、拿去升级的，是「💱 交易站」里的库存。
    </div>
    <div class="row">
      <button class="btn" id="totrade">💱 去交易站</button>
      <button class="btn primary" id="back">← 返回部署</button>
    </div>`;
}

