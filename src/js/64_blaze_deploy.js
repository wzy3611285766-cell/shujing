/* =========================================================
   部署 / 结算 / 回基地
   ========================================================= */
/* 情报处的开局简报：等级越高，开局就知道得越多。
   方位一律按「相对出生点」说，玩家不用对着小地图猜。 */
function bzBearing(x0,y0,x1,y1){
  const dx=x1-x0,dy=y1-y0;
  if(Math.abs(dx)<1&&Math.abs(dy)<1)return '脚下';
  const a=Math.atan2(dx,-dy)*180/Math.PI;
  const names=['正北','东北','正东','东南','正南','西南','正西','西北'];
  return names[((Math.round(a/45)%8)+8)%8];
}
function blazeIntelBrief(){
  /* 📟 开局情报券把待遇拉到满级，情报处没升过也能拿到完整简报 */
  const lv=BZ.intelAid?BLAZE_DEPT_MAX:deptLevel('intel');
  if(lv<2||!BZ.active)return '';
  const msgs=[];
  const vr=BZ.map&&BZ.map.vault;
  if(vr){
    const gn=BLAZE_SPOTS.filter(s=>s.t==='guard'&&!s.dead&&s.room===vr).length;
    msgs.push('🔐 保险箱房在'+bzBearing(state.x,state.y,vr.x+vr.w/2,vr.y+vr.h/2)+
      '方向 '+blazeGridOf(vr.x+vr.w/2,vr.y+vr.h/2)+(gn?(' · 门外 '+gn+' 名守卫'):' · 门已开'));
  }
  if(lv>=3){
    BLAZE_SPOTS.filter(s=>s.t==='door'&&!s.opened).slice(0,3).forEach(s=>{
      const c=BLAZE_CARD_OF[s.card]||{};
      msgs.push((c.e||'🔒')+(c.n||'上锁')+'门在'+bzBearing(state.x,state.y,s.x,s.y)+
        '方向 '+blazeGridOf(s.x,s.y));
    });
  }
  if(lv>=4){
    msgs.push('📦 全场 '+BLAZE_SPOTS.filter(s=>s.t==='crate'&&!s.looted).length+' 个物资箱');
  }
  if(!msgs.length)return '';
  return '📡 情报处：'+msgs.join(' · ');
}

