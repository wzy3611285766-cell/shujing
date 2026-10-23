/* =========================================================
   思路提示链
   —— 提示不再替玩家划掉两个错误选项（那是替他做题），
      而是像老师坐在旁边，一层层往下递思路：
        ① 从哪儿入手：考点 + 切入动作（不给结论、不碰选项）
        ② 关键提醒：这一步最容易踩的坑 / 最该抓住的性质
        ③ 解析的前半段：几乎摊开，但最后一步仍要自己算
      每层消耗一盏启示灯，逐条追加在题目下方，不会互相覆盖。
      数据来自 APPROACH 思路池与题目自带的解析；
      没有思路池的题（少数新题）自动降级成"解析分句递进"。
   ========================================================= */
/* ---------- 攻坚题的图、长解析、完整步骤（2.0.0）----------
   fig 可以是字符串，也可以是「运行时才画图」的函数（曲线要采样，只能现算）。 */
function figStr(f){
  if(!f)return '';
  try{return typeof f==='function'?f():String(f);}catch(e){return '';}
}
function qFigStr(q){
  if(!q)return '';
  if(q.hardIdx!=null&&typeof HARD!=='undefined'&&HARD[q.hardIdx])return figStr(HARD[q.hardIdx].fig);
  return figStr(q.fig);
}
function qFigHtml(q){
  const t=qFigStr(q);
  if(!t)return q&&q.img?'<div class="qimg">'+imgTag(q.img,'qimg-i')+'</div>':'';
  return '<div class="qfig">'+String(t).replace('<svg ','<svg onclick="figZoom(this)" ')+'</div>';
}
/* 点题图放大看（公式、坐标系在小屏上挤成一团时才用得上）
   动图放大后照样动，并给一个 ⏸/▶ —— 想盯着某一帧看时能按住它 */
function figZoom(el){
  if(!el)return;
  const anim=el.getAttribute('data-fig');
  /* 放大就重新挂一份：svg 是复制出来的新节点，得再登记一次。
     序列化用 XMLSerializer，产出的是同样一段标记；不整段读回 HTML 属性，
     免得安全扫描把「读写整段标记」判成注入点。 */
  const t=(new XMLSerializer()).serializeToString(el)
    .replace('class="qfig-svg"','class="qfig-svg" style="width:100%;height:auto;max-height:74vh;border-radius:10px;background:#fff"')
    .replace('__qfig','__qfig_old');
  openPanel('<div style="text-align:center">'+t+'</div>'
    +'<div class="row">'
    +(anim?'<button class="btn" id="fzPause">⏸ 暂停</button>':'')
    +'<button class="btn primary" id="ok">关闭</button></div>');
  try{qfigRun(panel);}catch(e){}
  const pz=$('fzPause');
  if(pz)pz.onclick=()=>{
    const it=QFIG_LIST.filter(x=>x.svg&&panel.contains(x.svg))[0]||null;
    if(it){it.off=!it.off;pz.textContent=it.off?'▶ 继续':'⏸ 暂停';}
  };
  const b=$('ok');if(b)b.onclick=closePanel;
}
/* 答完之后才摊开的东西：长解析 + 3~4 步完整求解 */
/* 答完之后的解析区：攻坚题 / 带步骤的题摊开完整讲解，普通题维持原来的一行 */
function fbExpHtml(q,open){
  /* 带多解层的题也走展开式 —— 不然 angles 挂在普通题上会被这行 early return 吃掉，
     只剩下一行解析，"换条路走"就永远露不出来 */
  if(q&&(q.hard||(q.steps&&q.steps.length)||(q.angles&&q.angles.length)))
    return qSolveHtml(q,open!==false);
  return '<div class="exp">💡 '+esc(q?q.exp:'')+'</div>';
}
function qSolveHtml(q,open){
  if(!q)return '';
  const st=q.steps||[],ag=q.angles||[];
  if(!q.exp&&!st.length&&!ag.length)return '';
  let inner='';
  if(q.exp)inner+='<div class="qexp"><div class="hd">📖 完整解析</div>'+esc(q.exp)+'</div>';
  if(st.length)inner+='<div class="qexp"><div class="hd">🧠 '+st.length+' 步走完这道题</div><ol>'
    +st.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol></div>';
  if(ag.length){
    inner+='<div class="qexp"><div class="hd">🔀 换条路走：这题有 '+ag.length+' 种解法</div>'
      +ag.map(a=>'<div class="ang">'
        +'<div class="ang-n">'+esc(a.n||'')+'</div>'
        +'<div class="ang-d">'+esc(a.d||'')+'</div>'
        +(a.sig?'<div class="ang-s">👀 什么时候想到它：'+esc(a.sig)+'</div>':'')
        +'</div>').join('')
      +'<div class="ang-tip">同一道题能走通几条路，比多刷十道新题更值钱 —— '
      +'考场上卡住时，换条路往往就通了。</div></div>';
  }
  return '<details class="ai-sec"'+(open?' open':'')+'><summary>📖 摊开完整讲解'
    +(st.length?'（'+st.length+' 步）':'')+(ag.length?' · '+ag.length+' 种解法':'')+'</summary>'+inner+'</details>';
}
function splitSents(s){
  return String(s||'').split(/[。！？；\n]/).map(x=>x.trim()).filter(Boolean);
}
function buildHintChain(q,ap){
  /* 攻坚题 / AI 讲过的题自带 hints：那是按「先做什么 → 再做什么」排好的，
     直接用，别再用解析的句子去拼（拼出来的是散句，不是台阶） */
  if(q&&q.hints&&q.hints.length>=2)return q.hints.slice(0,4);

  /* ---------------------------------------------------------------
     思路的取材顺序（173.1 修正）
     ---------------------------------------------------------------
     用户反馈：「思路和答案不同，那我要这思路还误导我了」。
     根因是旧版把 APPROACH[topic]（按知识点准备的通用套路）摆在第一顺位 ——
     可同一个知识点下的题，解法常常根本不是一条路：
       · 「比较 0.3²、2^0.3、log₂0.3」→ 用 0 和 1 夹，正解
       · 「比较 a=√2、b=log₂3」      → 0 和 1 夹不住（两个都在 1 附近），
                                      必须借中间量 1.5
     两题的 topic 都是「比较大小」，通用套路却只对第一题成立。
     于是第二题就出现了"思路说夹 0/1、解析说取 1.5"的分裂。

     现在把取材顺序倒过来：**先说这道题自己的解法**，
     通用套路只在题目本身没留下任何解法线索时才出场，
     并且措辞上明确标成"通用套路"而不是"这题该这么想"。
     --------------------------------------------------------------- */
  const out=[];
  const A=APPROACH[q.topic]||null;
  const sents=splitSents(q.exp);
  const ag=(q.angles&&q.angles[0])||null;     // 本题专属多解层：{n,d,sig}
  const st=(q.steps&&q.steps.length)?q.steps:null; // 本题专属步骤
  /* 思路层已经答过 → 「从哪儿入手」他已经选过了，不必再重复一遍 */
  const didApproach=!!(ap&&ap.done&&ap.picked!=null);

  /* 第一层：这题从哪儿入手 —— 优先用题目自带的解法信息 */
  if(didApproach){
    /* 已经选过入手点了，这一层直接给"关键提醒" */
    const tip=hintTip(q,A,ag,st,sents);
    if(tip)out.push('关键提醒：'+tip);
  }else if(ag&&ag.n){
    /* 本题多解层的第一条路：路名 + 走法，比 topic 模板精确得多 */
    let s='这题该这么入手 —— '+ag.n;
    if(ag.d)s+='：'+ag.d;
    out.push(trimHint(s,200));
  }else if(st&&st.length){
    /* 本题自带步骤的第一句，通常就是"第一步做什么" */
    out.push('这题的第一步 —— '+trimHint(String(st[0]),180));
  }else if(sents[0]){
    /* 没有专属解法数据，就从本题解析的第一句里抽入手动作 */
    out.push((q.topic?'考点「'+q.topic+'」，':'')+'从解析看入手点 —— '+trimHint(sents[0],180));
  }else if(A&&A.r){
    /* 题目连解析都没有，才退回知识点通用套路，并明确标注是通用套路 */
    out.push((q.topic?'考点「'+q.topic+'」':'')+'的通用套路 —— '+A.r+
      '（这题没留下更具体的线索，按通用套路先试）');
  }else{
    out.push('先把已知条件一条条列出来，再看它问的到底是什么。');
  }

  /* 第二层：本题的信号 / 通用点睛 / 解析第二句。
     注意去重 —— 第一层走 hintTip() 时可能已经用过 ag.sig 了，
     再推一遍会出现"思路 1 和 思路 2 一模一样"，看着像卡住了。 */
  if(out.length<2){
    const used=out.join('\u0001');
    const cands=[
      ag&&ag.sig?['看到什么就该想到它：',trimHint(ag.sig,180)]:null,
      A&&A.k?['通用提醒：',A.k]:null,
      sents[1]?['再往下想一步：',trimHint(sents[1],180)]:null,
    ].filter(Boolean);
    for(const c of cands){
      if(used.indexOf(c[1])>=0)continue;   // 这句话第一层已经给过了
      out.push(c[0]+c[1]);
      break;
    }
  }
  /* 第三层：解析的前两句拼起来 —— 给到方法，但不给最终答案 */
  if(out.length<3){
    const tail=sents.slice(didApproach?1:0,3).join('。');
    if(tail){
      let s=tail.replace(/。+$/,'')+'。';
      if(s.length>240)s=s.slice(0,240)+'……';
      out.push('把这一步走完：'+s);
    }
  }
  /* 第四层：解析再往后走两句 —— 台阶给到第四级，最后一步留给人自己迈 */
  if(out.length<3){
    const t2=sents.slice(didApproach?2:1,5).join('。');
    if(t2){
      let s=t2.replace(/。+$/,'')+'。';
      if(s.length>220)s=s.slice(0,220)+'……';
      out.push('再往下算一步：'+s);
    }
  }
  return out.slice(0,4);
}
/* 台阶文案的截断：按句读切，别切在半个词上 */
function trimHint(s,n){
  s=String(s||'').replace(/。+$/,'').trim();
  if(s.length<=n)return s;
  const cut=s.slice(0,n);
  const m=Math.max(cut.lastIndexOf('，'),cut.lastIndexOf('、'),cut.lastIndexOf('；'));
  return (m>n*0.5?cut.slice(0,m):cut)+'……';
}
/* 「关键提醒」的来源：优先本题的解法信号，其次通用点睛，最后本题解析 */
function hintTip(q,A,ag,st,sents){
  if(ag&&ag.sig)return trimHint(ag.sig,180);
  if(A&&A.k)return A.k;
  if(sents[0])return trimHint(sents[0],180);
  if(st&&st.length)return trimHint(String(st[0]),180);
  return '';
}
/* 提示卡片：逐条列出已经买下的思路（外层 #hintBox 由调用方渲染成空 div） */
function hintBoxHtml(chain,lv){
  if(!lv)return '';
  return `<div style="background:rgba(94,214,255,.10);
    border:1px solid rgba(94,214,255,.32);border-radius:14px;
    padding:10px 13px;margin-top:12px;text-align:left;
    font-size:var(--fs-sm);line-height:var(--lh-base);color:#dbeafe">
    ${chain.slice(0,lv).map((h,i)=>`<div${i?' style="margin-top:6px"':''}>
      <b style="color:#9fe4ff">💡 思路 ${i+1}：</b>${esc(h)}</div>`).join('')}
  </div>`;
}

