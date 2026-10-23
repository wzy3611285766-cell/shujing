/* =========================================================
   外部导入 / 导出错题
   ---------------------------------------------------------
   游戏内的错题都是四选一（带 opts），但从作业、卷子、备忘录里
   搬进来的题通常只有「题干 + 答案」，没有三个干扰项。
   所以导入的题允许没有 opts：重练时改走自评模式 —— 先自己做，
   再对答案，自己判「会了 / 还没会」，见 sessionFixed 的 renderSelfRate。
   ========================================================= */
const IMP_SEP=/[|｜\t]/;                       /* 字段分隔符：竖线 / 全角竖线 / 制表符 */
/* 导入面板的示例：照着改成自己的题就行 */
const IMP_DEMO=[
'把 0.5 mol/L 的盐酸 100 mL 加水稀释到 500 mL，稀释后浓度是？ | 0.1 mol/L | c1V1=c2V2，0.5×100=c2×500 | 物质的量浓度 | 化',
'函数 f(x)=ln(x²-3x+2) 的定义域是？ | (-∞,1)∪(2,+∞) | 真数大于 0，解一元二次不等式 | 定义域 | 数',
'光合作用中 ATP 和 NADPH 产生于哪个阶段？ | 光反应 | 光反应在类囊体薄膜上生成 ATP 与 NADPH，暗反应消耗它们 | 光合作用 | 生'
].join('\n');
/* 去重键：题干去掉全部空白后比较 —— 手抄时多敲几个空格不该算两道题 */
function wbKey(t){return String(t==null?'':t).replace(/\s+/g,'');}
/* 科目识别：中文名、单字、英文 id 都认 */
function impSubj(v){
  const s=String(v==null?'':v).trim().toLowerCase();
  if(!s)return '';
  const map={'数学':'math','数':'math','math':'math','ma':'math',
             '物理':'phys','物':'phys','phys':'phys','physics':'phys',
             '化学':'chem','化':'chem','chem':'chem','chemistry':'chem',
             '生物':'bio','生':'bio','bio':'bio','biology':'bio'};
  if(map[s])return map[s];
  for(let i=0;i<DRILL_SUBJ.length;i++){
    const d=DRILL_SUBJ[i];
    if(s.indexOf(d.id)>=0||s.indexOf(d.name)>=0)return d.id;
  }
  return '';
}
function impRid(sid){return (DRILL_RIDS[sid]&&DRILL_RIDS[sid][0])||'func';}
/* 把一行文本 / 一条记录整理成错题本条目；题干或答案为空就丢弃 */
function impOne(text,ans,exp,topic,subj,opts,defSubj){
  text=String(text==null?'':text).trim();
  ans =String(ans ==null?'':ans ).trim();
  if(!text||!ans)return null;                 /* 只有题干没有答案的题没法判，直接跳过 */
  exp  =String(exp  ==null?'':exp  ).trim()||'（导入时没写解析）';
  topic=String(topic==null?'':topic).trim()||'导入题';
  const sid=impSubj(subj)||impSubj(defSubj);
  let arr=null;
  if(Array.isArray(opts))arr=opts.map(x=>String(x==null?'':x).trim()).filter(Boolean);
  else if(typeof opts==='string'&&opts.trim())arr=impOptSplit(opts);
  /* 选项里必须含正确答案，否则这题永远判不对。
     比对前先归一化（去空白、全角转半角、统一小写）：
     答案写「0.1 mol/L」、选项写「0.1mol/L」这种情况应当算同一项；
     真对上了就把答案换成选项原文，判等时才不会差一个空格就判错。 */
  if(arr&&arr.length>=2){
    const na=impNorm(ans);
    let hit=-1;
    for(let i=0;i<arr.length;i++)if(impNorm(arr[i])===na){hit=i;break;}
    if(hit<0)arr.push(ans);else ans=arr[hit];
    arr=arr.slice(0,6);
  }else arr=null;
  return {text:text,ans:ans,exp:exp,topic:topic,opts:arr,
          rid:impRid(sid),subject:sid,src:'导入',imp:1};
}
/* 归一化：去空白 + 全角转半角 + 统一小写，只用来判断「是不是同一个答案」 */
function impNorm(t){
  return String(t==null?'':t)
    .replace(/[\s\u3000]/g,'')
    .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g,
             c=>String.fromCharCode(c.charCodeAt(0)-65248))
    .toLowerCase();
}
/* 拆一串选项。
   麻烦在于半角 / 既可能是分隔符（A/B/C/D），也可能是单位里的一撇（mol/L、m/s）。
   对策：优先用 ; ； 、 ／ 分；分不出来才动 / ，
   且这时选项里带空格（说明有单位），把 L、s 这类短碎片并回上一项。 */
