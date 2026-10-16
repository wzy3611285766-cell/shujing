/* =========================================================
   ⏳ 时空交易所 —— 时间星尘唯一的去处
   ------------------------------------------------------------
   星尘原本只进不出：读完 86 篇卷宗、答完时空题，攒下一千多枚，
   却没有任何地方能花 —— 编年史里没有商行，也不能带去另外两个世界。
   这里把星尘换成「支援券」：一次性、不可交易、不能换回钱，
   能带进烽火或闯关，替那边省下一笔开销或提供一次便利。
   为什么不直接兑换成结晶 / 哈夫币？
     烽火跑一趟高考场能赚几千哈夫币，闯关刷一个月也未必有三百结晶；
     一旦汇率放开，两个世界的经济会被星尘冲垮，搜打撤的风险就没意义了。
   券是「支援」不是「汇款」：只减负，不输血。
   ========================================================= */
function aidToName(to){
  return to==='blaze'?'🔥 烽火地带':(to==='adv'?'⚔️ 闯关模式':'📜 科学编年史');
}
/* ------------------------------------------------------------
   跨世界改存档：不在那个世界时，必须「整份读 → 改 → 整份写」。
   绝不能拿内存里的 EPIC_STATE / ADV_STATE / BLAZE_STATE 直接覆盖 localStorage
   —— 那几个对象在当前世界是没 load 过的旧值，一写就把人家进度抹了。
   ------------------------------------------------------------ */
