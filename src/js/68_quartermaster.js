/* =========================================================
   🏛️ 特勤处 —— 花哈夫币和稀有物资换长期能力
   ========================================================= */
function blazeHqHtml(){
  const crystals=BLAZE_STATE.crystals|0;
  const stashTotal=blazeStashCount(0);
  const spent=BLAZE_STATE.spent|0, spentItem=BLAZE_STATE.spentItem|0;
  const body=BLAZE_DEPT.map(d=>{
    const lv=deptLevel(d.id), cur=deptCur(d.id), nx=deptNext(d.id);
    const can=nx?deptCanUp(d.id):null;
    const full=lv>=BLAZE_DEPT_MAX;
    return `<div class="dept" style="${lv>1?'border-color:'+d.c+'55':''}">
      <div class="dhd">
        <span class="de">${d.e}</span>
        <span class="dn" style="color:${d.c}">${esc(d.n)}</span>
        <span class="dbar">${d.lv.map((_,k)=>`<i class="${k<lv?'on':''}"></i>`).join('')}</span>
        <span class="dlv">${lv}/${BLAZE_DEPT_MAX}</span>
      </div>
      <div class="dds">${esc(d.desc)}</div>
      <div class="dcur"><b style="color:#b9f2d3">现行</b>：${esc(cur.perk)}</div>
      ${nx?`
        <div class="dnx">
          <div style="color:#cfe6ff">⬆️ ${esc(nx.perk)}</div>
          <div class="dcost">
            <span style="color:${can.okMoney?'#b9f2d3':'#ff8a8a'}">🪙 ${nx.cost}
              ${can.okMoney?'✓':'· 差 '+(nx.cost-crystals)}</span>
            ${nx.need?`<span style="color:${can.okItem?'#b9f2d3':'#ff8a8a'}">
              ${(RAR_OF[nx.need.r]||RARITY[0]).e} ${(RAR_OF[nx.need.r]||RARITY[0]).n} ×${nx.need.n}
              ${can.okItem?'✓':'· 只有 '+blazeStashCount(nx.need.r)}</span>`:''}
          </div>
        </div>
        <button class="btn ${can.ok?'primary':''}" id="up_${d.id}" ${can.ok?'':'disabled'}
          style="width:100%;justify-content:center;margin-top:8px">
          ${can.ok?'⬆️ 升级到 '+(lv+1)+' 级':(can.okMoney?'📦 物资不够':'🪙 结晶不够')}</button>`
      :`<div class="dmax">🏆 已满级</div>`}
    </div>`;
  }).join('');
  return `
    <div class="center" style="font-size:40px;margin:0 0 2px">🏛️</div>
    <div class="sub" style="margin-bottom:10px">
      仓库 <b style="color:#ffd76a">${crystals}</b> 🪙
      · 库存物资 <b style="color:#ffd76a">${stashTotal}</b> 件（可卖 · 可上缴）<br>
      <span style="font-size:var(--fs-xs);color:#7d94ab">
        已经砸进去 ${spent} 🪙 与 ${spentItem} 件稀有物资</span>
    </div>
    <div class="deptlist">${body}</div>
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:10px;line-height:var(--lh-base)">
      升级要同时掏 <b style="color:#ffd76a">哈夫币</b> 和 <b style="color:#ffd76a">仓库里的稀有物资</b>；<br>
      物资只有撤离成功才会留下 —— <b>卖光了就升不了级</b>，这是要自己掂量的取舍。
    </div>
    <div class="row">
      <button class="btn" id="hqstash">🗄️ 看收藏柜</button>
      <button class="btn primary" id="back">← 返回部署</button>
    </div>`;
}
function blazeDeptUpgrade(did){
  const d=deptOf(did), nx=deptNext(did);
  if(!nx){toast(d.n+'已经是满级了');return;}
  const can=deptCanUp(did);
  if(!can.ok){
    if(!can.okMoney)toast('还差 '+(nx.cost-(BLAZE_STATE.crystals|0))+' 🪙');
    else toast('需要 '+(RAR_OF[nx.need.r]||RARITY[0]).n+'物资 ×'+nx.need.n+
               '，收藏柜里只有 '+blazeStashCount(nx.need.r)+' 件');
    return;
  }
  /* 确认走游戏内弹窗（4.0.14）：原生 confirm 会把全屏踢掉 */
  const rr=RAR_OF[nx.need&&nx.need.r]||RARITY[0];
  uiConfirm({
    icon:d.e||'🏛️',
    title:'把「'+d.n+'」升到 '+(deptLevel(did)+1)+' 级？',
    sub:'Lv'+deptLevel(did)+' → Lv'+(deptLevel(did)+1),
    lines:[{e:'🪙',n:'花费哈夫币',v:nx.cost+' 🪙'}]
      .concat(nx.need?[{e:rr.e,n:rr.n+' 物资',c:'×'+nx.need.n,v:'一并上缴'}]:[]),
    total:{label:'本次花费',v:nx.cost,unit:'🪙'},
    warn:'升级后这些结晶与物资不再退还',
    ok:'确认升级'},()=>{
    BLAZE_STATE.crystals=(BLAZE_STATE.crystals|0)-nx.cost;
    if(nx.need)blazeStashConsume(nx.need.r,nx.need.n);
    deptSet(did,deptLevel(did)+1);
    BLAZE_STATE.spent=(BLAZE_STATE.spent|0)+nx.cost;
    BLAZE_STATE.spentItem=(BLAZE_STATE.spentItem|0)+(nx.need?nx.need.n:0);
    save();SFX.win();
    toast(d.e+' '+d.n+' → '+deptLevel(did)+' 级');
    blazeLobbyTab=3;blazeRenderLobby();
  },()=>{blazeLobbyTab=3;blazeRenderLobby();});   // 取消也要把特勤处那一屏画回来
}

