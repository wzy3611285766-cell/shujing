/* =========================================================
   🤖 智谱 GLM · 题目详解引擎（3.0.0）
   ---------------------------------------------------------
   答完一道题，点「🤖 AI 详解」就让智谱把这道题讲透：
     · lecture：完整讲解（带具体数字和式子，不是空话）
     · steps ：3~4 步求解，答完摊开看
     · hints ：3~4 层阶梯提示，最后一步仍留给自己算
     · trap  ：一句话点出最容易错在哪
   结果按题干 hash 缓存在本机，同一道题第二次点开是秒开、不花 token。
   Key 只存在浏览器 localStorage 里，不会写进任何导出文件。
   ========================================================= */
const AI_KEY='genji_ai_v1';
/* 智谱预设：OpenAI 兼容端点，换模型名即可切换。
   标 free 的是官方有免费额度的，先试这些。 */
const ZHIPU_MODELS=[
 {id:'glm-4.6',      n:'GLM-4.6（旗舰·讲解最详细）',d:'复杂大题、压轴题首选'},
 {id:'glm-4.5-air',  n:'GLM-4.5-Air（均衡·推荐）',  d:'质量与速度兼顾，日常刷题用这个'},
 {id:'glm-4-flash',  n:'GLM-4-Flash（免费）',       d:'有免费额度，响应最快',free:1},
 {id:'glm-4-plus',   n:'GLM-4-Plus（增强）',        d:'推理能力更强，长解析更稳'}
];
const ZHIPU_BASE='https://open.bigmodel.cn/api/paas/v4';
let AI_CFG={key:'',model:'glm-4.5-air',on:1};
function aiLoadCfg(){
  try{
    const v=localStorage.getItem(AI_KEY);
    if(v){const o=JSON.parse(v);
      if(o&&typeof o==='object'){
        if(typeof o.key==='string')AI_CFG.key=o.key;
        if(typeof o.model==='string')AI_CFG.model=o.model;
        if(o.on!=null)AI_CFG.on=o.on?1:0;
      }}
  }catch(e){}
  if(!ZHIPU_MODELS.some(m=>m.id===AI_CFG.model))AI_CFG.model='glm-4.5-air';
}
function aiSaveCfg(){try{localStorage.setItem(AI_KEY,JSON.stringify(AI_CFG));}catch(e){}}
aiLoadCfg();
function aiReady(){return !!(AI_CFG.key||'').trim();}
/* ---------- 结果缓存 ---------- */
const AI_CACHE_KEY='genji_aiexp_v1';
let AI_CACHE=null;
function aiCacheLoad(){
  if(AI_CACHE)return AI_CACHE;
  AI_CACHE={};
  try{
    const v=localStorage.getItem(AI_CACHE_KEY);
    if(v){const o=JSON.parse(v);if(o&&typeof o==='object')AI_CACHE=o;}
  }catch(e){}
  return AI_CACHE;
}
function aiCacheSave(){
  try{
    const ks=Object.keys(AI_CACHE);
    /* 只留最近 120 条，别让缓存无限膨胀 */
    if(ks.length>120){
      ks.sort((a,b)=>(AI_CACHE[b].ts||0)-(AI_CACHE[a].ts||0));
      const keep={};ks.slice(0,120).forEach(k=>{keep[k]=AI_CACHE[k];});
      AI_CACHE=keep;
    }
    localStorage.setItem(AI_CACHE_KEY,JSON.stringify(AI_CACHE));
  }catch(e){}
}
function aiHash(t){
  let h=0;const s=String(t||'');
  for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
  return 'q'+(h>>>0).toString(36);
}
function aiCacheGet(t){const c=aiCacheLoad();return c[aiHash(t)]||null;}
function aiCacheSet(t,o){const c=aiCacheLoad();c[aiHash(t)]=Object.assign({ts:Date.now()},o);aiCacheSave();}