function session(cfg){
  let i=0,right=0,wrong=0,usedHint=false;
  /* 档位在会话内就能升降：连对 2 题立刻升一档，错的多了再降回来。
     守护者挑战（fixedTier）固定打高考题，不参与升降 */
  let curTier=clamp(cfg.tier,1,3);
  /* 混合模式（每日一练）：cfg.rid 传岛 id 数组，每一题换一座已开通的岛 */
  const mixed=Array.isArray(cfg.rid);
  let curRid=mixed?pick(cfg.rid):cfg.rid;
  let q=genQuestion(curRid,curTier,1),t0=performance.now(),opts=q.opts.slice();
  /* 172 版起：闯关模式不再走「先选思路」这一步 —— 抽实题、直接答题。
     思路学习归练枪模式（那里有完整的思路详解），这里 ap 恒为 null，
     render() 检测到没有思路层就直接进第二步。 */
  let ap=null;

  function headHtml(){
    const allowTxt=cfg.allowWrong!=null?` · 可错 ${Math.max(0,cfg.allowWrong-wrong)} 次`:'';
    const tagTxt=mixed
      ? (((REGIONS.find(r=>r.id===curRid)||{}).name||'综合')+' · '+TIER_NAME[curTier])
      : (q.topic+' · '+TIER_NAME[curTier]);
    return `<h2>${cfg.title}</h2>
      <div class="sub">第 ${i+1} / ${cfg.count} 题 · 已答对 ${right}${allowTxt}</div>
      <div style="text-align:center"><span class="qtag">${esc(tagTxt)}</span>${srcBadge(q.src,q.qt)}</div>
      <div class="qtext">${esc(q.text)}</div>${qFigHtml(q)}`;
  }
  /* 第一步的结果压成一行小卡片，跟着第二步一起显示，
     玩家能拿自己的切入点和最后的解析对照 */
  function apprRecapHtml(){
    if(!ap||!ap.done)return '';
    if(ap.picked==null)return `<div class="appr-recap skip">🧭 跳过了思路环节</div>`;
    return `<div class="appr-recap ${ap.ok?'ok':'no'}">🧭 ${ap.ok?'切入点正确':'切入点偏了'} · ${esc(ap.picked)}
      ${ap.ok?'':`<div class="rk">更好的入手：${esc(ap.r)}</div>`}</div>`;
  }

  /* ---------- 第一步：选思路 ---------- */
  function renderApproach(){
    usedHint=false;
    openPanel(`${headHtml()}
      <div class="qmeta">🧭 第一步 · 先想清楚从哪儿入手（这一步不计对错）</div>
      <div class="opts">${ap.opts.map((o,idx)=>`<div class="opt appr" data-i="${idx}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row">
        <button class="btn" id="skipBtn">跳过</button>
        <button class="btn primary" id="nextBtn" style="display:none">看选项 →</button>
      </div>`,1);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>pickApproach(+el.dataset.i));
    });
    $('skipBtn').addEventListener('click',()=>{ap.picked=null;ap.ok=false;ap.done=true;renderAnswer();});
    $('nextBtn').addEventListener('click',renderAnswer);
  }
  function pickApproach(idx){
    if(ap.done)return;
    ap.done=true;ap.picked=ap.opts[idx];ap.ok=ap.opts[idx]===ap.r;
    recordApproach(q.topic,ap.ok);
    panel.querySelectorAll('.opt').forEach(el=>{
      const k=+el.dataset.i;
      el.classList.add('locked');
      if(ap.opts[k]===ap.r)el.classList.add('right');
      else if(k===idx)el.classList.add('wrong');
      else el.classList.add('dim');
    });
    const fb=$('feedback');
    fb.className=ap.ok?'ok':'no';
    setH(fb, ap.ok
      ? `✅ 对路 · ${esc(ap.picked)}${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`
      : `💡 更好的入手：<b>${esc(ap.r)}</b>${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`);
    /* 不响音效：紧接着还要选答案，连着两声"正确"很吵，绿色卡片已经够反馈了 */
    $('skipBtn').style.display='none';
    $('nextBtn').style.display='block';
    save();
  }

  /* ---------- 第二步：选答案 ---------- */
  function renderAnswer(){
    if(ap&&!ap.done){ap.done=true;ap.picked=null;ap.ok=false;}
    /* 计时从这一步重新开始：思路阶段本来就要多花时间，
       算进"迅捷"奖励会让想得久的玩家白白吃亏 */
    t0=performance.now();
    usedHint=false;
    /* 提示按层给：每次点一下往下递一条思路，而不是划掉两个选项 */
    const hintChain=buildHintChain(q,ap);
    let hintLv=0;
    openPanel(`${headHtml()}
      ${apprRecapHtml()}
      ${lingStrip(q)}
      <div class="qmeta">${cfg.fixedTier
        ? '第二步 · 选出正确答案（高考真题档 · 最多错 1 题）'
        : '第二步 · 选出正确答案（连对 2 题升档，错 2 题降档）'}</div>
      <div class="opts">${opts.map((o,idx)=>`<div class="opt" data-i="${idx}">${esc(o)}</div>`).join('')}</div>
      <div id="hintBox"></div>
      <div id="feedback"></div>
      <div class="row">
        ${cfg.canHint?`<button class="btn" id="hintBtn" ${state.hint<=0?'disabled':''}>💡 给点思路 (${state.hint})</button>`:''}
        <button class="btn primary" id="nextBtn" style="display:none">继续 →</button>
      </div>`,1);
    bindOpts();
    const hb=$('hintBtn');
    if(hb)hb.addEventListener('click',()=>{
      if(state.hint<=0)return;
      if(hintLv>=hintChain.length){toast('思路已经给到底了');return;}
      state.hint--;usedHint=true;save();
      hintLv++;
      const box=$('hintBox');
      if(box)setH(box, hintBoxHtml(hintChain,hintLv));
      if(hintLv>=hintChain.length){hb.textContent='💡 思路已给完';hb.disabled=true;}
      else hb.textContent='💡 再给一步 ('+state.hint+')';
      if(state.hint<=0)hb.disabled=true;
      SFX.open();
      panel.scrollTop=panel.scrollHeight;   // 新思路追加在下面，滚过去才看得见
    });
    $('nextBtn').addEventListener('click',()=>{
      i++;
      if(i>=cfg.count||(cfg.allowWrong!=null&&wrong>cfg.allowWrong)){panel.dataset.lock='';cfg.onFinish(right,cfg.count,wrong);}
      else{
        curRid=mixed?pick(cfg.rid):cfg.rid;
        q=genQuestion(curRid,curTier,1);opts=q.opts.slice();
        ap=null;
        render();
      }
    });
  }
  /* 有思路层就走两步，没有就退回原来的一步答题 */
  function render(){
    if(ap)renderApproach();else renderAnswer();
  }
  function bindOpts(){
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>answer(+el.dataset.i));
    });
  }
  function answer(idx){
    const correct=opts[idx]===q.ansText;
    const cost=(performance.now()-t0)/1000;
    panel.querySelectorAll('.opt').forEach(el=>{
      const k=+el.dataset.i;
      el.classList.add('locked');
      if(opts[k]===q.ansText)el.classList.add('right');
      else if(k===idx)el.classList.add('wrong');
      else el.classList.add('dim');
    });
    const fb=$('feedback');
    recordAnswer(curRid,q.topic,correct);
    if(correct){
      right++;state.totalRight++;state.streak=(state.streak||0)+1;
      state.bestStreak=Math.max(state.bestStreak||0,state.streak);
      const bonus=cost<10?2:0;
      /* 思路选对再 +2：奖励"先想清楚"而不是"先蒙再说" */
      const apprBonus=(ap&&ap.ok)?2:0;
      const gain=(cfg.gain||4)+bonus+apprBonus;
      state.crystals+=gain;
      /* 【4.0.21】SFX 挪到"画完之后"（见本函数末尾 sideFx）：
         它要在真机上唤醒 AudioContext，可能几百毫秒 —— 排在视觉写入之后
         同步跑，就会把"变绿"那一帧一起拖住（烽火那边实测 800ms）。 */
      fb.className='ok';
      setH(fb, `✅ 答对！用时 ${cost.toFixed(1)} 秒${bonus?'（迅捷 +'+bonus+'）':''}${apprBonus?'（思路对路 +'+apprBonus+'）':''} · 获得 <b>${gain}</b> 🪙`);
      if(!cfg.fixedTier&&state.streak%2===0&&curTier<3){
        curTier++;
        state.tier[curRid]=Math.max(state.tier[curRid]||1,curTier);
        toast('📈 升档 → '+TIER_NAME[curTier]+'题');
      }
    }else{
      wrong++;state.totalWrong++;state.streak=0;
      if(!cfg.fixedTier&&curTier>1&&wrong>=2){
        curTier--;state.tier[curRid]=curTier;
        toast('📉 降到 '+TIER_NAME[curTier]+'题');
      }
      fb.className='no';
      setH(fb, `❌ 正确答案：<b>${esc(q.ansText)}</b><div class="exp">💡 ${esc(q.exp)}</div>`);
      /* 错题本（容量见 WRONG_CAP，1.5.15 起 30 → 200）。
         走 wbMiss 而不是 wbAdd：题已经在本子里时也要把"又错一次"记下来，
         否则推图时反复错的题在错题分析里一次都不算数。 */
      const kind=wbMiss({text:q.text,ans:q.ansText,exp:q.exp,topic:q.topic,opts:q.opts.slice(),
        rid:curRid,subject:subjOfRid(curRid),src2:'闯关'});
      if(kind==='down')
        addH(fb, '<div class="exp">📕 这题又错了一次 · 熟炼度打回第一天</div>');
      else if(kind==='new'||kind==='back')toast('📕 '+wbMissWord(kind));
      state.wrongBook=state.wrongBook.slice(0,WRONG_CAP);
    }
    $('nextBtn').style.display='block';
    $('nextBtn').textContent=(i+1>=cfg.count||(cfg.allowWrong!=null&&wrong>cfg.allowWrong))?'完成 ✓':'继续 →';
    /* 【4.0.21】先画反馈，再做副作用（顺序就是这几行的全部意义）：
       上面已经写完了 DOM（选项变绿/变红 + #feedback + 下一步按钮），
       浏览器下一帧就能画出来；音效要唤醒 AudioContext、lingJudge 与 save 要读写存档，
       这些**不能**排在写入之后同步跑 —— 会卡住这一帧的提交，玩家看到的就是
       "按下去停一下才变色"（慢音效模拟实测：800ms → 改成 8ms）。
       ⚠️ 必须「rAF + 宏任务」两段：光 rAF 的回调跑在绘制**之前**，挡不住。 */
    const tPaint=performance.now();
    const sideFx=()=>{
      window.__ansGap=Math.round(performance.now()-tPaint);
      try{correct?SFX.right():SFX.wrong();}catch(e){}
      /* 思路灵：独立答对才觉醒 / 涨羁绊（看了提示这题不计） */
      try{lingJudge(q,correct,usedHint);}catch(e){}
      save();updateHUD();
    };
    afterPaint(sideFx);
  }
  render();
}

/* 会话：固定题目（错题重练）
   同样走两步。错题本里存的是题目快照，没有 appr 字段，
   这里按 topic 现查一次思路池补上，老存档里的错题也能用上思路层。 */
function sessionFixed(list,title,onFinish){
  let i=0,right=0;
  let ap=null;
  function setup(){
    /* 172 版起：错题重练也直接答题 —— 思路学习统一归练枪模式 */
    ap=null;
  }
  function headHtml(){
    const q=list[i];
    return `<h2>${title}</h2>
      <div class="sub">第 ${i+1} / ${list.length} 题 · 已答对 ${right}</div>
      <div style="text-align:center"><span class="qtag">${esc(q.topic||'复习')}</span>${srcBadge(q.src,q.qt)}</div>
      <div class="qtext">${esc(q.text)}</div>${qFigHtml(q)}`;
  }
  function recapHtml(){
    if(!ap||!ap.done)return '';
    if(ap.picked==null)return `<div class="appr-recap skip">🧭 跳过了思路环节</div>`;
    return `<div class="appr-recap ${ap.ok?'ok':'no'}">🧭 ${ap.ok?'切入点正确':'切入点偏了'} · ${esc(ap.picked)}
      ${ap.ok?'':`<div class="rk">更好的入手：${esc(ap.r)}</div>`}</div>`;
  }
  function bindNext(){
    $('nextBtn').onclick=()=>{
      i++;
      if(i>=list.length){panel.dataset.lock='';onFinish(right,list.length);}
      else render();
    };
  }
  /* ---------- 第一步：选思路 ---------- */
  function renderApproach(){
    const q=list[i];
    openPanel(`${headHtml()}
      <div class="qmeta">🧭 第一步 · 先想清楚从哪儿入手（这一步不计对错）</div>
      <div class="opts">${ap.opts.map((o,k)=>`<div class="opt appr" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row">
        <button class="btn" id="skipBtn">跳过</button>
        <button class="btn primary" id="nextBtn" style="display:none">看选项 →</button>
      </div>`,1);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>{
        if(ap.done)return;
        const k=+el.dataset.i;
        ap.done=true;ap.picked=ap.opts[k];ap.ok=ap.opts[k]===ap.r;
        recordApproach(q.topic,ap.ok);
        panel.querySelectorAll('.opt').forEach(e2=>{
          const k2=+e2.dataset.i;e2.classList.add('locked');
          if(ap.opts[k2]===ap.r)e2.classList.add('right');
          else if(k2===k)e2.classList.add('wrong');
          else e2.classList.add('dim');
        });
        const fb=$('feedback');
        fb.className=ap.ok?'ok':'no';
        setH(fb, ap.ok
          ? `✅ 对路 · ${esc(ap.picked)}${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`
          : `💡 更好的入手：<b>${esc(ap.r)}</b>${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`);
        $('skipBtn').style.display='none';
        $('nextBtn').style.display='block';
        save();
      });
    });
    $('skipBtn').onclick=()=>{ap.picked=null;ap.ok=false;ap.done=true;renderAnswer();};
    $('nextBtn').onclick=renderAnswer;
  }
  /* ---------- 第二步：选答案 ---------- */
  function renderAnswer(){
    const q=list[i];
    if(ap&&!ap.done){ap.done=true;ap.picked=null;ap.ok=false;}
    /* 导入进来的题常常只有题干和答案，没有三个干扰项 —— 改走自评模式 */
    if(!q.opts||q.opts.length<2){renderSelfRate();return;}
    openPanel(`${headHtml()}
      ${recapHtml()}
      <div class="qmeta">第二步 · 选出正确答案</div>
      <div class="opts">${q.opts.map((o,k)=>`<div class="opt" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row"><button class="btn primary" id="nextBtn" style="display:none">继续 →</button></div>`,1);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>{
        const k=+el.dataset.i;
        const correct=q.opts[k]===q.ans;
        panel.querySelectorAll('.opt').forEach(e2=>{
          const k2=+e2.dataset.i;e2.classList.add('locked');
          if(q.opts[k2]===q.ans)e2.classList.add('right');
          else if(k2===k)e2.classList.add('wrong');
          else e2.classList.add('dim');
        });
        const fb=$('feedback');
        recordAnswer(q.rid||'func',q.topic||'',correct);
        if(correct){right++;state.totalRight++;state.streak=(state.streak||0)+1;
          state.bestStreak=Math.max(state.bestStreak||0,state.streak);
          state.crystals+=2+((ap&&ap.ok)?2:0);
          /* 答对就升一星熟炼度，满 5 星毕业进「已掌握」 */
          const gr=wbGrade(q,true),coin2=2+((ap&&ap.ok)?2:0);
          const nx=state.wrongBook.filter(x=>x.text===q.text)[0];
          SFX.right();
          fb.className='ok';
          setH(fb, (gr==='done'?'✅ 答对！🎓 满星毕业，收进「已掌握」'
            :(gr==='up'?'✅ 答对！⬆️ 熟炼度 +1'+(nx&&nx.due?'，'+esc(nx.due)+' 再见':'')
              :'✅ 答对！'))+' 🪙+'+coin2+stepsHtml(q,false)+aiExpBtnHtml(q));}
        else{state.totalWrong++;state.streak=0;SFX.wrong();
          wbGrade(q,false);
          fb.className='no';setH(fb, `❌ 正确答案：<b>${esc(q.ans)}</b><div class="exp">💡 ${esc(q.exp)}</div>${stepsHtml(q,true)}<div class="exp">📌 熟炼度归零，明天再来一遍</div>`+aiExpBtnHtml(q));}
        save();updateHUD();
        $('nextBtn').style.display='block';
        $('nextBtn').textContent=(i+1>=list.length)?'完成 ✓':'继续 →';
        try{aiExpBind(q);}catch(e){}
        bindNext();
      });
    });
  }
  /* ---------- 第二步（没有选项的题）：自己做 → 对答案 → 自评 ---------- */
  function renderSelfRate(){
    const q=list[i];
    openPanel(`${headHtml()}
      ${recapHtml()}
      <div class="qmeta">第二步 · 这道题没有选项，先在心里做一遍，再对答案自评</div>
      <div id="srBox">
        <button class="btn primary" id="srShow" style="width:100%;justify-content:center">👀 看答案与解析</button>
      </div>
      <div id="feedback"></div>
      <div class="row"><button class="btn primary" id="nextBtn" style="display:none">继续 →</button></div>`,1);
    function finish(ok){
      recordAnswer(q.rid||'func',q.topic||'',ok);
      save();updateHUD();
      const nb=$('nextBtn');
      nb.style.display='block';
      nb.textContent=(i+1>=list.length)?'完成 ✓':'继续 →';
      bindNext();
    }
    $('srShow').onclick=()=>{
      const box=$('srBox'),fb=$('feedback');
      setH(box, `<div class="sr-ans">答案：<b>${esc(q.ans)}</b><br>
          <span style="color:#9cc0e0">💡 ${esc(q.exp)}</span></div>${stepsHtml(q,true)}
        <div class="row" style="margin-top:10px">
          <button class="btn" id="srOk">✅ 我会了</button>
          <button class="btn" id="srNo">❌ 还没会</button>
        </div>
        <div class="center" style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:6px">
          选「会了」熟炼度 +1，满 5 星就毕业</div>`);
      fb.className='';
      $('srOk').onclick=()=>{
        right++;state.totalRight++;state.streak=(state.streak||0)+1;
        state.bestStreak=Math.max(state.bestStreak||0,state.streak);
        state.crystals+=2+((ap&&ap.ok)?2:0);
        const gr2=wbGrade(q,true),coin3=2+((ap&&ap.ok)?2:0);
        const nx2=state.wrongBook.filter(x=>x.text===q.text)[0];
        SFX.right();
        fb.className='ok';
        setH(fb, (gr2==='done'?'✅ 🎓 满星毕业，收进「已掌握」'
          :(gr2==='up'?'✅ 记住了！⬆️ 熟炼度 +1'+(nx2&&nx2.due?'，'+esc(nx2.due)+' 再见':'')
            :'✅ 记住了！'))+' 🪙+'+coin3);
        box.querySelectorAll('button').forEach(b=>{b.disabled=true;});
        finish(true);
      };
      $('srNo').onclick=()=>{
        state.totalWrong++;state.streak=0;SFX.wrong();
        wbGrade(q,false);
        fb.className='no';
        setH(fb, `❌ 熟炼度归零，明天再来一遍`);
        box.querySelectorAll('button').forEach(b=>{b.disabled=true;});
        finish(false);
      };
    };
  }
  function render(){
    setup();
    if(ap)renderApproach();else renderAnswer();
    fillImgs(panel);          /* 照片存在 IndexedDB 里，异步补 src */
  }
  render();
}

