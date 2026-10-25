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
   4.1.1 拆分：错题中心 UI 在 43_wrongbook_ui.js；这里留下答题会话
   （session / sessionFixed）、石碑 / 精灵 / 守护者入口与提示链。
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
/* 错题列表 / 重练面板里展示「几步思路」（题目自带的 steps：
   攻坚大题的 3~4 步求解，或导入题里自己写的步骤；没有就不显示） */
function stepsHtml(q,open){
  const st=(q&&q.steps)||[];
  if(!st.length)return '';
  const inner='<div class="ai-steps"><div class="hd">🧠 这道题该怎么想</div><ol>'
    +st.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></div>';
  if(open)return inner;
  return '<details class="ai-sec wb-ai"><summary>🧠 看这 '+st.length
    +' 步思路</summary>'+inner+'</details>';
}
function splitSents(s){
  return String(s||'').split(/[。！？；\n]/).map(x=>x.trim()).filter(Boolean);
}
function buildHintChain(q,ap){
  /* 攻坚题 / 导入题自带 hints：那是按「先做什么 → 再做什么」排好的，
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

/* =========================================================
   答题会话共享件（4.1.1 从三套引擎里收拢）
   ---------------------------------------------------------
   闯关 session / 错题重练 sessionFixed / 练枪 drillSession 的
   「判题涂色」和「思路小结」逐字重复三份，任何修改都得同步三处 ——
   4.0.21 的「先画后算」就只改了闯关一处，练枪 / 错题重练漏了两版。
   收拢到这里：一份实现，三处（加烽火 blazeAsk 共四处）调用。
   ========================================================= */
/* 判题涂色：全部选项加锁，正确项绿、点中的错误项红、其余淡。
   root=容器（一般是 #panel），arr=选项数组，ansText=正确答案文本，picked=点中的下标。 */
function paintOptsJudge(root,arr,ansText,picked){
  root.querySelectorAll('.opt').forEach(el=>{
    const k=+el.dataset.i;
    el.classList.add('locked');
    el.setAttribute('aria-disabled','true');   // role=button 的锁定态（4.1.1）
    if(arr[k]===ansText)el.classList.add('right');
    else if(k===picked)el.classList.add('wrong');
    else el.classList.add('dim');
  });
}
/* 思路小结：第一步的结果压成一行小卡片，跟着第二步一起显示，
   玩家能拿自己的切入点和最后的解析对照 */
function apprRecapHtmlOf(ap){
  if(!ap||!ap.done)return '';
  if(ap.picked==null)return `<div class="appr-recap skip">🧭 跳过了思路环节</div>`;
  return `<div class="appr-recap ${ap.ok?'ok':'no'}">🧭 ${ap.ok?'切入点正确':'切入点偏了'} · ${esc(ap.picked)}
    ${ap.ok?'':`<div class="rk">更好的入手：${esc(ap.r)}</div>`}</div>`;
}
/* 答题副作用统一走「先画后算」：DOM 写完 → 下一帧再响音效 / 记思路灵 / 落盘刷新 HUD。
   音效要唤醒 AudioContext（真机几百毫秒）、save 要读写存档，排在前头会卡住
   "变绿"那一帧的提交。⚠️ 必须 afterPaint（rAF+宏任务两段），原因见 34_engine_core.js。 */
function quizSideFx(tPaint,correct,q,hintUsed){
  window.__ansGap=Math.round(performance.now()-tPaint);
  try{correct?SFX.right():SFX.wrong();}catch(e){}
  try{lingJudge(q,correct,hintUsed);}catch(e){}
  save();updateHUD();
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
  /* 172 版起闯关不走思路步（ap 恒为 null，思路学习统一归练枪），
     当年的 renderApproach/pickApproach 已是死代码，4.1.1 删掉；
     ap 变量与相关表达式保留 —— 哪天要给闯关恢复思路层，接回来就是。 */

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
      ${apprRecapHtmlOf(ap)}
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
  /* 有思路层就走两步，没有就退回原来的一步答题。
     172 版起 ap 恒为 null：当年在这里岔去 renderApproach 的分支已删（见上）。 */
  function render(){
    renderAnswer();
  }
  function bindOpts(){
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>answer(+el.dataset.i));
    });
  }
  function answer(idx){
    const correct=opts[idx]===q.ansText;
    const cost=(performance.now()-t0)/1000;
    paintOptsJudge(panel,opts,q.ansText,idx);
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
    afterPaint(()=>quizSideFx(tPaint,correct,q,usedHint));
  }
  render();
}

/* 会话：固定题目（错题重练）
   错题本里存的是题目快照，没有 appr 字段，老存档里的错题直接答题
   （思路学习统一归练枪，172 版起思路步已删——同 session()）。 */