/* ---------- 提示词：一次要齐「讲解 + 步骤 + 阶梯提示 + 易错点」 ---------- */
const AI_EXP_PROMPT=[
'你是中学金牌讲师。下面是一道已经给出正确答案的题，请把这道题讲透。只输出 JSON，不要任何解释、不要 markdown 代码块标记。',
'【科目】{S}',
'【知识点】{K}',
'【题干】{Q}',
'【正确答案】{A}',
'输出格式：',
'{"lecture":"完整讲解。先点明这道题考什么，再说关键一步怎么想、关键式子怎么写，最后怎么落到答案；必须带具体数字和式子（如「由 2x/(4−x)=0.4 得 x=2/3」这种程度），不要写空话套话，150~260 字",',
' "steps":["第一步：先求什么，列出哪个式子","第二步：算出哪个中间量","第三步：怎么落到最终答案"],',
' "hints":["第一步：先做什么（不能给答案）","第二步：列出哪个关系式","第三步：算出哪个中间量","第四步：只剩哪一步就到答案"],',
' "trap":"学生最容易错在哪，一句话，30 字以内",',
' "key":"核心考点，10 字以内"}',
'要求：',
'1. steps 给 3~4 步，每步一句话 30 字以内，要能看出先做什么后做什么，不要堆大段计算',
'2. hints 给 3~4 条逐层逼近，前几条绝不能把答案说出来，最后一条也不给最终数值',
'3. lecture 必须落到具体数字和式子，能帮学生看懂「为什么是答案 A 而不是 B」',
'4. 题目是多问的大题时，steps 按「第一问 → 第二问 → 第三问」的顺序给',
'5. 化学式、上下标、根号、分数线、希腊字母按原样保留，不要改写成口语',
'6. 看不懂题目就按科目和知识点给通用讲法，不要编造题里的数字'
].join('\n');

/* ---------- 只做「剥壳 + 解析」，不重命名字段 ----------
   注意别用 aiParseJson：那是给拍题识别用的，只认 stem/answer/options
   那几个固定字段，详解要的 lecture / hints / trap 会被它丢掉。 */
function aiParseFree(txt){
  let t=String(txt||'').trim();
  t=t.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
  const a=t.indexOf('{'),b=t.lastIndexOf('}');
  if(a>=0&&b>a)t=t.slice(a,b+1);
  try{const o=JSON.parse(t);return (o&&typeof o==='object')?o:null;}catch(e){}
  /* 模型偶尔把换行直接塞进 JSON 字符串里，补一层转义再试 */
  try{
    const o=JSON.parse(t.replace(/\n/g,'\\n').replace(/\r/g,''));
    return (o&&typeof o==='object')?o:null;
  }catch(e){}
  return null;
}

/* ---------- 调用智谱 ---------- */
function aiExplain(stem,ans,topic,subj,onProg){
  const key=(AI_CFG.key||'').trim();
  const model=(AI_CFG.model||'').trim();
  if(!key)return Promise.resolve({ok:false,err:'还没填智谱 API Key'});
  if(!model)return Promise.resolve({ok:false,err:'还没选模型'});
  const hit=aiCacheGet(stem);
  if(hit&&hit.lecture)return Promise.resolve({ok:true,cached:1,data:hit});
  if(onProg)onProg('🤖 智谱正在写详解…');
  const subjName=(typeof DRILL_OF!=='undefined'&&DRILL_OF[subj]&&DRILL_OF[subj].name)||'中学';
  const pm=AI_EXP_PROMPT.replace('{S}',subjName)
    .replace('{K}',String(topic||'').slice(0,60))
    .replace('{Q}',String(stem||'').slice(0,900))
    .replace('{A}',String(ans||'').slice(0,300));
  const body={model:model,temperature:0.2,
    messages:[{role:'user',content:pm}]};
  const ctl=(typeof AbortController!=='undefined')?new AbortController():null;
  const timer=ctl?setTimeout(()=>{try{ctl.abort();}catch(e){}},60000):null;
  return fetch(ZHIPU_BASE.replace(/\/+$/,'')+'/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify(body),
    signal:ctl?ctl.signal:undefined
  }).then(r=>{
    if(!r.ok){
      return r.text().then(t=>{
        throw new Error('HTTP '+r.status+' '+(t||'').slice(0,120));
      });
    }
    return r.json();
  }).then(j=>{
    if(timer)clearTimeout(timer);
    const c=j&&j.choices&&j.choices[0];
    const o=aiParseFree((c&&c.message&&c.message.content)||'');
    if(!o)throw new Error('模型返回的不是有效 JSON');
    const steps=(o.steps||[]).map(v=>aiStr(v,120)).filter(v=>v.length>2);
    const hints=(o.hints||[]).map(v=>aiStr(v,120)).filter(v=>v.length>2);
    const d={lecture:aiStr(o.lecture||o.explain||'',600),
             steps:steps.length?steps.slice(0,4):null,
             hints:hints.length?hints.slice(0,4):null,
             trap:aiStr(o.trap||'',80),key:aiStr(o.key||'',20)};
    if(!d.lecture&&!d.steps)throw new Error('模型没有给出讲解内容');
    aiCacheSet(stem,d);
    return {ok:true,data:d};
  }).catch(e=>{
    if(timer)clearTimeout(timer);
    const nm=(e&&e.name)==='AbortError'?'请求超时（60 s）':((e&&e.message)||'请求失败');
    return {ok:false,err:nm};
  });
}