/* ---------------- 石碑 ---------------- */
function startStele(s){
  session({rid:s.r,tier:state.tier[s.r]||1,count:3,title:'🗿 智慧石碑',gain:4,canHint:true,
    onFinish:(right,total)=>{
      const pay=right*4;
      state.solved[s.x+','+s.y]=true;
      state.crystals+=pay;save();updateHUD();SFX.coin();
      openPanel(`
        <h2>石碑亮起 ✨</h2>
        <div class="sub">答对 ${right} / ${total} 题</div>
        <div class="center" style="font-size:44px;margin:10px 0">🗿</div>
        <div class="center">石碑上的公式重新流动起来，<br>额外掉出 <b style="color:#ffd76a">${pay}</b> 枚数字结晶<br>
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">（答题时已逐题结算过了）</span></div>
        <div class="row"><button class="btn primary" id="ok">继续探索</button></div>
      `);
      $('ok').onclick=closePanel;
    }});
}

/* ---------------- 精灵 ---------------- */
function startSpirit(s){
  const sp=SPIRITS.find(v=>v.id===s.sid);
  session({rid:s.sid?sp.r:s.r,tier:state.tier[sp.r]||1,count:3,title:'✨ 野生精灵 · '+sp.e,gain:3,canHint:true,
    onFinish:(right,total)=>{
      if(right<2){
        openPanel(`
          <h2>它跑掉了…</h2>
          <div class="sub">答对 ${right} / ${total}，至少要答对 2 题</div>
          <div class="center" style="font-size:44px;margin:10px 0">💨</div>
          <div class="center">${sp.e} ${sp.n} 溜走了。<br>别灰心，石碑那边再练几题就会了。</div>
          <div class="row"><button class="btn primary" id="ok">再试试</button></div>
        `);
        $('ok').onclick=closePanel;return;
      }
      state.caught[s.sid]=true;state.crystals+=6;save();updateHUD();SFX.win();
      openPanel(`
        <h2>收服成功！</h2>
        <div class="sub">答对 ${right} / ${total} 题</div>
        <div class="center" style="font-size:56px;margin:8px 0">${sp.e}</div>
        <div class="center"><b style="color:#ffd76a;font-size:var(--fs-lg)">${sp.n}</b><br>
        擅长：${sp.k}<br>它加入了你的图鉴 🪙+6</div>
        <div class="row"><button class="btn primary" id="ok">太棒了</button></div>
      `);
      $('ok').onclick=closePanel;
    }});
}

