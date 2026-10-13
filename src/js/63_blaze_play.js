/* =========================================================
   局内：搜 / 打 / 撤
   ========================================================= */
function blazeInteract(s){
  if(!s||BZ.busy)return;
  if(!BZ.active){ if(s.t==='lobby'){audioKick();showBlazeLobby();} return; }
  audioKick();
  if(s.t==='crate') blazeOpenCrate(s);
  else if(s.t==='vault') blazeOpenVault(s);
  else if(s.t==='door')  blazeOpenDoor(s);
  else if(s.t==='guard') blazeFightGuard(s);
  else if(s.t==='patrol') blazeFight(s);
  else if(s.t==='exfil')  blazeExfilStart(s);
}

/* ---------- 房卡开门 ----------
   有些屋子的门是被焊死的铁闸：没带对应的房卡，里头的东西跟你一点关系都没有。
   卡是一次性的 —— 刷开一扇门就作废一张，值不值得刷是这一局最实在的赌注。 */
function blazeOpenDoor(s){
  const card=BLAZE_CARD_OF[s.card]||BLAZE_CARDS[0];
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const have=(BZ.gear&&BZ.gear[card.id])|0;
  if(s.opened){toast('这门已经开过了');return;}
  if(have<=0){
    BZ.busy=true;
    openPanel(`
      <h2>🔒 ${esc(card.n)}门</h2>
      <div class="sub">${esc(site.name)} · 这扇门被焊死了</div>
      <div class="center" style="font-size:54px;margin:6px 0">${card.e}</div>
      <div class="center" style="line-height:var(--lh-loose)">
        门上贴着一张 <b style="color:#ffd76a">${esc(card.n)}</b> 的封条。<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">
          回基地的「🏪 战备采购」买一张，部署前勾选携带。<br>
          房卡是一次性的，刷开一扇门就作废。</span>
      </div>
      <div class="row"><button class="btn primary" id="ok">知道了</button></div>`);
    $('ok').onclick=()=>{closePanel();BZ.busy=false;};
    return;
  }
  BZ.busy=true;
  const inside=BLAZE_SPOTS.filter(v=>v!==s&&v.room===s.room);
  const crates=inside.filter(v=>v.t==='crate'&&!v.looted).length;
  const guards=inside.filter(v=>v.t==='guard'&&!v.dead).length;
  const vaults=inside.filter(v=>v.t==='vault'&&!v.looted).length;
  openPanel(`
    <h2>🔑 ${esc(card.n)}</h2>
    <div class="sub">${esc(site.name)} · 刷卡开门</div>
    <div class="center" style="font-size:54px;margin:6px 0">${card.e}</div>
    <div class="center" style="line-height:var(--lh-loose)">
      身上还有 <b style="color:#ffd76a">${have}</b> 张 ${esc(card.n)}<br>
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">刷开之后这张卡就作废了</span>
    </div>
    <div style="background:rgba(255,215,106,.09);border:1px solid rgba(255,215,106,.28);
      border-radius:14px;padding:11px 13px;margin-top:10px;
      font-size:var(--fs-sm);color:#cfe6ff;line-height:var(--lh-loose);text-align:center">
      这间屋里：<br>
      📦 物资箱 <b style="color:#ffd76a">${crates}</b> 个
      ${guards?'　💂 守卫 <b style="color:#ff8a8a">'+guards+'</b> 名':''}
      ${vaults?'　🔐 保险箱 <b style="color:#ffd76a">'+vaults+'</b> 座':''}
      ${(!crates&&!guards&&!vaults)?'<span style="color:#9cc0e0">好像……是空的</span>':''}
    </div>
    <div class="row">
      <button class="btn" id="no">再想想</button>
      <button class="btn primary" id="go">🔑 刷卡开门</button>
    </div>`);
  $('no').onclick=()=>{closePanel();BZ.busy=false;};
  $('go').onclick=()=>{
    BZ.gear[card.id]=have-1;
    s.opened=true;BZ.cards=(BZ.cards|0)+1;
    if(s.room){s.room.opened=true;}
    /* 门开了，地图上的铁闸要重画一次，否则看着还锁着 */
    buildStatic();
    SFX.unlock();
    toast('🔓 '+card.e+' '+card.n+'刷开，门开了');
    closePanel();BZ.busy=false;
    blazeSaveRun();updateHUD();
    /* 屋里有人守着的话，进门就得打 —— 顺手提醒一句 */
    if(guards)setQuestText('💂 屋里有 '+guards+' 名守卫，先解决他们',5000);
  };
}

