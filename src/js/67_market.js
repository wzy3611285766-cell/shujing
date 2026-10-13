/* =========================================================
   💱 交易站 —— 出了战场才能换钱的地方
   烽火里掉落的全是物资，一文现金都没有：
   想拿到哈夫币，只能活着走出去，回基地把东西卖给回收商。
   卖掉一件，🏛️ 特勤处就少一件升级材料 —— 这是要自己掂量的取舍。
   ========================================================= */
/* 卖掉 n 件同名物资，返回到手多少哈夫币。
   单价按「这一摞的平均估值」算，免得先卖贵的后卖便宜的占便宜。
   nt = 任务材料（三角洲里标注「禁止交易」的那一类）：
   交易行上不了架，只能交给军需处折价回收，到手四折。
   到手 = 估值 × 回收折率（BLAZE_SELL_RATE）× 情报处谈价加成。
   估值那么好看、到手却要打折，是刻意的：摸金的爽感在「摸到什么」，
   哈夫币的节奏则由回收行情决定 —— 不打折的话，一局就能买穿整条养成线。 */
function blazeSell(key,n){
  const st=BLAZE_STATE.stash||{};
  const rec=st[key];
  if(!rec||rec.cnt<=0)return 0;
  const take=Math.min(n,rec.cnt);
  const rawUnit=Math.max(1,Math.round(rec.val/Math.max(1,rec.cnt)));
  let unit=rawUnit;
  if(rec.nt)unit=Math.max(1,Math.round(unit*0.4));
  const gain=Math.max(take,Math.round(unit*take*hqSellMul()*BLAZE_SELL_RATE));
  /* 账面价值按原价扣，不然折价卖过一次后剩下的会被越算越贵 */
  rec.cnt-=take;rec.val=Math.max(0,rec.val-rawUnit*take);
  if(rec.cnt<=0)delete st[key];
  BLAZE_STATE.crystals=(BLAZE_STATE.crystals|0)+gain;
  BLAZE_STATE.sold=(BLAZE_STATE.sold|0)+take;
  BLAZE_STATE.soldVal=(BLAZE_STATE.soldVal|0)+gain;
  return gain;
}
/* 整档出手：把某一稀有度及以下的仓库存货一次卖光 */
function blazeSellRarity(rid){
  const list=blazeStashList().filter(v=>v.r===rid);
  let n=0,g=0;
  list.forEach(v=>{const c=v.cnt;g+=blazeSell(v.n,c);n+=c;});
  return {n:n,g:g};
}
/* 交易站里每一行对应的物资，事件绑定时按 index 取回（名字里有中文和符号，
   塞进 DOM id 太容易出事，索性用下标） */