/* ---------------- 守护者 ---------------- */
function startGuard(s){
  const reg=REGIONS.find(r=>r.id===s.r);
  const tv=3;
  openPanel(`
    <h2>⚔️ ${s.name}</h2>
    <div class="sub">${reg.name} · ${reg.sub}</div>
    <div class="center" style="font-size:52px;margin:6px 0">🛡️</div>
    <div class="center">守护者挡住了去路。<br>连答 <b style="color:#ffd76a">5 道挑战题</b>，<br>最多只能错 <b>1</b> 道。<br>胜利可获得 <b style="color:#ffd76a">${reg.emoji} ${reg.name}徽章</b>。</div>
    <div class="row"><button class="btn" id="no">再准备一下</button><button class="btn primary" id="go">开始挑战</button></div>
  `);
  $('no').onclick=closePanel;
  $('go').onclick=()=>{
    session({rid:s.r,tier:tv,count:5,title:'⚔️ '+s.name,gain:5,allowWrong:1,canHint:true,fixedTier:true,
      onFinish:(right,total,wrong)=>{
        if(wrong>1||right<4){
          openPanel(`
            <h2>挑战失败</h2>
            <div class="sub">答对 ${right} / ${total}</div>
            <div class="center" style="font-size:44px;margin:8px 0">😵</div>
            <div class="center">守护者摇摇头：「再去点亮几块石碑吧。」<br><span style="color:#9cc0e0;font-size:var(--fs-sm)">答错不惩罚，随时可以重来</span></div>
            <div class="row"><button class="btn primary" id="ok">好</button></div>
          `);
          $('ok').onclick=closePanel;return;
        }
        state.badges[s.r]=true;state.crystals+=25;save();updateHUD();SFX.unlock();
        const un=BRIDGES.filter(b=>b.need===s.r).map(b=>b.name).join('、');
        openPanel(`
          <h2>🏅 获得${reg.name}徽章</h2>
          <div class="sub">答对 ${right} / ${total} 题</div>
          <div class="center" style="font-size:56px;margin:6px 0">${reg.emoji}</div>
          <div class="center">守护者让开了道路！<br>${un?`<b style="color:#ffd76a">${un}</b> 已开通 🎉`:''}<br>奖励 25 🪙</div>
          <div class="row"><button class="btn primary" id="ok">出发！</button></div>
        `);
        $('ok').onclick=()=>{closePanel();buildStatic();};
      }});
  };
}