/* ---------- 搜：物资箱 ----------
   开箱的精髓在稀有度：同一张地图同一个箱子，
   可能摸出一卷胶带，也可能摸出一块没切割的钻石。 */
function blazeOpenCrate(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  blazeAsk({rid:pick(site.rids),tier:diff.tier,
    title:'📦 物资箱',sub:'正在撬锁 · '+site.name,
    tag:diff.emoji+' '+diff.name+' · 搜索',
    bar:blazeSigBar(),
    nextText:'搜刮完毕 →',
    onDone(ok){
      /* 开箱是单题结算，答完就回到地图上 ——
         必须自己把面板关掉：面板锁着（lock=1），点遮罩关不了，
         少这一句玩家就永远卡在「搜刮完毕 →」上，整局动不了。
         先关再结算，+战利品的 toast 才不会被面板挡住。 */
      closePanel();
      if(ok){
        s.looted=true;BZ.opened++;
        const R2=blazeRollInto(site,diff,s.boost||1,0,BLAZE_DROP.crate.n);
        blazeShowLoot('📦 搜出物资',R2.list,R2.dropped);
        SFX.coin();
      }else{
        /* 撬锁失败：惊动附近的人，箱子废了，慌乱中还从背包里掉了一件 */
        s.looted=true;BZ.sig--;
        let lost=null;
        if(BZ.bag&&BZ.bag.length){
          let mi=0;
          /* 慌乱中掉的是「最不划算」的那一件，不是最便宜的那一件 */
          for(let i=1;i<BZ.bag.length;i++)if(lootPerSlot(BZ.bag[i])<lootPerSlot(BZ.bag[mi]))mi=i;
          lost=BZ.bag.splice(mi,1)[0];
        }
        toast('💥 触发警报！'+(lost?('慌乱中丢了 '+lost.e+lost.n+' · '):'')+
              '信号值 '+Math.max(0,BZ.sig));
      }
      blazeAfter();
    }});
}

/* ---------- 把一件物资塞进背包 ----------
   背包按格数封顶：塞不下就按「单格价值」从低到高往外扔，
   直到腾出位置 —— 摸金玩家真正的取舍在这儿：
   一个 12 格的火箭燃料，未必比 1 格的非洲之心值钱。
   返回被挤掉的物资数组（没挤掉就是空数组）。
   宁可让玩家掉了芝麻捡了西瓜，也别卡在「背包满了开不了箱」的死局里。 */
function blazeBagPush(L){
  if(!Array.isArray(BZ.bag))BZ.bag=[];
  const cap=blazeBagCap();
  const need=lootSlot(L);
  /* 这一件本身就超过整个背包的容量，直接放不进去 */
  if(need>cap)return [L];
  BZ.bag.push(L);
  const dropped=[];
  let guard=0;
  while(blazeBagUsed()>cap&&BZ.bag.length&&guard++<64){
    let mi=0;
    for(let i=1;i<BZ.bag.length;i++)if(lootPerSlot(BZ.bag[i])<lootPerSlot(BZ.bag[mi]))mi=i;
    /* 新到手的自己就是最不划算的，那就直接扔掉它 */
    const isNew=(mi===BZ.bag.length-1&&BZ.bag[BZ.bag.length-1]===L);
    dropped.push(BZ.bag.splice(mi,1)[0]);
    if(isNew)break;
  }
  return dropped;
}
/* ---------- 抽 n 件物资进背包 ----------
   boost 是这一路的高稀有度加权：散落 0.5，普通箱 1，巡逻队 1.8，
   守卫 2.0，小保险箱 2.2，保险箱 3.0，高价值保险箱 5.0
   floor 是保底档位（见 rollRarity）：小保险箱 / 保险箱 1（保底 🟩），
   高价值保险箱 2（保底 🟦），其余一路传 0 表示不保底 */