/* 采购行：战备物资的统一渲染（折扣价与解锁提示都在这里算）。
   accent 是房卡用的强调色 —— 只换边框与底色，**结构与按钮一律和物资行相同**。
   4.0.12 之前房卡是另写一套 .kcard 标记，那颗购买按钮因此没落到 .item .buy
   的金色样式上，成了一颗浏览器默认灰按钮（同一页上两种长相）。
   一个渲染器就不会再长出第二套长相。 */
function blazeShopRow(it,gear,accent){
  const unlocked=hqShopUnlocked(it.id);
  const price=Math.round(it.price*hqDiscount());
  const poor=(BLAZE_STATE.crystals|0)<price;
  const style=accent?(' style="border-color:'+accent+'66;background:'+accent+'12'+
                      (unlocked?'':';opacity:.5')+'"')
                    :(unlocked?'':' style="opacity:.5"');
  return `<div class="item"${style}>
    <div class="ic">${unlocked?it.e:'🔒'}</div>
    <div style="flex:1;min-width:0">
      <div class="nm">${esc(it.n)}
        <span style="font-size:var(--fs-xs);color:#9cc0e0"> ×${gear[it.id]|0}</span>
        <span style="font-size:var(--fs-xs);color:#ffd76a"> 🎖️+${it.price|0}</span></div>
      <div class="ds">${unlocked?esc(it.d):('🔒 '+(deptUnlockHint(it.id)||'特勤处等级不足'))}</div>
    </div>
    <button class="buy" id="buy_${it.id}" ${(unlocked&&!poor)?'':'disabled'}>${price} 🪙</button>
  </div>`;
}
/* 一行字概括五个部门的等级与正在生效的加成 */
function blazeDeptBrief(){
  const lv=BLAZE_DEPT.map(d=>d.e+deptLevel(d.id)).join(' ');
  const extra=[];
  if(hqLootMul()>1)  extra.push('估值 ×'+hqLootMul().toFixed(2));
  if(hqSellMul()>1)  extra.push('回收 ×'+hqSellMul().toFixed(2));
  if(hqSigBonus()>0) extra.push('信号 +'+hqSigBonus());
  if(hqFreeMiss()>0) extra.push('免伤 '+hqFreeMiss()+' 枪');
  if(hqExtraMiss()>0)extra.push('容错 +'+hqExtraMiss()+' 题');
  if(hqGuardLess()>0)extra.push('守卫 −'+hqGuardLess()+' 题');
  if(hqDiscount()<1) extra.push('采购 8 折');
  if(hqSecured())    extra.push('阵亡保底');
  return lv+(extra.length?'　'+extra.join(' · '):'');
}
/* 这一档难度会刷出几间上锁房间（和 blazeGenMap 里的算法保持一致） */
function blazeLockRoomCount(diffId){
  const d=clamp(diffId|0,1,3);
  return clamp(1+(d>=2?1:0)+(deptLevel('cmd')>=3?1:0),0,7);
}