function openHermit(s){
  openPanel(`
    <h2>🧙 引路人</h2>
    <div class="sub">免费锦囊</div>
    <div class="center" style="font-size:44px;margin:6px 0">🧙</div>
    <div class="center" style="font-size:var(--fs-md)">「${s.tip}」</div>
    <div class="row"><button class="btn primary" id="ok">记住了</button></div>
  `);
  $('ok').onclick=closePanel;
}

/* ---------------- 图鉴 / 错题本 ---------------- */

$('btnDex').onclick=()=>{audioKick();if(CUR===EPIC)showChronicle();else showDex();};
/* 错题本：容量 WRONG_CAP（200），并按四科筛选。
   老存档里的题没有 subject 字段，用 rid 反查科目补齐。 */
function wbSubj(w){return DRILL_OF[w.subject||subjOfRid(w.rid)]||null;}

/* ---------- 📕 错题中心 ----------
   四个页签：今日复习（到期队列）/ 全部错题 / 已掌握（毕业归档）/ 错题分析。
   showWrongBook('math') 这种老调用仍然认 —— 当成"打开全部错题并筛数学"。 */
function showWrongBook(tab0,subj0){
  let tab='today',subj='all',kw='',sort='due',curList=[];
  if(tab0&&WB_TABS.some(x=>x.id===tab0))tab=tab0;
  else if(tab0){tab='all';subj=tab0;}
  if(subj0)subj=subj0;
  /* 空本子：给一条最短的路（拍照 / 文字导入），别让人对着空面板发呆 */
  if(!state.wrongBook.length&&!state.wrongDone.length){
    openPanel(`<h2>📕 错题中心</h2><div class="sub">还没有错题</div>
      <div class="center" style="font-size:44px;margin:10px 0">🎉</div>
      <div class="center">闯关与练枪答错的题会自动收进这里，
        并按熟炼度排好复习日程 —— 到期就练，连对 5 次毕业。<br>
        <span style="color:#9cc0e0;font-size:var(--fs-xs)">容量 ${WRONG_CAP} 题 · 也可以把作业、卷子上的错题导入进来</span></div>
      <div class="row"><button class="btn primary" id="ph">📷 拍一道题（AI 自动解析）</button></div>
      <div class="row"><button class="btn" id="imp">📥 文字导入</button></div>
      <div class="row"><button class="btn" id="ok">关闭</button></div>`);
    $('ok').onclick=closePanel;
    $('imp').onclick=showImportWrong;
    $('ph').onclick=showImportPhoto;
    return;
  }
  function match(w){
    if(subj!=='all'&&(w.subject||subjOfRid(w.rid))!==subj)return false;
    if(kw){
      const k=kw.trim().toLowerCase();
      if(k&&(String(w.text)+' '+(w.topic||'')+' '+(w.ans||'')+' '+(w.note||'')
        ).toLowerCase().indexOf(k)<0)return false;
    }
    return true;
  }
  function sorted(arr){
    arr=arr.slice();
    if(sort==='due')arr.sort((a,b)=>String(a.due||'9').localeCompare(String(b.due||'9')));
    else if(sort==='weak')arr.sort((a,b)=>(b.badN||0)-(a.badN||0)||(a.box||0)-(b.box||0));
    else if(sort==='new')arr.sort((a,b)=>(b.addAt||0)-(a.addAt||0));
    else arr.sort((a,b)=>(a.addAt||0)-(b.addAt||0));
    return arr;
  }
  let curDone=[];                 /* 「已掌握」页签的当前列表（折叠题图要用） */
  function itemHtml(w,i,mode){
    const s=wbSubj(w),t=todayStr();
    const dueNow=!w.due||w.due<=t;
    const bx=w.box||0;
    const ops=(mode==='done')
      ?'<button class="wb-op" data-op="back" data-i="'+i+'">↩️ 拉回本子</button>'
       +'<button class="wb-op" data-op="del" data-i="'+i+'">🗑 删除</button>'
      :'<button class="wb-op" data-op="soon" data-i="'+i+'">📌 今天就复习</button>'
       +'<button class="wb-op" data-op="know" data-i="'+i+'">✅ 会了</button>'
       +'<button class="wb-op" data-op="del" data-i="'+i+'">🗑 删除</button>';
    return '<div class="wb-item'+(w.imp?' imp':'')+'">'
      +(w.img?imgTag(w.img,'wb-th'):'')
      +'<div class="wb-t">'+(s?s.emoji+' ':'')
        +'<span class="qtag" style="margin:0 8px 0 0">'+esc(w.topic||'')+'</span>'
        +(i+1)+'. '+esc(w.text)+'</div>'
      +'<div class="wb-a">答案：<b>'+esc(w.ans)+'</b></div>'
      +(w.note?'<div class="wb-e" style="color:#ffd0a0">📝 '+esc(w.note)+'</div>':'')
      +'<div class="wb-e">'+esc(w.exp)+'</div>'
      +stepsHtml(w)
      +'<div class="wb-meta">'
        +'<span class="wb-tag box">'+'★'.repeat(bx)+'☆'.repeat(WB_PASS-bx)+' '+bx+'/'+WB_PASS+'</span>'
        +'<span class="wb-tag '+(dueNow?'due':'ok')+'">'
          +(dueNow?'今天该复习':'下次 '+esc(w.due))+'</span>'
        +'<span class="wb-tag">练过 '+(w.rev||0)+' 次 · 又错 '+(w.badN||0)+' 次</span>'
        +'<span class="wb-tag">'+esc(w.src2||'')+'</span>'
      +'</div>'
      +'<div class="wb-ops">'
        +'<button class="wb-op'+(w.star?' on':'')+'" data-op="star" data-i="'+i+'">'
          +(w.star?'⭐ 已收藏':'☆ 收藏')+'</button>'
        +'<button class="wb-op" data-op="edit" data-i="'+i+'">✏️ 改</button>'
        +ops
      +'</div></div>';
  }
  function op(name,w){
    if(!w)return;
    if(name==='star'){w.star=w.star?0:1;save();render();toast(w.star?'⭐ 已收藏':'已取消收藏');}
    else if(name==='edit'){showWbEdit(w);}
    else if(name==='soon'){
      wbHeal(w,false);w.due=todayStr();save();render();
      toast('📌 已排进今天的复习');}
    else if(name==='know'){
      wbArchive(w);save();updateHUD();render();toast('✅ 收进「已掌握」🎓');}
    else if(name==='back'){
      wbRestore(w);save();updateHUD();render();toast('↩️ 拉回本子，明天见');}
    else if(name==='del'){
      if(!confirm('删掉这道错题？删了就找不回来了'))return;
      wbDel(w);save();updateHUD();render();toast('已删除');}
  }
  function render(){
    const st=wbStat();
    const dueList=wbDueList();
    let body='',foot='';
    if(tab==='today'){
      const list=sorted(dueList);
      const show=list.slice(0,12);
      curList=show;
      const pct=(st.n+st.done)?Math.round(st.done/(st.n+st.done)*100):0;
      body='<div class="wb-card">'
        +'<div class="wb-kv"><span>今天该复习</span><b style="color:'
          +(dueList.length?'#ffb0b0':'#8ef0b8')+'">'+dueList.length+' 题</b></div>'
        +'<div class="wb-kv"><span>本子里的错题</span><b>'+st.n+' / '+WRONG_CAP+'</b></div>'
        +'<div class="wb-kv"><span>已掌握（毕业）</span><b style="color:#8ef0b8">'
          +st.done+' 题</b></div>'
        +'<div class="wb-kv"><span>连续复习</span><b>'+st.streak+' 天 · 累计 '+st.rev+' 题</b></div>'
        +'<div class="pbar"><i style="width:'+pct+'%"></i></div>'
        +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0">掌握进度 '
          +pct+'%（已掌握 / 曾收录）</div></div>';
      if(dueList.length){
        body+='<div class="row" style="margin-top:0"><button class="btn primary" id="wbGo" '
          +'style="flex:1;justify-content:center">🔥 开始今日复习（'
          +Math.min(WB_ONCE,dueList.length)+' 题）</button></div>'
          +(dueList.length>WB_ONCE
            ?'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:6px">'
              +'到期 '+dueList.length+' 题，一次练 '+WB_ONCE+' 题，剩下的做完再来</div>':'')
          +'<div class="row" style="margin-top:8px"><button class="btn" id="wbDueAll" '
          +'style="flex:1;justify-content:center">📚 一口气清完这 '+dueList.length+' 题</button></div>';
      }else{
        body+='<div class="center" style="font-size:40px;margin:6px 0">🎉</div>'
          +'<div class="center">今天的复习清完了'
          +(st.n?'，剩下的题都还没到期':'，本子也是空的')+'</div>'
          +(st.n?'<div class="center" style="color:#9cc0e0;font-size:var(--fs-xs);margin-top:4px">'
            +'想提前练就去「🗂 全部错题」，点「📌 今天就复习」把它排进来</div>':'')
          +'<div class="row"><button class="btn" id="wbGoAll" style="flex:1;justify-content:center">'
          +'🗂 去全部错题看看</button></div>';
      }
      body+='<div style="max-height:36vh;overflow:auto;margin-top:10px">'
        +show.map((w,i)=>itemHtml(w,i,'bk')).join('')+'</div>';
    }else if(tab==='all'){
      const list=sorted(state.wrongBook.filter(match));
      curList=list;
      const chips=[{id:'all',n:'全部',e:'📕'}].concat(
        DRILL_SUBJ.map(s=>({id:s.id,n:s.name,e:s.emoji})));
      body='<input class="wb-sr" id="wbSr" placeholder="🔍 搜题干 / 知识点 / 答案 / 笔记" value="'
          +esc(kw)+'">'
        +'<div class="row" style="margin:0 0 8px;gap:5px;justify-content:center;flex-wrap:wrap">'
        +chips.map(c=>'<button class="wb-tab'+(c.id===subj?' on':'')+'" data-s="'+c.id+'">'
          +c.e+' '+c.n+'</button>').join('')
        +'</div>'
        +'<div class="row" style="margin:0 0 10px;gap:5px;justify-content:center;flex-wrap:wrap">'
        +WB_SORTS.map(s=>'<button class="wb-tab" data-sort="'+s.id+'" style="'
          +(sort===s.id?'background:linear-gradient(180deg,rgba(94,214,255,.26),rgba(94,214,255,.15));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(94,214,255,.5),var(--gb-drop);color:#9fe4ff':'')
          +'">'+s.n+'</button>').join('')
        +'</div>'
        +'<div style="max-height:44vh;overflow:auto">'
        +(list.length?list.map((w,i)=>itemHtml(w,i,'bk')).join('')
          :'<div class="center" style="color:#9cc0e0;padding:16px">没有符合条件的错题</div>')
        +'</div>';
    }else if(tab==='done'){
      const list=sorted(state.wrongDone.filter(match));
      curList=list;curDone=list;
      body='<div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-bottom:8px">'
        +'连对 5 次的题会毕业到这里。忘了就点「↩️ 拉回本子」重新学。</div>'
        +'<div style="max-height:50vh;overflow:auto">'
        +(list.length?list.map((w,i)=>itemHtml(w,i,'done')).join('')
          :'<div class="center" style="color:#9cc0e0;padding:16px">还没有题毕业 🎓 继续复习</div>')
        +'</div>';
    }else{
      const mx=Math.max(1,DRILL_SUBJ.reduce((m,s)=>Math.max(m,st.bySubj[s.id]||0),0));
      const subjBar=DRILL_SUBJ.map(s=>{
        const n=st.bySubj[s.id]||0;
        return '<div class="wb-bar" data-drill="'+s.id+'" style="cursor:pointer">'
          +'<span class="nm">'+s.emoji+' '+s.name+'</span>'
          +'<span class="tr"><i style="width:'+(n/mx*100)+'%"></i></span>'
          +'<span class="vl">'+n+'</span>'
          +'<span class="wb-tag" style="flex:none">🎯 去练</span></div>';}).join('');
      const nm=Math.max(1,st.n);
      const boxBar=[5,4,3,2,1,0].map(b=>{
        const n=st.byBox[b]||0;
        return '<div class="wb-bar"><span class="nm">'+'★'.repeat(b)+'☆'.repeat(WB_PASS-b)+'</span>'
          +'<span class="tr"><i style="width:'+(n/nm*100)+'%;'
          +'background:linear-gradient(90deg,#5ed6ff,#34c77b)"></i></span>'
          +'<span class="vl">'+n+'</span></div>';}).join('');
      const tp=Object.keys(st.byTopic).map(k=>({k:k,v:st.byTopic[k]}))
        .sort((a,b)=>b.v-a.v).slice(0,6);
      const tpMax=Math.max(1,tp.reduce((m,x)=>Math.max(m,x.v),0));
      const tpBar=tp.length?tp.map(x=>{
          /* 热点行能反向定位到专题：本子里这块错得多，就去练枪场专攻它 */
          const tid=(function(){for(const r in DRILL_TOPICS){const b=topicBest(r,x.k);if(b)return b;}return null;})();
          return '<div class="wb-bar"><span class="nm" style="min-width:88px;'
          +'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.k)+'</span>'
          +'<span class="tr"><i style="width:'+(x.v/tpMax*100)+'%"></i></span>'
          +'<span class="vl">'+x.v+'</span>'
          +(tid?'<span class="wb-tag" data-tp="'+tid+'" style="flex:none;cursor:pointer">🎯 去练</span>':'')
          +'</div>';}).join('')
        :'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">还没有数据</div>';
      const dm=Math.max(1,st.day7.reduce((m,x)=>Math.max(m,x.n),0));
      const trend='<div style="display:flex;align-items:flex-end;gap:4px;height:58px;margin:6px 0 0">'
        +st.day7.map(x=>{
          const h=Math.max(2,x.n/dm*40);
          return '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;'
            +'align-items:center;height:100%">'
            +'<div style="width:100%;height:'+h+'px;border-radius:4px 4px 0 0;'
            +'background:linear-gradient(180deg,#ffd76a,#ff9f2b)"></div>'
            +'<div style="font-size:var(--fs-2xs);color:#8fb4d6;margin-top:3px">'+x.d+'</div>'
            +'<div style="font-size:var(--fs-2xs);color:#fff;font-weight:700">'+(x.n||'')+'</div></div>';
        }).join('')+'</div>';
      const tough=st.tough.filter(w=>(w.badN||0)>0);
      body='<div class="wb-card">'
        +'<div class="wb-kv"><span>本子里</span><b>'+st.n+' 题'
          +(st.star?' · ⭐ '+st.star:'')+'</b></div>'
        +'<div class="wb-kv"><span>今日待复习</span><b style="color:#ffb0b0">'+st.due+' 题</b></div>'
        +'<div class="wb-kv"><span>已掌握</span><b style="color:#8ef0b8">'+st.done+' 题</b></div>'
        +'<div class="wb-kv"><span>累计复习</span><b>'+st.rev+' 题</b></div>'
        +'<div class="wb-kv"><span>连续复习</span><b>'+st.streak+' 天（最长 '+st.best+' 天）</b></div>'
        +'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">📚 哪科错得多</div>'
          +(subjBar||'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">—</div>')
          +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:4px">'
          +'点一行直接去练枪场专攻这科的薄弱点</div></div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🎯 熟炼度分布</div>'
          +boxBar
          +'<div class="center" style="font-size:var(--fs-xs);color:#9cc0e0;margin-top:4px">'
          +'★ 越多越接近毕业，满 5 星就收进「已掌握」</div></div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🔥 顽固错题</div>'
          +(tough.length?tough.map((w,i)=>'<div class="wb-kv"><span style="flex:1;overflow:hidden;'
            +'text-overflow:ellipsis;white-space:nowrap">'+(i+1)+'. '
            +esc(String(w.text).slice(0,22))+'</span><b>又错 '+w.badN+' 次</b></div>').join('')
            :'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm)">没有反复错的题，很好 👍</div>')
          +'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:6px">🏷 知识点热点</div>'
          +tpBar+'</div>'
        +'<div class="wb-card"><div class="wb-t" style="margin-bottom:2px">📈 近 7 天收录</div>'
          +trend+'</div>';
      curList=[];
    }
    if(tab==='stat'){
      foot='<div class="row"><button class="btn" id="exp">📤 导出</button>'
        +'<button class="btn primary" id="ok">关闭</button></div>';
    }else if(tab==='done'){
      foot='<div class="row"><button class="btn" id="imp">📥 文字</button>'
        +'<button class="btn" id="ph">📷 AI 拍题</button>'
        +'<button class="btn" id="dr">🔁 抽 5 题复习</button>'
        +'<button class="btn" id="clrD">🗑 清空归档</button></div>'
        +'<div class="row"><button class="btn primary" id="ok">关闭</button></div>';
    }else{
      foot='<div class="row"><button class="btn" id="imp">📥 文字</button>'
        +'<button class="btn" id="ph">📷 AI 拍题</button>'
        +'<button class="btn" id="exp">📤 导出</button>'
        +'<button class="btn" id="dr">🔁 重练</button></div>'
        +'<div class="row"><button class="btn" id="clr">🗑 清空本子</button>'
        +'<button class="btn primary" id="ok">关闭</button></div>';
    }
    openPanel('<h2>📕 错题中心</h2>'
      +'<div class="sub">'+st.n+' 题待攻克 · 今日 '+st.due+' 题到期 · 已掌握 '+st.done+' 题</div>'
      +'<div class="wb-tabs">'+WB_TABS.map(x=>'<button class="wb-tab'+(x.id===tab?' on':'')
        +'" data-tab="'+x.id+'">'+x.e+' '+x.n
        +(x.id==='today'&&st.due?' · '+st.due:'')+'</button>').join('')+'</div>'
      +body+foot);
    panel.querySelectorAll('[data-tab]').forEach(b=>{
      b.onclick=()=>{tab=b.dataset.tab;render();};});
    panel.querySelectorAll('[data-s]').forEach(b=>{
      b.onclick=()=>{subj=b.dataset.s;render();};});
    panel.querySelectorAll('[data-sort]').forEach(b=>{
      b.onclick=()=>{sort=b.dataset.sort;render();};});
    panel.querySelectorAll('[data-drill]').forEach(b=>{
      b.onclick=()=>{const sid=b.dataset.drill;closePanel();
        try{drillPick(sid);}catch(e){showDrill();}};});
    /* 知识点热点那几行也能点：直接定位它所属的专题 */
    panel.querySelectorAll('[data-tp]').forEach(b=>{
      b.onclick=()=>{
        const t=topicInfo(b.dataset.tp);
        if(!t)return;
        closePanel();
        try{drillPick(subjOfRid(t.rid),t.id);}catch(e){showDrill();}
      };});
    panel.querySelectorAll('[data-op]').forEach(b=>{
      b.onclick=()=>{op(b.dataset.op,curList[+b.dataset.i]);};});
    /* 攻坚题 / 带图的题：列表里只放一个折叠条，点开才画 SVG ——
       本子最多 200 条，一上来全画出来会把手机卡住 */
    try{
      const items=panel.querySelectorAll('.wb-item');
      for(let i=0;i<items.length;i++){
        const w=(tab==='done'?curDone:curList)[i];
        if(!w||(w.hardIdx==null&&!w.fig))continue;
        const det=document.createElement('details');
        det.className='wb-fig';
        setH(det, '<summary>🖼 看题图</summary><div class="fgbox"></div>');
        det.addEventListener('toggle',()=>{
          if(!det.open)return;
          const box=det.querySelector('.fgbox');
          if(box&&!hasH(box)){
            setH(box, qFigHtml(w)||'<div class="wb-e">这道题没有图</div>');
            try{fillImgs(box);}catch(e){}
            try{qfigRun(box);}catch(e){}
          }
        });
        items[i].appendChild(det);
      }
    }catch(e){}
    const sr=$('wbSr');
    if(sr){
      let tm=null;
      sr.oninput=()=>{
        clearTimeout(tm);
        const pos=sr.selectionStart;
        tm=setTimeout(()=>{
          kw=sr.value;render();
          const n2=$('wbSr');
          if(n2){n2.focus();try{n2.setSelectionRange(pos,pos);}catch(e){}}
        },450);
      };
    }
    $('ok').onclick=closePanel;
    const gi=$('imp'),gp=$('ph'),ge=$('exp'),gd=$('dr'),gc=$('clr'),gcd=$('clrD');
    if(gi)gi.onclick=showImportWrong;
    if(gp)gp.onclick=showImportPhoto;
    if(ge)ge.onclick=showExportWrong;
    if(gd)gd.onclick=()=>{
      const src=(tab==='done')?state.wrongDone:state.wrongBook;
      const list=shuffle(src.filter(match));
      if(!list.length){toast('没有可练的题');return;}
      closePanel();startWrongDrill(list,5);
    };
    if(gc)gc.onclick=()=>{
      if(!confirm('清空全部 '+state.wrongBook.length+' 道错题？\n'
        +'（闯关、练枪、导入的错题都会一起清掉，已掌握的归档会保留）'))return;
      shotClearAll();
      state.wrongBook=[];save();updateHUD();closePanel();toast('错题本已清空');
    };
    if(gcd)gcd.onclick=()=>{
      if(!confirm('清空「已掌握」里的 '+state.wrongDone.length+' 道题？\n（只是清掉归档记录，不影响本子里的错题）'))return;
      state.wrongDone=[];save();closePanel();toast('归档已清空');
    };
    const gg=$('wbGo');
    if(gg)gg.onclick=()=>{closePanel();startWrongDrill(wbDueList(),WB_ONCE,true);};
    const gda=$('wbDueAll');
    if(gda)gda.onclick=()=>{closePanel();startWrongDrill(wbDueList(),wbDueList().length,true);};
    const ga=$('wbGoAll');
    if(ga)ga.onclick=()=>{tab='all';render();};
    fillImgs(panel);
  }
  render();
}