function blazeRollInto(site,diff,boost,luckExtra,n,floor){
  const bagMul=((BZ.gear&&BZ.gear.bag)?1.2:1)*hqLootMul();
  const luck=hqLuck()+((BZ.gear&&BZ.gear.bag)?0.15:0)
            +((BZ.gear&&BZ.gear.luck)?0.40:0)+(luckExtra||0);
  const cnt=Math.max(1,n|0||1), list=[], dropped=[];
  for(let i=0;i<cnt;i++){
    const L=makeLoot(rollRarity(luck,boost||1,floor||0),site.id,diff.mul,bagMul);
    list.push(L);
    const d=blazeBagPush(L);
    if(d&&d.length)d.forEach(x=>dropped.push(x));
  }
  list.sort((a,b)=>b.r-a.r);
  return {list:list,dropped:dropped};
}
/* ---------- 一格一格的战利品展示（开箱 / 缴获 / 结算共用） ----------
   每格都标出「占几格」—— 摸金时先看格数再看钱，这是肌肉记忆。 */
function blazeLootGridHtml(list,dropped){
  if(!list||!list.length)return '';
  return `<div class="lootgrid">${list.map(L=>{
    const r=RAR_OF[L.r]||RARITY[0];
    const s=lootSlot(L);
    return `<div class="lootcell" style="background:${r.bg};border-color:${r.bd}">
      <div class="e">${L.e}</div><div class="n">${esc(L.n)}</div>
      <div class="v">${L.val} 🪙</div>
      <div class="s">${s} 格${s>1?' · 单格 '+Math.round(lootPerSlot(L)):''}</div></div>`;}).join('')}</div>`+
    ((dropped&&dropped.length)
      ?`<div class="center" style="font-size:var(--fs-xs);color:#ffd0d0;margin-top:6px;line-height:var(--lh-base)">
          🎒 背包只有 ${blazeBagCap()} 格，按单格价值扔掉了最不划算的 ${dropped.length} 件：
          ${dropped.map(d=>d.e).join(' ')}</div>`
      :'');
}
/* ---------- 开箱 / 缴获结果的展示面板 ---------- */
function blazeShowLoot(title,list,dropped){
  const best=list.reduce((a,b)=>(!a||b.r>a.r)?b:a,null);
  const rar=best?(RAR_OF[best.r]||RARITY[0]):RARITY[0];
  const sum=list.reduce((a,b)=>a+b.val,0);
  let html=`<h2>${esc(title)}</h2>
    <div class="sub">共 ${list.length} 件 · 估值 <b style="color:#ffd76a">${sum}</b> 🪙</div>`;
  if(list.length===1){
    const L=list[0],s=lootSlot(L),def=lootDef(L.n);
    html+=`<div class="lootbox" style="background:${rar.bg};border-color:${rar.bd}">
      <div class="le">${L.e}</div>
      <div class="ln">${esc(L.n)}</div>
      <div style="margin-top:6px">${rarityTag(L.r)} ${lootSizeTag(L)}
        ${catTag(L.cat||(def&&def.cat))}</div>
      <div class="lv">估值 ${L.val} 🪙 · 占 ${s} 格${s>1?'（单格 '+Math.round(lootPerSlot(L))+'）':''}</div>
      ${L.nt?'<div style="font-size:var(--fs-xs);color:#ffd76a;margin-top:4px">🚫 任务材料 · 交易行禁售，只能军需处回收</div>':''}
    </div>`;
  }else{
    html+=blazeLootGridHtml(list,dropped)+
      `<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:8px">
        最好一件：${esc(best.n)} ${rarityTag(best.r)} ${lootSizeTag(best)}</div>`;
  }
  if(list.length===1&&dropped&&dropped.length)
    html+=`<div class="center" style="font-size:var(--fs-xs);color:#ffd0d0;margin-top:6px;line-height:var(--lh-base)">
      🎒 背包挤掉了 ${dropped.map(d=>d.e+d.n).join('、')}</div>`;
  html+=`<div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-top:8px;line-height:var(--lh-base)">
      背包 <b style="color:#ffd76a">${blazeBagUsed()} / ${blazeBagCap()}</b> 格<br>
      只有<b style="color:#ffd76a">活着撤离</b>才真正到手，
      回基地到 <b>💱 交易站</b> 换成哈夫币</div>
    <div class="row"><button class="btn primary" id="ok">收好</button></div>`;
  openPanel(html);
  $('ok').onclick=()=>{closePanel();BZ.busy=false;blazeAfter();};
  /* 出紫以上给点仪式感：全屏飘一行；出红是全服都该知道的事 */
  if(best&&best.r>=3){
    const big=best.r>=5&&lootSlot(best)>=4;
    toast((best.r>=5?(big?'🔥🔥🔥 大红！':'🔥🔥 小红！'):(best.r>=4?'🔥🔥 ':''))
          +best.e+' '+best.n+'（'+rar.n+'）');
  }
}

