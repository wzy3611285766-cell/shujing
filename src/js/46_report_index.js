/* =========================================================
   新增功能：考点诊断 / 公式速查 / 引路标 / 每日一练 / 传送阵
   ========================================================= */

/* ---------- 答题流水账：学习报告的数据来源 ----------
   每答一题记两笔：按「岛」记一份看整体强弱，
   再按「知识点」记一份，能精确到"导数与单调性"这一条。 */
function recordAnswer(rid,topic,ok){
  rid=rid||'func';
  const a=state.stat[rid]||(state.stat[rid]={r:0,w:0});
  if(ok)a.r++;else a.w++;
  if(topic){
    const b=state.tstat[topic]||(state.tstat[topic]={r:0,w:0});
    if(ok)b.r++;else b.w++;
  }
}
/* 思路层单独记一笔：只记知识点，不记岛。
   "答案对但思路错"是最值得警惕的组合 —— 说明是蒙对的或走了弯路，
   学习报告里会把这种情况单独列出来。 */
function recordApproach(topic,ok){
  if(!topic)return;
  healAstat();
  const a=state.astat[topic]||(state.astat[topic]={r:0,w:0});
  if(ok)a.r++;else a.w++;
}
function healAstat(){
  if(!state.astat||typeof state.astat!=='object')state.astat={};
}
const rateOf=a=>{const n=a.r+a.w;return n?a.r/n:0;};
const pctOf=v=>Math.round(v*100)+'%';
function levelOf(p){
  if(p>=.85)return{txt:'掌握扎实',c:'#8ef0b8'};
  if(p>=.7) return{txt:'基本过关',c:'#ffd76a'};
  if(p>=.5) return{txt:'还得练练',c:'#ffb06a'};
  return{txt:'薄弱 · 重点突破',c:'#ff8a8a'};
}

/* ---------- 学习报告（考点诊断） ----------
   岛的正确率看整体，知识点正确率看细节，两边一起才判得出该补哪里。 */