/* 让 AI 重新解析一道已入库的错题（得有图才行）。
   认错了题干、步骤给得不对，都能靠这一下救回来。 */
async function aiReParse(w){
  if(!w||!w.img)return;
  if(OCR_CFG.mode!=='ai'||!(OCR_CFG.aiBase||'').trim()||!(OCR_CFG.aiModel||'').trim()){
    toast('先到「⚙️ 识别设置」填好 AI 接口');return;
  }
  let url=shotMem[w.img];
  if(!url){try{url=await shotGet(w.img);}catch(e){url=null;}}
  if(!url){
    toast('这张图已经不在本机存图库里了');return;
  }
  openPanel('<h2>🤖 AI 重新解析</h2><div class="sub">正在看图并解析…</div>'
    +'<div class="center" style="font-size:40px;margin:10px 0">🧠</div>'
    +'<div class="center" id="aiMsg" style="color:#9cc0e0;font-size:var(--fs-sm)">这要几秒钟</div>');
  const setSt=t=>{const m=$('aiMsg');if(m)m.textContent=t;};
  const r=await aiDeepPhoto(url,setSt);
  if(!r.ok||!r.text){
    openPanel('<h2>🤖 解析失败</h2><div class="sub">'+esc(r.err||'没认出来')+'</div>'
      +'<div class="center" style="font-size:40px;margin:10px 0">😵</div>'
      +'<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);line-height:var(--lh-loose)">'
      +'可以换一个模型试试，或者自己编辑这道题</div>'
      +'<div class="row"><button class="btn" id="ed">✏️ 自己改</button>'
      +'<button class="btn primary" id="ok">好</button></div>');
    $('ok').onclick=closePanel;
    $('ed').onclick=()=>showWbEdit(w);
    return;
  }
  const ch=[];
  if(r.text&&r.text!==w.text){w.text=r.text;ch.push('题干');}
  if(r.ans){ch.push('答案');w.ans=r.ans;}
  if(r.opts&&r.opts.length>=2){
    const p=aiPickOpt(w.ans,r.opts);
    if(p.ok){w.ans=p.ans;w.opts=r.opts.slice(0,6);w.text=aiStripOpts(w.text,r.opts);ch.push('选项');}
  }
  if(r.topic){w.topic=r.topic;ch.push('知识点');}
  if(r.subject){w.subject=impSubj(r.subject)||w.subject;ch.push('科目');}
  if(r.explain){w.exp=r.explain;ch.push('解析');}
  if(r.steps&&r.steps.length){w.steps=r.steps;ch.push('思路步骤');}
  if(r.appr){w.appr=r.appr;ch.push('思路层');}
  save();
  openPanel('<h2>🤖 解析完成</h2><div class="sub">改了：'+(ch.length?esc(ch.join(' · ')):'没有变化')+'</div>'
    +'<div class="center" style="font-size:40px;margin:8px 0">✨</div>'
    +'<div class="wb-card">'
    +'<div class="wb-kv"><span style="flex:1">答案</span><b style="color:#ffd76a">'+esc(w.ans)+'</b></div>'
    +'<div class="wb-kv"><span>知识点</span><b>'+esc(w.topic||'—')+'</b></div>'
    +'</div>'
    +'<div class="wb-e" style="color:#9cc0e0">'+esc(w.exp||'')+'</div>'
    +stepsHtml(w,true)
    +'<div class="row"><button class="btn" id="ed">✏️ 再改改</button>'
    +'<button class="btn primary" id="ok">好</button></div>');
  $('ok').onclick=closePanel;
  $('ed').onclick=()=>showWbEdit(w);
}