/* ---------- 打：保险箱房的守卫 ----------
   守着屋子的都是精锐：题更多、错两次就倒，而且必须打掉才能开箱。 */
function blazeFightGuard(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const left=blazeVaultGuards(s).length;
  const total=Math.max(2,4-hqGuardLess());
  const maxMiss=1+hqExtraMiss();
  BZ.busy=true;
  openPanel(`
    <h2>💂 ${esc(s.name)}</h2>
    <div class="sub">${esc(site.name)} · 保险箱房守卫</div>
    <div class="center" style="font-size:52px;margin:4px 0">${s.e}</div>
    <div class="center" style="line-height:var(--lh-loose)">
      这人守着屋里的保险箱，<b style="color:#ffb0b0">不会让你绕过去</b><br>
      <b style="color:#ff8a8a">想开箱，只能先把他打掉</b><br>
      交火 <b>${total} 题</b>，最多错 <b>${maxMiss}</b> 题<br>
      还剩 <b style="color:#ffd76a">${left}</b> 名守卫没解决
    </div>
    ${blazeSigBar()}
    <div class="row">
      <button class="btn" id="no">先撤，待会儿再来</button>
      <button class="btn primary" id="go">开打</button>
    </div>`);
  $('no').onclick=()=>{closePanel();BZ.busy=false;};
  $('go').onclick=()=>{
    let i=0,miss=0;
    function step(){
      blazeAsk({rid:pick(site.rids),tier:Math.min(3,diff.tier+(i>=2?1:0)),
        title:'💥 强攻 · 第 '+(i+1)+' / '+total+' 题',
        sub:esc(s.name)+' · '+site.name,
        tag:diff.emoji+' '+diff.name+' · 精锐交火',
        bar:blazeSigBar(),
        nextText:(i+1>=total?'结束战斗 →':'下一题 →'),
        onDone(ok){
          if(!ok){
            miss++;
            /* 军械库：每场前 N 枪白挨；医疗包再额外顶一次 */
            const free=hqFreeMiss();
            let shielded=miss<=free;
            if(!shielded&&BZ.gear&&BZ.gear.medkit&&!BZ.medkitUsed){
              BZ.medkitUsed=true;shielded=true;
              toast('💊 战地医疗包生效，这次不掉信号值');
            }else if(shielded)toast('🛡️ 军械扛下了这一枪');
            if(!shielded)BZ.sig-=2;
            if(miss>=2+hqExtraMiss()||BZ.sig<=0){blazeFinish(false,'强攻保险箱房时被击倒');return;}
            if(!shielded)toast('💢 中弹！信号值 '+Math.max(0,BZ.sig));
          }
          i++;
          if(i>=total){
            s.dead=true;s.cd=60000;BZ.killed++;
            const rest=blazeVaultGuards(s);
            /* 精锐身上的装备比箱子里的讲究：件数随难度涨，军械库还能多搜出一件 */
            const dn=BLAZE_DROP.guard.n+(diff.id>=2?1:0)+(deptLevel('arms')>=3?1:0);
            const R2=blazeRollInto(site,diff,BLAZE_DROP.guard.boost,0,dn);
            SFX.win();
            /* 守卫解决光了，屋里的保险箱解锁 */
            if(!rest.length){
              /* 只解锁同一间屋里的箱子：别的屋子还锁着 / 还守着 */
              BLAZE_SPOTS.forEach(x=>{if(x.t==='vault'&&x.room===s.room)x.locked=false;});
              /* 保险箱房：最后一个人倒下，铁闸升起 —— 这间屋从现在起才进得去 */
              const wasOpen=!!BZ.vaultOpen;
              blazeVaultSync();
              if(BZ.vaultOpen&&!wasOpen){
                buildStatic();          // 门得从红铁闸重画成开着的门槛
                toast('🔓 守卫已清空 · 保险箱房的门开了');
              }else toast('🔓 守卫已清空，保险箱可以开了');
            }
            openPanel(`
              <h2>${s.name} 已解决</h2>
              <div class="sub">${esc(site.name)} · 保险箱房 · 缴获 ${R2.list.length} 件</div>
              <div class="center" style="font-size:52px;margin:6px 0">💥</div>
              ${blazeLootGridHtml(R2.list,R2.dropped)}
              <div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);line-height:var(--lh-base);margin-top:8px">
                背包 <b style="color:#ffd76a">${blazeBagUsed()} / ${blazeBagCap()}</b> 格<br>
                ${rest.length
                  ? `<span style="color:#ffb0b0">屋里还有 ${rest.length} 名守卫</span>`
                  : `<b style="color:#b9f2d3">全部守卫已清空 · 🔐 保险箱已解锁</b>`}
              </div>
              ${blazeSigBar()}
              <div class="row"><button class="btn primary" id="ok">继续行动</button></div>`);
            $('ok').onclick=()=>{closePanel();BZ.busy=false;blazeAfter();};
          }else setTimeout(step,280);
        }});
    }
    step();
  };
}