function readSave(key,fn){
  try{
    const s=localStorage.getItem(key);
    if(!s)return false;
    const o=JSON.parse(s);
    if(!o||typeof o!=='object')return false;
    fn(o);return true;
  }catch(e){return false;}
}
/* fn 显式返回 false 表示「不合条件，别写回」 */
function patchSave(key,fn){
  try{
    const s=localStorage.getItem(key);
    if(!s)return false;
    const o=JSON.parse(s);
    if(!o||typeof o!=='object')return false;
    if(fn(o)===false)return false;
    localStorage.setItem(key,JSON.stringify(o));
    return true;
  }catch(e){return false;}
}
/* 时间星尘（存在史诗存档里）：当前不在史诗时也要读得到真值 */
function aidDust(){
  if(CUR===EPIC)return EPIC_STATE.crystals|0;
  let v=0;
  readSave(SAVE_KEY_EPIC,o=>{v=o.crystals|0;});
  return v;
}
/* 扣时间星尘 */
function aidPayDust(n){
  if(CUR===EPIC){
    if((EPIC_STATE.crystals|0)<n)return false;
    EPIC_STATE.crystals=(EPIC_STATE.crystals|0)-n;save();updateHUD();return true;
  }
  let ok=false;
  patchSave(SAVE_KEY_EPIC,o=>{
    if((o.crystals|0)<n)return false;
    o.crystals=(o.crystals|0)-n;ok=true;
  });
  return ok;
}
/* 用掉一张券：三种券各有各的去处，ticket / scan 在部署时自动消耗 */
function aidApply(id){
  if(aidCount(id)<=0)return false;
  if(id==='lamp'){
    if(CUR===ADV){ADV_STATE.hint=(ADV_STATE.hint|0)+1;save();updateHUD();}
    else if(!patchSave(SAVE_KEY,o=>{o.hint=Math.max(0,(o.hint|0))+1;}))
      {toast('闯关模式还没有存档，先去那边开局');return false;}
  }else if(id==='key'){
    /* 房卡补给：发一张蓝色房卡（kc1）。id 仍叫 key 是历史包袱 —— 见 11_world.js 的说明 */
    const grant=o=>{
      if(!o.gear||typeof o.gear!=='object')o.gear={};
      o.gear.kc1=(o.gear.kc1|0)+1;
    };
    if(CUR===BLAZE){grant(BLAZE_STATE);save();}
    else if(!patchSave(SAVE_KEY_BLAZE,grant))
      {toast('烽火地带还没有存档，先去那边建个号');return false;}
  }else if(id==='compass'){
    if(CUR!==EPIC){toast('卷宗罗盘要回 📜 科学编年史才用得上');return false;}
    if(!showEpicCompass())return false;
  }else return false;
  aidUse(id);
  return true;
}
function showAidShop(){
  function render(){
    const dust=aidDust();
    openPanel(`
      <h2>⏳ 时空交易所</h2>
      <div class="sub">时间星尘 <b style="color:#ffd76a">${dust}</b> ✨
        · 手上有 <b style="color:#ffd76a">${aidTotal()}</b> 张支援券</div>
      <div style="background:rgba(255,215,106,.10);border:1px solid rgba(255,215,106,.3);
        border-radius:14px;padding:10px 12px;margin-bottom:12px;
        font-size:var(--fs-sm);color:#9cc0e0;line-height:var(--lh-base)">
        ✨ <b style="color:#ffd76a">时间星尘</b>是读科学史攒下的洞察，
        在这里换成支援券，带给另外两个世界。<br>
        <span style="color:#7d94ab">券是一次性的，不能卖、不能换回星尘，
        但清掉某个模式的进度时不会跟着没。</span>
        ${CUR===EPIC?'':'<br><span style="color:#9fe4ff">你现在不在编年史里 —— 券照样能兑换、能用，花的是那份存档里的星尘。</span>'}
      </div>
      <div class="sub" style="text-align:left;margin:0 0 8px">🎫 支援券
        <span style="opacity:.7">（🎟️ 📟 在烽火部署时自动消耗）</span></div>
      ${AID_ITEMS.map(a=>{
        const own=aidCount(a.id), poor=dust<a.price;
        const usable=(a.id==='lamp'||a.id==='key'||a.id==='compass')&&own>0;
        return `<div class="item">
          <div class="ic">${a.e}</div>
          <div style="flex:1;min-width:0">
            <div class="nm">${esc(a.n)}
              <span style="font-size:var(--fs-xs);color:#ffd76a"> 持有 ${own}</span></div>
            <div class="ds">${esc(a.d)}</div>
            <div style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:2px">
              用在哪：${aidToName(a.to)}${
                a.id==='ticket'?' · 部署时自动抵掉门票':
                a.id==='scan' ?' · 部署时自动生效':''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;flex:none">
            <button class="buy" id="ab_${a.id}" ${poor?'disabled':''}>${a.price} ✨</button>
            ${usable?`<button class="buy" id="au_${a.id}"
              style="background:linear-gradient(180deg,rgba(94,214,255,.24),rgba(94,214,255,.14));
              box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(94,214,255,.4),var(--gb-drop);
              color:#9fe4ff">用 1 张</button>`:''}
          </div>
        </div>`;}).join('')}
      <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;
        margin:10px 0;line-height:var(--lh-base)">
        券只减负、不输血：烽火省下一笔门票，闯关多一层思路，
        史诗少走一段回头路。<br>
        换不到哈夫币也换不到结晶 —— 三个世界的钱袋子各算各的。
      </div>
      <div class="row">
        ${CUR===EPIC?'':`<button class="btn" id="toEpic">📜 去编年史赚星尘</button>`}
        <button class="btn primary" id="ok">关闭</button>
      </div>
    `);
    $('ok').onclick=closePanel;
    const te=$('toEpic');
    if(te)te.onclick=()=>{closePanel();audioKick();
      if(CUR===BLAZE)switchTo(EPIC);else if(CUR===ADV)switchMode();};
    AID_ITEMS.forEach(a=>{
      const b=$('ab_'+a.id);
      if(b)b.onclick=()=>{
        if(!aidPayDust(a.price)){toast('时间星尘不够');return;}
        AID_STATE[a.id]=aidCount(a.id)+1;
        saveAid();SFX.coin();
        toast('换到一张 '+a.e+' '+a.n);
        render();
      };
      const u=$('au_'+a.id);
      if(u)u.onclick=()=>{
        if(!aidApply(a.id))return;
        SFX.unlock();
        toast(a.e+' '+a.n+' 已生效');
        render();
      };
    });
  }
  render();
}
/* 🧭 卷宗罗盘：指出当前时代最近的一篇未读卷宗。
   免费的「🔭 引路标」会指向全图最近的目标，时代一多就越指越远；
   罗盘只在当前纪元里找，读完一段历史正好用得上。 */
function showEpicCompass(){
  if(CUR!==EPIC){toast('卷宗罗盘只在科学编年史里能用');return false;}
  const era=state.era||'';
  let list=EPIC_SPOTS.filter(s=>!state.read[s.sid]);
  if(era)list=list.filter(s=>s.era===era);
  if(!list.length)list=EPIC_SPOTS.filter(s=>!state.read[s.sid]);   // 本纪元读完了就放宽到全图
  if(!list.length){toast('全部卷宗都读过了 🎖️');return false;}
  let best=list[0],bd=dist(state.x,state.y,best.x,best.y);
  list.forEach(s=>{const d=dist(state.x,state.y,s.x,s.y);if(d<bd){bd=d;best=s;}});
  const it=EPIC_LIB[best.sid]||{};
  guideTarget={x:best.x,y:best.y};guideTimer=20000;
  toast('🧭 指向「'+(it.title||'未读卷宗')+'」· '+Math.round(bd/20)+' 步');
  return true;
}

/* ---------------- 编年史总览 ---------------- */
function showChronicle(){
  const tot=EPIC_SPOTS.length;
  const rd=EPIC_SPOTS.filter(s=>state.read[s.sid]).length;
  const bd=EPOCHS.filter(r=>state.badges[r.id]).length;
  const html=EPOCHS.map(ep=>{
    const list=EPIC_SPOTS.filter(s=>s.era===ep.id);
    const r2=list.filter(s=>state.read[s.sid]).length;
    return `<div class="era-head">
        <div class="e">${state.badges[ep.id]?ep.emoji:'🔒'}</div>
        <div><div class="nm">${esc(ep.name)}</div><div class="yr">${esc(ep.sub)}</div></div>
        <div class="pg">${r2}/${list.length}</div>
      </div>
      <div class="era-list">
      ${list.map(s=>{
        const it=EPIC_LIB[s.sid],done=!!state.read[s.sid];
        return `<button class="era-li ${done?'done':''}" data-sid="${s.sid}">
          <div class="t">${done?it.e+' '+esc(it.title):'❔ 未读卷宗'}</div>
          <div class="s">${esc(it.year)} · ${done?'重读':'传送'}</div></button>`;
      }).join('')}
      </div>`;
  }).join('');
  openPanel(`
    <h2>📜 科学编年史</h2>
    <div class="sub">已读 ${rd} / ${tot} 篇 · ✨ ${state.crystals} 星尘 · 🎖️ ${bd}/${EPOCHS.length} 纪元章</div>
    <div class="pbar"><i style="width:${tot?rd/tot*100:0}%"></i></div>
    ${html}
    <div class="center" style="margin-top:14px;font-size:var(--fs-sm);color:#9cc0e0;line-height:var(--lh-base)">
      点「未读卷宗」直接传送过去；点「已读」可随时重读<br>也可以自己沿河走一遍，路上的 ✨ 星尘顺手就捡了
    </div>
    <div class="row"><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  panel.querySelectorAll('.era-li').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const sid=btn.dataset.sid;
      const sp=EPIC_SPOTS.find(s=>s.sid===sid);
      if(!sp)return;
      if(CUR!==EPIC){closePanel();return;}
      if(state.read[sid]){closePanel();openEra(sp);return;}
      closePanel();
      state.x=sp.x;state.y=sp.y+58;
      if(!walkable(state.x,state.y)){state.x=sp.x;state.y=sp.y;}
      cam.x=clamp(state.x-VW/SCALE/2,0,Math.max(0,W-VW/SCALE));
      cam.y=clamp(state.y-VH/SCALE/2,0,Math.max(0,H-VH/SCALE));
      save();updateHUD();
      showBanner('⏩ 时代跃迁',EPIC_LIB[sid]?EPIC_LIB[sid].title:'');
      setTimeout(()=>openEra(sp),380);
    });
  });
}

/* ---------------- 首次进入史诗模式的说明 ---------------- */
function epicIntroHtml(){
  return `
    <h2>📜 科学编年史 · 科学长河</h2>
    <div class="sub">从三万年前的一根骨头，走到今天的 AI</div>
    <div class="it-list"><div class="il">🕹️ <b>移动</b>：在河道上<b>按住拖动</b>，顺流而下</div><div class="il">📜 <b>卷宗</b>：走近石碑，点右下角按钮，读一段科学史</div><div class="il">✨ <b>星尘</b>：读一篇 +5 · 通过时空考题 +8 · 读完一纪元 +20</div><div class="il">⏳ <b>时空交易所</b>：星尘在这里换成<b>支援券</b> —— 抵火花的门票、
      给闯关送启示灯，编年史是另外两个世界的补给线</div><div class="il">📝 <b>时空考题</b>：部分卷宗附一题，用你学过的知识回应历史</div><div class="il">📖 <b>编年史</b>：顶部按钮可回顾全部篇章，未读的可一键传送</div><div class="il">🎖️ <b>纪元章</b>：读完一个纪元的全部卷宗即可点亮（共 ${EPOCHS.length} 枚）</div><div class="il">🔀 <b>切模式</b>：随时点「⚔️ 闯关」回去刷题，两边进度分开保存</div></div>
    <div class="row"><button class="btn primary" id="go">开始航行</button></div>
  `;
}