/* ---------- 编辑一条错题 ----------
   认错的题干、记错的答案、自己总结的坑，都能在这儿改回来；
   「我的笔记」只有你自己看得到，适合写"我为什么错"。 */
function showWbEdit(w){
  if(!w||!w.text){toast('这道题已经不在本子里了');return;}
  let subj=w.subject||subjOfRid(w.rid)||'math';
  function render(){
    const picks=DRILL_SUBJ.map(d=>'<button class="wb-tab'+(d.id===subj?' on':'')
      +'" data-s="'+d.id+'">'+d.emoji+' '+d.name+'</button>').join('');
    openPanel('<h2>✏️ 编辑错题</h2>'
      +'<div class="sub">改完点保存 · 当前熟炼度 '+(w.box||0)+' / '+WB_PASS+'</div>'
      +'<div class="imp-box" style="margin-bottom:5px">题干</div>'
      +'<textarea id="eT" style="'+TA_STYLE+';height:86px">'+esc(w.text)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">答案</div>'
      +'<textarea id="eA" style="'+TA_STYLE+';height:52px">'+esc(w.ans)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">解析 / 思路</div>'
      +'<textarea id="eE" style="'+TA_STYLE+';height:76px">'+esc(w.exp)+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">知识点</div>'
      +'<textarea id="eK" style="'+TA_STYLE+';height:44px">'+esc(w.topic||'')+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">我的笔记（只有你自己看得到）</div>'
      +'<textarea id="eN" style="'+TA_STYLE+';height:58px">'+esc(w.note||'')+'</textarea>'
      +'<div class="imp-box" style="margin:10px 0 5px">🧠 思路步骤（一行一步，最多 4 步）</div>'
      +'<textarea id="eS" style="'+TA_STYLE+';height:70px">'+esc((w.steps||[]).join('\n'))+'</textarea>'
      +(w.img?'<div class="row" style="margin-top:10px"><button class="btn" id="eAi" '
        +'style="flex:1;justify-content:center">🤖 让 AI 重新解析这张图</button></div>':'')
      +'<div class="imp-box" style="margin:10px 0 5px">科目</div>'
      +'<div class="row" style="margin-top:0;gap:6px;justify-content:center;flex-wrap:wrap">'
        +picks+'</div>'
      +'<div class="row"><button class="btn primary" id="eOk">保存</button>'
        +'<button class="btn" id="eCn">取消</button></div>');
    panel.querySelectorAll('[data-s]').forEach(b=>{b.onclick=()=>{subj=b.dataset.s;render();};});
    const ea=$('eAi');
    if(ea)ea.onclick=()=>aiReParse(w);
    $('eCn').onclick=()=>showWrongBook('all');
    $('eOk').onclick=()=>{
      const t=$('eT').value.trim();
      if(!t){toast('题干不能为空');return;}
      w.text=t;
      w.ans=$('eA').value.trim()||'见解析';
      w.exp=$('eE').value.trim();
      w.topic=$('eK').value.trim()||'未分类';
      w.note=$('eN').value.trim();
      w.steps=String($('eS').value).split(/\n+/).map(x=>String(x).trim())
        .filter(Boolean).slice(0,4);
      if(!w.steps.length)w.steps=null;
      w.subject=subj;
      /* 答案改了而选项里没有它，重练时会永远判错 —— 直接改成自评模式 */
      if(w.opts&&w.opts.length>=2&&w.ans&&w.opts.indexOf(w.ans)<0)w.opts=null;
      save();toast('已保存 ✏️');showWrongBook('all');
    };
  }
  render();
}