function showReport(){
  if(CUR===EPIC){
    openPanel(`<h2>📊 学习报告</h2>
      <div class="sub">答题诊断只在闯关模式统计</div>
      <div class="center" style="font-size:44px;margin:10px 0">📜</div>
      <div class="center">这里记的是十四个域的刷题数据。<br>先回「⚔️ 闯关模式」做几套题，再来看诊断。</div>
      <div class="row"><button class="btn primary" id="ok">关闭</button></div>`);
    $('ok').onclick=closePanel;return;
  }
  const rows=REGIONS.map(r=>{
    const a=state.stat[r.id]||{r:0,w:0};
    const n=a.r+a.w;
    return {reg:r,a:a,n:n,p:n?rateOf(a):0};
  });
  const totR=rows.reduce((s,x)=>s+x.a.r,0),totW=rows.reduce((s,x)=>s+x.a.w,0),totN=totR+totW;
  if(!totN){
    openPanel(`<h2>📊 学习报告</h2>
      <div class="sub">还没有答题记录</div>
      <div class="center" style="font-size:44px;margin:10px 0">🌱</div>
      <div class="center">先去点亮一块石碑（3 题）,<br>这里就会长出你的专属诊断：<br>
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">每个域的正确率、最该补的知识点、下一步该练什么</span></div>
      <div class="row"><button class="btn primary" id="ok">去练题</button></div>`);
    $('ok').onclick=closePanel;return;
  }
  const overall=pctOf(rateOf({r:totR,w:totW}));
  /* 练枪场的账也并进来看：它和推图共用 tstat，这里只补一句总览 */
  const dt=drillTotal();
  /* 只统计做过的岛；一道错题就判成弱项太武断，至少 2 题才进榜 */
  const weak=Object.keys(state.tstat||{}).map(k=>{
    const a=state.tstat[k],n=a.r+a.w;
    return {k:k,n:n,p:n?rateOf(a):0,w:a.w};
  }).filter(x=>x.n>=2).sort((a,b)=>a.p-b.p||b.n-a.n).slice(0,3);
  /* 思路层诊断：把「答案对但思路错」单独挑出来 —— 这是最容易自我欺骗的组合。
     同样要求该知识点至少记 2 次思路，一次就下结论太武断。 */
  healAstat();
  const apAll=Object.keys(state.astat||{}).map(k=>{
    const a=state.astat[k];return {r:a.r||0,w:a.w||0};
  });
  const apTot=apAll.reduce((s,x)=>s+x.r+x.w,0);
  const apRate=apTot?rateOf({r:apAll.reduce((s,x)=>s+x.r,0),w:apAll.reduce((s,x)=>s+x.w,0)}):0;
  const apWeak=Object.keys(state.astat||{}).map(k=>{
    const a=state.astat[k],n=(a.r||0)+(a.w||0);
    return {k:k,n:n,p:n?rateOf({r:a.r||0,w:a.w||0}):0,w:a.w||0};
  }).filter(x=>x.n>=2).sort((a,b)=>a.p-b.p||b.n-a.n).slice(0,3);
  /* 答案对、思路错：说明是蒙对的或走了弯路，比单纯答错更值得回头看 */
  const lucky=Object.keys(state.astat||{}).filter(k=>{
    const a=state.astat[k],t=state.tstat[k];
    return (a.w||0)>0&&t&&t.r>0&&t.r>=t.w;
  }).sort((a,b)=>(state.astat[b].w||0)-(state.astat[a].w||0)).slice(0,3);
  /* 建议盯住「做过 3 题以上 + 正确率最低」的那座岛 */
  const cand=rows.filter(x=>x.n>=3);
  const worst=cand.length?cand.reduce((a,b)=>a.p<=b.p?a:b):null;
  openPanel(`
    <h2>📊 学习报告</h2>
    <div class="sub">按域与知识点的正确率诊断，练得越多越准</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:12px;margin-bottom:12px;line-height:var(--lh-loose)">
      累计 <b>${totN}</b> 题 · 总正确率 <b style="color:#ffd76a">${overall}</b><br>
      答对 ${totR} · 答错 ${totW} · 当前连对 ${state.streak||0} · 最长连对 ${state.bestStreak||0}<br>
      错题本还剩 ${state.wrongBook.length} / ${WRONG_CAP} 题
      ${apTot?`<br>🧭 思路命中 <b style="color:#9fe4ff">${pctOf(apRate)}</b>（${apTot} 次选择）`:''}
      ${dt.n?`<br>🎯 练枪场累计 <b>${dt.n}</b> 题 · 命中 <b style="color:#ffd76a">${pctOf(dt.p)}</b>`:''}
    </div>
    ${rows.filter(x=>x.n>0).map(x=>{const L=levelOf(x.p);return `
      <div class="item" style="align-items:flex-start;margin-bottom:9px">
        <div class="ic">${x.reg.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="nm">${esc(x.reg.name)}
            <span style="color:#9cc0e0;font-size:var(--fs-xs);font-weight:600">
              ${x.n} 题 · ${pctOf(x.p)} · ${TIER_NAME[state.tier[x.reg.id]||1]}档</span></div>
          <div class="pbar" style="margin:7px 0 3px"><i style="width:${(x.p*100).toFixed(0)}%"></i></div>
          <div class="ds" style="color:${L.c}">${L.txt}</div>
        </div>
      </div>`;}).join('')}
    ${rows.filter(x=>!x.n).length?`<div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-bottom:8px">
      还没练过的域：${rows.filter(x=>!x.n).map(x=>esc(x.reg.name)).join('、')}</div>`:''}
    ${weak.length?`<div class="center" style="text-align:left;margin-top:8px;line-height:var(--lh-loose)">
      <b style="color:#ff8a8a">🎯 最该补的知识点</b><br>
      ${weak.map(w=>`· ${esc(w.k)}：${w.n} 题 · 正确率
        <b style="color:${levelOf(w.p).c}">${pctOf(w.p)}</b>（错 ${w.w} 次）`).join('<br>')}
    </div>`:''}
    ${apWeak.length?`<div class="center" style="text-align:left;margin-top:8px;line-height:var(--lh-loose)">
      <b style="color:#9fe4ff">🧭 思路最容易走偏的知识点</b><br>
      ${apWeak.map(w=>`· ${esc(w.k)}：${w.n} 次 · 命中率
        <b style="color:${levelOf(w.p).c}">${pctOf(w.p)}</b>（偏 ${w.w} 次）`).join('<br>')}
    </div>`:''}
    ${lucky.length?`<div class="center" style="text-align:left;margin-top:8px;line-height:var(--lh-loose);color:#ffd0d0">
      <b>⚠️ 答案对了但思路偏了</b><br>
      ${lucky.map(k=>`· ${esc(k)}：思路偏 ${state.astat[k].w} 次`).join('<br>')}
      <div style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:4px">这类题多半是蒙对或走了弯路，建议重看一遍破题口。</div>
    </div>`:''}
    ${worst?`<div class="center" style="text-align:left;margin-top:10px;color:#cfe6ff;line-height:var(--lh-loose)">
      💡 下一步：回 <b style="color:#ffd76a">${esc(worst.reg.name)}</b> 刷石碑，<br>
      或花 10 结晶做一轮专项训练（${esc(worst.reg.sub||'')}）。</div>`:''}
    <div class="row"><button class="btn" id="rpWb">📕 错题中心${wbDueList().length?'（'+wbDueList().length+'）':''}</button><button class="btn" id="rpDr">🎯 练枪场</button><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  $('rpWb').onclick=showWrongBook;
  $('rpDr').onclick=showDrill;
}

/* ---------- 公式速查 ----------
   考前扫一眼比翻书快：按域分组，只收最常用的那几条。
   上下标用 ^ / _ 写，避免小屏字体缺字符。 */
function showFormula(rid){
  const ids=Object.keys(FORMULAS);
  if(!rid||!FORMULAS[rid])rid=ids.indexOf(state.region)>=0?state.region:ids[0];
  const reg=REGIONS.find(r=>r.id===rid);
  const list=FORMULAS[rid]||[];
  openPanel(`
    <h2>📐 公式速查</h2>
    <div class="sub">${reg?esc(reg.emoji+' '+reg.name+' · '+reg.sub):esc(rid)}</div>
    <div class="row" style="margin-top:0;margin-bottom:12px;gap:7px">
      ${ids.map(k=>{const r=REGIONS.find(v=>v.id===k);
        return `<button class="btn ${k===rid?'primary':''}" id="fm_${k}"
          style="flex:0 0 auto;min-width:0;padding:7px 11px">${r?r.emoji:k}</button>`;}).join('')}
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

/* ---------- 引路标 ----------
   地图 2400×1900，跑图全靠腿。点一下就告诉你最近的目标在哪、往哪走，
   再给一支跟着人走的箭头，走岔了也能掰回来。 */
let guideTarget=null,guideTimer=0;
function spotNameOf(s){
  if(CUR===EPIC&&typeof epicSpotLabel==='function')return epicSpotLabel(s);
  if(s.t==='stele')return '🗿 智慧石碑';
  if(s.t==='guard')return '🛡️ '+(s.name||'守护者');
  if(s.t==='spirit'){const sp=SPIRITS.find(v=>v.id===s.sid);return sp?sp.e+' '+sp.n:'✨ 野生精灵';}
  if(s.t==='hermit')return '🧙 引路人';
  return s.name||'目标';
}
function guideCandidates(){
  const out=[];
  SPOTS.forEach(s=>{
    /* 引路人不进候选：它只给提示、不产生进度，指过去没意义，
       而且它永远"未完成"，会把真正要打的石碑、精灵挤到后面 */
    if(s.t==='hermit')return;
    /* 史诗模式的卷宗读完也算"没做完"，这里用 read 判断，避免反复指已读篇目 */
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
function dirName(dx,dy){
  /* 屏幕坐标 y 向下为正，所以 atan2(dy,dx)=0 是东、π/2 是南 */
  const a=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
  return ['东','东南','南','西南','西','西北','北','东北'][Math.round(a/45)%8];
}
function showGuide(){
  const list=guideCandidates()
    .map(o=>({o:o,d:dist(state.x,state.y,o.x,o.y)}))
    .sort((a,b)=>a.d-b.d);
  if(!list.length){
    openPanel(`<h2>🔭 引路标</h2>
      <div class="sub">附近没有未完成的目标了</div>
      <div class="center" style="font-size:44px;margin:10px 0">🎉</div>
      <div class="center">这一带的石碑、精灵、结晶都被你收干净了。<br>去下一域看看，或挑战守护者拿徽章。</div>
      <div class="row"><button class="btn primary" id="ok">好</button></div>`);
    $('ok').onclick=closePanel;return;
  }
  const g=list[0],rest=list.length-1;
  const dx=g.o.x-state.x,dy=g.o.y-state.y;
  openPanel(`
    <h2>🔭 引路标</h2>
    <div class="sub">离你最近的一个目标</div>
    <div class="center" style="font-size:52px;margin:4px 0">${g.o.emoji}</div>
    <div class="center" style="font-size:var(--fs-lg);font-weight:700;color:#fff">${esc(g.o.name)}</div>
    <div class="center" style="margin-top:8px;line-height:var(--lh-loose)">
      方向：<b style="color:#ffd76a">${dirName(dx,dy)}</b><br>
      距离：约 <b style="color:#ffd76a">${Math.round(g.d/20)}</b> 步
      <span style="color:#7d94ab;font-size:var(--fs-xs)">（一步约 20 个身位）</span><br>
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">这一带还剩 ${rest+1} 个未完成的目标</span>
    </div>
    <div class="row">
      <button class="btn" id="gl">🧭 指路 12 秒</button>
      <button class="btn primary" id="ok">知道了</button>
    </div>
  `);
  $('ok').onclick=closePanel;
  $('gl').onclick=()=>{
    closePanel();
    guideTarget={x:g.o.x,y:g.o.y};
    guideTimer=12000;
    toast('🧭 跟着金色箭头走');
  };
}

/* ---------- 每日一练 ----------
   每天一组跨域混合题，答完给一笔结晶。跨域抽题是为了"混着考"——
   真实考卷不会先告诉你这题考数列。 */
function todayStr(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dayOffsetStr(n){
  const d=new Date();d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
/* 已开通的岛：从第一座岛出发，沿「徽章已解锁的桥」扩散 */
function unlockedRegions(){
  if(!REGIONS.length)return [];
  const open=new Set([REGIONS[0].id]);let changed=true;
  while(changed){
    changed=false;
    for(const b of BRIDGES){
      if(b.need&&!state.badges[b.need])continue;
      if(open.has(b.from)&&!open.has(b.to)){open.add(b.to);changed=true;}
      if(open.has(b.to)&&!open.has(b.from)){open.add(b.from);changed=true;}
    }
  }
  return REGIONS.filter(r=>open.has(r.id)).map(r=>r.id);
}
function showDaily(){
  const today=todayStr();
  if(state.daily===today){
    openPanel(`<h2>🎯 每日一练</h2>
      <div class="sub">${today} 已完成 ✓</div>
      <div class="center" style="font-size:44px;margin:8px 0">✅</div>
      <div class="center" style="line-height:var(--lh-loose)">
        今天的一组已经打完了。<br>
        连续打卡 <b style="color:#ffd76a">${state.dailyStreak||1}</b> 天<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">明天 0 点刷新，回来接着练</span>
      </div>
      <div class="row"><button class="btn primary" id="ok">好</button></div>`);
    $('ok').onclick=closePanel;return;
  }
  const ids=unlockedRegions();
  if(ids.length<1){closePanel();return;}
  const tier=clamp(Math.max.apply(null,ids.map(id=>state.tier[id]||1)),1,3);
  const names=ids.map(id=>((REGIONS.find(r=>r.id===id)||{}).name||'')).join(' · ');
  const cont=state.dailyStreak&&state.daily===dayOffsetStr(-1);
  openPanel(`
    <h2>🎯 每日一练</h2>
    <div class="sub">${today} · ${ids.length} 座已开通的域混合抽题</div>
    <div class="center" style="font-size:48px;margin:6px 0">🎯</div>
    <div class="center" style="line-height:var(--lh-loose)">
      <b style="color:#ffd76a">5 道题</b>，跨域混合、难度 ${TIER_NAME[tier]}档<br>
      做完额外奖励 <b style="color:#ffd76a">20 🪙</b><br>
      <span style="color:#9cc0e0;font-size:var(--fs-sm)">${esc(names)}</span><br>
      ${cont?`<span style="color:#8ef0b8">已连续 ${state.dailyStreak} 天，今天是第 ${state.dailyStreak+1} 天 🔥</span>`
            :`<span style="color:#9cc0e0;font-size:var(--fs-xs)">每天一组，中断则重新计数</span>`}
    </div>
    <div class="row"><button class="btn" id="no">再等等</button><button class="btn primary" id="go">开始</button></div>
  `);
  $('no').onclick=closePanel;
  $('go').onclick=()=>{
    session({rid:ids,tier:tier,count:5,title:'🎯 每日一练',gain:5,canHint:true,
      onFinish:(right,total)=>{
        /* 连续天数：昨天打过就 +1，断档了从 1 重新起算 */
        state.dailyStreak=(state.daily===dayOffsetStr(-1))?((state.dailyStreak||0)+1):1;
        state.daily=todayStr();
        state.crystals+=20;save();updateHUD();SFX.win();
        openPanel(`<h2>今日完成 🎉</h2>
          <div class="sub">答对 ${right} / ${total} 题</div>
          <div class="center" style="font-size:48px;margin:8px 0">${right>=4?'🏆':(right>=3?'💪':'📗')}</div>
          <div class="center" style="line-height:var(--lh-loose)">
            额外奖励 <b style="color:#ffd76a">20 🪙</b><br>
            连续打卡 <b style="color:#ffd76a">${state.dailyStreak}</b> 天<br>
            <span style="color:#9cc0e0;font-size:var(--fs-sm)">明天 0 点刷新新的一组</span>
          </div>
          <div class="row"><button class="btn" id="rp">📊 看诊断</button><button class="btn primary" id="ok">好</button></div>`);
        $('ok').onclick=closePanel;
        $('rp').onclick=showReport;
      }});
  };
}