/* ---------- 界面：答题后的「🤖 AI 详解」 ----------
   返回一段 HTML，插到反馈区下面。点一下才发请求，不点不花 token。 */
function aiExpBtnHtml(q){
  if(!q)return '';
  const has=!!aiCacheGet(q.text);
  return `<div id="aiExpWrap" style="margin-top:10px">
    <button class="btn" id="aiExpBtn" style="width:100%;justify-content:center;
      ${has?'box-shadow:var(--gb-edge-hi),var(--gb-edge-lo),0 0 0 .5px rgba(94,214,255,.5),var(--gb-drop);color:#9fe4ff':'box-shadow:var(--gb-edge-hi),var(--gb-edge-lo),0 0 0 .5px rgba(255,215,106,.45),var(--gb-drop);color:#ffd76a'}">
      ${has?'🤖 再看一遍 AI 详解（已缓存）':'🤖 AI 详解（智谱 GLM）'}</button>
    <div id="aiExpBody"></div></div>`;
}
/* 绑定按钮：boxId 是 aiExpBtn 所在容器（一般是 feedback 的父节点） */
function aiExpBind(q){
  const btn=(typeof $!=='undefined')?$('aiExpBtn'):null;
  if(!btn)return;
  btn.onclick=async()=>{
    const body=$('aiExpBody');
    if(!body)return;
    if(!aiReady()){
      setH(body, '<div class="exp" style="color:#ffb0b0">还没填智谱 API Key —— 点下面「⚙️ AI 设置」填一个就能用</div>');
      return;
    }
    /* 闯关题是 ansText，错题本快照是 ans —— 两种都要认 */
    const ansTxt=q.ansText!=null?q.ansText:q.ans;
    const subj=q.subject||(typeof subjOfRid==='function'?subjOfRid(q.rid):'')||'math';
    btn.disabled=true;btn.textContent='🤖 智谱正在写详解…';
    setH(body, '<div class="exp" style="color:#9cc0e0">正在让 GLM 讲这道题…</div>');
    const r=await aiExplain(q.text,ansTxt,q.topic,subj,t=>{btn.textContent=t;});
    btn.disabled=false;
    btn.textContent='🤖 再看一遍 AI 详解（已缓存）';
    if(!r.ok){
      setH(body, '<div class="exp" style="color:#ffb0b0">AI 详解没拿到：'
        +esc(r.err||'未知原因')+'（题本身的解析照常可用）</div>');
      return;
    }
    const d=r.data;
    let h='<div class="qexp" style="margin-top:8px"><div class="hd">🤖 AI 完整讲解</div>'+esc(d.lecture||'')+'</div>';
    if(d.steps&&d.steps.length){
      h+='<div class="qexp"><div class="hd">🧠 分步骤</div><ol>'
        +d.steps.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol></div>';
    }
    if(d.hints&&d.hints.length){
      h+='<div class="qexp"><div class="hd">💡 阶梯提示</div><ol>'
        +d.hints.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol></div>';
    }
    if(d.trap)h+='<div class="exp" style="color:#ffd0a0">⚠️ 最容易错在这：'+esc(d.trap)+'</div>';
    if(d.key&&!q.topic)h+='<div class="exp">核心考点：'+esc(d.key)+'</div>';
    setH(body, h);
    /* 讲解顺手存进题里，收进错题本后重练也能看 */
    try{
      if(d.lecture)q.aiLecture=d.lecture;
      if(d.steps)q.aiSteps=d.steps;
      if(d.hints)q.aiHints=d.hints;
      if(d.trap)q.aiTrap=d.trap;
    }catch(e){}
    if(typeof panel!=='undefined'&&panel)panel.scrollTop=panel.scrollHeight;
  };
}