function blazeDeploy(){
  /* 📌 每日复习闸（4.0.22）：今天到期的错题还没复习完，就不让开新的一局。
     放在最前面 —— 连战备核算都别做，免得白扣东西。
     复习完会回调 blazeDeploy 自己，玩家不用再点一次部署。 */
  if(typeof reviewNeed==='function'&&reviewNeed()>0){
    if(typeof reviewGate==='function')reviewGate(blazeDeploy);
    return false;
  }
  const pick=BLAZE_STATE.pick||{site:'math',diff:1};
  const site=BLAZE_SITE_OF[pick.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[pick.diff]||BLAZE_DIFF[0];

  /* ---------- 入局核算：战备值够不够、门票买不买得起 ----------
     放在扣物资之前：不达标就一个子儿都不动，别把装备白扣了再告诉人进不去 */
  const chk=blazeEntryCheck();
  if(!chk.ok){
    toast('战备值不足 '+chk.val+'/'+chk.req+'，还差 '+chk.need);
    SFX.wrong();
    blazeLobbyTab=0;blazeRenderLobby();
    return false;
  }
  if(chk.poor){
    toast('行动经费不足：还差 '+chk.needMoney+' 🪙');
    SFX.wrong();
    blazeLobbyTab=0;blazeRenderLobby();
    return false;
  }
  const naked=chk.naked;

  /* 勾选的物资从仓库里扣掉 —— 带出去了就没了。
     跑刀时不带任何东西，仓库里一件都不动。 */
  const g={};BLAZE_GEAR.forEach(it=>{g[it.id]=0;});
  if(!naked)BLAZE_GEAR.forEach(it=>{
    if(BZ.carry&&BZ.carry[it.id]&&(BLAZE_STATE.gear[it.id]|0)>0){
      BLAZE_STATE.gear[it.id]--;g[it.id]=1;
    }
  });
  /* 各部门的长期加成在这里一次性发到位。
     跑刀是赤手空拳进图，白送的那些配发物资也不给 —— 免票就别想领装备 */
  if(!naked){
    if(deptLevel('log')>=2)g.bag=1;      // 后勤处：白送扩容背包
    if(deptLevel('med')>=4)g.medkit=1;   // 医疗站：白送战地医疗包
  }
  /* 门票：当场扣，一去不回。
     🎟️ 抵用券优先 —— 券是一次性的，能省则省，别把哈夫币花在能抵的地方 */
  let fee=naked?0:(diff.fee|0), usedTicket=false;
  if(fee>0&&aidCount('ticket')>0){
    aidUse('ticket');usedTicket=true;fee=0;
    toast('🎟️ 抵用券生效：这次的行动经费免了');
  }else if(fee>0){
    BLAZE_STATE.crystals=Math.max(0,(BLAZE_STATE.crystals|0)-fee);
    BLAZE_STATE.spent=(BLAZE_STATE.spent|0)+fee;
    BLAZE_STATE.fee=(BLAZE_STATE.fee|0)+fee;
  }
  /* 📟 开局情报券：本局把情报处的待遇拉满，不占特勤处等级 */
  if(aidCount('scan')>0){
    aidUse('scan');BZ.intelAid=true;
    toast('📟 开局情报已送达');
  }else BZ.intelAid=false;
  BZ.naked=naked;BZ.fee=fee;BZ.usedTicket=usedTicket;
  /* 勾选表只在真正带走了东西时清空 —— 跑刀一件没动，
     回到大厅还看得见上次勾了什么，买了装备就能直接再部署 */
  if(!naked){BZ.carry={};BLAZE_GEAR.forEach(it=>{BZ.carry[it.id]=0;});}
  goTarget=null;                 // 换了战场，旧落点留在上一个世界了

  BZ.active=true;BZ.phase='search';BZ.site=site.id;BZ.diff=diff.id;
  BZ.loot=0;BZ.cards=0;
  /* 跑刀没有配发装备护着，少一格信号值 */
  BZ.sigMax=Math.max(1,diff.sig+(g.battery?1:0)+hqSigBonus()-(naked?1:0));
  BZ.sig=BZ.sigMax;
  BZ.waves=diff.waves;BZ.opened=0;BZ.killed=0;BZ.busy=false;BZ.gear=g;BZ._sv=0;
  BZ.bag=[];BZ.medkitUsed=false;

  const sp=blazeGenMap(site.id,diff.id,g);
  state.x=sp.spawnX;state.y=sp.spawnY;state.region='zone';
  /* 换场先清实体层：营地那枚 🎖️ 指挥部不会跟着上飞机，
     战场上那些箱子 / 守卫也不会跟着回基地（4.0.13） */
  entWipe();
  buildStatic();
  blazeCamTo(state.x,state.y);
  blazeSaveRun();updateHUD();
  showBanner('🚀 '+site.name,naked?'🪖 跑刀进图 · 一件都别落下':(diff.emoji+' '+diff.name+' · 活着回来'));
  SFX.unlock();
  /* 情报处的开局简报：等级越高，开局知道得越多 */
  const intel=blazeIntelBrief();
  if(naked){
    setQuestText('🪖 跑刀：没买票也没带货，活着走出去才有得赚（估值 ×'+
      BLAZE_NAKED_MUL+' · 阵亡零保底）',9000,true);
  }else{
    setQuestText(intel||'📦 搜刮物资箱，装满背包就去 🚁 撤离点',intel?11000:7000,true);
  }
}

function blazeFinish(ok,reason){
  const site=BLAZE_SITE_OF[BZ.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[BZ.diff]||BLAZE_DIFF[0];
  const bag=(BZ.bag||[]).slice();
  let bonus=null,saved=[],squeeze=[];

  /* 入库：撤离成功带回来的东西全部进仓库。
     仓库里的物资有两个去处 —— 💱 交易站卖成哈夫币，
     或者留给 🏛️ 特勤处当升级材料。卖一件就少一件材料，自己掂量。 */
  function stashIn(list){
    if(!BLAZE_STATE.stash)BLAZE_STATE.stash={};
    if(!BLAZE_STATE.dex||typeof BLAZE_STATE.dex!=='object')BLAZE_STATE.dex={};
    list.forEach(L=>{
      const k=L.n;
      const rec=BLAZE_STATE.stash[k]||{n:L.n,e:L.e,r:L.r,val:0,cnt:0,
        slot:lootSlot(L),cat:L.cat||'',nt:L.nt?1:0};
      rec.cnt++;rec.val+=L.val;
      rec.slot=lootSlot(L);rec.cat=L.cat||rec.cat||'';
      rec.nt=L.nt?1:(rec.nt||0);
      if(L.r>rec.r){rec.r=L.r;rec.e=L.e;}
      BLAZE_STATE.stash[k]=rec;
      /* 图鉴是只增不减的历史记录，卖光了也还在，留给收藏页翻 */
      const d=BLAZE_STATE.dex[k]||{n:L.n,e:L.e,r:L.r,val:0,cnt:0,
        slot:lootSlot(L),cat:L.cat||'',nt:L.nt?1:0};
      d.cnt++;d.val+=L.val;
      d.slot=lootSlot(L);d.cat=L.cat||d.cat||'';
      if(L.r>d.r){d.r=L.r;d.e=L.e;}
      BLAZE_STATE.dex[k]=d;
      if(!BLAZE_STATE.best||L.val>(BLAZE_STATE.best.v|0))
        BLAZE_STATE.best={r:L.r,n:L.n,e:L.e,v:L.val};
    });
  }

  if(ok){
    /* 跑刀进图：省下的门票钱，从这批货的估值里扣回去。
       打折要在统计与入库之前做完，免得结算页和仓库对不上账 */
    if(BZ.naked){
      (BZ.bag||[]).forEach(L=>{L.val=Math.max(1,Math.round(L.val*BLAZE_NAKED_MUL));});
    }
    /* 撤离奖励也是一件物资 —— 这里从不发结晶，钱只能回基地去卖 */
    const R2=blazeRollInto(site,diff,BLAZE_DROP.exfil.boost,0,BLAZE_DROP.exfil.n);
    if(R2.list.length){
      bonus=R2.list[0];
      if(BZ.naked)bonus.val=Math.max(1,Math.round(bonus.val*BLAZE_NAKED_MUL));
    }
    squeeze=R2.dropped;
    /* 补发可能把背包挤掉一件，直接按最终背包重新取一遍，
       免得被挤掉的那件也跟着混进仓库 */
    bag.length=0;
    (BZ.bag||[]).forEach(L=>bag.push(L));
    stashIn(bag);
    BLAZE_STATE.bstat.exfil=(BLAZE_STATE.bstat.exfil|0)+1;
    BLAZE_STATE.bstat.items=(BLAZE_STATE.bstat.items|0)+bag.length;
    const v=bag.reduce((a,b)=>a+b.val,0);
    BLAZE_STATE.bstat.loot=(BLAZE_STATE.bstat.loot|0)+v;
    BLAZE_STATE.bstat.best=Math.max(BLAZE_STATE.bstat.best|0,v);
    SFX.win();
  }else{
    /* 阵亡保底：🔒 保密箱（后勤处 4 级）留最贵的 1 件，
       📄 行动保险再留 2 件，两者可以叠加。
       跑刀进图没有保底 —— 保险都没买，凭什么给你留东西 */
    let keep=0;
    if(!BZ.naked){
      if(hqSecured())keep+=1;
      if(BZ.gear&&BZ.gear.ins)keep+=2;
    }
    if(keep>0&&bag.length){
      saved=bag.slice().sort((a,b)=>b.val-a.val).slice(0,keep);
      stashIn(saved);
    }
    BLAZE_STATE.bstat.wipe=(BLAZE_STATE.bstat.wipe|0)+1;
    SFX.wrong();
  }
  const bagVal=bag.reduce((a,b)=>a+b.val,0);
  BZ.active=false;BZ.phase='over';BZ.busy=false;BZ.loot=0;BZ.bag=[];
  BLAZE_STATE.run=null;
  save();
  updateHUD();

  const topBag=bag.slice().sort((a,b)=>b.val-a.val).slice(0,8);

  /* 结算面板不再上锁：它是这一局的终点，不是"正在作答的题"。
     以前它跟着答题面板一起上了锁，Esc 关不掉、点遮罩没反应、
     ☰ 里切世界被"先把这道题做完"拦下 —— 阵亡之后人就困在战场里出不去了。
     _finishing 是给 openPanel 的暗号：这张面板是结算自己开的，
     不是被别的入口顶掉的，别触发"替玩家回基地"的兜底。 */
  BZ._finishing=true;
  openPanel(`
    <h2>${ok?'✅ 撤离成功':'❌ 行动失败'}</h2>
    <div class="sub">${esc(site.emoji+' '+site.name)} · ${diff.emoji} ${diff.name}</div>
    <div class="center" style="font-size:56px;margin:4px 0">${ok?'🚁':'💀'}</div>
    ${ok?`
      <div class="center" style="line-height:var(--lh-loose)">
        带回 <b style="color:#ffd76a;font-size:var(--fs-2xl)">${bag.length}</b> 件物资
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">占 ${blazeBagUsed(bag)} 格 · 估值 ${bagVal} 🪙</span><br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">
          开箱 ${BZ.opened} 个 · 击溃 ${BZ.killed} 队
          ${(BZ.cards|0)?' · 🔑 刷开 '+BZ.cards+' 扇门':''}
          ${bonus?'<br>🚁 指挥部补发：'+bonus.e+' '+esc(bonus.n)+' '+rarityTag(bonus.r):''}
          ${squeeze&&squeeze.length?'<br><span style="color:#ffd0d0">🎒 背包装不下，挤掉了 '+squeeze.map(L=>L.e+L.n).join('、')+'</span>':''}
          <br>
          ${hqLootMul()>1?'🎒 后勤处估值 ×'+hqLootMul().toFixed(2)+'<br>':''}
          ${BZ.naked?'🪖 跑刀进图：这批货只能按 8 折入库<br>':''}
          ${BZ.usedTicket?'🎟️ 行动经费已用抵用券免除<br>':''}
          ${(BZ.fee|0)>0?'🎟️ 行动经费 <b style="color:#ff8a8a">-'+(BZ.fee|0)+' 🪙</b><br>':''}
          <b style="color:#ffd76a">去「💱 交易站」把它们卖成哈夫币</b></span>
      </div>`
    :`
      <div class="center" style="line-height:var(--lh-loose)">
        ${esc(reason||'被淘汰')}<br>
        丢失 <b style="color:#ff8a8a;font-size:var(--fs-2xl)">${bag.length}</b> 件物资
        <span style="font-size:var(--fs-sm);color:#9cc0e0">（估值 ${bagVal} 🪙）</span><br>
        ${saved.length
          ?`<span style="color:#b9f2d3;font-size:var(--fs-sm)">${(BZ.gear&&BZ.gear.ins)?'📄 行动保险':'🔒 保密箱'}保住了 ${saved.length} 件：
            ${saved.map(L=>L.e+esc(L.n)).join('、')}</span>`
          :(BZ.naked
            ?`<span style="color:#ff8a8a;font-size:var(--fs-sm)">🪖 跑刀阵亡：没买保险，一件都留不下</span>`
            :`<span style="color:#9cc0e0;font-size:var(--fs-sm)">没带出去的东西，一件都不算数</span>`)}
        ${BZ.usedTicket?'<br><span style="color:#9fe4ff;font-size:var(--fs-sm)">🎟️ 门票走的是抵用券，哈夫币没损失</span>':''}
        ${(BZ.fee|0)>0?'<br><span style="color:#ff8a8a;font-size:var(--fs-sm)">🎟️ 行动经费 '+(BZ.fee|0)+' 🪙 也打了水漂</span>':''}
      </div>`}
    ${topBag.length?`
      <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin:10px 0 6px">
        ${ok?'随你一起上机的战利品':'没能带出去的战利品'}${bag.length>topBag.length?'（最好的 '+topBag.length+' 件）':''}</div>
      <div class="lootgrid">${topBag.map(L=>{
        const r=RAR_OF[L.r]||RARITY[0];
        return `<div class="lootcell" style="background:${r.bg};border-color:${r.bd};
          ${ok?'':'opacity:.55'}">
          <div class="e">${L.e}</div><div class="n">${esc(L.n)}</div>
          <div class="v">${L.val} 🪙</div>
          <div class="s">${lootSlot(L)} 格${L.cat?' · '+esc(L.cat):''}</div></div>`;}).join('')}</div>`
    :''}
    <div class="pbar" style="margin:12px 0 4px">
      <i style="width:${ok?100:0}%;background:${ok?'#34c77b':'#ff6b6b'}"></i></div>
    <div class="center" style="font-size:var(--fs-xs);color:#9cc0e0">
      仓库 🪙 ${BLAZE_STATE.crystals|0} · 待售物资 ${blazeStashCount(0)} 件
      · 累计撤离 ${BLAZE_STATE.bstat.exfil|0} 次 / 阵亡 ${BLAZE_STATE.bstat.wipe|0} 次
    </div>
    <div class="row bz-foot">
      ${ok&&bag.length?`<button class="btn" id="trade">💱 去交易站卖掉</button>`:''}
      <button class="btn" id="again">🚀 再部署一次</button>
      <button class="btn primary" id="home">🎖️ 回基地</button>
    </div>`);
  BZ._finishing=false;
  $('again').onclick=()=>{closePanel();blazeToLobby(true);showBlazeLobby();};
  $('home').onclick =()=>{closePanel();blazeToLobby();};
  const tr=$('trade');
  /* 卖东西得先回基地：以前直接盖一层大厅面板，
     关掉大厅后人还站在已经结束的战场上，哪儿都点不动 */
  if(tr)tr.onclick=()=>{audioKick();closePanel();blazeToLobby(true);blazeLobbyTab=2;blazeRenderLobby();};
}

/* 回基地：清掉这一局的地图，换回营地场景 */
function blazeToLobby(silent){
  BZ.active=false;BZ.phase='lobby';BZ.busy=false;BZ.loot=0;BZ.sig=0;
  BZ.bag=[];BZ.medkitUsed=false;
  BLAZE_STATE.run=null;
  blazeBuildLobby();
  state.x=800;state.y=590;state.region='base';
  /* 回营地同样清一次：战场上的箱子 / 保险箱 / 巡逻队不能跟着回来（4.0.13） */
  entWipe();
  buildStatic();
  blazeCamTo(state.x,state.y);
  save();updateHUD();
  if(!silent){
    showBanner('🎖️ 行动基地','选个地点和难度，重新部署');
    setQuestText('去 🎖️ 指挥部选择行动地点与难度',6000,true);
  }
}