function impOptSplit(str){
  const t=String(str==null?'':str).trim();
  if(!t)return [];
  let arr=t.split(/[;；、／]/).map(x=>x.trim()).filter(Boolean);
  if(arr.length<2&&t.indexOf('/')>=0){
    const raw=t.split('/').map(x=>x.trim()).filter(Boolean);
    if(/\s/.test(t)){                       /* 有空格 = 多半带单位，别把单位切碎 */
      const out=[];
      raw.forEach(x=>{
        /* 只把碎片并回「带空格的上一项」：0.05 mol + L 该合成 mol/L，
           而 A / B / C 里每项都不带空格，不该被粘成一坨 */
        const prev=out.length?out[out.length-1]:'';
        if(prev&&x.length<=3&&!/\s/.test(x)&&/\s/.test(prev))out[out.length-1]+='/'+x;
        else out.push(x);
      });
      arr=out;
    }else arr=raw;                           /* A/B/C/D 这种直接切 */
  }
  return arr;
}
/* 拆一行的字段，并单独认出「选项」那一段。
   难点：题干自己可能带竖线（{x | 1<x<2}），直接切会整体错位。
   对策：① 写了「选项：」的段直接摘出来，不再参与位置判断
        ② 剩下多于 5 段时，只认末尾 4 段（答案/解析/知识点/科目），
           前面多出来的统统并回题干 */
function impFields(s){
  let p=s.split(IMP_SEP).map(x=>String(x).trim());
  let joiner=' | ';
  /* 一行里没有竖线也没有 Tab：多半是从 csv 复制的，退一步按逗号（半角优先）分。
     题干里带逗号会切多，但下面「多于 5 段并回题干」的兜底能救回来。 */
  if(p.length<2){
    if(s.indexOf(',')>=0){p=s.split(',').map(x=>String(x).trim());joiner=',';}
    else if(s.indexOf('，')>=0){p=s.split('，').map(x=>String(x).trim());joiner='，';}
  }
  let optStr=null;
  for(let i=p.length-1;i>=0;i--){
    if(/^(?:【选项】|选项[：:]|opt[：:])/i.test(p[i])){
      optStr=p[i].replace(/^(?:【选项】|选项[：:]|opt[：:])/i,'').trim();
      p.splice(i,1);
    }
  }
  /* 没写「选项：」但段数够多时，末尾一段看着像一串短选项，就当它是 */
  if(optStr==null&&p.length>=6){
    const last=p[p.length-1];
    const parts=impOptSplit(last);
    if(parts.length>=2&&parts.every(x=>x.length<=20)){optStr=last;p.splice(p.length-1,1);}
  }
  /* 多出来的段并回题干：按原分隔符拼回去，
     竖线分隔时两侧补空格，{x | 1<x<2} 这种写法才不会被挤成 {x|1<x<2} */
  if(p.length>5)p=[p.slice(0,p.length-4).join(joiner)].concat(p.slice(p.length-4));
  return {f:p,optStr:optStr};
}
/* 解析整段文本：先试 JSON，失败再按行拆。
   返回 {list:[...], bad:跳过的行数} */