/* ---------- 设置面板 ---------- */
function showAiSettings(back){
  function render(){
    const cur=ZHIPU_MODELS.filter(m=>m.id===AI_CFG.model)[0]||ZHIPU_MODELS[1];
    openPanel(`
      <h2>⚙️ AI 设置 · 智谱 GLM</h2>
      <div class="sub">填一次 Key，之后所有题都能一键要详解</div>
      <div class="imp-box">
        · Key 只存在<b>这台设备的浏览器里</b>，不会写进导出文件、不会上传别处<br>
        · 讲解结果会按题目缓存，<b>同一道题第二次点开是秒开、不重复花 token</b><br>
        · 没填 Key 也能正常刷题，只是用不了 AI 详解<br>
        · 智谱控制台 <b>open.bigmodel.cn</b> 里可以领到 Key 与免费额度
      </div>
      <div style="text-align:left;margin-bottom:10px">
        <div style="color:#9cc0e0;font-size:var(--fs-sm);margin-bottom:4px">API Key</div>
        <input id="aiKeyInp" type="password" placeholder="粘贴你的智谱 API Key"
          value="${esc(AI_CFG.key)}" style="width:100%;padding:9px 11px;border-radius:10px;
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);
          color:#eaf4ff;font-size:var(--fs-md);font-family:inherit">
      </div>
      <div style="text-align:left;margin-bottom:10px">
        <div style="color:#9cc0e0;font-size:var(--fs-sm);margin-bottom:6px">模型</div>
        <div class="menu-list">
          ${ZHIPU_MODELS.map(m=>`<button class="menu-li" data-m="${m.id}"
            style="${m.id===AI_CFG.model?'background:linear-gradient(180deg,rgba(255,215,106,.20),rgba(255,215,106,.09));box-shadow:var(--gb-edge-hi),0 0 0 .5px rgba(255,215,106,.55),var(--gb-drop)':''}">
            <span class="e">${m.free?'🆓':'🤖'}</span>
            <span class="tx">${esc(m.n)}<div class="d">${esc(m.d)}</div></span></button>`).join('')}
        </div>
      </div>
      <div class="center" id="aiMsg" style="min-height:20px;color:#ffd76a;
        font-size:var(--fs-sm);font-weight:700"></div>
      <div class="row"><button class="btn" id="aiTest">🔌 测一下连通</button>
        <button class="btn primary" id="aiSave">保存</button></div>
      <div class="row"><button class="btn" id="aiClr">🗑 清空讲解缓存</button>
        <button class="btn" id="aiBack">返回</button></div>
      <div class="center" style="font-size:var(--fs-xs);color:#7d94ab;margin-top:8px;line-height:var(--lh-base)">
        端点：${esc(ZHIPU_BASE)}<br>当前模型：<b style="color:#ffd76a">${esc(cur.n)}</b>
      </div>`);
    const inp=$('aiKeyInp');
    panel.querySelectorAll('[data-m]').forEach(b=>{
      b.onclick=()=>{if(inp)AI_CFG.key=inp.value.trim();AI_CFG.model=b.dataset.m;render();};
    });
    $('aiSave').onclick=()=>{
      AI_CFG.key=(inp?inp.value:'').trim();aiSaveCfg();
      toast('已保存 · 模型 '+AI_CFG.model);
      if(back)back();else closePanel();
    };
    $('aiTest').onclick=async()=>{
      AI_CFG.key=(inp?inp.value:'').trim();
      if(!aiReady()){$('aiMsg').textContent='先填 Key 再测';return;}
      const mg=$('aiMsg');mg.textContent='正在连接…';
      const r=await aiExplain('1 + 1 = ?','2','测试','math',t=>{mg.textContent=t;});
      setH(mg, r.ok
        ? '<span class="imp-ok">连通 ✓</span> 模型 '+esc(AI_CFG.model)
        : '<span class="imp-no">没通</span>：'+esc(r.err||'未知原因'));
    };
    $('aiClr').onclick=()=>{
      AI_CACHE={};try{localStorage.removeItem(AI_CACHE_KEY);}catch(e){}
      toast('讲解缓存已清空');
    };
    $('aiBack').onclick=()=>{if(back)back();else closePanel();};
  }
  render();
}

