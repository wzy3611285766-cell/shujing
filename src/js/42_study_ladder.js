/* =========================================================
   自习室 + 母题阶梯（选层 UI）
   ---------------------------------------------------------
   4.1.1 自 49_drill.js 拆出：自习室（按真实做题记录排「该练哪块」）
   与母题阶梯的选层界面。阶梯的数据与爬梯会话（LADDERS / ladderSession）
   在 16_bank_ladder.js，这里只是 UI 入口。
   ========================================================= */
/* =========================================================
   📚 自习室（173.5）
   —— "打开就知道该学什么"的窗口。
   ---------------------------------------------------------
   练枪场解决的是"我想练某一块"，自习室补另一半：
   **不知道该练哪块的时候，替你排好序**。
   排序依据只有两条，全部来自真实做题记录（state.drill）：
     ① 做过但正确率低的专题 —— 真短板，排最前
     ② 一次都没碰过的专题 —— 盲区，排在其次
   已掌握的不列出来（做过 3 题以上且正确率 ≥ 80%），
   否则列表会越用越长、又变回"一大坨"。
   点进去仍然走 drillSession，所以思路详解、提示免费、
   错题自动归档这一整套机制原样复用 —— 这里只负责指路。
   ========================================================= */
function studyTopicStats(){
  const acc={};
  DRILL_SUBJ.forEach(s=>{
    const d=drillStat(s.id);
    if(!d||!d.t)return;
    Object.keys(d.t).forEach(topic=>{
      const rec=d.t[topic]||{};
      let hit=null;
      (DRILL_RIDS[s.id]||[]).forEach(rid=>{
        if(hit)return;
        const t=topicBest(rid,topic);
        if(t)hit=t;
      });
      if(!hit)return;
      /* topicBest 返回的是专题 **id 字符串**（不是对象），
         一开始按 hit.id 取，统计全落到了 undefined 这个键上，
         结果"动过 0 块"永远出不来 —— 这种"返回类型记岔了"的坑，
         写的时候一定要看一眼被调函数的 return。 */
      const a=acc[hit]||(acc[hit]={n:0,r:0,w:0,sid:s.id});
      const r=rec.r||0,w=rec.w||0;
      a.n+=r+w;a.r+=r;a.w+=w;
    });
  });
  return acc;
}
function studyAllTopics(){
  const st=studyTopicStats(),out=[];
  Object.keys(DRILL_TOPICS).forEach(rid=>{
    const sid=subjOfRid(rid);
    (DRILL_TOPICS[rid]||[]).forEach(t=>{
      const a=st[t.id];
      const n=a?a.n:0,r=a?a.r:0;
      out.push({id:t.id,nm:t.n,rid:rid,sid:sid,t:t,cnt:n,
        rate:n?r/n:null,done:n>=3&&(r/n)>=0.8});
    });
  });
  return out;
}
function showStudyRoom(){
  /* 和练枪场同一条规矩：自习记录写在 state.drill 里，跟着世界走，
     所以要真的切到练枪场这个世界才能落账（理由见 showDrill 的注释） */
  if(CUR!==ADV&&CUR!==DRILL){
    switchTo(DRILL);
    if(CUR!==DRILL)return;
    toast('📚 已切到练枪场 · ☰ 菜单可切回原来的世界');
  }
  const all=studyAllTopics();
  const total=all.length;
  const mastered=all.filter(x=>x.done).length;
  const touched=all.filter(x=>x.cnt>0).length;
  const weak=all.filter(x=>x.cnt>0&&!x.done).sort((a,b)=>(a.rate-b.rate)||(b.cnt-a.cnt));
  const fresh=all.filter(x=>x.cnt===0);
  const rec=weak.slice(0,3).concat(fresh.slice(0,2)).slice(0,5);
  function markOf(x){
    if(x.cnt===0)return {e:'⬜',c:'#7d94ab',t:'还没练过 · 点开就能开始'};
    const p=Math.round(x.rate*100);
    if(x.rate<0.6)return {e:'🔥',c:'#ff8a5c',t:'正确率 '+p+'% · 这是短板'};
    return {e:'🟡',c:'#ffd76a',t:'正确率 '+p+'% · 再练几题就掌握'};
  }
  function card(x,cid){
    const m=markOf(x);
    const s=DRILL_OF[x.sid]||{name:''};
    return `<button class="menu-li" id="${cid}">
      <span class="e">${m.e}</span>
      <span class="tx">${esc(x.nm)}<span style="font-size:var(--fs-xs);color:#9cc0e0"> · ${s.name}</span>
        <div class="d" style="color:${m.c}">${m.t}${x.cnt?' · 做过 '+x.cnt+' 题':''}</div>
      </span></button>`;
  }
  const recHtml=rec.map((x,i)=>card(x,'sr_r'+i)).join('');
  const groups=DRILL_SUBJ.map(s=>{
    const list=all.filter(x=>x.sid===s.id&&!x.done);
    if(!list.length)return '';
    /* 两列网格 + 每科最多 8 块：专题一共六十多个，全铺成竖排长条
       又会变成"一大坨"，滚动条拉半天才到底 */
    const show=list.slice(0,8),more=list.length-show.length;
    return `<div class="sub" style="text-align:left;margin:13px 0 8px">${s.emoji} ${s.name}
      <span style="color:#7d94ab;font-weight:600">　还有 ${list.length} 块没掌握</span></div>
      <div class="bz-grid2">${show.map((x,i)=>card(x,'sr_'+s.id+'_'+i)).join('')}
      ${more?`<div class="center" style="grid-column:1/-1;font-size:var(--fs-xs);color:#7d94ab;padding:2px">
        …还有 ${more} 块没列出，去 🎯 练枪场能挑全部专题</div>`:''}</div>`;
  }).join('');
  openPanel(`
    <h2>📚 自习室</h2>
    <div class="sub">打开就知道该补哪一块 · 提示免费 · 答错不扣分</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:11px;margin-bottom:12px;line-height:var(--lh-base)">
      已掌握 <b style="color:#84e3a6">${mastered}</b> / ${total} 块 · 动过 <b style="color:#ffd76a">${touched}</b> 块<br>
      <span style="font-size:var(--fs-xs);color:#9cc0e0">算掌握 = 做过 3 题以上且正确率 ≥ 80%</span>
    </div>
    ${rec.length?`<div class="sub" style="text-align:left;margin:2px 0 8px">🔥 最该补的几块</div>
      <div class="menu-list" style="margin-bottom:4px">${recHtml}</div>`:''}
    <div class="sub" style="text-align:left;margin:14px 0 4px">按科目看</div>
    ${groups||'<div class="center" style="color:#84e3a6;padding:12px 0">全部专题都掌握了 🎉</div>'}
    <div class="row"><button class="btn" id="srDrill">🎯 去练枪场</button>
      <button class="btn primary" id="ok">关闭</button></div>
  `);
  function go(x){
    closePanel();
    const last=state.drillTier&&state.drillTier[x.sid];
    const arr=x.t.t||[2];
    const tier=last||arr[arr.length-1]||2;
    drillSession(x.sid,{tier:tier,focus:true,tid:x.id});
  }
  rec.forEach((x,i)=>{const b=$('sr_r'+i);if(b)b.onclick=()=>go(x);});
  DRILL_SUBJ.forEach(s=>{
    all.filter(x=>x.sid===s.id&&!x.done).slice(0,8).forEach((x,i)=>{
      const b=$('sr_'+s.id+'_'+i);if(b)b.onclick=()=>go(x);
    });
  });
  const d=$('srDrill');if(d)d.onclick=()=>{closePanel();showDrill();};
  $('ok').onclick=closePanel;
}