/* ---------- 搜：保险箱（守卫清空后才打得开） ---------- */
function blazeOpenVault(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const g=blazeVaultGuards(s);
  if(g.length){
    toast('🔒 还有 '+g.length+' 名守卫，先解决他们');
    BZ.busy=true;
    openPanel(`
      <h2>🔒 保险箱还锁着</h2>
      <div class="sub">${esc(site.name)} · 保险箱房</div>
      <div class="center" style="font-size:52px;margin:6px 0">💂</div>
      <div class="center" style="line-height:var(--lh-loose)">
        屋里还有 <b style="color:#ffb0b0">${g.length}</b> 名守卫站着，<br>
        他们不走，箱子就开不了。<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">打赢守卫的缴获比普通箱子厚得多</span>
      </div>
      <div class="row"><button class="btn primary" id="ok">知道了</button></div>`);
    $('ok').onclick=()=>{closePanel();BZ.busy=false;};
    return;
  }
  if(s.needKey&&!(BZ.gear&&BZ.gear.key)){
    toast('🔑 需要钥匙卡，去特勤处采购');
    BZ.busy=true;
    openPanel(`
      <h2>🔑 打不开</h2>
      <div class="sub">${esc(site.name)} · 高价值保险箱</div>
      <div class="center" style="font-size:52px;margin:6px 0">💠</div>
      <div class="center" style="line-height:var(--lh-loose)">
        这个箱子要 <b style="color:#ffd76a">🔑 保险箱钥匙卡</b> 才开得动。<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">特勤处升到 2 级后，在「🏪 战备采购」里买</span>
      </div>
      <div class="row"><button class="btn primary" id="ok">知道了</button></div>`);
    $('ok').onclick=()=>{closePanel();BZ.busy=false;};
    return;
  }
  const site2=site;
  /* big 0 = 房卡房里白送的小保险箱 · 1 = 保险箱 · 2 = 要钥匙卡的高价值箱 */
  const cfg=(s.big===2)?BLAZE_DROP.vaultBig
           :((s.big===1)?BLAZE_DROP.vault:BLAZE_DROP.vaultSmall);
  const fl=cfg.floor||0;
  blazeAsk({rid:pick(site.rids),tier:Math.min(3,diff.tier+1),
    title:'🔐 '+(s.name||'保险箱'),
    /* 把保底档位写在破解面板上：玩家得先看见「最差也是绿的」，
       才会愿意为了一座保险箱去清守卫、花钱买卡 */
    sub:'正在破解 · '+site2.name+(fl?(' · 保底 '+RARITY[fl].e+RARITY[fl].n):''),
    tag:diff.emoji+' '+diff.name+' · 高价值容器',
    bar:blazeSigBar(),
    nextText:'开箱 →',
    onDone(ok){
      closePanel();
      if(!ok){
        s.looted=true;BZ.sig-=2;
        toast('💥 破解失败，警报响起！信号值 '+Math.max(0,BZ.sig));
        blazeAfter();return;
      }
      if(s.needKey&&BZ.gear.key)BZ.gear.key=0;   // 钥匙卡一次性的
      s.looted=true;BZ.opened++;
      /* 保险箱里塞的是成堆的物资，不是一小摞结晶：
         小保险箱 2 件 / 保险箱 3 件 / 高价值箱（要钥匙卡）4 件，
         稀有度加权与保底档位也一档比一档高 —— 见 BLAZE_DROP */
      const R2=blazeRollInto(site2,diff,cfg.boost,cfg.luck||0,cfg.n,fl);
      SFX.win();
      blazeShowLoot('🔐 保险箱开启',R2.list,R2.dropped);
    }});
}

