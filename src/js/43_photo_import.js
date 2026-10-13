/* =========================================================
   拍照 / 选图 / 粘贴 —— 批量导入照片错题
   ========================================================= */
let PHOTO_SHOTS=[];          /* {id,url,text,ans,topic,st,cls} */
let photoOpen=false,pasteHooked=false;
function shotId(){return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function hookPaste(){
  if(pasteHooked)return;
  pasteHooked=true;
  document.addEventListener('paste',e=>{
    /* 面板被别的方式关掉（Esc / 点遮罩）时 photoOpen 还留着，
       看一眼列表在不在就知道该不该收图，顺手把开关复位 */
    if(!photoOpen||!document.getElementById('shotList')){photoOpen=false;return;}
    const it=e.clipboardData&&e.clipboardData.items;
    if(!it)return;
    let got=false;
    for(let i=0;i<it.length;i++){
      const o=it[i];
      if(o&&o.type&&o.type.indexOf('image')===0){
        const f=o.getAsFile&&o.getAsFile();
        if(f){got=true;shotAddFiles([f]);}
      }
    }
    if(got)e.preventDefault();
  });
}
async function shotAddFiles(files){
  const arr=[];
  for(const f of files||[])if(f&&/^image\//.test(f.type||''))arr.push(f);
  if(!arr.length){toast('没选到图片');return;}
  toast('处理中…');
  for(const f of arr){
    const url=await shrinkImage(f,1100,0.72);
    if(!url){toast('有一张图读不出来');continue;}
    const id=shotId();
    await shotPut(id,url);
    PHOTO_SHOTS.push({id:id,url:url,text:'',ans:'',topic:'',st:'待识别',cls:''});
  }
  showImportPhoto();
}
/* ---------- 面板 ---------- */
/* 单张卡片的「AI 解析」折叠区：
   解析 / 步骤 / 思路层都摊开给人看，也都能改 —— AI 认错的题干能救回来，
   它给的步骤不对，删掉自己写一行也是一样能用。 */
function aiShotBox(sh,i){
  const steps=(sh.steps||[]).slice(0,4);
  const hints=(sh.hints||[]).slice(0,4);
  const ar=sh.appr?esc(sh.appr.r):'';
  const aw=sh.appr?esc((sh.appr.opts||[]).filter(v=>v!==sh.appr.r).join('\n')):'';
  const has=!!(sh.lecture||sh.exp||steps.length||sh.appr||sh.trap);
  const lect=sh.lecture||sh.exp||'';
  /* 上半部分是「看」：讲完直接能读懂；下半部分是「改」：AI 说错的自己救回来 */
  const show=has?`<div class="tc">
      <div class="hd">📖 AI 讲解${sh.key?'<span class="tc-lv" style="background:rgba(255,215,106,.16);color:#ffd76a">'+esc(sh.key)+'</span>':''}</div>
      ${lect?esc(lect):'<span style="color:#9cc0e0">（还没有讲解，点下面「🧠 AI 解析」生成）</span>'}
      ${steps.length?`<div class="tc-step"><b>🧠 分 ${steps.length} 步走</b><ol style="margin:4px 0 0 18px;padding:0">${steps.map(t=>'<li>'+esc(t)+'</li>').join('')}</ol></div>`:''}
      ${sh.trap?`<div class="tc-step"><b>⚠️ 最容易错在这</b><br>${esc(sh.trap)}</div>`:''}
    </div>`:'';
  return `${show}
  <details class="ai-sec">
    <summary>✍️ 逐项校对 / 自己改（解析 · 步骤 · 提示 · 思路层）</summary>
    <div class="ai-hd">📖 讲解（摊开给人看的那一段）</div>
    <textarea class="shot-inp st-lect" rows="3" placeholder="AI 生成的完整讲解，可改">${esc(sh.lecture)}</textarea>
    <div class="ai-hd" style="margin-top:6px">💡 一句话解析（列表里显示）</div>
    <textarea class="shot-inp st-exp" rows="2" placeholder="识别后自动填，可改">${esc(sh.exp)}</textarea>
    <div class="ai-hd" style="margin-top:6px">🧠 解题步骤（一行一步，最多 4 步）</div>
    <textarea class="shot-inp st-steps" rows="3" placeholder="先做什么&#10;再做什么&#10;得出什么">${esc(steps.join('\n'))}</textarea>
    <div class="ai-hd" style="margin-top:6px">🪜 阶梯提示（一行一步，最后一步也不给答案）</div>
    <textarea class="shot-inp st-hints" rows="3" placeholder="第一步：先做什么&#10;第二步：列出哪个关系&#10;第三步：算出哪个中间量">${esc(hints.join('\n'))}</textarea>
    <div class="ai-hd" style="margin-top:6px">⚠️ 易错点（一句话）</div>
    <input class="shot-inp st-trap" placeholder="如：把沉淀完全当成浓度为零" value="${esc(sh.trap)}">
    <div class="ai-hd" style="margin-top:6px">🧭 入手方式（第一行正确，其余是学生常跑偏的）</div>
    <input class="shot-inp st-appr-r" placeholder="正确入手，如 先受力分析再正交分解" value="${ar}">
    <textarea class="shot-inp st-appr-w" rows="3" placeholder="一行一条，写学生真会犯的错">${aw}</textarea>
  </details>`;
}
/* ---------- 把刚拍下来的这一题直接练一遍 ----------
   拍完 → 讲解已经摆在眼前，但"看懂"和"自己做得出来"是两回事。
   所以这里不走错题本，就地把它当成一道题做：先选思路、再选答案，
   提示按 AI 给的 3~4 步逐层给，答完把完整讲解摊开 —— 做对了再决定收不收。 */
function playShot(i,defSubj){
  const sh=PHOTO_SHOTS[i];
  if(!sh){return;}
  if(!(sh.text||sh.ans)){toast('先给这张图填上题干或答案');return;}
  let opts=null,ans=(sh.ans||'').trim();
  if(sh.opts&&sh.opts.length>=2){
    const pk=aiPickOpt(ans,sh.opts);
    if(pk.ok){ans=pk.ans;opts=sh.opts.slice(0,6);}
  }
  const sid=impSubj(sh.subj)||impSubj(defSubj)||'';
  drillOne({text:(sh.text||'').trim(),ansText:ans||'见图片',opts:opts,
    exp:(sh.lecture||sh.exp||''),steps:(sh.steps||[]).slice(0,4),
    hints:(sh.hints||[]).slice(0,4),trap:sh.trap||'',
    topic:sh.topic||'照片题',appr:sh.appr||null,img:sh.id,
    subject:sid,rid:impRid(sid)},{sh:sh,i:i,defSubj:defSubj});
}
/* ---------- 单题两步作答：思路 → 答案 → 完整讲解 ----------
   没有选项的填空 / 计算 / 解答题走自评：先自己算，再对答案，自己判会不会。
   两种模式共用同一套提示链与讲解区。 */
function drillOne(q,opt){
  opt=opt||{};
  const opts=(q.opts&&q.opts.length>=2)?q.opts.slice():null;
  const subj=DRILL_OF[q.subject]||null;
  const chain=(q.hints&&q.hints.length>=2)?q.hints.slice(0,4):buildHintChain(q,null);
  let hintLv=0;
  let ap=q.appr?{opts:q.appr.opts.slice(),r:q.appr.r,why:q.appr.why,
                 picked:null,ok:false,done:false}:null;
  function head(){
    return `<h2>🎯 练这一题</h2>
      <div class="sub">${subj?subj.emoji+' '+subj.name+' · ':''}${esc(q.topic||'导入题')}${opts?' · 四选一':' · 自评题'}</div>
      <div style="text-align:center"><span class="qtag">${esc(q.topic||'导入题')}</span>${srcBadge('导入·图')}</div>
      <div class="qtext">${esc(q.text)}</div>${q.img?`<div class="qimg">${imgTag(q.img,'qimg-i')}</div>`:''}`;
  }
  function recap(){
    if(!ap||!ap.done)return '';
    if(ap.picked==null)return `<div class="appr-recap skip">🧭 跳过了思路环节</div>`;
    return `<div class="appr-recap ${ap.ok?'ok':'no'}">🧭 ${ap.ok?'切入点正确':'切入点偏了'} · ${esc(ap.picked)}
      ${ap.ok?'':`<div class="rk">更好的入手：${esc(ap.r)}</div>`}</div>`;
  }
  function box(){
    return (q.exp||(q.steps&&q.steps.length))?qSolveHtml(q,true):'';
  }
  /* ---- 第一步：选思路 ---- */
  function stepAppr(){
    openPanel(`${head()}
      <div class="qmeta">🧭 第一步 · 先想清楚从哪儿入手（不算对错）</div>
      <div class="opts">${ap.opts.map((o,k)=>`<div class="opt appr" data-i="${k}">${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
      <div class="row">
        <button class="btn" id="pSkip">跳过</button>
        <button class="btn primary" id="pNext" style="display:none">看选项 →</button>
      </div>`);
    panel.querySelectorAll('.opt').forEach(el=>{
      el.addEventListener('click',()=>{
        if(ap.done)return;
        const k=+el.dataset.i;
        ap.done=true;ap.picked=ap.opts[k];ap.ok=ap.opts[k]===ap.r;
        panel.querySelectorAll('.opt').forEach(e2=>{
          const j=+e2.dataset.i;e2.classList.add('locked');
          if(ap.opts[j]===ap.r)e2.classList.add('right');
          else if(j===k)e2.classList.add('wrong');else e2.classList.add('dim');});
        const fb=$('feedback');
        fb.className=ap.ok?'ok':'no';
        fb.innerHTML=ap.ok?`✅ 对路 · ${esc(ap.picked)}${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`
          :`💡 更好的入手：<b>${esc(ap.r)}</b>${ap.why?'<div class="exp">'+esc(ap.why)+'</div>':''}`;
        $('pSkip').style.display='none';$('pNext').style.display='block';
      });
    });
    $('pSkip').onclick=()=>{ap.done=true;ap.picked=null;ap.ok=false;stepAnswer();};
    $('pNext').onclick=stepAnswer;
    try{fillImgs(panel);}catch(e){}
  }
  /* ---- 第二步：选答案 / 自评 ---- */
  function stepAnswer(){
    if(ap&&!ap.done){ap.done=true;ap.picked=null;ap.ok=false;}
    hintLv=0;
    openPanel(`${head()}${recap()}
      <div class="qmeta">${opts?'第二步 · 选出正确答案':'在心里算一个答案，再对照'}</div>
      ${opts?`<div class="opts">${opts.map((o,k)=>`<div class="opt" data-i="${k}">${esc(o)}</div>`).join('')}</div>`:''}
      <div id="hintBox"></div>
      <div id="feedback"></div>
      <div class="row">
        ${chain.length?`<button class="btn" id="pHint">💡 第 1 步（免费）</button>`:''}
        ${opts?'':`<button class="btn primary" id="pReveal">看答案</button>`}
      </div>
      <div class="row" style="display:none" id="pRow2">
        <button class="btn" id="pOk">✅ 我会了</button>
        <button class="btn" id="pNo">❌ 没做对</button>
      </div>`);
    if(opts){
      panel.querySelectorAll('.opt').forEach(el=>{
        el.addEventListener('click',()=>{
          const k=+el.dataset.i,right=opts[k]===q.ansText;
          panel.querySelectorAll('.opt').forEach(e2=>{
            const j=+e2.dataset.i;e2.classList.add('locked');
            if(opts[j]===q.ansText)e2.classList.add('right');
            else if(j===k)e2.classList.add('wrong');else e2.classList.add('dim');});
          const fb=$('feedback');
          fb.className=right?'ok':'no';
          fb.innerHTML=right?`✅ 答对！`+box()
            :`❌ 正确答案：<b>${esc(q.ansText)}</b>`+box();
          if(right)SFX.right();else SFX.wrong();
          after(right);
        });
      });
    }else{
      $('pReveal').onclick=()=>{
        const fb=$('feedback');fb.className='';
        fb.innerHTML=`<b style="color:#ffd76a">答案：${esc(q.ansText)}</b>`+box();
        $('pReveal').style.display='none';
        $('pRow2').style.display='flex';
      };
      $('pOk').onclick=()=>{SFX.right();after(true);};
      $('pNo').onclick=()=>{SFX.wrong();after(false);};
    }
    const hb=$('pHint');
    if(hb)hb.onclick=()=>{
      if(hintLv>=chain.length){toast('提示已经给到底了');return;}
      hintLv++;
      const bx=$('hintBox');
      if(bx)bx.innerHTML=hintBoxHtml(chain,hintLv);
      hb.textContent=hintLv>=chain.length?'💡 提示已给完':'💡 第 '+(hintLv+1)+' 步（免费）';
      SFX.open();panel.scrollTop=panel.scrollHeight;
    };
  }
  /* ---- 答完：收不收进错题本 ---- */
  function after(right){
    if(q.trap){
      const fb=$('feedback');
      if(fb)fb.innerHTML+='<div class="exp">⚠️ 最容易错在这：'+esc(q.trap)+'</div>';
    }
    const row=document.createElement('div');
    row.className='row';
    row.innerHTML=(!right?'<button class="btn primary" id="pKeep">📕 收进错题本</button>':'<button class="btn" id="pKeep">📕 还是收进错题本</button>')
      +'<button class="btn" id="pAgain">🔁 再做一遍</button>'
      +'<button class="btn" id="pBack">返回</button>';
    const fb2=$('feedback');
    if(fb2&&fb2.parentNode)fb2.parentNode.appendChild(row);
    const keepIt=()=>{
      const it={text:q.text,ans:q.ansText,exp:q.exp,topic:q.topic,
        opts:(q.opts||[]).slice(),steps:q.steps||null,hints:q.hints||null,
        trap:q.trap||'',appr:q.appr||null,img:q.img||'',rid:q.rid||'func',
        subject:q.subject||'',src:'导入·图',imp:1,src2:'照片题'};
      if(wbAdd(it)){
        /* 图留着：已被本子引用，导出清理时不会被删 */
        if(opt.sh)opt.sh.kept=1;
        save();toast('已收进错题本 📕');
      }else toast('本子里已经有这道题了');
      closePanel();
    };
    const k=$('pKeep');if(k)k.onclick=keepIt;
    const g=$('pAgain');if(g)g.onclick=()=>{hintLv=0;ap=q.appr?{opts:q.appr.opts.slice(),
      r:q.appr.r,why:q.appr.why,picked:null,ok:false,done:false}:null;
      if(ap)stepAppr();else stepAnswer();};
    const b2=$('pBack');if(b2)b2.onclick=()=>{showImportPhoto();};
    try{fillImgs(panel);}catch(e){}
  }
  if(ap)stepAppr();else stepAnswer();
}

/* 只解析这一张：整批识别完发现某一张不对，不用全部重来 */
async function aiOneShot(i){
  const sh=PHOTO_SHOTS[i];
  if(!sh)return;
  if(OCR_CFG.mode!=='ai'){
    const m=$('phMsg');
    if(m)m.innerHTML='<span class="imp-no">当前不是 AI 识别</span>，先去「⚙️ 识别设置」切成视觉大模型';
    return;
  }
  if(!(OCR_CFG.aiBase||'').trim()||!(OCR_CFG.aiModel||'').trim()){
    const m=$('phMsg');
    if(m)m.innerHTML='<span class="imp-no">还没填接口地址或模型名</span>，先去「⚙️ 识别设置」';
    return;
  }
  const setSt=t=>{
    sh.st=t;sh.cls='run';
    const els=panel.querySelectorAll('.shot .st');
    if(els[i])els[i].textContent=t;
  };
  setSt('AI 解析中…');
  const r=await aiDeepPhoto(sh.url,setSt);
  if(!r.ok||!r.text){
    sh.cls='no';sh.st='没认出来：'+(r.err||'图上看不到字');
  }else{
    if(r.text)sh.text=r.text;
    if(r.ans)sh.ans=r.ans;
    if(r.topic)sh.topic=r.topic;
    if(r.subject)sh.subj=impSubj(r.subject)||sh.subj;
    if(r.opts&&r.opts.length>=2){
      sh.opts=r.opts.map(x=>String(x).trim()).filter(Boolean);
      const p=aiPickOpt(sh.ans,sh.opts);
      if(p.ok){sh.ans=p.ans;sh.text=aiStripOpts(sh.text,sh.opts);}
      else sh.opts=null;
    }
    sh.exp=r.explain||sh.exp;
    if(r.steps&&r.steps.length)sh.steps=r.steps;
    if(r.appr)sh.appr=r.appr;
    sh.cls='ok';
    sh.st='AI 已解析'+(r.ans?' · 答案已填':' · 图上没答案，自己敲')
      +((sh.steps||[]).length?' · '+sh.steps.length+' 步思路':'')
      +(sh.appr?' · 思路层 ✓':'');
    /* 结构化拿到手 → 再跑一趟把讲解写透（失败也不影响入库） */
    if(OCR_CFG.mode==='ai'){
      setSt('AI 正在写讲解…');
      const L=await aiLecture(sh.text,sh.ans,sh.subj||PHOTO_SHOTS._subj,setSt);
      if(shotApplyLect(sh,L))sh.st+=' · 讲解 ✓';
    }
  }
  showImportPhoto();
  const m=$('phMsg');
  if(m)m.innerHTML=r.ok
    ? '<span class="imp-ok">这一张解析完了</span>，往下改一改再导入'
    : '<span class="imp-no">这一张没成</span>：'+esc(r.err||'未知原因')+'（也可以自己敲）';
}
function showImportPhoto(){
  photoOpen=true;hookPaste();
  let defSubj=PHOTO_SHOTS._subj||'';
  function collect(){
    const box=$('shotList');
    if(box){
      box.querySelectorAll('.shot').forEach(el=>{
        const i=+el.getAttribute('data-k');
        if(isNaN(i)||!PHOTO_SHOTS[i])return;
        const a=el.querySelector('.st-text'),b=el.querySelector('.st-ans');
        if(a)PHOTO_SHOTS[i].text=a.value;
        if(b)PHOTO_SHOTS[i].ans=b.value;
        const ex=el.querySelector('.st-exp'),sp=el.querySelector('.st-steps');
        const ar=el.querySelector('.st-appr-r'),aw=el.querySelector('.st-appr-w');
        const lc=el.querySelector('.st-lect'),ht=el.querySelector('.st-hints');
        const tp=el.querySelector('.st-trap');
        if(ex)PHOTO_SHOTS[i].exp=ex.value;
        if(lc)PHOTO_SHOTS[i].lecture=lc.value;
        if(ht)PHOTO_SHOTS[i].hints=String(ht.value).split(/\n+/)
          .map(t=>String(t).trim()).filter(Boolean).slice(0,4);
        if(tp)PHOTO_SHOTS[i].trap=tp.value;
        if(sp)PHOTO_SHOTS[i].steps=String(sp.value).split(/\n+/)
          .map(t=>String(t).trim()).filter(Boolean).slice(0,4);
        if(ar){
          const r=String(ar.value||'').trim();
          if(r){
            const w=String(aw?aw.value:'').split(/\n+/)
              .map(t=>String(t).trim()).filter(Boolean);
            /* 偏路不足 3 条时用科目的兜底池补齐，凑不出 4 个选项就不出思路题 */
            PHOTO_SHOTS[i].appr=aiFixAppr({right:r,wrong:w},
              PHOTO_SHOTS[i].subj||PHOTO_SHOTS._subj||'math');
          }else PHOTO_SHOTS[i].appr=null;
        }
      });
    }
  }
  function render(){
    const picks=DRILL_SUBJ.map(d=>{const on=(defSubj===d.id);return `<button class="btn" data-s="${d.id}"
      style="flex:none;min-width:0;padding:6px 11px;font-size:var(--fs-sm);${on
        ?'background:linear-gradient(160deg,#ffd76a,#f59f2b);color:#4a2c00;border:none':''}">${d.emoji} ${d.name}</button>`;}).join('');
    const n=PHOTO_SHOTS.length;
    const ready=PHOTO_SHOTS.filter(x=>x.text||x.ans).length;
    openPanel(`
      <h2>📷 拍题 · AI 讲解</h2>
      <div class="sub">已选 ${n} 张${n?' · '+ready+' 张有内容':''} · 错题本现有 ${state.wrongBook.length} / ${WRONG_CAP} 题</div>
      <div class="imp-box">
        · 手机上点 <b>📷 拍照 / 选图</b> 可以直接拍，也能从相册里选（可多选）<br>
        · 电脑上截完图，回到这个页面 <b>直接 Ctrl+V 粘贴</b> 就行<br>
        · 点 <b>🧠 识别并讲解</b>：AI 一次给出题干、答案、选项、知识点，
          再单独写一份<b style="color:#9fe4ff">完整讲解 + 3~4 步思路 + 阶梯提示 + 易错点</b><br>
        · 讲解直接套进游戏的思路框架：答前逐层给提示，答后摊开步骤，
          思路层走「🧭 先选思路 → 再选答案」两步作答<br>
        · 单张想重来点 <b>🧠 AI 解析</b>，想当场做一遍点 <b>🎯 练这一题</b><br>
        · 认不出来的（公式、手写）没关系：图照样存着，重练时看图做
      </div>
      <div class="row" style="margin-top:0;margin-bottom:8px;gap:6px;justify-content:center;flex-wrap:wrap">
        <span style="color:#9cc0e0;font-size:var(--fs-sm);align-self:center">科目</span>${picks}
      </div>
      <div id="shotList">
        ${n?PHOTO_SHOTS.map((sh,i)=>`
          <div class="shot" data-k="${i}">
            <img class="pic" src="${esc(sh.url)}" data-zoom="${i}" alt="">
            <div class="fd">
              <textarea class="shot-inp st-text" rows="2" placeholder="题干（识别后自动填，可改）">${esc(sh.text)}</textarea>
              <input class="shot-inp st-ans" placeholder="答案（识别后自动填，可改）" value="${esc(sh.ans)}">
              <div class="st ${sh.cls}">${esc(sh.st)}</div>
              ${aiShotBox(sh,i)}
              <div style="display:flex;gap:6px">
                <button class="del" data-ai="${i}" style="flex:1;background:linear-gradient(180deg,rgba(94,214,255,.22),rgba(94,214,255,.12));
                  box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(94,214,255,.4),var(--gb-drop);color:#9fe4ff">🧠 AI 解析</button>
                <button class="del" data-play="${i}" style="flex:1;background:linear-gradient(180deg,rgba(255,215,106,.22),rgba(255,215,106,.12));
                  box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(255,215,106,.42),var(--gb-drop);color:#ffd76a">🎯 练这一题</button>
                <button class="del" data-del="${i}" style="flex:none">移除</button>
              </div>
            </div>
          </div>`).join('')
        :`<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);padding:18px 6px;line-height:var(--lh-loose)">
            还没有图片<br>点下面「📷 拍照 / 选图」，或者直接粘贴截图</div>`}
      </div>
      <div class="center" id="phMsg" style="min-height:20px;color:#ffd76a;font-weight:700;font-size:var(--fs-sm)"></div>
      <div class="row"><button class="btn" id="phPick">📷 拍照 / 选图</button><button class="btn primary" id="phOcr">🧠 识别并讲解</button></div>
      <div class="row"><button class="btn" id="phSet">⚙️ 识别设置</button><button class="btn primary" id="phGo" ${n?'':'disabled'}>✅ 导入 ${n} 张</button></div>
      <div class="row"><button class="btn" id="ok">关闭</button></div>
    `);
    panel.querySelectorAll('[data-s]').forEach(b=>{b.onclick=()=>{
      collect();defSubj=(defSubj===b.dataset.s?'':b.dataset.s);PHOTO_SHOTS._subj=defSubj;render();};});
    panel.querySelectorAll('[data-del]').forEach(b=>{b.onclick=()=>{
      const i=+b.getAttribute('data-del');
      const sh=PHOTO_SHOTS[i];
      if(sh){shotDel(sh.id);PHOTO_SHOTS.splice(i,1);}
      render();};});
    $('phPick').onclick=()=>{
      collect();
      const inp=document.createElement('input');
      inp.type='file';inp.accept='image/*';inp.multiple=true;
      inp.onchange=()=>{shotAddFiles(inp.files);};
      inp.click();
    };
    panel.querySelectorAll('[data-ai]').forEach(b=>{
      b.onclick=()=>{collect();PHOTO_SHOTS._subj=defSubj;aiOneShot(+b.getAttribute('data-ai'),defSubj);};});
    panel.querySelectorAll('[data-play]').forEach(b=>{
      b.onclick=()=>{collect();PHOTO_SHOTS._subj=defSubj;playShot(+b.getAttribute('data-play'),defSubj);};});
    $('phSet').onclick=()=>{collect();PHOTO_SHOTS._subj=defSubj;showOcrSettings();};
    $('phOcr').onclick=()=>{collect();PHOTO_SHOTS._subj=defSubj;runOcrAll(defSubj);};
    $('phGo').onclick=()=>{collect();PHOTO_SHOTS._subj=defSubj;commitPhotos(defSubj);};
    $('ok').onclick=()=>{photoOpen=false;closePanel();};
    fillImgs(panel);
  }
  render();
}
/* ---------- 逐张识别 ---------- */
async function runOcrAll(defSubj){
  const list=PHOTO_SHOTS;
  if(!list.length){toast('先加几张图');return;}
  const msg=$('phMsg');
  const useApi=OCR_CFG.mode==='api'&&(OCR_CFG.endpoint||'').trim();
  if(msg)msg.innerHTML=useApi?'正在识别…':'首次识别要下一份中文字库，慢一点，等一下 ⏳';
  let ok=0,bad=0;
  for(let i=0;i<list.length;i++){
    const sh=list[i];
    if(sh.text&&sh.ans){sh.st='已填过，跳过';sh.cls='ok';continue;}
    sh.cls='run';
    const setSt=t=>{sh.st=t;const el=panel.querySelectorAll('.shot .st')[i];if(el)el.textContent=t;};
    setSt('识别中…');
    const r=await ocrOne(sh.url,setSt);
    if(!r.ok||!r.text){sh.cls='no';sh.st='没认出来：'+(r.err||'图上看不到字')+'（可以自己敲）';bad++;continue;}
    if(r.ai){
      /* AI 直接给了结构化结果，不用再从整段文本里切答案 */
      if(r.text&&!sh.text)sh.text=r.text;
      if(r.ans&&!sh.ans)sh.ans=r.ans;
      if(r.topic&&!sh.topic)sh.topic=r.topic;
      if(r.subject)sh.subj=impSubj(r.subject)||sh.subj;
      if(r.explain&&!sh.exp)sh.exp=r.explain;
      if(r.steps&&r.steps.length&&!(sh.steps&&sh.steps.length))sh.steps=r.steps;
      if(r.appr&&!sh.appr)sh.appr=r.appr;
      if(r.opts&&r.opts.length>=2){
        sh.opts=r.opts.map(x=>String(x).trim()).filter(Boolean);
        const p=aiPickOpt(sh.ans,sh.opts);
        /* 答案能对上选项才做成选择题；对不上（比如答案是段过程）就只存图 */
        if(p.ok){sh.ans=p.ans;sh.text=aiStripOpts(sh.text,sh.opts);}
        else sh.opts=null;
      }
      sh.cls='ok';ok++;
      sh.st='AI 已解析'+(r.ans?' · 答案已填':' · 图上没答案，自己敲')
        +(sh.steps?' · '+sh.steps.length+' 步思路':'')
        +(sh.appr?' · 思路层 ✓':'');
      /* 批量时同样补一趟讲解，逐张来，进度写在卡片上 */
      if(OCR_CFG.mode==='ai'){
        setSt('AI 正在写讲解…');
        const L=await aiLecture(sh.text,sh.ans,sh.subj||defSubj,setSt);
        if(shotApplyLect(sh,L))sh.st+=' · 讲解 ✓';
      }
      continue;
    }
    const q=splitQA(r.text);
    if(q.text&&!sh.text)sh.text=q.text;
    if(q.ans&&!sh.ans)sh.ans=q.ans;
    if(q.exp&&!sh.topic)sh.topic=q.exp.slice(0,40);
    sh.cls='ok';ok++;
    sh.st='已识别'+(q.ans?'（答案自动填好了）':'（答案要自己敲一下）');
  }
  /* 重绘一次，把识别结果刷进输入框 */
  showImportPhoto();
  const m=$('phMsg');
  if(m)m.innerHTML=`<span class="imp-ok">识别完成 ${ok} 张</span>${bad?' · <span class="imp-no">'+bad+' 张没认出来</span>':''}<br>
    <span style="color:#9cc0e0;font-weight:400">认错的改一改，然后点「✅ 导入」</span>`;
  if(shotNoDB)toast('本机存图不可用，图片刷新后会丢');
}