function parseWrongText(txt,defSubj){
  const res={list:[],bad:0};
  txt=String(txt==null?'':txt).replace(/\r\n?/g,'\n').trim();
  if(!txt)return res;
  /* JSON：既认 [ {...} ]，也认 {"wrongBook":[ ... ]}（自己导出的备份能原样导回） */
  if(txt.charAt(0)==='['||txt.charAt(0)==='{'){
    let arr=null;
    try{
      const o=JSON.parse(txt);
      if(Array.isArray(o))arr=o;
      else if(o&&Array.isArray(o.wrongBook))arr=o.wrongBook;
    }catch(e){arr=null;}
    if(arr){
      arr.forEach(it=>{
        if(!it||typeof it!=='object'){res.bad++;return;}
        const g=(...ks)=>{for(const k of ks)if(it[k]!=null)return it[k];return null;};
        const q=impOne(g('text','q','stem','question'),
                       g('ans','answer','a','right'),
                       g('exp','explain','analysis'),
                       g('topic'),g('subject','subj'),
                       g('opts','options'),defSubj);
        if(q)res.list.push(q);else res.bad++;
      });
      return res;
    }
  }
  txt.split('\n').forEach(line=>{
    const s=line.trim();
    if(!s||s.charAt(0)==='#'||s.indexOf('//')===0)return;   // 注释行 / 标题行
    const sp=impFields(s);
    const p=sp.f;
    const q=impOne(p[0],p[1],p[2],p[3],p[4],sp.optStr,defSubj);
    if(q)res.list.push(q);else res.bad++;
  });
  return res;
}
/* 写入错题本：去重 + 容量截断。返回 {added,dup,cut} */
function commitImport(list){
  const have={};
  state.wrongBook.forEach(w=>{have[wbKey(w.text)]=1;});
  let added=0,dup=0,cut=0;
  /* 倒着 unshift：导进来的第 1 题最后插，正好落在错题本最前面，顺序不乱 */
  for(let i=list.length-1;i>=0;i--){
    const q=list[i],k=wbKey(q.text);
    if(have[k]){dup++;continue;}
    have[k]=1;
    if(state.wrongBook.length>=WRONG_CAP){cut++;continue;}
    wbHeal(q,true);state.wrongBook.unshift(q);added++;
  }
  save();updateHUD();
  return {added:added,dup:dup,cut:cut};
}
/* ---------- 导入面板 ---------- */
function showImportWrong(initTxt){
  let defSubj='';
  function render(){
    const picks=DRILL_SUBJ.map(d=>{const on=(defSubj===d.id);return `<button class="btn" data-s="${d.id}"
      style="flex:none;min-width:0;padding:6px 11px;font-size:var(--fs-sm);${on
        ?'background:linear-gradient(160deg,#ffd76a,#f59f2b);color:#4a2c00;border:none':''}">${d.emoji} ${d.name}</button>`;}).join('');
    openPanel(`
      <h2>📥 导入错题</h2>
      <div class="sub">把作业、卷子、备忘录里的错题搬进来 · 现有 ${state.wrongBook.length} / ${WRONG_CAP} 题</div>
      <div class="imp-box">
        <b>一题一行</b>，字段用 <b>|</b> 隔开（全角｜和 Tab 也认）
        <span class="imp-code">题干 | 答案 | 解析 | 知识点 | 科目</span>
        · 最少只写 <b>题干 | 答案</b>，后三段可以省<br>
        · 科目写「数 / 理 / 化 / 生」或中英文都行，不写就用下面点的默认科目<br>
        · 要保留选择题就加第 6 段写选项，用 <b>;</b> 或 <b>、</b> 隔开（短选项用 / 也行）<br>
        · 从表格软件复制的（Tab）或 csv（逗号）直接粘也行<br>
        · 没写选项的题照样能练：重练时先自己做，再对答案自评
      </div>
      <div class="row" style="margin-top:0;margin-bottom:8px;gap:6px;justify-content:center;flex-wrap:wrap">
        <span style="color:#9cc0e0;font-size:var(--fs-sm);align-self:center">默认科目</span>${picks}
      </div>
      <textarea id="impTa" placeholder="在这里长按 → 粘贴你的错题，一题一行" style="${TA_STYLE};height:150px">${esc(initTxt||'')}</textarea>
      <div class="center" id="impMsg" style="min-height:20px;color:#ffd76a;font-weight:700;font-size:var(--fs-sm)"></div>
      <div class="row"><button class="btn" id="impFile">📂 选文件</button><button class="btn" id="impDemo">📋 填示例</button></div>
      <div class="row"><button class="btn primary" id="impGo">🔍 解析并预览</button></div>
      <div class="row"><button class="btn" id="impFmt">❓ 更多格式</button><button class="btn" id="impPh">📷 拍题讲解</button></div>
      <div class="row"><button class="btn" id="ok">关闭</button></div>
    `);
    const ta=$('impTa');
    /* 每次重绘前先把输入框里的内容捞回来，点科目按钮不会把已经粘好的题刷掉 */
    const keep=()=>{if(ta)initTxt=ta.value;};
    panel.querySelectorAll('[data-s]').forEach(b=>{b.onclick=()=>{
      keep();defSubj=(defSubj===b.dataset.s?'':b.dataset.s);render();};});
    $('impDemo').onclick=()=>{keep();
      initTxt=initTxt&&initTxt.trim()?initTxt+'\n'+IMP_DEMO:IMP_DEMO;
      toast('已填入 3 道示例，改一改就能用');render();};
    $('impFmt').onclick=()=>{keep();showImportFmt(initTxt);};
    $('impPh').onclick=()=>{showImportPhoto();};
    $('impGo').onclick=()=>{
      keep();
      const r=parseWrongText(initTxt||'',defSubj);
      if(!r.list.length){
        setH($('impMsg'), `<span class="imp-no">没解析出题目</span>${r.bad?'（跳过了 '+r.bad+' 行无效内容）':''}<br>
          <span style="color:#9cc0e0;font-weight:400">检查一下每行是不是「题干 | 答案」</span>`);
        return;
      }
      showImportPreview(r.list,r.bad,initTxt||'',defSubj);
    };
    $('impFile').onclick=()=>{
      keep();
      const inp=document.createElement('input');
      inp.type='file';inp.accept='.txt,.csv,.json,.md,text/plain,application/json';
      inp.onchange=async()=>{
        const f=inp.files&&inp.files[0];if(!f)return;
        const t=await f.text().catch(()=>null);
        if(t==null){toast('读取失败');return;}
        initTxt=(initTxt&&initTxt.trim()?initTxt+'\n':'')+t;
        toast('已读入 '+f.name);render();
      };
      inp.click();
    };
    $('ok').onclick=closePanel;
  }
  render();
}
/* ---------- 格式说明 ---------- */
function showImportFmt(back){
  openPanel(`
    <h2>❓ 导入格式</h2>
    <div class="sub">怎么顺手怎么来，只认「一题一行」</div>
    <div class="imp-box">
      <b>1. 最简</b>：题干 | 答案
      <span class="imp-code">细胞呼吸的场所 | 细胞质基质和线粒体</span>
      <b>2. 完整</b>：题干 | 答案 | 解析 | 知识点 | 科目
      <span class="imp-code">铁与稀盐酸反应的产物 | FeCl2 和 H2 | 铁被氧化成 +2 价，不是 +3 | 金属的性质 | 化</span>
      <b>3. 带选项</b>：再加第 6 段，选项之间用 <b>;</b> 或 <b>、</b> 隔开
      <span class="imp-code">盐酸稀释后浓度 | 0.1 mol/L | c1V1=c2V2 | 物质的量浓度 | 化 | 0.05 mol/L;0.1 mol/L;0.25 mol/L</span>
      （选项里不带单位时，用 / 隔开也认：0.05/0.1/0.25）
      <b>4. 表格</b>：从表格软件里整行复制过来直接粘，Tab 分隔会自动识别<br>
      <b>5. JSON</b>：也认数组或导出的备份文件，选项一并保留
      <span class="imp-code">[{"text":"…","ans":"…","exp":"…","subject":"math"}]</span>
      <b>6. 文件</b>：点「📂 选文件」读 .txt / .csv / .json / .md
    </div>
    <div class="imp-box" style="border-color:rgba(255,215,106,.3)">
      <b style="color:#ffd76a">几条小提示</b><br>
      · 分隔符是竖线 <b>|</b>（全角｜和 Tab 也行）；逗号不算分隔，题干里逗号太多<br>
      · 以 # 或 // 开头的行会跳过，可以拿来写小标题<br>
      · 题干相同的题会自动去重，同一批导两次也不会翻倍<br>
      · 没写选项的题不会硬凑成选择题，重练时自己先做、再对答案自评
    </div>
    <div class="row"><button class="btn primary" id="ok">知道了</button></div>
  `);
  $('ok').onclick=()=>showImportWrong(back||'');
}
/* ---------- 预览 → 确认 ---------- */
function showImportPreview(list,bad,raw,defSubj){
  const cnt={};let noOpt=0;
  list.forEach(q=>{const k=q.subject||'other';cnt[k]=(cnt[k]||0)+1;if(!q.opts)noOpt++;});
  const sum=DRILL_SUBJ.filter(d=>cnt[d.id]).map(d=>d.emoji+d.name+' '+cnt[d.id]).join(' · ')
    +(cnt.other?(DRILL_SUBJ.some(d=>cnt[d.id])?' · ':'')+'未分类 '+cnt.other:'');
  const room=WRONG_CAP-state.wrongBook.length;
  openPanel(`
    <h2>🔍 预览</h2>
    <div class="sub">识别到 ${list.length} 题${bad?' · 跳过 '+bad+' 行无效':''}</div>
    <div class="center" style="font-size:var(--fs-sm);color:#9cc0e0;margin-bottom:8px;line-height:var(--lh-base)">
      ${sum?esc(sum)+'<br>':''}${noOpt?noOpt+' 题没写选项，重练时走自评模式':''}</div>
    <div style="max-height:40vh;overflow:auto">
      ${list.slice(0,6).map((w,i)=>`<div class="wb-item imp">
        <div class="wb-t">📥 <span class="qtag" style="margin:0 8px 0 0">${esc(w.topic)}</span>${i+1}. ${esc(w.text)}</div>
        <div class="wb-a">答案：<b>${esc(w.ans)}</b></div>
        <div class="wb-e">${esc(w.exp)}</div></div>`).join('')}
      ${list.length>6?`<div class="center" style="color:#9cc0e0;font-size:var(--fs-sm);padding:8px">…… 还有 ${list.length-6} 题，导入后在错题本里查看</div>`:''}
    </div>
    <div class="center" id="pvMsg" style="min-height:20px;color:#ffd76a;font-weight:700;font-size:var(--fs-sm)">
      ${room<list.length?`<span class="imp-no">只剩 ${room} 个空位</span>，多出来的会被截掉`:''}</div>
    <div class="row"><button class="btn primary" id="pvGo">✅ 确认导入</button></div>
    <div class="row"><button class="btn" id="pvBack">✏️ 返回修改</button><button class="btn" id="ok">关闭</button></div>
  `);
  $('pvBack').onclick=()=>showImportWrong(raw);
  $('ok').onclick=closePanel;
  $('pvGo').onclick=()=>{
    if(room<=0){setH($('pvMsg'), `<span class="imp-no">错题本已满 ${WRONG_CAP} 题</span>，先清掉一些再来`);return;}
    const r=commitImport(list);
    openPanel(`
      <h2>✅ 导入完成</h2>
      <div class="sub">错题本现在 ${state.wrongBook.length} / ${WRONG_CAP} 题</div>
      <div class="center" style="font-size:44px;margin:8px 0">📥</div>
      <div class="center" style="line-height:var(--lh-loose)">
        <span class="imp-ok">新导入 ${r.added} 题</span><br>
        ${r.dup?`跳过重复 ${r.dup} 题<br>`:''}
        ${r.cut?`<span class="imp-no">超出容量，截断 ${r.cut} 题</span><br>`:''}
        <span style="color:#9cc0e0;font-size:var(--fs-sm)">点「🔁 马上重练」就能立刻过一遍</span>
      </div>
      <div class="row"><button class="btn" id="pvDr">🔁 马上重练</button><button class="btn primary" id="ok">好</button></div>
    `);
    $('ok').onclick=closePanel;
    $('pvDr').onclick=()=>{closePanel();startWrongDrill(state.wrongBook.filter(w=>w.imp),5);};
  };
}
/* ---------- 导出 ---------- */
function showExportWrong(){
  const list=state.wrongBook;
  if(!list.length){toast('错题本是空的');return;}
  const nm=w=>{const d=DRILL_OF[w.subject||subjOfRid(w.rid)];return d?d.name:'';};
  const txt=list.map(w=>[w.text,w.ans,w.exp||'',w.topic||'',nm(w)]
    .concat((w.opts&&w.opts.length)?[w.opts.join('/')]:[]).join(' | ')).join('\n');
  const json=JSON.stringify(list.map(w=>({text:w.text,ans:w.ans,exp:w.exp||'',
    topic:w.topic||'',subject:w.subject||subjOfRid(w.rid)||'',
    opts:(w.opts&&w.opts.length)?w.opts:null})),null,1);
  const head='数境 · 错题本导出 '+new Date().toISOString().slice(0,10)+'\n'
    +'（改完可以直接粘回「📥 导入错题」）\n\n';
  openPanel(`
    <h2>📤 导出错题</h2>
    <div class="sub">共 ${list.length} 题 · 换设备、备份、自己编辑都用它</div>
    <div class="imp-box">
      <b>纯文本</b>：一行一题，能用记事本改，改完再导回来
      <span class="imp-code">${esc(txt.split('\n').slice(0,2).join('\n'))}${list.length>2?'\n…':''}</span>
      <b>JSON</b>：连选项一起存，原样导回不丢东西<br>
      <span style="color:#9cc0e0">（照片存在本机，导出的是文字部分）</span>
    </div>
    <div class="row"><button class="btn" id="ex1">📋 复制文本</button><button class="btn" id="ex2">📄 存成 .txt</button></div>
    <div class="row"><button class="btn" id="ex3">📄 存成 .json</button><button class="btn primary" id="ok">关闭</button></div>
  `);
  $('ok').onclick=closePanel;
  $('ex1').onclick=()=>{copyText(head+txt).then(ok=>toast(ok?'已复制到剪贴板 ✅':'复制失败，请手动长按选中'));};
  $('ex2').onclick=()=>{downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.txt',head+txt);toast('已存成文件 ✅');};
  $('ex3').onclick=()=>{downloadFile('错题本_'+new Date().toISOString().slice(0,10)+'.json',json);toast('已存成文件 ✅');};
}
/* ---------- 重练一批错题（免费，最多 n 题）----------
   review=true 表示这是「今日复习」队列：结束后报一遍熟炼度变化
   （毕业几题 / 升星几题 / 打回几题），并发复习奖励。
   onDone(r,t)（4.0.22）：练完通知一声 —— 「每日复习闸」要靠它放行
   （复习完才允许开新的一局）。 */
function startWrongDrill(list,n,review,onDone){
  list=(list||[]).filter(Boolean);
  if(!list.length){toast('没有可练的题');return;}
  const pick=shuffle(list).slice(0,Math.max(1,Math.min(n||5,list.length)));
  const snap=pick.map(w=>({t:String(w.text),box:w.box||0}));
  const coin=Math.min(20,pick.length*2);
  sessionFixed(pick,review?'📌 今日复习':'📕 错题重练',(r,t)=>{
    let up=0,down=0,done=0,back=0;
    snap.forEach(s=>{
      if(state.wrongDone.some(x=>String(x.text)===s.t)){done++;return;}
      const w=state.wrongBook.filter(x=>String(x.text)===s.t)[0];
      if(!w)return;
      if((w.box||0)>s.box)up++;else if((w.box||0)<s.box)down++;
    });
    if(review){wbRevTick(t);state.crystals+=coin;}
    save();updateHUD();
    openPanel('<h2>'+(review?'今日复习完成':'复习完成')+'</h2>'
      +'<div class="sub">答对 '+r+' / '+t+'</div>'
      +'<div class="center" style="font-size:44px;margin:8px 0">'
        +(review?(r>=t?'🏆':'📕'):'📕')+'</div>'
      +'<div class="center" style="line-height:var(--lh-loose)">'
      +(done?'<span class="imp-ok">🎓 '+done+' 题毕业，收进「已掌握」</span><br>':'')
      +(up?'⬆️ '+up+' 题熟炼度 +1<br>':'')
      +(down?'<span class="imp-no">⬇️ '+down+' 题打回第一天</span><br>':'')
      +(back?'↩️ '+back+' 题从归档区拉回来重学<br>':'')
      +(review?'🪙 复习奖励 +'+coin+' · 连续复习 '
        +((state.wbRev&&state.wbRev.streak)||1)+' 天<br>':'')
      +'</div>'
      +'<div class="row"><button class="btn" id="pvWb">📕 回到错题本</button>'
      +'<button class="btn primary" id="ok">好</button></div>');
    $('ok').onclick=closePanel;
    $('pvWb').onclick=()=>showWrongBook(review?'today':'all');
    if(typeof onDone==='function'){try{onDone(r,t);}catch(e){}}
  });
}

/* =========================================================
   📌 每日复习闸（4.0.22）
   ---------------------------------------------------------
   产品决定：**每天先复习错题，复习完才能开新的一局。**
   理由不再解释（是玩家自己定的规矩），这里只写实现上的三个取舍：

   1. 只拦"第一批"（REVIEW_BATCH 题，按到期顺序随机抽）。
      到期题可能是几十道 —— 一次全拦等于把人挡在门外，他会关掉页面，
      那就连复习也没有了。拦一批（3~5 分钟）既保住"每天先复习"，
      又不至于变成惩罚。批完的提示里会说"还有 M 道到期，明天继续"。
   2. 拦的是**开新局**（烽火部署），不是整个游戏。
      已经进来的玩家可以自由看地图、翻菜单、去练枪（练枪本来就在做题）。
      "复习完才能开始新的游戏"这句，落在部署那一下最准确。
   3. 完成标记记在**练完之后**（不是点"开始复习"那一刻）。
      半路退出 → 下次启动照样拦，这才叫"复习完"。
   ========================================================= */
const REVIEW_DAY='himath_review_day';
const REVIEW_BATCH=10;              // 每天拦下来的第一批题数
function reviewDoneToday(){
  try{return localStorage.getItem(REVIEW_DAY)===todayStr();}catch(e){return true;}
}
function reviewMarkDone(){
  try{localStorage.setItem(REVIEW_DAY,todayStr());}catch(e){}
}
/* 今天"还欠着"几题（0 = 不拦） */
function reviewNeed(){
  if(reviewDoneToday())return 0;
  return wbDueList().length;
}
/* 弹闸门。onPass：复习完之后接着做玩家原本想做的事（例如直接部署入局） */
function reviewGate(onPass){
  const due=wbDueList();
  if(!due.length||reviewDoneToday()){if(onPass)onPass();return;}
  const n=Math.min(due.length,REVIEW_BATCH);
  /* 4.0.23：这段文案砍到最短。
     玩家到此为止只想知道两件事：为什么拦我、要点几下。
     「这些题按熟炼度排到今天」「认真答比快点答划算」—— 说教，删。
     「每天只拦第一批」—— 解释规则，也删（按钮上的题数已经说清了）。 */
  openPanel(`<h2>📌 今天该复习 ${due.length} 题</h2>
    <div class="sub">先做 ${n} 题，做完就能开新的一局</div>
    <div class="row"><button class="btn primary" id="rvGo">开始（${n} 题）</button></div>`);
  const go=$('rvGo');
  if(go)go.onclick=()=>{
    audioKick();closePanel();
    startWrongDrill(due,n,true,()=>{
      reviewMarkDone();            // 练完才算今天复习过
      /* 4.0.23：不播报"可以去玩了"—— 按钮上已经写着「去开始新的一局 →」，
         再弹一个 toast 只是把同一句话说两遍。 */
      const ok=$('ok');
      if(ok){
        ok.textContent='去开始新的一局 →';
        ok.onclick=()=>{closePanel();audioKick();if(onPass)onPass();};
      }
    });
  };
}