/* ---------- 打：遭遇巡逻队 ----------
   三题对决，可以错一道；错两道就地阵亡。
   打赢了拿一大笔，打输了全丢 —— 所以遇见巡逻队，逃也是个选项。 */
function blazeFight(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  let i=0,miss=0;const total=3;
  function step(){
    blazeAsk({rid:pick(site.rids),tier:diff.tier,
      title:'💥 遭遇战 · 第 '+(i+1)+' / '+total+' 题',
      sub:'敌方巡逻队 · '+site.name,
      tag:diff.emoji+' '+diff.name+' · 交火中',
      bar:blazeSigBar(),
      nextText:(i+1>=total?'结束交火 →':'下一题 →'),
      onDone(ok){
        if(!ok){
          miss++;
          /* 军械库：每场前 N 枪白挨；医疗包再额外顶一次 */
          const free=hqFreeMiss();
          let shielded=miss<=free;
          if(!shielded&&BZ.gear&&BZ.gear.medkit&&!BZ.medkitUsed){
            BZ.medkitUsed=true;shielded=true;
            toast('💊 战地医疗包生效，这次不掉信号值');
          }else if(shielded)toast('🛡️ 军械扛下了这一枪');
          if(!shielded)BZ.sig-=2;
          if(miss>=2+hqExtraMiss()||BZ.sig<=0){blazeFinish(false,'交火中被击倒');return;}
          if(!shielded)toast('💢 中弹！信号值 '+Math.max(0,BZ.sig));
        }
        i++;
        if(i>=total){
          s.dead=true;s.cd=60000;BZ.killed++;
          /* 巡逻队身上揣着东西，而且出好货的概率比箱子高一点；
             难度越高、军械库越深，能搜出来的件数越多 */
          const dn=BLAZE_DROP.patrol.n+(diff.id>=2?1:0)+(diff.id>=3?1:0)
                  +(deptLevel('arms')>=3?1:0);
          const R2=blazeRollInto(site,diff,BLAZE_DROP.patrol.boost,0,dn);
          SFX.win();
          openPanel(`
            <h2>敌方小队已清除</h2>
            <div class="sub">${esc(site.name)} · 击溃 ${BZ.killed} 队 · 缴获 ${R2.list.length} 件</div>
            <div class="center" style="font-size:52px;margin:6px 0">💥</div>
            ${R2.list.length===1?`<div class="lootbox"
              style="background:${(RAR_OF[R2.list[0].r]||RARITY[0]).bg};
              border-color:${(RAR_OF[R2.list[0].r]||RARITY[0]).bd}">
              <div class="le">${R2.list[0].e}</div>
              <div class="ln">${esc(R2.list[0].n)}</div>
              <div style="margin-top:6px">${rarityTag(R2.list[0].r)}
                ${lootSizeTag(R2.list[0])}</div>
              <div class="lv">估值 ${R2.list[0].val} 🪙 · 占 ${lootSlot(R2.list[0])} 格</div></div>`
              :blazeLootGridHtml(R2.list,R2.dropped)}
            <div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);line-height:var(--lh-base)">
              背包 <b style="color:#ffd76a">${blazeBagUsed()} / ${blazeBagCap()}</b> 格<br>
              巡逻队身上带的总比箱子里的多
            </div>
            ${blazeSigBar()}
            <div class="row"><button class="btn primary" id="ok">继续行动</button></div>`);
          $('ok').onclick=()=>{closePanel();BZ.busy=false;blazeAfter();};
        }else setTimeout(step,280);
      }});
  }
  step();
}