/* 把讲解结果塞回 shot（也供错题详情重讲时使用） */
function shotApplyLect(sh,L){
  if(!sh||!L)return false;
  let got=false;
  if(L.lecture){sh.lecture=L.lecture;got=true;}
  if(L.hints&&L.hints.length){sh.hints=L.hints;got=true;}
  if(L.trap){sh.trap=L.trap;got=true;}
  if(L.key&&!sh.topic){sh.topic=L.key;got=true;}
  return got;
}

/* 模型只吐出题干答案（或深度请求失败）时用的兜底思路池。
   按科目给几条"学生常犯的入手错误"，凑够 4 个选项才出得了思路题。 */
const AI_APPR_FALLBACK={
  math:['先把数代进去硬算','看着像哪个选哪个','先猜结论再往回推'],
  phys:['凭直觉判断大小','先把公式背下来再套','只看题目问的那个量'],
  chem:['先记反应方程式','只看颜色或状态变化','凭经验估一个'],
  bio:['先回忆课本原话','只看其中某一个条件','凭生活经验判断']
};
/* 大模型爱给 JSON 套一层 ```json ... ```，也可能前后带废话，统统剥掉 */
function aiParseJson(txt){
  let t=String(txt||'').trim();
  t=t.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
  const a=t.indexOf('{'),b=t.lastIndexOf('}');
  if(a>=0&&b>a)t=t.slice(a,b+1);
  let o=null;
  try{o=JSON.parse(t);}catch(e){o=null;}
  if(!o)return null;
  const g=(...ks)=>{for(const k of ks)if(o[k]!=null&&o[k]!=='')return o[k];return null;};
  const ap=g('approach','思路','appr');
  return {stem:String(g('stem','question','q','text','题干')||'').trim(),
          answer:String(g('answer','ans','a','right','答案')||'').trim(),
          options:Array.isArray(g('options','opts','choices'))?g('options','opts','choices'):null,
          topic:String(g('topic','knowledge','知识点')||'').trim(),
          subject:String(g('subject','subj','科目')||'').trim(),
          explain:String(g('explain','analysis','solution','exp','解析')||'').trim(),
          steps:Array.isArray(g('steps','过程','思路'))?g('steps','过程','思路'):null,
          approach:(ap&&typeof ap==='object')?ap:null};
}
/* ---------- 把 AI 给的东西洗成游戏能直接用的样子 ----------
   模型是自由的：会给 markdown 星号、会把"第一步：…"写进步骤里、
   会给三条一模一样的干扰项、会把答案原文当成"思路"。不洗一遍，
   思路那一步会出成「四个选项里俩一模一样」这种一眼假题。 */