let blazeTradeSlots=[];
function blazeTradeHtml(){
  const list=blazeStashList();
  const mul=hqSellMul();
  const total=list.reduce((a,b)=>a+b.cnt,0);
  /* 库存一共吃掉多少个仓库格子 —— 摸金玩家真正关心的数字 */
  const slots=list.reduce((a,b)=>a+Math.max(1,b.slot|0||1)*b.cnt,0);
  /* 任务材料（nt）上不了交易行，只能军需处四折回收，估值要跟着打折；
     再乘回收折率 —— 这才是真正到手的价，界面上不能标虚的 */
  const sellVal=v=>v.val*(v.nt?0.4:1)*BLAZE_SELL_RATE;
  const worth=Math.round(list.reduce((a,b)=>a+sellVal(b),0)*mul);
  const crystals=BLAZE_STATE.crystals|0;
  blazeTradeSlots=[];
  if(!total)return `
    <div class="center" style="font-size:52px;margin:10px 0">💱</div>
    <div class="center" style="color:#9cc0e0;font-size:var(--fs-md);line-height:var(--lh-loose)">
      仓库里没有可卖的东西。<br>
      <span style="font-size:var(--fs-sm)">战场上掉的全是物资，一文现金都没有 ——<br>
      先部署一趟，<b style="color:#ffd76a">活着回来</b>才有货。</span>
    </div>
    <div class="row"><button class="btn primary" id="back">← 返回部署</button></div>`;
  const body=RARITY.slice().reverse().map(r=>{
    const g=list.filter(v=>v.r===r.id);
    if(!g.length)return '';
    const cnt=g.reduce((a,b)=>a+b.cnt,0);
    const val=Math.round(g.reduce((a,b)=>a+sellVal(b),0)*mul);
    return `<div style="margin-bottom:13px">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
        <span style="font-size:var(--fs-sm);font-weight:700;color:${r.c}">${r.e} ${r.n}</span>
        <span style="font-size:var(--fs-xs);color:#7d94ab">${cnt} 件 · ${val} 🪙</span>
        <button class="btn" id="sr_${r.id}" style="margin-left:auto;padding:4px 11px;
          font-size:var(--fs-xs);min-width:0;flex:none">整档卖</button>
      </div>
      <div class="lootgrid">${g.map(v=>{
        const idx=blazeTradeSlots.length;blazeTradeSlots.push(v);
        const unit=Math.max(1,Math.round(sellVal(v)/Math.max(1,v.cnt)*mul));
        return `<div class="lootcell" style="background:${r.bg};border-color:${r.bd}">
          <div class="e">${v.e}</div>
          <div class="n">${esc(v.n)}${v.cnt>1?' ×'+v.cnt:''}</div>
          <div class="v">${unit} 🪙${v.nt?' <span style="color:#ffd76a">🚫</span>':''}</div>
          <div class="s">${Math.max(1,v.slot|0||1)} 格${v.cat?' · '+esc(v.cat):''}</div>
          <button class="btn" id="sl_${idx}" style="margin-top:5px;padding:3px 6px;
            font-size:var(--fs-xs);min-width:0;flex:none;justify-content:center">卖 1</button>
          ${v.cnt>1?`<button class="btn" id="sa_${idx}" style="margin-top:4px;padding:3px 6px;
            font-size:var(--fs-xs);min-width:0;flex:none;justify-content:center">卖 ${v.cnt}</button>`:''}
        </div>`;}).join('')}</div></div>`;
  }).join('');
  return `
    <div class="sub" style="margin-bottom:8px">
      仓库 <b style="color:#ffd76a">${crystals}</b> 🪙
      · 待售 <b>${total}</b> 件 / <b>${slots}</b> 格 · 全卖约值 <b style="color:#ffd76a">${worth}</b> 🪙</div>
    <div style="background:rgba(255,201,74,.10);border:1px solid rgba(255,201,74,.28);
      border-radius:14px;padding:9px 12px;margin-bottom:13px;text-align:center;
      font-size:var(--fs-sm);color:#cfe6ff;line-height:var(--lh-base)">
      🔍 情报处谈价 <b style="color:#ffd76a">×${mul.toFixed(2)}</b>
      ${mul>1?`（贵 ${Math.round((mul-1)*100)}%）`:'（升情报处能卖更贵）'} ·
      回收行情 <b style="color:#ffd76a">×${BLAZE_SELL_RATE.toFixed(2)}</b><br>
      <span style="font-size:var(--fs-xs);color:#9cc0e0">
        下面标的都是<b>到手价</b>（估值 × 行情 × 谈价），不用自己乘<br>
        卖掉一件，🏛️ 特勤处就少一件升级材料<br>
        <span style="color:#ffd76a">🚫 = 任务材料</span>：交易行禁售，只能军需处四折回收</span>
    </div>
    ${body}
    <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin:4px 0 10px;line-height:var(--lh-base)">
      卖来的哈夫币可以去「🏪 战备采购」买物资与房卡，<br>
      也可以砸进「🏛️ 特勤处」升级，或者上缴回闯关模式。
    </div>
    <div class="row">
      <button class="btn" id="dump">📦 一键清空仓库</button>
      <button class="btn primary" id="back">← 返回部署</button>
    </div>`;
}