/* ---------- 撤：撤离序列 ---------- */
function blazeExfilStart(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const left=BLAZE_SPOTS.filter(v=>v.t==='crate'&&!v.looted).length;
  const bagVal=(BZ.bag||[]).reduce((a,b)=>a+b.val,0);
  openPanel(`
    <h2>🚨 ${esc(s.name)}</h2>
    <div class="sub">${esc(site.name)} · ${diff.emoji} ${diff.name}</div>
    <div class="center" style="font-size:54px;margin:4px 0">🚁</div>
    <div class="center" style="line-height:var(--lh-loose)">
      背包 <b style="color:#ffd76a;font-size:var(--fs-xl)">${blazeBagUsed()}</b>
      / ${blazeBagCap()} 格（${(BZ.bag||[]).length} 件） · 估值
      <b style="color:#ffd76a;font-size:var(--fs-xl)">${bagVal}</b> 🪙<br>
      撤离路上会有 <b style="color:#ffb0b0">${BZ.waves}</b> 波拦截<br>
      <b style="color:#ff6b6b">任何一题答错，背包里的东西一件都带不走</b><br>
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">地图上还剩 ${left} 个物资箱没开</span>
    </div>
    ${blazeSigBar()}
    <div class="row">
      <button class="btn" id="no">再搜一会儿</button>
      <button class="btn primary" id="go">开始撤离</button>
    </div>`);
  $('no').onclick=closePanel;
  $('go').onclick=()=>blazeExfilRun(s);
}

function blazeExfilRun(s){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const total=BZ.waves;
  let w=0;
  function step(){
    blazeAsk({rid:pick(site.rids),tier:diff.tier,
      title:'🚁 撤离中 · 第 '+(w+1)+' / '+total+' 波',
      sub:'冲向 '+s.name+' · 敌方正在封锁撤离路线',
      tag:diff.emoji+' '+diff.name+' · 敌方拦截',
      bar:blazeBar(w/total*100,'#5ed6ff')+
        `<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-bottom:8px">
           撤离进度 ${Math.round(w/total*100)}%</div>`,
      nextText:(w+1>=total?'登机 →':'继续推进 →'),
      onDone(ok){
        if(!ok){blazeFinish(false,'撤离途中被拦截');return;}
        w++;
        if(w>=total){blazeFinish(true);return;}
        toast('✅ 突破第 '+w+' 波');
        setTimeout(step,300);
      }});
  }
  step();
}

/* ---------- 每次交互之后的统一收尾 ---------- */
function blazeAfter(){
  BZ.busy=false;
  if(BZ.sig<=0){blazeFinish(false,'信号值归零，被锁定');return;}
  blazeSaveRun();updateHUD();
}

/* ---------- 散落物资（走过去自动捡） ----------
   地上扔的也是真东西，只是成色最差：boost 只有 0.5，基本出不了紫。 */