const aiNormKey=s=>String(s||'').replace(/[\s*#`>|"']/g,'')
       .replace(/[、，。：；！？（）【】\[\]]/g,'').toLowerCase();
function aiStr(v,max){
  let s=String(v==null?'':v).replace(/[\r\n]+/g,' ').replace(/\s{2,}/g,' ')
       .replace(/\*\*/g,'').trim();
  if(max&&s.length>max)s=s.slice(0,max);
  return s;
}
function aiFixSteps(v){
  if(!Array.isArray(v))return null;
  const out=[],seen=new Set();
  v.forEach(s=>{
    if(out.length>=4)return;
    /* 编号交给渲染时的 <ol>，模型写的"第一步："就别重复了 */
    /* 模型爱写「第一步：…」「1. …」这类前缀，编号交给 <ol>，
       连开头残留的冒号顿号一起剥掉，免得渲染出「：对二次式配方」 */
    let t=aiStr(s,64)
      .replace(/^第?\s*[0-9一二三四五六七八九十]+\s*[步、.．)）]?\s*[:：、.．)）]?\s*/,'')
      .replace(/^[:：、.．)）]\s*/,'');
    if(t.length<2)return;
    const k=aiNormKey(t);
    if(seen.has(k))return;
    seen.add(k);out.push(t);
  });
  return out.length?out:null;
}
/* 思路层：right 必须有、wrong 凑够 3 条且互不雷同，才配出一道思路题 */
function aiFixAppr(a,subj){
  if(!a||typeof a!=='object')return null;
  const r=aiStr(a.right||a.r||a.best||a.correct,40);
  if(r.length<2)return null;
  const why=aiStr(a.why||a.k||a.reason||a.因为,90);
  const src=Array.isArray(a.wrong)?a.wrong
           :(Array.isArray(a.w)?a.w:(Array.isArray(a.opts)?a.opts:[]));
  const pool=src.concat(AI_APPR_FALLBACK[subj]||AI_APPR_FALLBACK.math);
  const w=[],seen=new Set([aiNormKey(r)]);
  pool.forEach(v=>{
    if(w.length>=3)return;
    const s=aiStr(v,30);
    if(s.length<2)return;
    const k=aiNormKey(s);
    /* 把答案原文当"思路"也挡掉：思路说的是怎么下手，不是答案是什么 */
    if(seen.has(k)||k===aiNormKey(r))return;
    seen.add(k);w.push(s);
  });
  if(w.length<3)return null;
  return {r:r,opts:shuffle([r].concat(w)),why:why};
}
/* 重练 / 错题详情里展示 AI 给的几步思路 */
function stepsHtml(q,open){
  const st=(q&&q.steps)||[];
  if(!st.length)return '';
  const inner='<div class="ai-steps"><div class="hd">🧠 这道题该怎么想</div><ol>'
    +st.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></div>';
  if(open)return inner;
  return '<details class="ai-sec wb-ai"><summary>🧠 看 AI 的 '+st.length
    +' 步思路</summary>'+inner+'</details>';
}
/* 大模型常这么给：answer 是「B」，options 却是纯文本 ['0.05','0.1','0.25']。
   得把字母换成对应的选项原文，否则重练时判不出对错。
   也认「A.」「B、」这类带前缀的写法，以及直接给选项文本的。 */
function aiPickOpt(ans,opts){
  if(!opts||!opts.length)return {ans:ans||'',ok:false};
  const s=String(ans==null?'':ans).trim();
  if(!s)return {ans:'',ok:false};
  const bare=v=>String(v).replace(/^[A-Da-d]\s*[.、．)）:]\s*/,'').trim();
  /* ① 单个字母 A / A. / （A） */
  let m=s.match(/^[（(]?\s*([A-Da-d])\s*[）.、．]?\s*$/);
  if(m){
    const i=m[1].toUpperCase().charCodeAt(0)-65;
    if(i>=0&&i<opts.length)return {ans:opts[i],ok:true};
  }
  /* ② 多选答案 AB / A、C：游戏是单选，取第一个能认出来的 */
  m=s.match(/^[A-Da-d](?:\s*[、,，和与\s]?\s*[A-Da-d])+$/);
  if(m){
    const letters=s.match(/[A-Da-d]/g)||[];
    for(const L of letters){
      const i=L.toUpperCase().charCodeAt(0)-65;
      if(i>=0&&i<opts.length)return {ans:opts[i],ok:true};
    }
  }
  /* ③ 直接给的是选项文本 */
  const na=impNorm(s);
  for(let i=0;i<opts.length;i++){
    if(impNorm(opts[i])===na)return {ans:opts[i],ok:true};
    if(impNorm(bare(opts[i]))===na)return {ans:opts[i],ok:true};
  }
  /* ④ 答案带前缀（"B. 0.1 mol/L"），剥掉再比 */
  const nb=impNorm(bare(s));
  if(nb){
    for(let i=0;i<opts.length;i++){
      if(impNorm(bare(opts[i]))===nb)return {ans:opts[i],ok:true};
    }
  }
  return {ans:s,ok:false};
}
/* 选项单独存了，题干里就别再写一遍 A. xxx —— 重练时会重复显示两遍 */
function aiStripOpts(stem,opts){
  const t=String(stem||'').trim();
  if(!t||!opts||!opts.length)return t;
  const lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const kept=lines.filter(l=>!/^[（(]?\s*[A-Da-d]\s*[）.、．:]\s*\S/.test(l));
  if(!kept.length)return t;                       /* 整段都被当成选项了，别删 */
  const out=kept.join('\n').trim();
  return out.length>=6?out:t;                     /* 删完没剩几个字，也别删 */
}
function aiToQA(url,onProg,deep){
  const base=(OCR_CFG.aiBase||'').trim(),key=(OCR_CFG.aiKey||'').trim();
  const model=(OCR_CFG.aiModel||'').trim();
  if(!base)return Promise.resolve({ok:false,err:'还没填接口地址'});
  if(!model)return Promise.resolve({ok:false,err:'还没填模型名'});
  if(onProg)onProg(deep===false?'AI 正在看图…':'AI 正在看图并解析…');
  const body={model:model,temperature:0,
    messages:[{role:'user',content:[
      {type:'text',text:(deep===false?AI_PROMPT:AI_PROMPT_DEEP)},
      {type:'image_url',image_url:{url:url}}]}]};
  return fetch(base.replace(/\/+$/,'')+'/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify(body)
  }).then(r=>{
    if(!r.ok)return r.text().then(t=>{throw new Error('HTTP '+r.status+' '+String(t||'').slice(0,160));});
    return r.json();
  }).then(j=>{
    const c=j&&j.choices&&j.choices[0];
    const txt=(c&&c.message&&c.message.content)||'';
    const o=aiParseJson(txt);
    if(!o)throw new Error('返回的内容看不懂：'+String(txt).slice(0,160));
    if(!o.stem&&!o.answer)throw new Error('图上没找到题目');
    return {ok:true,text:o.stem,ans:o.answer,opts:o.options,
            topic:o.topic,subject:o.subject,ai:1,
            explain:o.explain,steps:aiFixSteps(o.steps),
            appr:aiFixAppr(o.approach,o.subject)};
  }).catch(e=>({ok:false,err:(e&&e.message)||'请求失败'}));
}
/* 深度解析优先，拿不到就退回简版 —— 有些小模型吐不出长 JSON，
   但认题干和答案没问题，不能因为少一段解析就把整张图作废 */