function blazeRenderLobby(){
  const pick=BLAZE_STATE.pick||{site:'math',diff:1};
  const site=BLAZE_SITE_OF[pick.site]||BLAZE_SITES[0];
  const diff=BLAZE_DIFF_OF[pick.diff]||BLAZE_DIFF[0];
  const st=BLAZE_STATE.bstat||{};
  const gear=BLAZE_STATE.gear||{};
  if(!BZ.carry||typeof BZ.carry!=='object')BZ.carry={};
  BLAZE_GEAR.forEach(it=>{if(BZ.carry[it.id]==null)BZ.carry[it.id]=0;});
  const carry=BZ.carry;
  /* 入局核算：战备值、行动经费、是不是跑刀 */
  const naked=!!BLAZE_STATE.naked;
  const ent=blazeEntryCheck(carry);
  const entReady=ent.ready;

  /* 携带物资的小结：算给玩家看这一局能多扛多少 */
  const perk=[];
  if(naked)perk.push('🪖 跑刀：不带任何物资，仓库一件都不动');
  else{
    if(carry.battery)perk.push('信号值 +1');
    if(carry.bag)    perk.push('背包 +10 格 · 估值 +20% · 稀有度 +15%');
    if(carry.ins)    perk.push('阵亡保住最贵 2 件');
    if(carry.scan)   perk.push('保险箱房上小地图');
    if(carry.medkit) perk.push('首次中弹不掉信号');
    if(carry.luck)   perk.push('稀有度 +40%');
    BLAZE_CARDS.forEach(c=>{if(carry[c.id])perk.push(c.e+' 可刷开一座'+c.n+'门');});
    if(deptLevel('log')>=2&&!carry.bag)perk.push('🎁 后勤处赠送扩容背包');
    if(deptLevel('med')>=4&&!carry.medkit)perk.push('🎁 医疗站赠送医疗包');
  }

  const body = blazeLobbyTab===0 ? `
    <div class="sub" style="margin-bottom:8px">选择行动地点</div>
    <div class="bz-grid2">
      ${BLAZE_SITES.map(s=>`<button class="menu-li" id="bs_${s.id}" title="${esc(s.brief)}"
        style="${s.id===pick.site?'border-color:'+s.color+';background:rgba(255,255,255,.12)':''}">
        <span class="e">${s.emoji}</span>
        <span class="tx">${esc(s.name)}</span>
        <div class="d">${esc(s.sub)}</div></button>`).join('')}
    </div>
    <div class="sub" style="margin-bottom:8px">选择难度</div>
    <div class="bz-grid3">
      ${BLAZE_DIFF.map(d=>`<button class="menu-li" id="bd_${d.id}" title="${esc(d.desc)}"
        style="${d.id===pick.diff?'background:linear-gradient(180deg,rgba(255,215,106,.22),rgba(255,215,106,.10));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(255,215,106,.55),var(--gb-drop)':''}">
        <span class="e">${d.emoji}</span>
        <span class="tx">${esc(d.name)}</span>
        <div class="d" style="color:#ffd76a">估值 ×${d.mul}</div>
        <div class="d">🎖️${d.req} · 🎟️${d.fee}🪙</div>
        <div class="d">📦${d.crates} 👾${d.patrols} 📶${d.sig}</div></button>`).join('')}
    </div>
    <div class="sub" style="margin-bottom:8px">携带物资
      <span style="opacity:.7">（带出去就没了）</span>
      ${naked?'<span style="color:#ffd76a">（🪖 跑刀中，本次一件都不带）</span>':''}</div>
    <div class="bz-grid3">
      ${BLAZE_GEAR.map(it=>{
        const have=gear[it.id]|0, on=!!carry[it.id];
        return `<button class="menu-li${on?' on':''}" id="bg_${it.id}" title="${esc(it.n)}：${esc(it.d)}"
          ${have<=0&&!on?'disabled style="opacity:.4"':''}>
          <span class="e">${it.e}</span>
          <span class="tx">${esc(it.n)}</span>
          <div class="d" style="color:${on?'#b9f2d3':'#9cc0e0'}">${on?'✅ 携带中':'⬜ 未带'} · 库${have}</div>
          </button>`;
      }).join('')}
      ${!BLAZE_GEAR.some(it=>(gear[it.id]|0)>0)
        ? `<div class="center" style="font-size:var(--fs-sm);color:#7d94ab;padding:4px;grid-column:1/-1">
             仓库还是空的，去「🏪 战备采购」买点东西</div>`:''}
    </div>
    <button class="menu-li bz-naked" id="bnaked"
      style="${naked?'background:linear-gradient(180deg,rgba(255,215,106,.22),rgba(255,215,106,.10));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(255,215,106,.55),var(--gb-drop)':''}">
      <span class="e">🪖</span>
      <span class="tx">${naked?'✅ 跑刀进图（免行动经费）':'⬜ 跑刀进图（免行动经费）'}
        <div class="d">不买票、不带货，光着身子进去捡垃圾：
          战备值只剩制式配装 ${BLAZE_BASE_KIT}（只够进常规场）·
          估值 ×${BLAZE_NAKED_MUL} · 阵亡一件都保不住 · 信号值 -1</div></span></button>
    <div style="background:${entReady?'rgba(52,199,123,.10)':'rgba(255,107,107,.10)'};
      border:1px solid ${entReady?'rgba(52,199,123,.32)':'rgba(255,107,107,.34)'};
      border-radius:14px;padding:9px 12px;margin:10px 0 10px">
      <div style="font-size:var(--fs-sm);font-weight:700;
        color:${entReady?'#b9f2d3':'#ffd0d0'}">
        ${entReady?'🎖️ 入局条件已满足':'⚠️ 入局条件不满足'}</div>
      <div style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:3px;line-height:1.62">
        🎖️ 战备值 <b style="color:${ent.ok?'#ffd76a':'#ff8a8a'}">${ent.val}</b>/${ent.req}
        ${ent.ok ? (naked?'✅ 制式配装达标':'✅ 达标')
                 : '❌ 还差 '+ent.need+(naked?'（跑刀只能进常规场）':'　去「🏪 战备采购」买装备')}<br>
        🎟️ 行动经费 <b style="color:${ent.canPay?'#ffd76a':'#ff8a8a'}">${ent.fee}</b> 🪙
        ${naked?'　🪖 跑刀免票'
          :(ent.ticket?'　🎟️ <b style="color:#9fe4ff">抵用券自动抵扣</b>'
            :(ent.canPay
              ? '　✅ 仓库 '+(BLAZE_STATE.crystals|0)+' 🪙'
              : '　❌ 还差 '+ent.needMoney+' 🪙（卖货 / 跑刀 / 用 🎟️ 抵用券）'))}
        ${ent.scan?'　📟 <b style="color:#9fe4ff">情报券已备好</b>':''}<br>
        <span style="color:#7d94ab">制式配装 ${BLAZE_BASE_KIT} 白送 ·
          携带物资按采购原价计入战备值，带出去就没了 ·
          🎟️📟 两种券在「⏳ 时空交易所」（☰ 菜单）用编年史的时间星尘换</span>
      </div>
    </div>
    <div style="background:rgba(94,214,255,.10);border:1px solid rgba(94,214,255,.3);
      border-radius:14px;padding:10px 12px;margin-bottom:12px">
      <div style="font-size:var(--fs-md);font-weight:700;color:#9fe4ff">
        ${site.emoji} ${esc(site.name)} · ${diff.emoji} ${esc(diff.name)}</div>
      <div style="font-size:var(--fs-sm);color:#9cc0e0;margin-top:4px;line-height:var(--lh-base)">
        物资箱 ${diff.crates} 个 · 巡逻队 ${diff.patrols} 队 ·
        撤离点 ${diff.exfils} 个 ·
        🔐 保险箱房 ${1+(deptLevel('cmd')>=4?1:0)} 座<br>
        🗺️ 不规则战场 · 🔒 上锁房间 ${blazeLockRoomCount(diff.id)} 间（需房卡）<br>
        信号值 ${Math.max(1,diff.sig+((!naked&&carry.battery)?1:0)+hqSigBonus()-(naked?1:0))} ·
        撤离拦截 ${diff.waves} 波 ·
        题目档位 <b style="color:#ffd76a">${['','普通','中档','高考'][diff.tier]}</b><br>
        🎒 背包 <b style="color:#ffd76a">${blazeBagCapPreview(naked?{}:carry)}</b> 格 ·
        场上掉的<b style="color:#ffd76a">全是物资</b>，撤离成功才入库<br>
        <span style="color:#9fe4ff">特勤处 ${blazeDeptBrief()}</span>
        ${perk.length?'<br>携带加成：<b style="color:#b9f2d3">'+perk.join(' · ')+'</b>':''}
      </div>
    </div>
    <div class="row bz-foot">
      <button class="btn" id="shop">🏪 战备采购</button>
      <button class="btn primary" id="go" ${entReady?'':'disabled title="入局条件不满足"'}>🚀 部署行动</button>
    </div>`

  : blazeLobbyTab===1 ? `
    <div class="sub" style="margin-bottom:10px">仓库结晶 <b style="color:#ffd76a">${BLAZE_STATE.crystals|0}</b> 🪙
      ${hqDiscount()<1?'<span style="color:#9fe4ff">· 🔍 情报处 8 折</span>':''}
      <span style="font-size:var(--fs-xs);color:#7d94ab"><br>
        哈夫币只能靠「💱 交易」卖物资换 —— 战场上不掉钱<br>
        买进仓库的物资按<b style="color:#ffd76a">采购原价</b>计入战备值，
        是进中高档图的门票本钱</span></div>
    <div class="sub" style="text-align:left;margin:0 0 8px">🎒 战备物资</div>
    ${BLAZE_GEAR.filter(it=>it.kind!=='card').map(it=>blazeShopRow(it,gear)).join('')}
    <div class="sub" style="text-align:left;margin:14px 0 8px">🔑 房卡
      <span style="opacity:.7">（进游戏前买好，勾选携带，刷卡即消耗）</span></div>
    ${BLAZE_CARDS.map(c=>blazeShopRow(BLAZE_GEAR_OF[c.id],gear,c.c)).join('')}
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin:10px 0;line-height:var(--lh-base)">
      物资与房卡买进仓库后，要在「部署」页勾选携带才会生效；<br>
      带进战场就用掉了，无论撤离成功还是阵亡都不会退还。<br>
      房卡两种用法：刷开<b style="color:#ffd76a">上锁房间的铁门</b>，或者开<b style="color:#ffd76a">💠 高价值保险箱</b>
      —— 一扇门 / 一座箱子各一张卡，<b>手里哪张等级最低就先扣哪张</b>。
    </div>
    <div class="row">
      <button class="btn" id="back">← 返回部署</button>
      <button class="btn" id="cash">💱 上缴结晶</button>
    </div>`

  : blazeLobbyTab===2 ? blazeTradeHtml()

  : blazeLobbyTab===3 ? blazeHqHtml()

  : blazeLobbyTab===4 ? blazeDexHtml()

  : `
    <div class="center" style="margin:6px 0 14px">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        <div class="sp"><div class="e">🚁</div><div class="n">${st.exfil|0}</div><div class="k">成功撤离</div></div>
        <div class="sp"><div class="e">💀</div><div class="n">${st.wipe|0}</div><div class="k">阵亡</div></div>
        <div class="sp"><div class="e">🏆</div><div class="n">${st.best|0}</div><div class="k">单次最高估值</div></div>
        <div class="sp"><div class="e">📦</div><div class="n">${st.items|0}</div><div class="k">累计带回件数</div></div>
      </div>
    </div>
    <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;line-height:var(--lh-loose);margin-bottom:12px">
      累计答题 ${BLAZE_STATE.totalRight|0} 对 / ${BLAZE_STATE.totalWrong|0} 错<br>
      撤离成功率 <b style="color:#ffd76a">${
        ((st.exfil|0)+(st.wipe|0))>0
          ? Math.round((st.exfil|0)/((st.exfil|0)+(st.wipe|0))*100)
          : 0}%</b>
      <span style="font-size:var(--fs-xs);color:#7d94ab">（${st.exfil|0} 撤 / ${st.wipe|0} 亡）</span><br>
      仓库待售 <b style="color:#ffd76a">${blazeStashCount(0)}</b> 件物资 · 特勤处 ${blazeDeptBrief()}<br>
      已卖出 ${BLAZE_STATE.sold|0} 件，进账 <b style="color:#ffd76a">${BLAZE_STATE.soldVal|0}</b> 🪙 ·
      已投入 <b style="color:#ffd76a">${BLAZE_STATE.spent|0}</b> 🪙
      与 <b style="color:#ffd76a">${BLAZE_STATE.spentItem|0}</b> 件稀有物资<br>
      其中 <b style="color:#ffd76a">${BLAZE_STATE.fee|0}</b> 🪙 是历次部署交掉的行动经费
      ${BLAZE_STATE.best&&BLAZE_STATE.best.n
        ?`<br>镇柜之宝：${BLAZE_STATE.best.e} <b style="color:#ffd76a">${esc(BLAZE_STATE.best.n)}</b>`
        :''}
    </div>
    <div style="background:rgba(255,107,107,.10);border:1px solid rgba(255,107,107,.28);
      border-radius:14px;padding:11px 13px;font-size:var(--fs-sm);color:#ffd0d0;line-height:var(--lh-base)">
      💡 <b>怎么玩</b><br>
      🗺️ <b>地形</b>：战场边界是不规则的，外面全是焦土禁区；
        图上有成片的建筑（进得去、穿不过墙）、岩石与集装箱挡路<br>
      🔍 <b>搜</b>：📦 物资箱答题开箱，开出的是<b>物资</b>，稀有度从普通到神话<br>
      💱 <b>交易</b>：战场上只掉物资，<b>一文现金都没有</b> ——
        回基地到「💱 交易站」卖掉，才变成哈夫币<br>
      🔐 <b>保险箱房</b>：最远的那间楼，<b>门口与屋里都有守卫，不打赢别想开箱</b> ——
        最里面那座 💠 高价值保险箱另外要<b>刷一张房卡</b><br>
      🔑 <b>房卡</b>：两种用法 —— 刷开<b>上锁房间的铁门</b>，或者开 💠 <b>高价值保险箱</b>；
        <b>进游戏前</b>在「🏪 战备采购」买卡、部署时勾选携带，刷卡即作废一张<br>
      💥 <b>打</b>：撞上 👾 巡逻队打三题，错两道当场阵亡；打赢从他们身上搜出物资<br>
      🚁 <b>撤</b>：到撤离点开始撤离，路上每波一题，
        <b>错一道，背包里的东西一件都带不走</b><br>
      🎖️ <b>入局</b>：进图要<b style="color:#ffd76a">战备值</b>达标，还要交<b style="color:#ffd76a">行动经费</b>（门票，摔了也不退）<br>
        <span style="color:#ffd76a">${BLAZE_DIFF.map(d=>d.emoji+esc(d.name)+' 🎖️'+d.req+' · 🎟️'+d.fee+'🪙').join('　')}</span>
        <span style="font-size:var(--fs-xs);color:#7d94ab">
          （战备值 = 制式配装 ${BLAZE_BASE_KIT} + 勾选携带物资的采购原价）</span><br>
      🪖 <b>跑刀</b>：没钱没装备就光着进去捡垃圾 —— 免票，但估值 ×${BLAZE_NAKED_MUL}、
         阵亡<b>一件都保不住</b>、信号值 -1，而且<b>只够进常规场</b><br>
      🏛️ <b>特勤处</b>：指挥部 / 后勤处 / 医疗站 / 情报处 / 军械库
        五个部门各自升级，花的是哈夫币 + 上缴的稀有物资<br>
      🎒 <b>背包</b>：按<b>格数</b>算（不是件数），满了会挤掉<b>单格价值最低</b>的<br>
      ⏳ <b>时空交易所</b>：☰ 菜单里用 📜 编年史的时间星尘换支援券 ——
        🎟️ 免一次行动经费 · 🔑 白拿一张蓝色房卡 · 📟 开局报点<br>
      ⚠️ 战利品只有<b>活着走出去</b>才入账、<b>卖掉了</b>才变成钱
    </div>
    <div class="row"><button class="btn primary" id="back">← 返回部署</button></div>`;

  openPanel(`
    <h2>🔥 烽火地带</h2>
    <div class="sub">搜刮 · 交火 · 活着撤离　—　🪙 ${BLAZE_STATE.crystals|0}
      · 待售 ${blazeStashCount(0)} 件</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:12px">
      ${[['🚀','部署'],['🏪','采购'],['💱','交易'],['🏛️','特勤处'],['🗄️','收藏'],['📊','战绩']]
        .map((x,i)=>`<button class="btn ${blazeLobbyTab===i?'primary':''}" id="t${i}"
          style="flex:0;min-width:0;padding:7px 2px;font-size:var(--fs-xs);
          flex-direction:column;gap:1px">
          <span style="font-size:var(--fs-lg);line-height:1.1">${x[0]}</span>${x[1]}</button>`).join('')}
    </div>
    ${body}
    <div class="row"><button class="btn" id="close">关闭</button></div>`);

  const re=()=>{audioKick();blazeRenderLobby();};
  BLAZE_SITES.forEach(s=>{const b=$('bs_'+s.id);if(b)b.onclick=()=>{audioKick();BLAZE_STATE.pick.site=s.id;save();re();};});
  BLAZE_DIFF.forEach(d=>{const b=$('bd_'+d.id);if(b)b.onclick=()=>{audioKick();BLAZE_STATE.pick.diff=d.id;save();re();};});
  BLAZE_GEAR.forEach(it=>{
    const b=$('bg_'+it.id);
    if(b)b.onclick=()=>{
      audioKick();
      if(!carry[it.id]&&(gear[it.id]|0)<=0)return;
      carry[it.id]=carry[it.id]?0:1;re();
    };
    const by=$('buy_'+it.id);
    if(by)by.onclick=()=>{
      audioKick();
      if(!hqShopUnlocked(it.id)){toast(deptUnlockHint(it.id)||'特勤处等级不足');return;}
      const price2=Math.round(it.price*hqDiscount());
      if((BLAZE_STATE.crystals|0)<price2){toast('结晶不够');return;}
      BLAZE_STATE.crystals=(BLAZE_STATE.crystals|0)-price2;
      gear[it.id]=(gear[it.id]|0)+1;
      SFX.coin();toast('已入库：'+it.n);save();re();
    };
  });
  [0,1,2,3,4,5].forEach(i=>{const b=$('t'+i);if(b)b.onclick=()=>{audioKick();blazeLobbyTab=i;re();};});
  /* 🪖 跑刀开关：切回正规部署时，之前勾选的物资还留在 BZ.carry 里，
     取消跑刀就能接着用 —— 不用重新勾一遍 */
  const bnaked=$('bnaked');
  if(bnaked)bnaked.onclick=()=>{
    audioKick();
    BLAZE_STATE.naked=!BLAZE_STATE.naked;
    if(BLAZE_STATE.naked)toast('🪖 跑刀：免行动经费，只够进常规场');
    save();re();
  };
  const back=$('back');if(back)back.onclick=()=>{audioKick();blazeLobbyTab=0;re();};
  const shop=$('shop');if(shop)shop.onclick=()=>{audioKick();blazeLobbyTab=1;re();};
  BLAZE_DEPT.forEach(d=>{
    const b=$('up_'+d.id);
    if(b)b.onclick=()=>{audioKick();blazeDeptUpgrade(d.id);};
  });
  const hqst=$('hqstash');if(hqst)hqst.onclick=()=>{audioKick();blazeLobbyTab=4;re();};
  const totrade=$('totrade');if(totrade)totrade.onclick=()=>{audioKick();blazeLobbyTab=2;re();};
  /* 💱 交易站的卖出按钮：单个 / 同名全卖 / 整档 / 一键清空 */
  blazeTradeSlots.forEach((v,i)=>{
    const a=$('sl_'+i);
    if(a)a.onclick=()=>{
      audioKick();
      const g=blazeSell(v.n,1);
      if(g<=0)return;
      SFX.coin();save();updateHUD();toast('💱 卖出 '+v.e+v.n+' ＋'+g+' 🪙');re();
    };
    const b=$('sa_'+i);
    if(b)b.onclick=()=>{
      audioKick();
      const c=v.cnt;
      const cal=blazeSellCalc(v,c);        // 先说准价，再动手
      uiConfirm({
        icon:'💱',
        title:'把这一摞全卖掉？',
        lines:[{e:v.e,n:v.n,c:'×'+c,v:cal.gain+' 🪙'}],
        total:{label:'到手',v:cal.gain,unit:'🪙',
          sub:'估值 '+v.val+' 🪙 × 行情 '+BLAZE_SELL_RATE.toFixed(2)
             +' × 谈价 '+hqSellMul().toFixed(2)+(v.nt?' × 任务材料 0.4':'')},
        warn:'卖掉一件，🏛️ 特勤处就少一件升级材料',
        ok:'确认卖出'},()=>{
        const g=blazeSell(v.n,c);
        if(g>0){SFX.coin();save();updateHUD();toast('💱 卖出 '+c+' 件 ＋'+g+' 🪙');}
        re();
      },re);
    };
  });
  RARITY.forEach(r=>{
    const b=$('sr_'+r.id);
    if(b)b.onclick=()=>{
      audioKick();
      const items=blazeStashList().filter(v=>v.r===r.id);
      const cnt=items.reduce((a,x)=>a+x.cnt,0);
      if(cnt<=0){toast('这一档没有存货');return;}
      const gain=items.reduce((a,x)=>a+blazeSellCalc(x,x.cnt).gain,0);
      uiConfirm({
        icon:r.e,
        title:'整档卖掉「'+r.n+'」物资？',
        sub:cnt+' 件 · '+items.length+' 种',
        lines:items.map(x=>({e:x.e,n:x.n,c:'×'+x.cnt,v:blazeSellCalc(x,x.cnt).gain+' 🪙'})),
        total:{label:'到手',v:gain,unit:'🪙'},
        warn:'卖掉后 🏛️ 特勤处就少这些升级材料',
        ok:'确认卖 '+cnt+' 件'},()=>{
        const res=blazeSellRarity(r.id);
        SFX.coin();save();updateHUD();toast('💱 '+r.n+' 卖出 '+res.n+' 件 ＋'+res.g+' 🪙');re();
      },re);
    };
  });
  const dump=$('dump');
  if(dump)dump.onclick=()=>{
    audioKick();
    const list=blazeStashList();
    const total=blazeStashCount(0);
    if(total<=0){toast('仓库是空的');return;}
    /* 到手价逐件算完再加总 —— 和真正卖出去时是同一个函数。
       以前这里写的是"约到手"：它自己复算了一遍，天生会和账目差一点 */
    const worth=list.reduce((a,v)=>a+blazeSellCalc(v,v.cnt).gain,0);
    const slots=list.reduce((a,b)=>a+Math.max(1,b.slot|0||1)*b.cnt,0);
    uiConfirm({
      icon:'📦',
      title:'把仓库全部卖掉？',
      sub:total+' 件 · '+list.length+' 种 · 占 '+slots+' 格',
      lines:list.map(v=>({e:v.e,n:v.n,c:'×'+v.cnt,v:blazeSellCalc(v,v.cnt).gain+' 🪙'})),
      total:{label:'到手',v:worth,unit:'🪙'},
      warn:'卖光之后 🏛️ 特勤处就没有升级材料了',
      ok:'确认清空'},()=>{
      let g=0;
      blazeStashList().forEach(v=>{g+=blazeSell(v.n,v.cnt);});
      SFX.win();save();updateHUD();toast('💱 清空仓库 ＋'+g+' 🪙');re();
    },re);
  };
  const cash=$('cash');
  if(cash)cash.onclick=()=>{
    audioKick();
    const n=BLAZE_STATE.crystals|0;
    if(n<=0){toast('仓库里没有结晶');return;}
    const rate=Math.round(1/BLAZE_REMIT_RATE);
    const got=Math.floor(n*BLAZE_REMIT_RATE);
    uiConfirm({
      icon:'💱',
      title:'把结晶上缴到闯关模式？',
      sub:'烽火与闯关的物价差着一个量级',
      lines:[{e:'🪙',n:'仓库结晶',c:'×'+n,v:n+' 🪙'},
             {e:'💎',n:'闯关结晶',c:'×'+got,v:'上缴后到账'}],
      total:{label:'闯关模式到手',v:got,unit:'枚',sub:'按 '+rate+' 🪙 换 1 枚的行情'},
      warn:'单向操作：转过去就转不回来了',
      ok:'确认上缴'},()=>{
      BLAZE_STATE.crystals=n-got*rate;
      ADV_STATE.crystals=(ADV_STATE.crystals|0)+got;
      save();
      try{localStorage.setItem(SAVE_KEY,JSON.stringify(ADV_STATE));}catch(e){}
      SFX.win();toast('已上缴 '+n+' 🪙 → 闯关 ＋'+got+' 枚结晶');
      blazeLobbyTab=0;re();
    },re);
  };
  $('close').onclick=()=>{closePanel();if(!BZ.active&&CUR===BLAZE)flashQuest(true);};
  const go=$('go');
  if(go)go.onclick=()=>{
    audioKick();
    closePanel();
    blazeDeploy();
  };
}