function blazeLoosePick(c){
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const R2=blazeRollInto(site,diff,BLAZE_DROP.loose.boost,0,BLAZE_DROP.loose.n);
  const L=R2.list[0];
  SFX.coin();
  toast('📦 捡到 '+L.e+' '+L.n+(R2.dropped.length?'（背包塞不下，扔了最不划算的一件）':''));
  const by=Math.sin(t/300+c.bob)*5;
  fxPickup(c.x,c.y+by,L.e,L.val);
  blazeSaveRun();updateHUD();
}

/* ---------- 巡逻队移动与触发 ---------- */
function blazeTick(dt){
  if(!BZ.active||BZ.busy)return;
  const reg=BLAZE_REGIONS[0];if(!reg)return;
  const [rx,ry,rw,rh]=reg.rect;
  const k=dt/16.67;
  for(const s of BLAZE_SPOTS){
    /* 保险箱房的守卫：站桩不动，谁靠近就跟谁打 —— 绕不过去的 */
    if(s.t==='guard'){
      if(s.dead)continue;
      /* 门还锁着的屋里守卫：隔着墙不该触发交火 */
      if(s.room&&s.room.lock>0&&!s.room.opened)continue;
      if(s.cd>0){s.cd-=dt;continue;}
      if(dist(state.x,state.y,s.x,s.y)<132){
        s.cd=4000;SFX.wrong();
        toast('💂 守卫发现了你！');
        blazeFightGuard(s);return;
      }
      continue;
    }
    if(s.t!=='patrol'||s.dead)continue;
    if(s.cd>0){s.cd-=dt;continue;}
    if(s.path&&s.path.length){
      const p=s.path[s.pi%s.path.length];
      const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy);
      if(d<9){s.pi=(s.pi+1)%s.path.length;}
      else{
        const nx2=s.x+dx/d*1.25*k, ny2=s.y+dy/d*1.25*k;
        /* 巡逻队不穿墙、也不许走出战区。
           这里必须用 blazeWalkable（= 不规则边界内 + 不撞墙/岩石/河），
           以前只判 blazeBlocked，边界那一层漏了：巡逻队会一路走进焦土禁区，
           玩家追不进去，看上去就是「敌人跑到地图上不该在的地方」。
           另外不许逛进保险箱房：那间屋的敌人是固定守卫，
           巡逻兵从门外晃进去，就成了「敌人刷在保险房里」。
           （本来就在屋里的旧存档不管，只挡住「从外面走进去」这一步） */
        /* 巡逻队是野外部队：任何一间屋子都不许晃进去（保险箱房尤其）。
           wasIn 是给旧存档留的口子：人已经站在屋里了，得先让他走出来，
           走出来之后就再也进不去了。 */
        const wasIn=bzInAnyRoom(s.x,s.y);
        const free=(x,y)=>blazeWalkable(x,y)&&(!bzInAnyRoom(x,y)||wasIn);
        if(free(nx2,ny2)){s.x=nx2;s.y=ny2;}
        else if(free(nx2,s.y))s.x=nx2;   // 沿障碍滑半步，别一撞就掉头
        else if(free(s.x,ny2))s.y=ny2;
        else s.pi=(s.pi+1)%s.path.length;
      }
      /* 兜底：读旧档或地形变更后，人可能已经站在界外，拉回最近的合法点 */
      if(!blazeWalkable(s.x,s.y)){
        const q=bzNearestWalkable(s.x,s.y,320);
        if(q){s.x=q.x;s.y=q.y;}
        else if(blazeWalkable(s.ax,s.ay)){s.x=s.ax;s.y=s.ay;}
      }
      s.x=clamp(s.x,rx+34,rx+rw-34);s.y=clamp(s.y,ry+34,ry+rh-34);
    }
    if(dist(state.x,state.y,s.x,s.y)<120){
      s.cd=2500;SFX.wrong();
      blazeFight(s);return;
    }
  }
  /* 巡逻兵一直在动，位置得隔一会儿落一次盘，刷新页面不至于从头再来 */
  if(!BZ._sv||t-BZ._sv>1500){BZ._sv=t;blazeSaveRun();}
}