function aiDeepPhoto(url,onProg){
  return aiToQA(url,onProg,true).then(r=>{
    if(r.ok)return r;
    if(onProg)onProg('深度解析没成，退回简版…');
    return aiToQA(url,onProg,false).then(r2=>r2.ok?r2:r);
  });
}
function ocrOne(url,onProg){
  if(OCR_CFG.mode==='ai')return aiDeepPhoto(url,onProg);
  if(OCR_CFG.mode==='api'&&(OCR_CFG.endpoint||'').trim())return ocrApi(url);
  return ocrTess(url,onProg);
}
/* 从识别出来的一整段文字里切出「题干 / 答案 / 解析」。
   打印体卷子一般长这样：题目…… 答案：B 解析：……
   找不到标记就把整段当题干，答案留空让人自己敲。 */
function splitQA(raw){
  const flat=v=>String(v||'').replace(/\r/g,'').replace(/\n+/g,' ').replace(/\s{2,}/g,' ').trim();
  const t=flat(raw);
  if(!t)return {text:'',ans:'',exp:''};
  const marks=[];
  const push=(re,tag)=>{re.lastIndex=0;let m;while((m=re.exec(t)))marks.push({i:m.index,l:m[0].length,tag:tag});};
  push(/(?:【|\(|\[|（)?\s*(?:参考答案|标准答案|答案)\s*(?:】|\)|\]|）)?\s*[:：]?/g,'ans');
  push(/解\s*[:：]/g,'ans');
  push(/解析\s*[:：]?/g,'exp');
  if(!marks.length)return {text:t,ans:'',exp:''};
  marks.sort((a,b)=>a.i-b.i);
  const head=t.slice(0,marks[0].i).trim();
  let A=null,E=null;
  for(let i=0;i<marks.length;i++){
    if(marks[i].tag==='ans'&&!A)A=marks[i];
    if(marks[i].tag==='exp'&&!E)E=marks[i];
  }
  let ans='',exp='';
  if(A){
    const st=A.i+A.l;
    let en=t.length;
    if(E&&E.i>A.i)en=E.i;
    ans=t.slice(st,en).trim();
  }
  if(E)exp=t.slice(E.i+E.l).trim();
  return {text:head,ans:ans,exp:exp};
}