function blazeIntroHtml(){
  return `
    <h2>🔥 烽火地带</h2>
    <div class="sub">搜刮 · 交火 · 活着撤离</div>
    <div class="it-list"><div class="il">🎖️ <b>基地</b>：走进 🎖️ 指挥部，选行动地点与难度</div><div class="il">🗺️ <b>战场</b>：边界不规则，外面是焦土禁区；建筑能进、墙穿不过、岩石挡路</div><div class="il">🔑 <b>房卡</b>：部分房间门被焊死，先在「🏪 战备采购」买卡、部署时勾选携带</div><div class="il">🗺️ <b>四个行动地点</b>：📐 零点演算场 · ⚡ 长弓变电站 · 🔥 灰烬精炼厂 · 🌿 静默培养区</div><div class="il">🎚️ <b>三档难度</b>：🟢 常规 ×1 · 🟡 中档 ×2 · 🔴 高考 ×4（物资估值倍率）</div><div class="il">🎖️ <b>入局条件</b>：战备值达标 + 交<b>行动经费</b>才放你上机 ——
      <b style="color:#ffd76a">${BLAZE_DIFF.map(d=>d.emoji+d.name+' 🎖️'+d.req+' · 🎟️'+d.fee+'🪙').join('　')}</b></div><div class="il">🪖 <b>跑刀</b>：没钱可以光着进去捡垃圾 —— 免票，但估值 ×${BLAZE_NAKED_MUL}、
      阵亡<b>零保底</b>、信号值 -1，而且<b>只够进常规场</b></div><div class="il">🔍 <b>搜</b>：走到 📦 物资箱答题，答对开出<b>物资</b>，
      答错触发警报、慌乱中还从背包掉一件</div><div class="il">🔐 <b>保险箱房</b>：最远那间楼有守卫把守，<b>必须打赢才打得开箱子</b>；最里面那座 💠 高价值箱另外要<b>刷一张房卡</b></div><div class="il">💥 <b>打</b>：撞上 👾 巡逻队打三题，错两道当场阵亡；打赢从他们身上搜出物资</div><div class="il">🚁 <b>撤</b>：到 🚁 撤离点开始撤离，路上每波一题，
      <b>错一道，背包里的东西一件都带不走</b></div><div class="il">📶 <b>信号值</b>：答错就掉，归零直接被锁定淘汰</div><div class="il">🎒 <b>背包</b>：<b>按格数算，不是按件数</b> —— 一个 12 格的大红顶六件小货</div><div class="il">满了会挤掉<b>单格价值最低</b>的那件，装不下就先撤</div><div class="il">🏪 <b>战备采购</b>：电池 / 背包 / 保险 / <b>房卡</b>，带进去就没了</div><div class="il">💱 <b>交易站</b>：战场上只掉物资，<b>一文现金都没有</b> ——
      活着回基地，把东西卖给回收商才变成哈夫币</div><div class="il">🏛️ <b>特勤处</b>：指挥部 · 后勤处 · 医疗站 · 情报处 · 军械库，
      花哈夫币 + 上缴稀有物资升级（卖光了就没材料了）</div><div class="il">⚠️ <b>核心规则</b>：战利品只有<b>活着走出去</b>才入账，<b>卖掉了</b>才变成钱</div><div class="il">💱 <b>上缴</b>：仓库结晶可以转回闯关模式花</div><div class="il">🔀 <b>切模式</b>：顶部「⚔️ 闯关」回去刷题，三个模式进度分开保存
    ${IS_PC?`</div><div class="il">⌨️ <b style="color:#ffd76a">电脑端</b>：WASD 移动 · Shift 疾跑 · 点地图自动走 ·
      E 互动 · 1~4 选选项 · H 查全部键位`:''}</div></div>
    <div class="row"><button class="btn primary" id="go">进入基地</button></div>`;
}