/* ---------- 🧗 母题阶梯：挑一个模型，从母题一格格往上爬 ---------- */
function showLadder(){
  /* 和练枪场 / 自习室同一条规矩：进度写在 state.lad 里、跟着世界走，
     所以要真的切到练枪场这个世界才能落账 */
  if(CUR!==ADV&&CUR!==DRILL){
    switchTo(DRILL);
    if(CUR!==DRILL)return;
    toast('🧗 已切到练枪场 · ☰ 菜单可切回原来的世界');
  }
  const all=ladderList(null);
  const full=all.filter(L=>ladStat(L.id).lv>=2).length;
  function card(L,cid){
    const st=ladStat(L.id);
    const s=DRILL_OF[L.s]||{name:''};
    /* 三格进度：● 过了 · ◉ 正在这一级 · ○ 还没到 */
    const dots=[0,1,2].map(k=>st.lv>k?'●':(st.lv>=k||st.n===0?'○':'○')).join('');
    return `<button class="menu-li" id="${cid}">
      <span class="e">${ladMark(L.id)}</span>
      <span class="tx" style="white-space:normal">${esc(L.n)}<span style="font-size:var(--fs-xs);color:#9cc0e0"> · ${s.name}</span>
        <div class="d" style="color:#9cc0e0;white-space:normal;overflow:visible;text-overflow:clip">核心方法：${esc(L.model)}</div>
        <div class="d" style="color:${st.lv>=2?'#84e3a6':'#7d94ab'};white-space:normal;overflow:visible;text-overflow:clip">
          母题 → 变式 → 出其不意　<b>${dots}</b>${st.n?' · 过 '+Math.max(st.lv+1,0)+'/3':''}</div>
      </span></button>`;
  }
  const groups=DRILL_SUBJ.map(s=>{
    const list=ladderList(s.id);
    if(!list.length)return '';
    return `<div class="sub" style="text-align:left;margin:13px 0 8px">${s.emoji} ${s.name}
      <span style="color:#7d94ab;font-weight:600">　${list.length} 个模型</span></div>
      <div class="bz-grid2">${list.map((L,i)=>card(L,'ld_'+s.id+'_'+i)).join('')}</div>`;
  }).join('');
  openPanel(`
    <h2>🧗 母题阶梯</h2>
    <div class="sub">课本原型 → 换皮 → 出其不意 · 三级<b>按顺序</b>连刷 · 提示免费</div>
    <div class="center" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:11px;margin-bottom:12px;line-height:var(--lh-loose)">
      <b style="font-size:var(--fs-lg)">${full} / ${all.length}</b> 个模型三级全过
      <div style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:4px">
        创新题不会做，多半是跳级了 —— 从母题一格格往上爬，爬到第三级你会发现自己已经能做那种题了</div>
    </div>
    ${groups||'<div class="center" style="color:#7d94ab;padding:20px">阶梯题库还没装进来</div>'}
    <div class="row"><button class="btn" id="ok">关闭</button></div>`);
  DRILL_SUBJ.forEach(s=>{
    ladderList(s.id).forEach((L,i)=>{
      const el=$('ld_'+s.id+'_'+i);
      if(el)el.onclick=()=>{closePanel();audioKick();ladderSession(L.id);};
    });
  });
  $('ok').onclick=closePanel;
}