function sessionFixed(list,title,onFinish){
  let i=0,right=0;
  let ap=null;
  function headHtml(){
    const q=list[i];
    return `<h2>${title}</h2>
      <div class="sub">第 ${i+1} / ${list.length} 题 · 已答对 ${right}</div>
      <div style="text-align:center"><span class="qtag">${esc(q.topic||'复习')}</span>${srcBadge(q.src,q.qt)}</div>
      <div class="qtext">${esc(q.text)}</div>${qFigHtml(q)}`;
  }
  function bindNext(){
    $('nextBtn').onclick=()=>{
      i++;
      if(i>=list.length){panel.dataset.lock='';onFinish(right,list.length);}
      else render();
    };
  }
  /* ---------- 第二步：选答案 ---------- */
  function renderAnswer(){
    const q=list[i];
    if(ap&&!ap.done){ap.done=true;ap.picked=null;ap.ok=false;}
    /* 导入进来的题常常只有题干和答案，没有三个干扰项 —— 改走自评模式 */
    if(!q.opts||q.opts.length<2){renderSelfRate();return;}
    openPanel(`${headHtml()}
      ${apprRecapHtmlOf(ap)}
      <div class="qmeta">第二步 · 选出正确答案</div>
      <div class="opts">${q.opts.map((o,k)=>`<div class="opt" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row"><button class="btn primary" id="nextBtn" style="display:none">继续 →</button></div>`,1);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>{
        const k=+el.dataset.i;
        const correct=q.opts[k]===q.ans;
        paintOptsJudge(panel,q.opts,q.ans,k);
        const fb=$('feedback');
        recordAnswer(q.rid||'func',q.topic||'',correct);
        if(correct){right++;state.totalRight++;state.streak=(state.streak||0)+1;
          state.bestStreak=Math.max(state.bestStreak||0,state.streak);
          state.crystals+=2+((ap&&ap.ok)?2:0);
          /* 答对就升一星熟炼度，满 5 星毕业进「已掌握」 */
          const gr=wbGrade(q,true),coin2=2+((ap&&ap.ok)?2:0);
          const nx=state.wrongBook.filter(x=>x.text===q.text)[0];
          fb.className='ok';
          setH(fb, (gr==='done'?'✅ 答对！🎓 满星毕业，收进「已掌握」'
            :(gr==='up'?'✅ 答对！⬆️ 熟炼度 +1'+(nx&&nx.due?'，'+esc(nx.due)+' 再见':'')
              :'✅ 答对！'))+' 🪙+'+coin2+stepsHtml(q,false));}
        else{state.totalWrong++;state.streak=0;
          wbGrade(q,false);
          fb.className='no';setH(fb, `❌ 正确答案：<b>${esc(q.ans)}</b><div class="exp">💡 ${esc(q.exp)}</div>${stepsHtml(q,true)}<div class="exp">📌 熟炼度归零，明天再来一遍</div>`);}
        /* 音效 / 落盘 / HUD 与闯关同款「先画后算」（wbGrade 要喂反馈文案，保持同步） */
        const tPaint=performance.now();
        afterPaint(()=>{
          try{correct?SFX.right():SFX.wrong();}catch(e){}
          save();updateHUD();
          window.__ansGap=Math.round(performance.now()-tPaint);
        });
        $('nextBtn').style.display='block';
        $('nextBtn').textContent=(i+1>=list.length)?'完成 ✓':'继续 →';
        bindNext();
      });
    });
  }
  /* ---------- 第二步（没有选项的题）：自己做 → 对答案 → 自评 ---------- */
  function renderSelfRate(){
    const q=list[i];
    openPanel(`${headHtml()}
      ${apprRecapHtmlOf(ap)}
      <div class="qmeta">第二步 · 这道题没有选项，先在心里做一遍，再对答案自评</div>
      <div id="srBox">
        <button class="btn primary" id="srShow" style="width:100%;justify-content:center">👀 看答案与解析</button>
      </div>
      <div id="feedback"></div>
      <div class="row"><button class="btn primary" id="nextBtn" style="display:none">继续 →</button></div>`,1);
    function finish(ok){
      recordAnswer(q.rid||'func',q.topic||'',ok);
      /* 音效 / 落盘 / HUD 与其余答题路径同款「先画后算」（4.1.1 补齐最后一条路） */
      afterPaint(()=>{
        try{ok?SFX.right():SFX.wrong();}catch(e){}
        save();updateHUD();
      });
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
        fb.className='ok';
        setH(fb, (gr2==='done'?'✅ 🎓 满星毕业，收进「已掌握」'
          :(gr2==='up'?'✅ 记住了！⬆️ 熟炼度 +1'+(nx2&&nx2.due?'，'+esc(nx2.due)+' 再见':'')
            :'✅ 记住了！'))+' 🪙+'+coin3);
        box.querySelectorAll('button').forEach(b=>{b.disabled=true;});
        finish(true);
      };
      $('srNo').onclick=()=>{
        state.totalWrong++;state.streak=0;
        wbGrade(q,false);
        fb.className='no';
        setH(fb, `❌ 熟炼度归零，明天再来一遍`);
        box.querySelectorAll('button').forEach(b=>{b.disabled=true;});
        finish(false);
      };
    };
  }
  function render(){
    renderAnswer();
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
